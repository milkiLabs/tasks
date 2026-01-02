import RemoteStorage from 'remotestoragejs';
import Widget from 'remotestorage-widget';

// Define the Todo type
export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
}

/**
 * Todo Data Module for RemoteStorage
 * 
 * This module defines how todos are stored and retrieved from RemoteStorage.
 * Data modules encapsulate all storage logic and provide a clean API.
 */
export const TodoModule = {
  name: 'todos',
  builder: function (privateClient: any) {
    // Declare the schema for todos - this enables validation
    privateClient.declareType('todo', {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        completed: { type: 'boolean' },
        createdAt: { type: 'number' }
      },
      required: ['id', 'title', 'completed', 'createdAt']
    });

    return {
      exports: {
        /**
         * Get all todos from storage
         */
        async getAll(): Promise<Record<string, Todo>> {
          const listing = await privateClient.getAll('');
          // Filter out any metadata or non-todo objects
          const todos: Record<string, Todo> = {};
          for (const [key, value] of Object.entries(listing || {})) {
            if (value && typeof value === 'object' && 'id' in (value as object)) {
              todos[key] = value as Todo;
            }
          }
          return todos;
        },

        /**
         * Get a single todo by ID
         */
        async get(id: string): Promise<Todo | undefined> {
          return privateClient.getObject(id);
        },

        /**
         * Store a todo (create or update)
         */
        async store(todo: Todo): Promise<void> {
          return privateClient.storeObject('todo', todo.id, todo);
        },

        /**
         * Remove a todo by ID
         */
        async remove(id: string): Promise<void> {
          return privateClient.remove(id);
        },

        /**
         * Subscribe to changes in the todos folder
         */
        onChange(callback: (event: any) => void): void {
          privateClient.on('change', callback);
        }
      }
    };
  }
};

// Extend RemoteStorage type to include our module
declare module 'remotestoragejs' {
  interface RemoteStorage {
    todos: ReturnType<typeof TodoModule.builder>['exports'];
  }
}

/**
 * Initialize RemoteStorage with our Todo module
 * 
 * This creates a singleton instance that can be imported throughout the app.
 */
export const remoteStorage = new RemoteStorage({
  logging: false,  // Set to true for debugging
  modules: [TodoModule]
});

// Claim access to the 'todos' category with read/write permissions
// This tells RemoteStorage what data we need access to
remoteStorage.access.claim('todos', 'rw');

// Enable caching for the todos path
// This means todos will be synced automatically and available offline
remoteStorage.caching.enable('/todos/');

/**
 * Create and attach the RemoteStorage widget
 * 
 * The widget provides a ready-made UI for connecting/disconnecting storage
 */
export function initWidget(elementId?: string): Widget {
  const widget = new Widget(remoteStorage);
  widget.attach(elementId);
  return widget;
}

export default remoteStorage;
