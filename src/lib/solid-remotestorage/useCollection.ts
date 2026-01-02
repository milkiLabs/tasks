/**
 * useCollection hook for creating collections within components
 * 
 * A convenience wrapper around createCollection that integrates
 * with the RemoteStorage context.
 */

import type RemoteStorage from 'remotestoragejs';
import { onMount, onCleanup } from 'solid-js';
import { createCollection, type CollectionAPI, type CollectionOptions } from './createCollection';
import { useRemoteStorage } from './RemoteStorageProvider';
import type { BaseItem } from './types';
import type { ModuleExports } from './createModule';

/**
 * Options for useCollection hook
 */
export interface UseCollectionOptions<T extends BaseItem> {
  /** 
   * Function to get the module from the RemoteStorage instance
   * @example (rs) => rs.todos
   */
  getModule: (rs: RemoteStorage) => ModuleExports<T>;
  
  /** Sort function for ordering items */
  sortFn?: (a: T, b: T) => number;
  
  /** Filter function for filtering items */
  filterFn?: (item: T) => boolean;
  
  /** 
   * Whether to load data immediately 
   * @default true
   */
  autoLoad?: boolean;
}

/**
 * Hook to create a reactive collection from a RemoteStorage module.
 * 
 * This hook combines useRemoteStorage with createCollection for
 * a more ergonomic API within components.
 * 
 * @example
 * ```tsx
 * interface Todo extends BaseItem {
 *   title: string;
 *   completed: boolean;
 * }
 * 
 * function TodoList() {
 *   const todos = useCollection<Todo>({
 *     getModule: (rs) => rs.todos,
 *     sortFn: (a, b) => b.createdAt - a.createdAt
 *   });
 * 
 *   return (
 *     <Show when={!todos.isLoading()} fallback={<Loading />}>
 *       <For each={todos.items}>
 *         {(todo) => (
 *           <div>
 *             <input 
 *               type="checkbox" 
 *               checked={todo.completed}
 *               onChange={() => todos.update(todo.id, { completed: !todo.completed })}
 *             />
 *             {todo.title}
 *             <button onClick={() => todos.remove(todo.id)}>Delete</button>
 *           </div>
 *         )}
 *       </For>
 *     </Show>
 *   );
 * }
 * ```
 */
export function useCollection<T extends BaseItem>(
  options: UseCollectionOptions<T>
): CollectionAPI<T> {
  const { rs } = useRemoteStorage();
  const module = options.getModule(rs);
  
  const collection = createCollection({
    module,
    sortFn: options.sortFn,
    filterFn: options.filterFn,
    autoLoad: options.autoLoad
  });

  // Listen for disconnect events to clear the collection immediately
  onMount(() => {
    const handleDisconnected = () => {
      collection.clear();
    };

    const handleConnected = () => {
      // Reload data when reconnected
      collection.reload();
    };

    rs.on('disconnected', handleDisconnected);
    rs.on('connected', handleConnected);

    onCleanup(() => {
      (rs as any).removeEventListener('disconnected', handleDisconnected);
      (rs as any).removeEventListener('connected', handleConnected);
    });
  });

  return collection;
}

export default useCollection;
