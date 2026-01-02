/**
 * Collection factory for creating reactive data collections
 * 
 * Creates a SolidJS store-backed collection with automatic sync
 * to RemoteStorage.
 */

import { createStore, produce, type SetStoreFunction } from 'solid-js/store';
import { createSignal, onMount, type Accessor } from 'solid-js';
import type { BaseItem, ChangeEvent } from './types';
import type { ModuleExports } from './createModule';

/**
 * Options for creating a collection
 */
export interface CollectionOptions<T extends BaseItem> {
  /** The module exports object from RemoteStorage */
  module: ModuleExports<T>;
  
  /** 
   * Sort function for ordering items 
   * @default Sort by createdAt descending (newest first)
   */
  sortFn?: (a: T, b: T) => number;
  
  /** 
   * Filter function for filtering items 
   * @default No filtering
   */
  filterFn?: (item: T) => boolean;
}

/**
 * API returned by createCollection
 */
export interface CollectionAPI<T extends BaseItem> {
  /** Reactive array of items */
  items: T[];
  /** Set function for direct store manipulation (advanced) */
  setItems: SetStoreFunction<T[]>;
  /** Loading state */
  isLoading: Accessor<boolean>;
  /** Error state */
  error: Accessor<Error | null>;
  
  // CRUD operations with optimistic updates
  /** Add a new item */
  add: (data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => Promise<T>;
  /** Update an existing item */
  update: (id: string, updates: Partial<Omit<T, 'id' | 'createdAt'>>) => Promise<void>;
  /** Remove an item */
  remove: (id: string) => Promise<void>;
  /** Find an item by ID */
  find: (id: string) => T | undefined;
  
  /** Reload all items from storage */
  reload: () => Promise<void>;
}

/**
 * Create a reactive collection backed by RemoteStorage.
 * 
 * This is the primary way to work with data in your components.
 * It provides a reactive store that automatically syncs with RemoteStorage.
 * 
 * Features:
 * - Optimistic updates for instant UI feedback
 * - Automatic reload on remote changes
 * - Loading and error states
 * - Sorting and filtering
 * 
 * @example
 * ```tsx
 * // In your component
 * function TodoList() {
 *   const { rs } = useRemoteStorage();
 *   const collection = createCollection({
 *     module: rs.todos,
 *     sortFn: (a, b) => b.createdAt - a.createdAt
 *   });
 * 
 *   return (
 *     <For each={collection.items}>
 *       {(todo) => <TodoItem todo={todo} />}
 *     </For>
 *   );
 * }
 * ```
 */
export function createCollection<T extends BaseItem>(
  options: CollectionOptions<T>
): CollectionAPI<T> {
  const { 
    module, 
    sortFn = (a, b) => b.createdAt - a.createdAt,
    filterFn 
  } = options;

  const [items, setItems] = createStore<T[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<Error | null>(null);

  // Track if initial load is complete
  let initialLoadComplete = false;

  /**
   * Load all items from storage
   */
  const reload = async () => {
    try {
      setError(null);
      const allItems = await module.getAllAsArray();
      let processed = allItems;
      
      if (filterFn) {
        processed = processed.filter(filterFn);
      }
      
      processed = processed.sort(sortFn);
      setItems(processed);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      console.error('Error loading collection:', err);
    } finally {
      setIsLoading(false);
      initialLoadComplete = true;
    }
  };

  /**
   * Add a new item with optimistic update
   */
  const add = async (data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> => {
    const item = await module.create(data);
    
    // Optimistic update - add to store immediately
    setItems(produce((items) => {
      items.unshift(item);
      items.sort(sortFn);
    }));
    
    return item;
  };

  /**
   * Update an item with optimistic update
   */
  const update = async (id: string, updates: Partial<Omit<T, 'id' | 'createdAt'>>) => {
    // Optimistic update
    setItems(produce((items) => {
      const index = items.findIndex(item => item.id === id);
      if (index !== -1) {
        Object.assign(items[index], updates, { updatedAt: Date.now() });
      }
    }));
    
    // Persist to storage
    await module.update(id, updates);
  };

  /**
   * Remove an item with optimistic update
   */
  const remove = async (id: string) => {
    // Optimistic update
    setItems(produce((items) => {
      const index = items.findIndex(item => item.id === id);
      if (index !== -1) {
        items.splice(index, 1);
      }
    }));
    
    // Persist to storage
    await module.remove(id);
  };

  /**
   * Find an item by ID
   */
  const find = (id: string): T | undefined => {
    return items.find(item => item.id === id);
  };

  // Set up change listener
  onMount(() => {
    // Initial load
    reload();
    
    // Listen for remote changes
    module.onChange((event: ChangeEvent<T>) => {
      // Only reload for remote or local origin (not window - our own changes)
      if (initialLoadComplete && (event.origin === 'remote' || event.origin === 'local')) {
        reload();
      }
    });
  });

  return {
    items,
    setItems,
    isLoading,
    error,
    add,
    update,
    remove,
    find,
    reload
  };
}

export default createCollection;
