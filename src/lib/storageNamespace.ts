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
 * Check if a key is a remoteStorage key that needs namespacing
 */
function isRemoteStorageKey(key: string): boolean {
  return typeof key === 'string' && key.startsWith('remotestorage:');
}

/**
 * Add namespace prefix to a remoteStorage key
 */
function addNamespace(key: string): string {
  return STORAGE_PREFIX + key;
}

// ============================================================================
// PATCH localStorage
// ============================================================================

const _lsGetItem = localStorage.getItem.bind(localStorage);
const _lsSetItem = localStorage.setItem.bind(localStorage);
const _lsRemoveItem = localStorage.removeItem.bind(localStorage);

localStorage.getItem = function(key: string): string | null {
  if (isRemoteStorageKey(key)) {
    return _lsGetItem(addNamespace(key));
  }
  return _lsGetItem(key);
};

localStorage.setItem = function(key: string, value: string): void {
  if (isRemoteStorageKey(key)) {
    return _lsSetItem(addNamespace(key), value);
  }
  return _lsSetItem(key, value);
};

localStorage.removeItem = function(key: string): void {
  if (isRemoteStorageKey(key)) {
    return _lsRemoveItem(addNamespace(key));
  }
  return _lsRemoveItem(key);
};

// Handle `delete localStorage[key]` syntax used by remoteStorage's wireclient
const _origLocalStorage = window.localStorage;
const localStorageProxy = new Proxy(_origLocalStorage, {
  deleteProperty(_target, prop) {
    if (typeof prop === 'string') {
      if (isRemoteStorageKey(prop)) {
        _lsRemoveItem(addNamespace(prop));
      } else {
        _lsRemoveItem(prop);
      }
    }
    return true;
  },
  get(target, prop) {
    const value = Reflect.get(target, prop);
    if (typeof value === 'function') {
      return value.bind(target);
    }
    return value;
  },
  set(_target, prop, value) {
    if (typeof prop === 'string') {
      if (isRemoteStorageKey(prop)) {
        _lsSetItem(addNamespace(prop), value);
      } else {
        _lsSetItem(prop, value);
      }
    }
    return true;
  }
});

Object.defineProperty(window, 'localStorage', {
  value: localStorageProxy,
  writable: false,
  configurable: true
});

// ============================================================================
// PATCH sessionStorage
// ============================================================================

const _ssGetItem = sessionStorage.getItem.bind(sessionStorage);
const _ssSetItem = sessionStorage.setItem.bind(sessionStorage);
const _ssRemoveItem = sessionStorage.removeItem.bind(sessionStorage);

sessionStorage.getItem = function(key: string): string | null {
  if (isRemoteStorageKey(key)) {
    return _ssGetItem(addNamespace(key));
  }
  return _ssGetItem(key);
};

sessionStorage.setItem = function(key: string, value: string): void {
  if (isRemoteStorageKey(key)) {
    return _ssSetItem(addNamespace(key), value);
  }
  return _ssSetItem(key, value);
};

sessionStorage.removeItem = function(key: string): void {
  if (isRemoteStorageKey(key)) {
    return _ssRemoveItem(addNamespace(key));
  }
  return _ssRemoveItem(key);
};

// ============================================================================
// PATCH IndexedDB
// ============================================================================

const RS_DB_NAME = 'remotestorage';
const NAMESPACED_DB_NAME = `${APP_NAMESPACE}-remotestorage`;

const _idbOpen = indexedDB.open.bind(indexedDB);
const _idbDeleteDatabase = indexedDB.deleteDatabase.bind(indexedDB);

indexedDB.open = function(name: string, version?: number): IDBOpenDBRequest {
  const dbName = name === RS_DB_NAME ? NAMESPACED_DB_NAME : name;
  if (version !== undefined) {
    return _idbOpen(dbName, version);
  }
  return _idbOpen(dbName);
};

indexedDB.deleteDatabase = function(name: string): IDBOpenDBRequest {
  const dbName = name === RS_DB_NAME ? NAMESPACED_DB_NAME : name;
  return _idbDeleteDatabase(dbName);
};

// ============================================================================
// PATCH BroadcastChannel
// ============================================================================

const RS_CHANNEL_NAME = 'remotestorage:changes';
const NAMESPACED_CHANNEL_NAME = `${APP_NAMESPACE}:remotestorage:changes`;

const OriginalBroadcastChannel = window.BroadcastChannel;

class NamespacedBroadcastChannel extends OriginalBroadcastChannel {
  constructor(name: string) {
    const channelName = name === RS_CHANNEL_NAME ? NAMESPACED_CHANNEL_NAME : name;
    super(channelName);
  }
}

Object.defineProperty(window, 'BroadcastChannel', {
  value: NamespacedBroadcastChannel,
  writable: true,
  configurable: true
});

// ============================================================================
// EXPORT
// ============================================================================

export const STORAGE_NAMESPACE = APP_NAMESPACE;

if (import.meta.env.DEV) {
  console.log(`[storageNamespace] Active with namespace: "${APP_NAMESPACE}"`);
}
