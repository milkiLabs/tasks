/**
 * Collection factory for creating reactive data collections
 * 
 * Creates a SolidJS store-backed collection with automatic sync
 * to RemoteStorage.
 */

import { createStore, produce, reconcile, type SetStoreFunction } from 'solid-js/store';
import { createSignal, onMount, onCleanup, type Accessor } from 'solid-js';
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
  
  /**
   * Whether to load data immediately on creation
   * @default true
   */
  autoLoad?: boolean;
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
  /** Clear all items from the local store (does not delete from remote) */
  clear: () => void;
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
    filterFn,
    autoLoad = true
  } = options;

  const [items, setItems] = createStore<T[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<Error | null>(null);

  // Track if initial load is complete
  let initialLoadComplete = false;
  // Track change handler for cleanup
  let changeHandler: ((event: ChangeEvent<T>) => void) | null = null;

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
      // Use reconcile for efficient diffing instead of replacing entire array
      setItems(reconcile(processed));
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      console.error('Error loading collection:', err);
    } finally {
      setIsLoading(false);
      initialLoadComplete = true;
    }
  };

  /**
   * Add a new item with optimistic update and rollback on error
   */
  const add = async (data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> => {
    // Create item first to get the ID
    let item: T;
    try {
      item = await module.create(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
    
    // Optimistic update - add to store
    setItems(produce((items) => {
      items.unshift(item);
      items.sort(sortFn);
    }));
    
    return item;
  };

  /**
   * Update an item with optimistic update and rollback on error
   */
  const update = async (id: string, updates: Partial<Omit<T, 'id' | 'createdAt'>>) => {
    // Store original for rollback
    const originalIndex = items.findIndex(item => item.id === id);
    const original = originalIndex !== -1 ? { ...items[originalIndex] } : null;
    
    // Optimistic update
    setItems(produce((items) => {
      const index = items.findIndex(item => item.id === id);
      if (index !== -1) {
        Object.assign(items[index], updates, { updatedAt: Date.now() });
      }
    }));
    
    // Persist to storage
    try {
      await module.update(id, updates);
    } catch (err) {
      // Rollback on error
      if (original) {
        setItems(produce((items) => {
          const index = items.findIndex(item => item.id === id);
          if (index !== -1) {
            items[index] = original as T;
          }
        }));
      }
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };

  /**
   * Remove an item with optimistic update and rollback on error
   */
  const remove = async (id: string) => {
    // Store original for rollback
    const originalIndex = items.findIndex(item => item.id === id);
    const original = originalIndex !== -1 ? { ...items[originalIndex] } : null;
    
    // Optimistic update
    setItems(produce((items) => {
      const index = items.findIndex(item => item.id === id);
      if (index !== -1) {
        items.splice(index, 1);
      }
    }));
    
    // Persist to storage
    try {
      await module.remove(id);
    } catch (err) {
      // Rollback on error
      if (original) {
        setItems(produce((items) => {
          items.splice(originalIndex, 0, original as T);
          items.sort(sortFn);
        }));
      }
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };

  /**
   * Find an item by ID
   */
  const find = (id: string): T | undefined => {
    return items.find(item => item.id === id);
  };

  /**
   * Clear all items from the local store (does not delete from remote storage)
   * Used when disconnecting from remote storage to clear the UI immediately
   */
  const clear = () => {
    setItems(reconcile([]));
    setError(null);
    initialLoadComplete = false;
  };

  // Set up change listener and initial load
  onMount(() => {
    // Initial load if autoLoad is enabled
    if (autoLoad) {
      reload();
    } else {
      setIsLoading(false);
    }
    
    // Listen for remote changes
    changeHandler = (event: ChangeEvent<T>) => {
      // Only reload for remote or local origin (not window - our own changes)
      if (initialLoadComplete && (event.origin === 'remote' || event.origin === 'local')) {
        reload();
      }
    };
    module.onChange(changeHandler);
  });

  // Cleanup change listener on unmount
  onCleanup(() => {
    // Note: RemoteStorage's privateClient doesn't expose off() for change events
    // The changeHandler will be garbage collected with the component
    changeHandler = null;
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
    reload,
    clear
  };
}

export default createCollection;
