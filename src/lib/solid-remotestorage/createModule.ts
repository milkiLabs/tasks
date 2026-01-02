/**
 * Module factory for creating RemoteStorage data modules
 * 
 * Provides a type-safe way to define data modules with CRUD operations.
 */

import type BaseClient from 'remotestoragejs/release/types/baseclient';
import type { BaseItem, JSONSchema } from './types';
import { generateId } from './utils';

/**
 * Definition for creating a data module
 */
export interface ModuleDefinition<T extends BaseItem> {
  /** 
   * Module name - becomes the folder path in storage
   * @example 'todos', 'notes', 'bookmarks'
   */
  name: string;
  
  /**
   * JSON Schema for validating items
   * @see https://json-schema.org/
   */
  schema?: JSONSchema;
  
  /**
   * Custom exports to add to the module
   * Receives the privateClient and publicClient
   */
  customExports?: (privateClient: BaseClient, publicClient: BaseClient) => Record<string, unknown>;
}

/**
 * Standard exports provided by createModule
 */
export interface ModuleExports<T extends BaseItem> {
  /** Get all items */
  getAll(): Promise<Record<string, T>>;
  /** Get all items as an array, sorted by createdAt descending */
  getAllAsArray(): Promise<T[]>;
  /** Get a single item by ID */
  get(id: string): Promise<T | undefined>;
  /** Store an item (create or update) */
  store(item: T): Promise<void>;
  /** Create a new item with auto-generated ID and timestamps */
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  /** Update an existing item */
  update(id: string, updates: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<T | undefined>;
  /** Remove an item by ID */
  remove(id: string): Promise<void>;
  /** Subscribe to changes */
  onChange(callback: (event: any) => void): void;
}

/**
 * Create a RemoteStorage data module with standard CRUD operations.
 * 
 * This factory generates a module with common operations pre-configured,
 * reducing boilerplate for typical use cases.
 * 
 * @example
 * ```ts
 * interface Todo extends BaseItem {
 *   title: string;
 *   completed: boolean;
 * }
 * 
 * const TodosModule = createModule<Todo>({
 *   name: 'todos',
 *   schema: {
 *     type: 'object',
 *     properties: {
 *       id: { type: 'string' },
 *       title: { type: 'string' },
 *       completed: { type: 'boolean' },
 *       createdAt: { type: 'number' }
 *     },
 *     required: ['id', 'title', 'completed', 'createdAt']
 *   }
 * });
 * ```
 */
export function createModule<T extends BaseItem>(
  definition: ModuleDefinition<T>
): { name: string; builder: (privateClient: BaseClient, publicClient: BaseClient) => { exports: ModuleExports<T> & Record<string, unknown> } } {
  const { name, schema, customExports } = definition;
  
  return {
    name,
    builder: (privateClient: BaseClient, publicClient: BaseClient) => {
      // Declare the type if schema is provided
      if (schema) {
        privateClient.declareType(name, schema);
      } else {
        // Empty schema for flexibility
        privateClient.declareType(name, {});
      }

      const standardExports: ModuleExports<T> = {
        async getAll(): Promise<Record<string, T>> {
          // Use maxAge=false so we always read from the local cache even when offline
          const listing = await privateClient.getAll('', false);
          const items: Record<string, T> = {};
          
          for (const [key, value] of Object.entries(listing || {})) {
            if (value && typeof value === 'object' && 'id' in (value as object)) {
              items[key] = value as T;
            }
          }
          
          return items;
        },

        async getAllAsArray(): Promise<T[]> {
          const items = await this.getAll();
          return Object.values(items).sort((a, b) => b.createdAt - a.createdAt);
        },

        async get(id: string): Promise<T | undefined> {
          // Same offline-first behavior for single object reads
          return privateClient.getObject(id, false) as Promise<T | undefined>;
        },

        async store(item: T): Promise<void> {
          await privateClient.storeObject(name, item.id, item);
        },

        async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
          const item = {
            ...data,
            id: generateId(),
            createdAt: Date.now()
          } as T;
          
          await this.store(item);
          return item;
        },

        async update(id: string, updates: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<T | undefined> {
          const existing = await this.get(id);
          if (!existing) return undefined;
          
          const updated = {
            ...existing,
            ...updates,
            updatedAt: Date.now()
          } as T;
          
          await this.store(updated);
          return updated;
        },

        async remove(id: string): Promise<void> {
          await privateClient.remove(id);
        },

        onChange(callback: (event: any) => void): void {
          privateClient.on('change', callback);
        }
      };

      // Merge standard exports with custom exports
      const custom = customExports ? customExports(privateClient, publicClient) : {};

      return {
        exports: { ...standardExports, ...custom }
      };
    }
  };
}

export default createModule;
