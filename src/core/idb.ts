/** Minimal promise wrapper around IndexedDB (key/value object stores). */

export const DB_NAME = 'pawprints-through-time';
export const DB_VERSION = 1;
export const STORES = ['saves', 'meta'] as const;
export type StoreName = (typeof STORES)[number];

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export class KeyValueDB {
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(
    private name = DB_NAME,
    private factory: IDBFactory | undefined = typeof indexedDB !== 'undefined' ? indexedDB : undefined,
  ) {}

  get available(): boolean {
    return !!this.factory;
  }

  private open(): Promise<IDBDatabase> {
    if (!this.factory) return Promise.reject(new Error('IndexedDB is not available'));
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const r = this.factory!.open(this.name, DB_VERSION);
        r.onupgradeneeded = () => {
          const db = r.result;
          for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s);
        };
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
        r.onblocked = () => reject(new Error('IndexedDB open blocked'));
      });
    }
    return this.dbPromise;
  }

  async get<T>(store: StoreName, key: string): Promise<T | undefined> {
    const db = await this.open();
    return req<T>(db.transaction(store, 'readonly').objectStore(store).get(key) as IDBRequest<T>);
  }

  async put<T>(store: StoreName, key: string, value: T): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value, key);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('transaction aborted'));
    });
  }

  async delete(store: StoreName, key: string): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async keys(store: StoreName): Promise<string[]> {
    const db = await this.open();
    const keys = await req(db.transaction(store, 'readonly').objectStore(store).getAllKeys());
    return keys.map(String);
  }

  close(): void {
    this.dbPromise?.then((db) => db.close()).catch(() => undefined);
    this.dbPromise = null;
  }
}
