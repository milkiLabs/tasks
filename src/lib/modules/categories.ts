/**
 * Categories Module
 * 
 * Data module for managing categories and topics for todo organization.
 */

import { createModule, type BaseItem } from '../solid-remotestorage';

/**
 * Topic - a subdivision within a category
 */
export interface Topic extends BaseItem {
  name: string;
  categoryId: string;
  color?: string;
}

/**
 * Category - top-level organizational unit
 */
export interface Category extends BaseItem {
  name: string;
  color: string;
  icon?: string;
}

/**
 * Categories data module
 */
 const CategoriesModule = createModule<Category>({
  name: 'categories',
  schema: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      color: { type: 'string' },
      icon: { type: 'string' },
      createdAt: { type: 'number' },
      updatedAt: { type: 'number' }
    },
    required: ['id', 'name', 'color', 'createdAt']
  }
});

/**
 * Topics data module
 */
export const TopicsModule = createModule<Topic>({
  name: 'topics',
  schema: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      categoryId: { type: 'string' },
      color: { type: 'string' },
      createdAt: { type: 'number' },
      updatedAt: { type: 'number' }
    },
    required: ['id', 'name', 'categoryId', 'createdAt']
  },
  customExports: (privateClient) => ({
    /**
     * Get topics by category ID
     */
    async getByCategory(categoryId: string): Promise<Topic[]> {
      const all = await privateClient.getAll('');
      return Object.values(all || {})
        .filter((t: any) => t?.categoryId === categoryId) as Topic[];
    }
  })
});

// Extend RemoteStorage type for TypeScript support
declare module 'remotestoragejs' {
  interface RemoteStorage {
    categories: ReturnType<typeof CategoriesModule.builder>['exports'];
    topics: ReturnType<typeof TopicsModule.builder>['exports'];
  }
}

export { CategoriesModule, TopicsModule as default };
