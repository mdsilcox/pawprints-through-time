import { KeyValueDB } from './idb';
import { migrateSave, summarize, type SaveData, type SlotSummary } from './state';

export const SLOT_COUNT = 3;

/** Storage backend (IndexedDB in the game, an in-memory map in some tests). */
export interface SaveBackend {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  getMeta(key: string): Promise<unknown>;
  putMeta(key: string, value: unknown): Promise<void>;
}

export class IdbSaveBackend implements SaveBackend {
  constructor(private db = new KeyValueDB()) {}
  get(key: string) {
    return this.db.get('saves', key);
  }
  put(key: string, value: unknown) {
    return this.db.put('saves', key, value);
  }
  delete(key: string) {
    return this.db.delete('saves', key);
  }
  getMeta(key: string) {
    return this.db.get('meta', key);
  }
  putMeta(key: string, value: unknown) {
    return this.db.put('meta', key, value);
  }
}

export class MemorySaveBackend implements SaveBackend {
  saves = new Map<string, unknown>();
  meta = new Map<string, unknown>();
  async get(key: string) {
    return structuredClone(this.saves.get(key));
  }
  async put(key: string, value: unknown) {
    this.saves.set(key, structuredClone(value));
  }
  async delete(key: string) {
    this.saves.delete(key);
  }
  async getMeta(key: string) {
    return structuredClone(this.meta.get(key));
  }
  async putMeta(key: string, value: unknown) {
    this.meta.set(key, structuredClone(value));
  }
}

const slotKey = (slot: number) => `slot-${slot}`;

function assertSlot(slot: number) {
  if (!Number.isInteger(slot) || slot < 1 || slot > SLOT_COUNT) throw new Error(`Invalid save slot ${slot}`);
}

/** Multiple save slots with a remembered "last played" slot. */
export class SaveManager {
  constructor(private backend: SaveBackend = new IdbSaveBackend()) {}

  async load(slot: number): Promise<SaveData | null> {
    assertSlot(slot);
    const raw = await this.backend.get(slotKey(slot));
    if (raw === undefined || raw === null) return null;
    return migrateSave(raw);
  }

  async save(slot: number, data: SaveData, now = Date.now()): Promise<void> {
    assertSlot(slot);
    data.updatedAt = now;
    // Store a plain structured clone so later in-memory mutation never races the write.
    await this.backend.put(slotKey(slot), structuredClone(data));
    await this.backend.putMeta('lastSlot', slot);
  }

  async delete(slot: number): Promise<void> {
    assertSlot(slot);
    await this.backend.delete(slotKey(slot));
  }

  async list(): Promise<SlotSummary[]> {
    const out: SlotSummary[] = [];
    for (let s = 1; s <= SLOT_COUNT; s++) {
      let data: SaveData | null = null;
      try {
        data = await this.load(s);
      } catch (err) {
        console.warn('[save] could not read slot', s, err);
      }
      out.push(summarize(s, data));
    }
    return out;
  }

  async lastSlot(): Promise<number | null> {
    const v = await this.backend.getMeta('lastSlot');
    return typeof v === 'number' && v >= 1 && v <= SLOT_COUNT ? v : null;
  }

  /** The slot to "Continue" from: the last one played, or the most recently updated one. */
  async continueSlot(): Promise<number | null> {
    const list = await this.list();
    const last = await this.lastSlot();
    if (last && list[last - 1]?.exists) return last;
    const existing = list.filter((s) => s.exists).sort((a, b) => b.updatedAt - a.updatedAt);
    return existing[0]?.slot ?? null;
  }
}

/**
 * Debounced autosaver: `request()` coalesces bursts of changes into one write, `flush()` writes now.
 * The owner also calls `tick()` periodically so play is saved at least every `intervalMs`.
 */
export class AutoSaver {
  private pending = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastSave = 0;
  private writing: Promise<void> | null = null;
  saves = 0;

  constructor(
    private write: () => Promise<void>,
    private opts: { debounceMs: number; intervalMs: number; now: () => number } = {
      debounceMs: 1500,
      intervalMs: 60_000,
      now: () => Date.now(),
    },
  ) {
    this.lastSave = opts.now();
  }

  request(): void {
    this.pending = true;
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.opts.debounceMs);
  }

  tick(): void {
    if (this.opts.now() - this.lastSave >= this.opts.intervalMs) void this.flush();
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.writing) await this.writing;
    this.pending = false;
    this.lastSave = this.opts.now();
    this.writing = this.write()
      .then(() => {
        this.saves++;
      })
      .catch((err) => console.error('[autosave] failed', err))
      .finally(() => {
        this.writing = null;
      });
    await this.writing;
  }

  get hasPending(): boolean {
    return this.pending;
  }

  cancel(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.pending = false;
  }
}
