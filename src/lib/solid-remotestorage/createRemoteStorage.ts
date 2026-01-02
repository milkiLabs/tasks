/**
 * RemoteStorage instance factory
 * 
 * Creates and configures a RemoteStorage instance with sensible defaults.
 */

import RemoteStorage from 'remotestoragejs';
import type { RSModule } from 'remotestoragejs';

/**
 * Configuration options for createRemoteStorage
 */
export interface RemoteStorageConfig {
  /** 
   * Array of data modules to load 
   * @see createModule for creating modules
   */
  modules?: RSModule[];
  
  /** 
   * Enable console logging for debugging 
   * @default false
   */
  logging?: boolean;
  
  /** 
   * Enable local caching (required for offline-first)
   * @default true
   */
  cache?: boolean;
  
  /**
   * Automatically claim access for all modules
   * @default true
   */
  autoClaimAccess?: boolean;
  
  /**
   * Automatically enable caching for all modules
   * @default true
   */
  autoCaching?: boolean;
  
  /**
   * Change events settings
   */
  changeEvents?: {
    local?: boolean;
    window?: boolean;
    remote?: boolean;
    conflict?: boolean;
  };
}

/**
 * Create a configured RemoteStorage instance.
 * 
 * This is the entry point for setting up RemoteStorage in your app.
 * 
 * @example
 * ```ts
 * import { createRemoteStorage, createModule } from './lib/solid-remotestorage';
 * 
 * const TodosModule = createModule({
 *   name: 'todos',
 *   schema: { ... }
 * });
 * 
 * export const remoteStorage = createRemoteStorage({
 *   modules: [TodosModule],
 *   logging: import.meta.env.DEV
 * });
 * ```
 */
export function createRemoteStorage(config: RemoteStorageConfig = {}): RemoteStorage {
  const {
    modules = [],
    logging = false,
    cache = true,
    autoClaimAccess = true,
    autoCaching = true,
    changeEvents = {
      local: true,
      window: true,
      remote: true,
      conflict: true
    }
  } = config;

  // Create the RemoteStorage instance
  const rs = new RemoteStorage({
    logging,
    cache,
    modules,
    changeEvents
  });

  // Auto-claim access for all modules
  if (autoClaimAccess) {
    for (const module of modules) {
      rs.access.claim(module.name, 'rw');
    }
  }

  // Auto-enable caching for all modules
  if (autoCaching && cache) {
    for (const module of modules) {
      rs.caching.enable(`/${module.name}/`);
    }
  }

  return rs;
}

export default createRemoteStorage;
