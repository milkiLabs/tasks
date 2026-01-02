/**
 * Todos Module
 * 
 * Example data module for the Todo app using solid-remotestorage.
 */

import { createModule, type BaseItem } from '../solid-remotestorage';

/**
 * Todo item type
 */
export interface Todo extends BaseItem {
  title: string;
  completed: boolean;
}

/**
 * Todos data module
 * 
 * Provides CRUD operations for todos, automatically synced with RemoteStorage.
 */
export const TodosModule = createModule<Todo>({
  name: 'todos',
  schema: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      title: { type: 'string' },
      completed: { type: 'boolean' },
      createdAt: { type: 'number' },
      updatedAt: { type: 'number' }
    },
    required: ['id', 'title', 'completed', 'createdAt']
  },
  // Example of adding custom methods
  customExports: (privateClient) => ({
    /**
     * Get count of completed todos
     */
    async getCompletedCount(): Promise<number> {
      const all = await privateClient.getAll('');
      return Object.values(all || {}).filter((t: any) => t?.completed).length;
    }
  })
});

// Extend RemoteStorage type for TypeScript support
declare module 'remotestoragejs' {
  interface RemoteStorage {
    todos: ReturnType<typeof TodosModule.builder>['exports'];
  }
}

export default TodosModule;
