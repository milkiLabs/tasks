/**
 * Todos Module
 * 
 * Data module for the Todo app using solid-remotestorage.
 * Supports categories and topics for organization.
 */

import { createModule, type BaseItem } from '../solid-remotestorage';

/**
 * Category assignment - links a todo to categories and optional topics
 */
export interface CategoryAssignment {
  categoryId: string;
  topicIds?: string[];
}

/**
 * Todo item type with category support
 */
export interface Todo extends BaseItem {
  title: string;
  description?: string;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: number;
  categories?: CategoryAssignment[];
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
      description: { type: 'string' },
      completed: { type: 'boolean' },
      priority: { type: 'string' },
      dueDate: { type: 'number' },
      categories: { 
        type: 'array',
        items: {
          type: 'object',
          properties: {
            categoryId: { type: 'string' },
            topicIds: { type: 'array', items: { type: 'string' } }
          }
        }
      },
      createdAt: { type: 'number' },
      updatedAt: { type: 'number' }
    },
    required: ['id', 'title', 'completed', 'createdAt']
  },
  customExports: (privateClient) => ({
    /**
     * Get count of completed todos
     */
    async getCompletedCount(): Promise<number> {
      const all = await privateClient.getAll('');
      return Object.values(all || {}).filter((t: any) => t?.completed).length;
    },
    /**
     * Get todos by category ID
     */
    async getByCategory(categoryId: string): Promise<Todo[]> {
      const all = await privateClient.getAll('');
      return Object.values(all || {}).filter((t: any) => 
        t?.categories?.some((c: CategoryAssignment) => c.categoryId === categoryId)
      ) as Todo[];
    },
    /**
     * Get todos by topic ID
     */
    async getByTopic(topicId: string): Promise<Todo[]> {
      const all = await privateClient.getAll('');
      return Object.values(all || {}).filter((t: any) => 
        t?.categories?.some((c: CategoryAssignment) => c.topicIds?.includes(topicId))
      ) as Todo[];
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
