/**
 * Storage Namespace Isolation for remoteStorage.js
 * 
 * ============================================================================
 * WHY THIS FILE EXISTS
 * ============================================================================
 * 
 * When multiple remoteStorage apps are hosted on the same domain (e.g., 
 * milkilabs.github.io/zikra and milkilabs.github.io/tasks), they share the 
 * same browser storage origin. This causes conflicts because remoteStorage.js 
 * uses hardcoded keys like "remotestorage:wireclient" for auth tokens.
 * 
 * When you sign into one app, it overwrites the other app's auth state,
 * effectively breaking the other app's connection.
 * 
 * This file patches the browser storage APIs to prefix all remoteStorage keys
 * with an app-specific namespace, isolating each app's data.
 * 
 * ============================================================================
 * WHAT IT PATCHES
 * ============================================================================
 * 
 * - localStorage: All keys starting with "remotestorage:" get prefixed
 * - sessionStorage: All keys starting with "remotestorage:" get prefixed  
 * - IndexedDB: The "remotestorage" database gets renamed
 * - BroadcastChannel: The "remotestorage:changes" channel gets renamed
 * 
 * ============================================================================
 * HOW TO REMOVE THIS
 * ============================================================================
 * 
 * If remoteStorage.js adds native namespace support, or if you move to a 
 * different domain/subdomain, you can safely delete this file and remove
 * its import from the app entry point.
 * 
 * Steps to remove:
 * 1. Delete this file (src/lib/storageNamespace.ts)
 * 2. Remove the import from src/index.tsx (or wherever it's imported)
 * 3. Clear browser storage for affected users (they'll need to re-authenticate)
 * 
 * ============================================================================
 * CONFIGURATION
 * ============================================================================
 */

/** 
 * Unique namespace for this app. Change this value for each app on the same domain.
 * 
 * For example:
 * - zikra app: 'zikra'
 * - tasks app: 'tasks'
 */
const APP_NAMESPACE = 'tasks';

/**
 * Prefix added to all remoteStorage storage keys
 */
const STORAGE_PREFIX = `${APP_NAMESPACE}:`;

/**
 * The key prefix that remoteStorage.js uses for all its storage
 */
const RS_KEY_PREFIX = 'remotestorage:';
const RS_KEY_REGEX = /^remotestorage:/;

/**
 * Check if a key is a remoteStorage key that needs namespacing
 */
function isRemoteStorageKey(key: string): boolean {
  return RS_KEY_REGEX.test(key);
}

/**
 * Add namespace prefix to a remoteStorage key
 */
function addNamespace(key: string): string {
  return STORAGE_PREFIX + key;
}

/**
 * Remove namespace prefix from a key (for iteration)
 */
function removeNamespace(key: string): string {
  if (key.startsWith(STORAGE_PREFIX + RS_KEY_PREFIX)) {
    return key.slice(STORAGE_PREFIX.length);
  }
  return key;
}

// ============================================================================
// PATCH localStorage
// ============================================================================

const originalLocalStorage = {
  getItem: localStorage.getItem.bind(localStorage),
  setItem: localStorage.setItem.bind(localStorage),
  removeItem: localStorage.removeItem.bind(localStorage),
  key: localStorage.key.bind(localStorage),
};

localStorage.getItem = function(key: string): string | null {
  if (isRemoteStorageKey(key)) {
    return originalLocalStorage.getItem(addNamespace(key));
  }
  return originalLocalStorage.getItem(key);
};

localStorage.setItem = function(key: string, value: string): void {
  if (isRemoteStorageKey(key)) {
    return originalLocalStorage.setItem(addNamespace(key), value);
  }
  return originalLocalStorage.setItem(key, value);
};

localStorage.removeItem = function(key: string): void {
  if (isRemoteStorageKey(key)) {
    return originalLocalStorage.removeItem(addNamespace(key));
  }
  return originalLocalStorage.removeItem(key);
};

// Also handle delete localStorage[key] syntax used by remoteStorage
const localStorageProxy = new Proxy(localStorage, {
  deleteProperty(_target, prop: string) {
    if (isRemoteStorageKey(prop)) {
      originalLocalStorage.removeItem(addNamespace(prop));
    } else {
      originalLocalStorage.removeItem(prop);
    }
    return true;
  },
  get(target, prop: string) {
    if (prop === 'getItem' || prop === 'setItem' || prop === 'removeItem' || prop === 'key') {
      return target[prop];
    }
    if (typeof prop === 'string' && isRemoteStorageKey(prop)) {
      return originalLocalStorage.getItem(addNamespace(prop));
    }
    return target[prop];
  },
  set(target, prop: string, value) {
    if (typeof prop === 'string' && isRemoteStorageKey(prop)) {
      originalLocalStorage.setItem(addNamespace(prop), value);
    } else {
      target[prop] = value;
    }
    return true;
  }
});

// Replace global localStorage with proxy
Object.defineProperty(window, 'localStorage', {
  value: localStorageProxy,
  writable: false,
  configurable: true
});

// ============================================================================
// PATCH sessionStorage
// ============================================================================

const originalSessionStorage = {
  getItem: sessionStorage.getItem.bind(sessionStorage),
  setItem: sessionStorage.setItem.bind(sessionStorage),
  removeItem: sessionStorage.removeItem.bind(sessionStorage),
};

sessionStorage.getItem = function(key: string): string | null {
  if (isRemoteStorageKey(key)) {
    return originalSessionStorage.getItem(addNamespace(key));
  }
  return originalSessionStorage.getItem(key);
};

sessionStorage.setItem = function(key: string, value: string): void {
  if (isRemoteStorageKey(key)) {
    return originalSessionStorage.setItem(addNamespace(key), value);
  }
  return originalSessionStorage.setItem(key, value);
};

sessionStorage.removeItem = function(key: string): void {
  if (isRemoteStorageKey(key)) {
    return originalSessionStorage.removeItem(addNamespace(key));
  }
  return originalSessionStorage.removeItem(key);
};

// ============================================================================
// PATCH IndexedDB
// ============================================================================

const RS_DB_NAME = 'remotestorage';
const NAMESPACED_DB_NAME = `${APP_NAMESPACE}-remotestorage`;

const originalIndexedDBOpen = indexedDB.open.bind(indexedDB);
const originalIndexedDBDeleteDatabase = indexedDB.deleteDatabase.bind(indexedDB);

indexedDB.open = function(name: string, version?: number): IDBOpenDBRequest {
  if (name === RS_DB_NAME) {
    name = NAMESPACED_DB_NAME;
  }
  return version !== undefined 
    ? originalIndexedDBOpen(name, version) 
    : originalIndexedDBOpen(name);
};

indexedDB.deleteDatabase = function(name: string): IDBOpenDBRequest {
  if (name === RS_DB_NAME) {
    name = NAMESPACED_DB_NAME;
  }
  return originalIndexedDBDeleteDatabase(name);
};

// ============================================================================
// PATCH BroadcastChannel
// ============================================================================

const RS_CHANNEL_NAME = 'remotestorage:changes';
const NAMESPACED_CHANNEL_NAME = `${APP_NAMESPACE}:remotestorage:changes`;

const OriginalBroadcastChannel = window.BroadcastChannel;

window.BroadcastChannel = class NamespacedBroadcastChannel extends OriginalBroadcastChannel {
  constructor(name: string) {
    if (name === RS_CHANNEL_NAME) {
      name = NAMESPACED_CHANNEL_NAME;
    }
    super(name);
  }
} as typeof BroadcastChannel;

// ============================================================================
// EXPORT FOR DEBUGGING
// ============================================================================

/**
 * Exported for debugging purposes. You can check the namespace in the console:
 * 
 * ```js
 * import { STORAGE_NAMESPACE } from './lib/storageNamespace';
 * console.log('App namespace:', STORAGE_NAMESPACE);
 * ```
 */
export const STORAGE_NAMESPACE = APP_NAMESPACE;

// Log that namespacing is active (helpful for debugging)
if (import.meta.env.DEV) {
  console.log(`[storageNamespace] Active with namespace: "${APP_NAMESPACE}"`);
}
