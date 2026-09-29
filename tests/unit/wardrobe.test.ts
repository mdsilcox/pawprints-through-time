import { describe, it, expect } from 'vitest';
import { CLOTHES, BISCUIT_ITEMS, specForPlayer, lookKey, eraPieces } from '../../src/data/clothes';
import { defaultSave } from '../../src/core/state';
import { buy, equip, grant, owns, setLook, surprise, unequip, worn, price, ownedFor } from '../../src/core/wardrobe';
import { hasAcc, hasHat } from '../../src/art/character';
import '../../src/art/items';

const TOP_KINDS = ['tee', 'hoodie', 'cardigan', 'coat', 'shirt', 'sailor', 'tunic', 'bowling', 'jacket', 'doublet', 'smock', 'vest'];
const BOTTOM_KINDS = ['shorts', 'pants', 'skirt', 'pleated', 'pantaloons', 'shendyt', 'poodle', 'jeans', 'breeches', 'cuffed', 'hose'];
const SHOE_KINDS = ['sneakers', 'rainboots', 'boots', 'sandals', 'buckle', 'saddle', 'skates', 'slippers'];

describe('clothing catalogue', () => {
  it('has 30+ player items across every slot, with unique ids', () => {
    expect(CLOTHES.length).toBeGreaterThanOrEqual(30);
    const ids = new Set(CLOTHES.map((c) => c.id));
    expect(ids.size).toBe(CLOTHES.length);
    for (const slot of ['hat', 'top', 'bottom', 'shoes', 'acc'] as const) expect(CLOTHES.filter((c) => c.slot === slot).length).toBeGreaterThanOrEqual(5);
  });

  it('includes the spec’s era pieces (tricorn, shendyt, poodle skirt, Renaissance cap) for all four eras', () => {
    for (const id of ['tricorn', 'shendyt', 'poodle-skirt', 'florentine-cap']) expect(CLOTHES.some((c) => c.id === id)).toBe(true);
    for (const era of ['pirate', 'egypt', 'fifties', 'florence']) expect(CLOTHES.filter((c) => c.era === era).length).toBeGreaterThanOrEqual(3);
  });

  it('every item has named colour variants and a drawable kind', () => {
    for (const c of CLOTHES) {
      expect(c.colors.length).toBeGreaterThan(0);
      expect(c.colorNames.length).toBe(c.colors.length);
      if (c.slot === 'hat') expect(hasHat(c.kind), c.id).toBe(true);
      if (c.slot === 'acc') expect(hasAcc(c.kind), c.id).toBe(true);
      if (c.slot === 'top') expect(TOP_KINDS, c.id).toContain(c.kind);
      if (c.slot === 'bottom') expect(BOTTOM_KINDS, c.id).toContain(c.kind);
      if (c.slot === 'shoes') expect(SHOE_KINDS, c.id).toContain(c.kind);
      if (c.source === 'shop') expect(c.price, c.id).toBeGreaterThan(0);
    }
  });

  it('Biscuit has a wardrobe too: a bandana, a tiny pirate hat and a party bow', () => {
    for (const id of ['biscuit-bandana', 'pirate-hat', 'party-bow']) expect(BISCUIT_ITEMS.some((b) => b.id === id)).toBe(true);
    for (const slot of ['hat', 'neck'] as const) expect(BISCUIT_ITEMS.filter((b) => b.slot === slot).length).toBeGreaterThanOrEqual(3);
  });
});

describe('wardrobe rules', () => {
  it('starts with a wearable outfit for both players and several owned pieces per slot', () => {
    const d = defaultSave();
    for (const who of [0, 1] as const) for (const slot of ['top', 'bottom', 'shoes'] as const) expect(worn(d, who, slot)).not.toBeNull();
    for (const slot of ['hat', 'top', 'bottom', 'acc'] as const) expect(ownedFor(d, 0, slot).length).toBeGreaterThanOrEqual(2);
    expect(worn(d, 'biscuit', 'neck')?.id).toBe('biscuit-bandana');
  });

  it('equips only owned items, into the right slot, with a clamped colour', () => {
    const d = defaultSave();
    expect(equip(d, 0, 'tricorn')).toBe(false); // not owned yet
    grant(d, 'tricorn');
    expect(equip(d, 0, 'tricorn', 99)).toBe(true);
    expect(d.players[0].outfit.hat).toEqual({ id: 'tricorn', color: 2 });
    expect(d.players[1].outfit.hat?.id).not.toBe('tricorn'); // player 2 unchanged
    equip(d, 1, 'skirt', 1);
    expect(d.players[1].outfit.bottom).toEqual({ id: 'skirt', color: 1 });
  });

  it('can take off hats and extras, but never tops, bottoms or shoes', () => {
    const d = defaultSave();
    equip(d, 0, 'sunhat');
    unequip(d, 0, 'hat');
    expect(d.players[0].outfit.hat).toBeNull();
    unequip(d, 0, 'top');
    expect(d.players[0].outfit.top).not.toBeNull();
    unequip(d, 'biscuit', 'neck');
    expect(d.biscuit.outfit.neck).toBeNull();
  });

  it('buys from Bramble with Tockens (and refuses when you can’t afford it)', () => {
    const d = defaultSave();
    d.tockens = 40;
    expect(price('cardigan')).toBe(35);
    expect(buy(d, 'cardigan')).toBe('ok');
    expect(d.tockens).toBe(5);
    expect(owns(d, 'cardigan')).toBe(true);
    expect(buy(d, 'cardigan')).toBe('owned');
    expect(buy(d, 'raincoat')).toBe('poor');
    expect(owns(d, 'raincoat')).toBe(false);
    expect(buy(d, 'tricorn')).toBe('not-for-sale'); // earned on an adventure
  });

  it('changes looks with wrap-around, and the look shows up in the sprite key', () => {
    const d = defaultSave();
    const before = lookKey(d.players[0]);
    setLook(d, 0, { skin: 3, hair: 5, hairStyle: 4 });
    expect(d.players[0].look).toEqual({ skin: 3, hair: 5, hairStyle: 4 });
    expect(lookKey(d.players[0])).not.toBe(before);
    setLook(d, 0, { hairStyle: -1 });
    expect(d.players[0].look.hairStyle).toBe(5);
    const spec = specForPlayer(d.players[0]);
    expect(spec.hairStyle).toBe(5);
    expect(spec.outfit.top?.kind).toBe('tee');
  });

  it('"Surprise me" only uses owned clothes and keeps the essentials on', () => {
    const d = defaultSave();
    let seed = 1;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 20; i++) {
      surprise(d, 0, r);
      for (const slot of ['hat', 'top', 'bottom', 'shoes', 'acc'] as const) {
        const w = worn(d, 0, slot);
        if (w) expect(owns(d, w.id)).toBe(true);
      }
      expect(worn(d, 0, 'top')).not.toBeNull();
    }
  });

  it('counts period-appropriate pieces (for era reactions and disguises)', () => {
    const d = defaultSave();
    grant(d, 'deckhand-bandana');
    grant(d, 'sailor-shirt');
    equip(d, 0, 'deckhand-bandana');
    equip(d, 0, 'sailor-shirt');
    expect(eraPieces(d.players[0].outfit, 'pirate')).toBe(2);
    expect(eraPieces(d.players[1].outfit, 'pirate')).toBe(0);
  });
});
