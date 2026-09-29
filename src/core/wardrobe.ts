import type { SaveData, OutfitSlot, BiscuitSlot, Look } from './state';
import { SKIN_TONES, HAIR_COLORS, HAIR_STYLE_COUNT } from './state';
import { CLOTHES_BY_ID, BISCUIT_BY_ID, CLOTHES, BISCUIT_ITEMS } from '../data/clothes';

/**
 * Wardrobe rules (pure): what you own, what you wear, buying from Bramble.
 * Owned clothes are shared by the household — both players can wear anything the family owns.
 */
export type Wearer = 0 | 1 | 'biscuit';

export function owns(d: SaveData, id: string): boolean {
  return d.wardrobe.includes(id);
}

/** Add an item to the family wardrobe. Returns true if it was new. */
export function grant(d: SaveData, id: string): boolean {
  if (!CLOTHES_BY_ID.has(id) && !BISCUIT_BY_ID.has(id)) return false;
  if (d.wardrobe.includes(id)) return false;
  d.wardrobe.push(id);
  return true;
}

export function colorCount(id: string): number {
  return (CLOTHES_BY_ID.get(id) ?? BISCUIT_BY_ID.get(id))?.colors.length ?? 0;
}

/** Put an owned item on a player (or Biscuit). The item's slot decides where it goes. */
export function equip(d: SaveData, who: Wearer, id: string, color = 0): boolean {
  if (!owns(d, id)) return false;
  const c = Math.max(0, Math.min(color, colorCount(id) - 1));
  if (who === 'biscuit') {
    const item = BISCUIT_BY_ID.get(id);
    if (!item) return false;
    d.biscuit.outfit[item.slot] = { id, color: c };
    return true;
  }
  const item = CLOTHES_BY_ID.get(id);
  if (!item) return false;
  d.players[who].outfit[item.slot] = { id, color: c };
  return true;
}

export function unequip(d: SaveData, who: Wearer, slot: OutfitSlot | BiscuitSlot): void {
  if (who === 'biscuit') {
    if (slot === 'hat' || slot === 'neck') d.biscuit.outfit[slot] = null;
    return;
  }
  // everyone keeps at least a top, bottoms and shoes (cozy, not cold!)
  if (slot === 'top' || slot === 'bottom' || slot === 'shoes') return;
  d.players[who].outfit[slot as OutfitSlot] = null;
}

export function worn(d: SaveData, who: Wearer, slot: OutfitSlot | BiscuitSlot): { id: string; color: number } | null {
  if (who === 'biscuit') return d.biscuit.outfit[slot as BiscuitSlot] ?? null;
  return d.players[who].outfit[slot as OutfitSlot] ?? null;
}

export type BuyResult = 'ok' | 'owned' | 'poor' | 'unknown' | 'not-for-sale';

export function price(id: string): number | null {
  const it = CLOTHES_BY_ID.get(id) ?? BISCUIT_BY_ID.get(id);
  return it && it.source === 'shop' && it.price ? it.price : null;
}

/** Buy from Bramble's shop with Tockens. */
export function buy(d: SaveData, id: string): BuyResult {
  const it = CLOTHES_BY_ID.get(id) ?? BISCUIT_BY_ID.get(id);
  if (!it) return 'unknown';
  if (owns(d, id)) return 'owned';
  const p = price(id);
  if (p === null) return 'not-for-sale';
  if (d.tockens < p) return 'poor';
  d.tockens -= p;
  d.wardrobe.push(id);
  return 'ok';
}

export function setLook(d: SaveData, who: 0 | 1, patch: Partial<Look>): void {
  const look = d.players[who].look;
  if (patch.skin !== undefined) look.skin = ((patch.skin % SKIN_TONES.length) + SKIN_TONES.length) % SKIN_TONES.length;
  if (patch.hair !== undefined) look.hair = ((patch.hair % HAIR_COLORS.length) + HAIR_COLORS.length) % HAIR_COLORS.length;
  if (patch.hairStyle !== undefined) look.hairStyle = ((patch.hairStyle % HAIR_STYLE_COUNT) + HAIR_STYLE_COUNT) % HAIR_STYLE_COUNT;
}

/** Items a wearer can choose from for a slot (owned only). */
export function ownedFor(d: SaveData, who: Wearer, slot: OutfitSlot | BiscuitSlot): string[] {
  if (who === 'biscuit') return BISCUIT_ITEMS.filter((i) => i.slot === slot && owns(d, i.id)).map((i) => i.id);
  return CLOTHES.filter((i) => i.slot === slot && owns(d, i.id)).map((i) => i.id);
}

/** "Surprise me!" — a random outfit from what's owned (deterministic with a given rng). */
export function surprise(d: SaveData, who: Wearer, r: () => number = Math.random): void {
  const slots: (OutfitSlot | BiscuitSlot)[] = who === 'biscuit' ? ['hat', 'neck'] : ['hat', 'top', 'bottom', 'shoes', 'acc'];
  for (const slot of slots) {
    const opts = ownedFor(d, who, slot);
    const optional = slot === 'hat' || slot === 'acc' || slot === 'neck';
    const pickNone = optional && r() < 0.25;
    if (!opts.length || pickNone) {
      if (optional) unequip(d, who, slot);
      continue;
    }
    const id = opts[Math.floor(r() * opts.length)];
    equip(d, who, id, Math.floor(r() * colorCount(id)));
  }
}
