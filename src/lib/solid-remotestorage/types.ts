/**
 * Common types used throughout the solid-remotestorage library
 */

/**
 * Base interface for all stored items.
 * Your data types should extend this.
 * 
 * @example
 * ```ts
 * interface Todo extends BaseItem {
 *   title: string;
 *   completed: boolean;
 * }
 * ```
 */
export interface BaseItem {
  /** Unique identifier for the item */
  id: string;
  /** Timestamp when the item was created */
  createdAt: number;
  /** Optional timestamp when the item was last updated */
  updatedAt?: number;
}

/**
 * Change event emitted by RemoteStorage when data changes
 */
export interface ChangeEvent<T = unknown> {
  /** Absolute path of the changed node */
  path: string;
  /** Path relative to the module's scope */
  relativePath: string;
  /** Origin of the change */
  origin: 'window' | 'local' | 'remote' | 'conflict';
  /** Previous value (undefined if creation) */
  oldValue?: T;
  /** New value (undefined if deletion) */
  newValue?: T;
  /** Value when local and remote last agreed (only in conflicts) */
  lastCommonValue?: T;
  /** Previous content type */
  oldContentType?: string;
  /** New content type */
  newContentType?: string;
}

/**
 * Sync status for tracking synchronization state
 */
export type SyncStatus = 'idle' | 'syncing' | 'error';

/**
 * JSON Schema definition for RemoteStorage types
 */
export interface JSONSchema {
  type: 'object' | 'string' | 'number' | 'boolean' | 'array';
  properties?: Record<string, JSONSchema | { type: string; items?: JSONSchema }>;
  required?: string[];
  items?: JSONSchema;
  additionalProperties?: boolean;
}
