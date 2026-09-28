import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { KeyValueDB } from '../../src/core/idb';
import { AutoSaver, IdbSaveBackend, MemorySaveBackend, SaveManager, SLOT_COUNT } from '../../src/core/save';
import { defaultSave, migrateSave, summarize } from '../../src/core/state';

describe('SaveManager (memory backend)', () => {
  it('round-trips a save through a slot', async () => {
    const mgr = new SaveManager(new MemorySaveBackend());
    const data = defaultSave();
    data.flags.metPip = true;
    data.inventory.carrot = 3;
    data.players[0].name = 'Robin';
    await mgr.save(2, data, 1234);
    const loaded = await mgr.load(2);
    expect(loaded).not.toBeNull();
    expect(loaded!.flags.metPip).toBe(true);
    expect(loaded!.inventory.carrot).toBe(3);
    expect(loaded!.players[0].name).toBe('Robin');
    expect(loaded!.updatedAt).toBe(1234);
  });

  it('keeps slots independent and lists summaries for every slot', async () => {
    const mgr = new SaveManager(new MemorySaveBackend());
    const a = defaultSave();
    a.sands = ['pirate'];
    a.bunnies = ['skipper', 'coco'];
    await mgr.save(1, a);
    const list = await mgr.list();
    expect(list).toHaveLength(SLOT_COUNT);
    expect(list[0]).toMatchObject({ slot: 1, exists: true, sands: 1, bunnies: 2 });
    expect(list[1].exists).toBe(false);
    expect(list[2].exists).toBe(false);
    expect(await mgr.load(3)).toBeNull();
  });

  it('continues from the last played slot', async () => {
    const mgr = new SaveManager(new MemorySaveBackend());
    expect(await mgr.continueSlot()).toBeNull();
    await mgr.save(3, defaultSave(), 100);
    await mgr.save(1, defaultSave(), 50);
    expect(await mgr.continueSlot()).toBe(1); // most recently *written* slot wins
    await mgr.delete(1);
    expect(await mgr.continueSlot()).toBe(3);
  });

  it('rejects invalid slots', async () => {
    const mgr = new SaveManager(new MemorySaveBackend());
    await expect(mgr.save(0, defaultSave())).rejects.toThrow();
    await expect(mgr.load(SLOT_COUNT + 1)).rejects.toThrow();
  });

  it('stores a snapshot, not a live reference', async () => {
    const mgr = new SaveManager(new MemorySaveBackend());
    const data = defaultSave();
    await mgr.save(1, data);
    data.tockens = 999;
    expect((await mgr.load(1))!.tockens).not.toBe(999);
  });
});

describe('SaveManager (IndexedDB backend)', () => {
  it('persists across database re-opens (like a page reload)', async () => {
    const factory = new IDBFactory();
    const first = new SaveManager(new IdbSaveBackend(new KeyValueDB('test-db', factory)));
    const data = defaultSave();
    data.day = 7;
    data.recipes = ['glowbroth'];
    await first.save(2, data);

    const second = new SaveManager(new IdbSaveBackend(new KeyValueDB('test-db', factory)));
    const loaded = await second.load(2);
    expect(loaded?.day).toBe(7);
    expect(loaded?.recipes).toEqual(['glowbroth']);
    expect(await second.lastSlot()).toBe(2);
  });

  it('deletes a slot', async () => {
    const factory = new IDBFactory();
    const mgr = new SaveManager(new IdbSaveBackend(new KeyValueDB('test-db-2', factory)));
    await mgr.save(1, defaultSave());
    await mgr.delete(1);
    expect(await mgr.load(1)).toBeNull();
  });
});

describe('migrateSave', () => {
  it('fills fields missing from an older save and keeps existing ones', () => {
    const old = { version: 0, day: 12, flags: { a: true }, inventory: { shell: 2 }, players: [{ name: 'Kit' }] };
    const m = migrateSave(old);
    expect(m.day).toBe(12);
    expect(m.flags).toEqual({ a: true });
    expect(m.inventory).toEqual({ shell: 2 });
    expect(m.players[0].name).toBe('Kit');
    expect(m.players[0].outfit.top?.id).toBe('tee-striped'); // filled from defaults
    expect(m.players[1].name).toBe('Player 2');
    expect(Array.isArray(m.bunnies)).toBe(true);
    expect(m.garden).toHaveLength(4);
    expect(m.version).toBe(defaultSave().version);
  });

  it('recovers from garbage', () => {
    expect(migrateSave(null).day).toBe(1);
    expect(migrateSave('nope').players).toHaveLength(2);
    const m = migrateSave({ day: 'banana', bunnies: 'x' });
    expect(m.day).toBe(1);
    expect(m.bunnies).toEqual([]);
  });

  it('keeps unequipped (null) outfit slots null', () => {
    const d = defaultSave();
    d.players[0].outfit.top = null;
    const m = migrateSave(JSON.parse(JSON.stringify(d)));
    expect(m.players[0].outfit.top).toBeNull();
  });
});

describe('summarize', () => {
  it('describes empty and used slots', () => {
    expect(summarize(1, null).exists).toBe(false);
    const d = defaultSave();
    d.location.map = 'pirate-cove';
    expect(summarize(2, d)).toMatchObject({ slot: 2, exists: true, location: 'pirate-cove', day: 1 });
  });
});

describe('AutoSaver', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('coalesces a burst of change requests into one write', async () => {
    const write = vi.fn(async () => undefined);
    let now = 0;
    const saver = new AutoSaver(write, { debounceMs: 1000, intervalMs: 60_000, now: () => now });
    saver.request();
    saver.request();
    saver.request();
    expect(write).not.toHaveBeenCalled();
    now = 1000;
    await vi.advanceTimersByTimeAsync(1000);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('saves periodically via tick() and immediately via flush()', async () => {
    const write = vi.fn(async () => undefined);
    let now = 0;
    const saver = new AutoSaver(write, { debounceMs: 1000, intervalMs: 60_000, now: () => now });
    now = 30_000;
    saver.tick();
    expect(write).not.toHaveBeenCalled();
    now = 61_000;
    saver.tick();
    await vi.advanceTimersByTimeAsync(0);
    expect(write).toHaveBeenCalledTimes(1);
    await saver.flush();
    expect(write).toHaveBeenCalledTimes(2);
    expect(saver.saves).toBe(2);
  });
});
