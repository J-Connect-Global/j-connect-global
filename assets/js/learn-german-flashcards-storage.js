(function initializeFlashcardStorage(window) {
  "use strict";

  const DB_NAME = "jconnect-learn-german";
  const DB_VERSION = 1;
  const FALLBACK_KEY = "jconnect-flashcards-fallback-v1";
  const STORES = ["progress", "sessions"];
  let databasePromise;

  function readFallback() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(FALLBACK_KEY) || "{}");
      return {
        progress: parsed.progress && typeof parsed.progress === "object" ? parsed.progress : {},
        sessions: parsed.sessions && typeof parsed.sessions === "object" ? parsed.sessions : {}
      };
    } catch {
      return { progress: {}, sessions: {} };
    }
  }

  function writeFallback(value) {
    window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(value));
  }

  function fallbackKey(storeName, value) {
    return storeName === "progress" ? value.card_id : value.deck_id;
  }

  function openDatabase() {
    if (!("indexedDB" in window)) return Promise.reject(new Error("IndexedDB is unavailable."));
    if (databasePromise) return databasePromise;

    databasePromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains("progress")) {
          const progressStore = database.createObjectStore("progress", { keyPath: "card_id" });
          progressStore.createIndex("status", "status", { unique: false });
          progressStore.createIndex("next_review", "next_review", { unique: false });
        }
        if (!database.objectStoreNames.contains("sessions")) {
          database.createObjectStore("sessions", { keyPath: "deck_id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("IndexedDB could not be opened."));
      request.onblocked = () => reject(new Error("IndexedDB upgrade was blocked."));
    });
    return databasePromise;
  }

  function requestPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
    });
  }

  async function indexedOperation(storeName, mode, operation) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      let result;
      try {
        result = operation(store);
      } catch (error) {
        reject(error);
        return;
      }
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed."));
      transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction was aborted."));
    });
  }

  async function getAll(storeName) {
    try {
      const database = await openDatabase();
      const transaction = database.transaction(storeName, "readonly");
      return await requestPromise(transaction.objectStore(storeName).getAll());
    } catch {
      return Object.values(readFallback()[storeName]);
    }
  }

  async function get(storeName, key) {
    try {
      const database = await openDatabase();
      const transaction = database.transaction(storeName, "readonly");
      return await requestPromise(transaction.objectStore(storeName).get(key));
    } catch {
      return readFallback()[storeName][key];
    }
  }

  async function put(storeName, value) {
    try {
      await indexedOperation(storeName, "readwrite", store => store.put(value));
    } catch {
      const fallback = readFallback();
      fallback[storeName][fallbackKey(storeName, value)] = value;
      writeFallback(fallback);
    }
    return value;
  }

  async function remove(storeName, key) {
    try {
      await indexedOperation(storeName, "readwrite", store => store.delete(key));
    } catch {
      const fallback = readFallback();
      delete fallback[storeName][key];
      writeFallback(fallback);
    }
  }

  async function clearAll() {
    try {
      const database = await openDatabase();
      await new Promise((resolve, reject) => {
        const transaction = database.transaction(STORES, "readwrite");
        STORES.forEach(storeName => transaction.objectStore(storeName).clear());
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error || new Error("IndexedDB clear failed."));
        transaction.onabort = () => reject(transaction.error || new Error("IndexedDB clear was aborted."));
      });
    } catch {
      window.localStorage.removeItem(FALLBACK_KEY);
    }
  }

  async function replaceAll(payload) {
    const progress = Array.isArray(payload.progress) ? payload.progress : [];
    const sessions = Array.isArray(payload.sessions) ? payload.sessions : [];
    try {
      const database = await openDatabase();
      await new Promise((resolve, reject) => {
        const transaction = database.transaction(STORES, "readwrite");
        const progressStore = transaction.objectStore("progress");
        const sessionStore = transaction.objectStore("sessions");
        progressStore.clear();
        sessionStore.clear();
        progress.forEach(entry => progressStore.put(entry));
        sessions.forEach(entry => sessionStore.put(entry));
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error || new Error("IndexedDB restore failed."));
        transaction.onabort = () => reject(transaction.error || new Error("IndexedDB restore was aborted."));
      });
    } catch {
      writeFallback({
        progress: Object.fromEntries(progress.map(entry => [entry.card_id, entry])),
        sessions: Object.fromEntries(sessions.map(entry => [entry.deck_id, entry]))
      });
    }
  }

  window.JConnectFlashcardStorage = Object.freeze({
    schemaVersion: DB_VERSION,
    backend: "indexedDB" in window ? "indexeddb" : "localstorage-fallback",
    getAllProgress: () => getAll("progress"),
    getProgress: cardId => get("progress", cardId),
    putProgress: value => put("progress", value),
    getAllSessions: () => getAll("sessions"),
    getSession: deckId => get("sessions", deckId),
    putSession: value => put("sessions", value),
    deleteSession: deckId => remove("sessions", deckId),
    clearAll,
    replaceAll
  });
})(window);
