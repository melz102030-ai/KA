// ─── window.storage shim ─────────────────────────────────────────────────────
// The app expects an async key/value store at `window.storage` with the shape:
//   await window.storage.get(key)  -> { value: string } | null
//   await window.storage.set(key, value)
//   await window.storage.delete(key)
// Here we back it with localStorage so a plain browser build works offline.
// Swap this module for a real backend (API / IndexedDB) later without touching App.jsx.

const PREFIX = "akbadna:";

function makeStorage() {
  const mem = new Map(); // fallback when localStorage is unavailable (private mode, etc.)

  const readRaw = (key) => {
    try {
      return window.localStorage.getItem(PREFIX + key);
    } catch {
      return mem.has(key) ? mem.get(key) : null;
    }
  };

  return {
    async get(key) {
      const value = readRaw(key);
      return value === null || value === undefined ? null : { value };
    },
    async set(key, value) {
      const v = String(value);
      try {
        window.localStorage.setItem(PREFIX + key, v);
      } catch {
        mem.set(key, v);
      }
    },
    async delete(key) {
      try {
        window.localStorage.removeItem(PREFIX + key);
      } catch {
        mem.delete(key);
      }
    },
  };
}

if (typeof window !== "undefined" && !window.storage) {
  window.storage = makeStorage();
}
