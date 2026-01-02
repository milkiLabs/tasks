/**
 * solid-remotestorage
 * 
 * A reusable library for integrating RemoteStorage with SolidJS applications.
 * Provides reactive state management, offline-first data handling, and 
 * seamless sync across devices.
 * 
 * @example
 * ```tsx
 * import { 
 *   createRemoteStorage, 
 *   RemoteStorageProvider, 
 *   useRemoteStorage,
 *   createModule 
 * } from './lib/solid-remotestorage';
 * ```
 */

// Core exports
export { createRemoteStorage, type RemoteStorageConfig } from './createRemoteStorage';
export { RemoteStorageProvider, useRemoteStorage, type ConnectionStatus } from './RemoteStorageProvider';
export { createModule, type ModuleDefinition, type ModuleExports } from './createModule';
export { createCollection, type CollectionOptions, type CollectionAPI } from './createCollection';
export { createSharedCollection, type SharedCollectionOptions, type SharedCollectionAPI } from './createSharedCollection';
export { useCollection } from './useCollection';

// Utility exports
export { generateId, debounce } from './utils';

// Type exports
export type { BaseItem, ChangeEvent, SyncStatus, RemoteStorage, BaseClient } from './types';
