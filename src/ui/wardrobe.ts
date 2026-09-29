import { app } from '../app';
import { audio } from '../audio/audio';
import { CLOTHES, BISCUIT_ITEMS, CLOTHES_BY_ID, BISCUIT_BY_ID, specForPlayer, biscuitPieces } from '../data/clothes';
import { SKIN_TONES, HAIR_COLORS, type OutfitSlot, type BiscuitSlot } from '../core/state';
import { buy, equip, owns, price, setLook, surprise, unequip, worn, type Wearer } from '../core/wardrobe';
import { HAIR_STYLES, type Facing } from '../art/character';
import { itemThumb, drawPreview, drawBiscuitPreview } from '../art/thumbs';
import { iconUrl } from '../art/icons';
import { h, clear } from './dom';
import { button, toast, ui } from './ui';
import { registerPauseEntry } from './pause';

/**
 * The wardrobe: dress both players and Biscuit. Changes show instantly in the world
 * (and in the dance and bowling mini-games, which draw the same outfits).
 * In shop mode (Bramble's), items you don't own yet can be tried on and bought with Tockens.
 */
type Tab = OutfitSlot | BiscuitSlot | 'look';
const PLAYER_TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'hat', icon: '🎩', label: 'Hat' },
  { id: 'top', icon: '👕', label: 'Top' },
  { id: 'bottom', icon: '👖', label: 'Bottoms' },
  { id: 'shoes', icon: '👟', label: 'Shoes' },
  { id: 'acc', icon: '🎒', label: 'Extras' },
  { id: 'look', icon: '✨', label: 'Look' },
];
const BISCUIT_TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'hat', icon: '🎩', label: 'Hat' },
  { id: 'neck', icon: '🧣', label: 'Neck' },
];

export function openWardrobe(opts: { who?: Wearer; shop?: boolean } = {}): void {
  const d = app.data;
  if (!d || ui.has('wardrobe')) return;
  let who: Wearer = opts.who ?? 0;
  let tab: Tab = 'hat';
  const shop = !!opts.shop;
  let facing: Facing = 'down';
  let flip = false;
  /** item being tried on in the shop (not owned yet) */
  let trying: { id: string; color: number } | null = null;

  const preview = h('canvas', { class: 'wd-preview', attrs: { width: 220, height: 300, 'data-testid': 'wd-preview' } });
  const whoTabs = h('div', { class: 'wd-who' });
  const slotTabs = h('div', { class: 'wd-slots' });
  const grid = h('div', { class: 'wd-grid' });
  const swatches = h('div', { class: 'wd-swatches' });
  const info = h('div', { class: 'wd-info' });
  const buyRow = h('div', { class: 'wd-buy' });
  const coins = h('div', { class: 'wd-coins', attrs: { 'data-testid': 'wd-tockens' } });

  const changed = () => {
    app.events.emit('outfit-changed', who === 'biscuit' ? 2 : who);
    app.autosave.request();
  };

  const redrawPreview = () => {
    preview.classList.remove('bounce');
    void preview.offsetWidth;
    preview.classList.add('bounce');
    if (who === 'biscuit') {
      const outfit = { ...d.biscuit.outfit };
      if (trying) {
        const it = BISCUIT_BY_ID.get(trying.id)!;
        outfit[it.slot] = trying;
      }
      drawBiscuitPreview(preview, biscuitPieces(outfit), facing === 'down' ? 'happy' : facing === 'up' ? 'up-idle' : 'side-idle', flip);
      return;
    }
    const profile = structuredClone(d.players[who]);
    if (trying) {
      const it = CLOTHES_BY_ID.get(trying.id)!;
      profile.outfit[it.slot] = trying;
    }
    drawPreview(preview, specForPlayer(profile), facing, flip, facing === 'down' && !trying ? 'idle' : 'idle');
  };

  const renderWho = () => {
    clear(whoTabs);
    const entries: [Wearer, string][] = [
      [0, d.players[0].name],
      [1, d.players[1].name],
      ['biscuit', 'Biscuit'],
    ];
    for (const [w, label] of entries)
      whoTabs.appendChild(
        h(
          'button',
          {
            class: `seg-btn wd-who-btn ${w === who ? 'on' : ''} ${w === 1 ? 'p2' : w === 0 ? 'p1' : 'dog'}`,
            dataset: { nav: '' },
            attrs: { type: 'button', 'data-testid': `wd-who-${w}` },
            onclick: () => {
              who = w;
              tab = 'hat';
              trying = null;
              audio.sfx('blip');
              render();
            },
          },
          w === 'biscuit' ? '🐶 ' : w === 0 ? '🧡 ' : '💙 ',
          label,
        ),
      );
  };

  const renderSlots = () => {
    clear(slotTabs);
    const tabs = who === 'biscuit' ? BISCUIT_TABS : PLAYER_TABS.filter((t) => !(shop && t.id === 'look'));
    for (const t of tabs)
      slotTabs.appendChild(
        h(
          'button',
          {
            class: `wd-slot ${t.id === tab ? 'on' : ''}`,
            dataset: { nav: '' },
            attrs: { type: 'button', 'data-testid': `wd-slot-${t.id}` },
            onclick: () => {
              tab = t.id;
              trying = null;
              audio.sfx('blip');
              render();
            },
          },
          h('span', { class: 'wd-slot-icon' }, t.icon),
          h('span', { class: 'wd-slot-label' }, t.label),
        ),
      );
  };

  const itemsForTab = (): string[] => {
    if (tab === 'look') return [];
    const list = who === 'biscuit' ? BISCUIT_ITEMS.filter((i) => i.slot === tab) : CLOTHES.filter((i) => i.slot === tab);
    return list.filter((i) => owns(d, i.id) || (shop && i.source === 'shop')).map((i) => i.id);
  };

  const current = () => (tab === 'look' ? null : worn(d, who, tab as OutfitSlot));

  const renderGrid = () => {
    clear(grid);
    clear(swatches);
    clear(buyRow);
    if (tab === 'look' && who !== 'biscuit') return renderLook();
    const ids = itemsForTab();
    const cur = current();
    const optional = tab === 'hat' || tab === 'acc' || tab === 'neck';
    if (optional) {
      grid.appendChild(
        h(
          'button',
          {
            class: `wd-item none ${!cur && !trying ? 'on' : ''}`,
            dataset: { nav: '' },
            attrs: { type: 'button', 'data-testid': 'wd-none', title: 'Nothing' },
            onclick: () => {
              trying = null;
              unequip(d, who, tab as OutfitSlot);
              audio.sfx('select');
              changed();
              render();
            },
          },
          h('span', { class: 'wd-none-x' }, '∅'),
        ),
      );
    }
    for (const id of ids) {
      const item = CLOTHES_BY_ID.get(id) ?? BISCUIT_BY_ID.get(id)!;
      const own = owns(d, id);
      const selected = (trying?.id ?? cur?.id) === id;
      const color = selected ? (trying?.color ?? cur?.color ?? 0) : 0;
      grid.appendChild(
        h(
          'button',
          {
            class: `wd-item ${selected ? 'on' : ''} ${own ? '' : 'for-sale'}`,
            dataset: { nav: '' },
            attrs: { type: 'button', 'data-testid': `wd-item-${id}`, title: item.name },
            onclick: () => {
              if (own) {
                trying = null;
                equip(d, who, id, selected ? color : 0);
                audio.sfx('select');
                changed();
              } else {
                trying = { id, color: 0 };
                audio.sfx('blip');
              }
              render();
            },
          },
          h('img', { attrs: { src: itemThumb(id, color), alt: '' } }),
          own ? null : h('span', { class: 'wd-price' }, `${price(id) ?? '?'}🪙`),
          own && shop ? h('span', { class: 'wd-owned' }, '✓') : null,
        ),
      );
    }
    if (!ids.length) grid.appendChild(h('div', { class: 'wd-empty small' }, 'Nothing for this spot yet — adventures and Bramble’s shop have more!'));
    // colour swatches for the selected item
    const sel = trying ?? cur;
    if (sel) {
      const item = CLOTHES_BY_ID.get(sel.id) ?? BISCUIT_BY_ID.get(sel.id);
      if (item) {
        info.innerHTML = '';
        info.append(h('div', { class: 'wd-name' }, item.name, item.era ? h('span', { class: 'wd-era' }, eraLabel(item.era)) : null), h('div', { class: 'small' }, item.desc));
        item.colors.forEach(([main, accent], i) =>
          swatches.appendChild(
            h(
              'button',
              {
                class: `wd-swatch ${i === sel.color ? 'on' : ''}`,
                dataset: { nav: '' },
                attrs: { type: 'button', title: item.colorNames[i] ?? '', 'data-testid': `wd-color-${i}`, 'aria-label': item.colorNames[i] ?? `Colour ${i + 1}` },
                style: { background: `linear-gradient(135deg, ${main} 60%, ${accent} 60%)` },
                onclick: () => {
                  if (trying) trying = { ...trying, color: i };
                  else {
                    equip(d, who, sel.id, i);
                    changed();
                  }
                  audio.sfx('blip');
                  render();
                },
              },
            ),
          ),
        );
      }
    } else {
      info.innerHTML = '';
      info.append(h('div', { class: 'small' }, optional ? 'Nothing on — nice and simple!' : ''));
    }
    if (trying && shop) {
      const p = price(trying.id) ?? 0;
      const tryItem = trying;
      buyRow.append(
        button(
          `Buy for ${p} Tockens`,
          () => {
            const r = buy(d, tryItem.id);
            if (r === 'ok') {
              equip(d, who, tryItem.id, tryItem.color);
              trying = null;
              audio.sfx('coin');
              toast('Bought! Bramble wraps it up with a bow.', { icon: '🛍️' });
              changed();
            } else if (r === 'poor') {
              audio.sfx('error');
              toast('Not enough Tockens yet — Biscuit can dig up treasure to sell to Dr. Quill!', { icon: '🪙', ms: 3200 });
            }
            render();
          },
          { icon: '🛍️', cls: 'gold', testid: 'wd-buy' },
        ),
      );
    }
  };

  const renderLook = () => {
    if (who === 'biscuit') return;
    const look = d.players[who].look;
    info.innerHTML = '';
    info.append(h('div', { class: 'wd-name' }, 'Your look'), h('div', { class: 'small' }, 'Pick a skin tone, hair colour and hairstyle.'));
    const row = (label: string, items: HTMLElement[]) => h('div', { class: 'wd-look-row' }, h('div', { class: 'wd-look-label' }, label), h('div', { class: 'wd-look-opts' }, items));
    const w = who;
    const sw = (color: string, on: boolean, onClick: () => void, testid: string) =>
      h('button', { class: `wd-swatch round ${on ? 'on' : ''}`, dataset: { nav: '' }, attrs: { type: 'button', 'data-testid': testid }, style: { background: color }, onclick: () => (onClick(), audio.sfx('blip'), changed(), render()) });
    grid.append(
      row('Skin', SKIN_TONES.map((c, i) => sw(c, look.skin === i, () => setLook(d, w, { skin: i }), `wd-skin-${i}`))),
      row('Hair colour', HAIR_COLORS.map((c, i) => sw(c, look.hair === i, () => setLook(d, w, { hair: i }), `wd-hair-${i}`))),
      row(
        'Hairstyle',
        HAIR_STYLES.map((name, i) =>
          h('button', { class: `seg-btn ${look.hairStyle === i ? 'on' : ''}`, dataset: { nav: '' }, attrs: { type: 'button', 'data-testid': `wd-style-${i}` }, onclick: () => (setLook(d, w, { hairStyle: i }), audio.sfx('blip'), changed(), render()) }, name),
        ),
      ),
    );
  };

  const render = () => {
    coins.innerHTML = '';
    coins.append(h('img', { attrs: { src: iconUrl('tockens'), alt: '' } }), `${d.tockens}`);
    renderWho();
    renderSlots();
    renderGrid();
    redrawPreview();
  };

  const turn = (dir: number) => {
    const order: [Facing, boolean][] = [
      ['down', false],
      ['side', false],
      ['up', false],
      ['side', true],
    ];
    let i = order.findIndex(([f, fl]) => f === facing && fl === flip);
    i = (i + dir + order.length) % order.length;
    [facing, flip] = order[i];
    audio.sfx('blip');
    redrawPreview();
  };

  const close = () => {
    audio.sfx('close');
    ui.pop('wardrobe');
  };
  const panel = h(
    'div',
    { class: `panel wardrobe-panel ${shop ? 'shop' : ''}` },
    h('div', { class: 'wd-head' }, h('h2', null, shop ? '🧵 Bramble’s Stitch & Style' : '👗 Wardrobe'), coins),
    whoTabs,
    h(
      'div',
      { class: 'wd-body' },
      h(
        'div',
        { class: 'wd-left' },
        h('div', { class: 'wd-stage' }, preview),
        h(
          'div',
          { class: 'row center wd-turn' },
          button('↺', () => turn(-1), { cls: 'secondary small-btn', testid: 'wd-turn-left' }),
          button('🎲', () => {
            surprise(d, who);
            trying = null;
            audio.sfx('sparkle');
            changed();
            render();
          }, { cls: 'secondary small-btn', testid: 'wd-surprise' }),
          button('↻', () => turn(1), { cls: 'secondary small-btn', testid: 'wd-turn-right' }),
        ),
      ),
      h('div', { class: 'wd-right' }, slotTabs, grid, swatches, info),
    ),
    h('div', { class: 'row end wd-foot' }, buyRow, button('Done', close, { icon: '✔', testid: 'wardrobe-done' })),
  );
  ui.push({ id: 'wardrobe', el: h('div', { class: 'center-wrap backdrop' }, panel), onBack: close });
  audio.sfx('open');
  render();
}

function eraLabel(era: string): string {
  return { pirate: '🏴 Pirate era', egypt: '🔺 Ancient Egypt', fifties: '🎳 1950s', florence: '🎨 Renaissance' }[era] ?? '';
}

registerPauseEntry({ id: 'wardrobe', icon: '👗', label: 'Wardrobe', order: 15, open: () => openWardrobe() });
