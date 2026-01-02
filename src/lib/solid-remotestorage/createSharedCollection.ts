/**
 * Shared Collection factory for creating singleton reactive data collections
 * 
 * Unlike createCollection which creates a new store per component,
 * createSharedCollection creates a singleton store that is shared across
 * all components that use it.
 * 
 * Use this when you need the same data to be synchronized across multiple
 * components without prop drilling or context.
 */

import { createStore, produce, reconcile, type SetStoreFunction } from 'solid-js/store';
import { createSignal, createRoot, type Accessor } from 'solid-js';
import type { BaseItem, ChangeEvent } from './types';
import type { ModuleExports } from './createModule';

/**
 * Options for creating a shared collection
 */
export interface SharedCollectionOptions<T extends BaseItem> {
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
 * API returned by createSharedCollection
 */
export interface SharedCollectionAPI<T extends BaseItem> {
  /** Reactive array of items */
  items: T[];
  /** Set function for direct store manipulation (advanced) */
  setItems: SetStoreFunction<T[]>;
  /** Loading state */
  isLoading: Accessor<boolean>;
  /** Error state */
  error: Accessor<Error | null>;
  /** Whether initial load has completed */
  isInitialized: Accessor<boolean>;
  
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
  
  /** Initialize the collection (call once in your app root) */
  init: () => void;
  
  /** Dispose of the collection (cleanup) */
  dispose: () => void;
}

/**
 * Create a shared/singleton reactive collection backed by RemoteStorage.
 * 
 * This creates a collection that lives outside of any component lifecycle,
 * making it perfect for global app state.
 * 
 * IMPORTANT: You must call `init()` once in your app (e.g., in App.tsx onMount)
 * to start loading data and listening for changes.
 * 
 * @example
 * ```ts
 * // stores/todos.ts
 * import { createSharedCollection } from '../lib/solid-remotestorage';
 * import { remoteStorage } from '../remoteStorageInstance';
 * 
 * export const todosStore = createSharedCollection({
 *   module: remoteStorage.todos,
 *   sortFn: (a, b) => b.createdAt - a.createdAt
 * });
 * 
 * // App.tsx
 * onMount(() => {
 *   todosStore.init();
 * });
 * 
 * // Any component
 * function TodoList() {
 *   return (
 *     <For each={todosStore.items}>
 *       {(todo) => <TodoItem todo={todo} />}
 *     </For>
 *   );
 * }
 * ```
 */
export function createSharedCollection<T extends BaseItem>(
  options: SharedCollectionOptions<T>
): SharedCollectionAPI<T> {
  const { 
    module, 
    sortFn = (a, b) => b.createdAt - a.createdAt,
    filterFn 
  } = options;

  // Create a root that won't be disposed when components unmount
  let dispose: (() => void) | null = null;
  let items: T[] = [];
  let setItems!: SetStoreFunction<T[]>;
  let isLoading!: Accessor<boolean>;
  let setIsLoading!: (v: boolean) => void;
  let error!: Accessor<Error | null>;
  let setError!: (v: Error | null) => void;
  let isInitialized!: Accessor<boolean>;
  let setIsInitialized!: (v: boolean) => void;
  
  // Track if already initialized
  let hasInit = false;

  // Create reactive primitives in a persistent root
  dispose = createRoot((disposeFn) => {
    const [itemsStore, setItemsStore] = createStore<T[]>([]);
    const [loading, setLoading] = createSignal(true);
    const [err, setErr] = createSignal<Error | null>(null);
    const [initialized, setInitializedSignal] = createSignal(false);
    
    items = itemsStore;
    setItems = setItemsStore;
    isLoading = loading;
    setIsLoading = setLoading;
    error = err;
    setError = setErr;
    isInitialized = initialized;
    setIsInitialized = setInitializedSignal;
    
    return disposeFn;
  });

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
      setItems(reconcile(processed));
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      console.error('Error loading shared collection:', err);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  };

  /**
   * Add a new item with optimistic update
   */
  const add = async (data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> => {
    let item: T;
    try {
      item = await module.create(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
    
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
    const originalIndex = items.findIndex(item => item.id === id);
    const original = originalIndex !== -1 ? { ...items[originalIndex] } : null;
    
    setItems(produce((items) => {
      const index = items.findIndex(item => item.id === id);
      if (index !== -1) {
        Object.assign(items[index], updates, { updatedAt: Date.now() });
      }
    }));
    
    try {
      await module.update(id, updates);
    } catch (err) {
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
    const originalIndex = items.findIndex(item => item.id === id);
    const original = originalIndex !== -1 ? { ...items[originalIndex] } : null;
    
    setItems(produce((items) => {
      const index = items.findIndex(item => item.id === id);
      if (index !== -1) {
        items.splice(index, 1);
      }
    }));
    
    try {
      await module.remove(id);
    } catch (err) {
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
   * Initialize the collection - call once in your app
   */
  const init = () => {
    if (hasInit) {
      console.warn('Shared collection already initialized');
      return;
    }
    hasInit = true;
    
    // Load data
    reload();
    
    // Listen for remote changes
    module.onChange((event: ChangeEvent<T>) => {
      if (event.origin === 'remote' || event.origin === 'local') {
        reload();
      }
    });
  };

  /**
   * Dispose of the collection (cleanup)
   */
  const disposeCollection = () => {
    if (dispose) {
      dispose();
      dispose = null;
    }
    hasInit = false;
  };

  return {
    get items() { return items; },
    setItems,
    isLoading,
    error,
    isInitialized,
    add,
    update,
    remove,
    find,
    reload,
    init,
    dispose: disposeCollection
  };
}

export default createSharedCollection;
