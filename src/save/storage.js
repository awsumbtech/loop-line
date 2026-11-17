// Where saves are kept. Both kinds have the same three methods, so either can
// be handed to the SaveManager.

// The browser's local storage. Never throws: some browsers block storage.
export class BrowserStorage {
  read(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  write(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* not saved */ } }
  remove(key) { try { localStorage.removeItem(key); } catch (e) { /* ignore */ } }
}

// Keeps saves in memory, for tests.
export class MemoryStorage {
  constructor() { this.data = new Map(); }
  read(key) { return this.data.has(key) ? this.data.get(key) : null; }
  write(key, value) { this.data.set(key, value); }
  remove(key) { this.data.delete(key); }
}
