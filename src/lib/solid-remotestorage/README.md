# solid-remotestorage

A reusable library for integrating [RemoteStorage](https://remotestorage.io/) with [SolidJS](https://www.solidjs.com/) applications.

## Features

- 🔄 **Reactive State** - SolidJS stores with fine-grained reactivity
- 📴 **Offline-First** - Works without internet, syncs when connected
- 🔐 **User-Owned Data** - Data stored in user's own storage
- ⚡ **Optimistic Updates** - Instant UI feedback
- 📦 **Modular** - Clean separation of data modules
- 🎯 **Type-Safe** - Full TypeScript support

## Quick Start

### 1. Install Dependencies

```bash
npm install remotestoragejs remotestorage-widget solid-js
# or
pnpm add remotestoragejs remotestorage-widget solid-js
```

### 2. Define Your Data Module

```typescript
// src/modules/todos.ts
import { createModule, type BaseItem } from '../lib/solid-remotestorage';

// Define your data type (must extend BaseItem)
export interface Todo extends BaseItem {
  title: string;
  completed: boolean;
}

// Create the module
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
  }
});

// Extend RemoteStorage type for TypeScript
declare module 'remotestoragejs' {
  interface RemoteStorage {
    todos: ReturnType<typeof TodosModule.builder>['exports'];
  }
}
```

### 3. Create RemoteStorage Instance

```typescript
// src/remoteStorage.ts
import { createRemoteStorage } from './lib/solid-remotestorage';
import { TodosModule } from './modules/todos';

export const remoteStorage = createRemoteStorage({
  modules: [TodosModule],
  logging: import.meta.env.DEV  // Enable logging in development
});
```

### 4. Wrap Your App with Provider

```tsx
// src/App.tsx
import { RemoteStorageProvider } from './lib/solid-remotestorage';
import { remoteStorage } from './remoteStorage';

function App(props) {
  return (
    <RemoteStorageProvider 
      remoteStorage={remoteStorage}
      widgetContainerId="rs-widget"
    >
      {/* Widget will be attached here */}
      <div id="rs-widget" />
      
      {props.children}
    </RemoteStorageProvider>
  );
}
```

### 5. Use in Components

```tsx
// src/components/TodoList.tsx
import { For, Show, createSignal } from 'solid-js';
import { useCollection } from '../lib/solid-remotestorage';
import type { Todo } from '../modules/todos';

export function TodoList() {
  const [newTitle, setNewTitle] = createSignal('');
  
  // Create a reactive collection
  const todos = useCollection<Todo>({
    getModule: (rs) => rs.todos
  });

  const handleAdd = async (e: Event) => {
    e.preventDefault();
    if (!newTitle().trim()) return;
    
    await todos.add({
      title: newTitle(),
      completed: false
    });
    setNewTitle('');
  };

  return (
    <div>
      <form onSubmit={handleAdd}>
        <input 
          value={newTitle()} 
          onInput={(e) => setNewTitle(e.currentTarget.value)}
          placeholder="New todo..."
        />
        <button type="submit">Add</button>
      </form>

      <Show when={!todos.isLoading()} fallback={<p>Loading...</p>}>
        <ul>
          <For each={todos.items}>
            {(todo) => (
              <li>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => todos.update(todo.id, { 
                    completed: !todo.completed 
                  })}
                />
                <span>{todo.title}</span>
                <button onClick={() => todos.remove(todo.id)}>
                  Delete
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}
```

## API Reference

### `createRemoteStorage(config)`

Creates a configured RemoteStorage instance.

```typescript
interface RemoteStorageConfig {
  modules?: RSModule[];      // Data modules to load
  logging?: boolean;         // Enable console logging (default: false)
  cache?: boolean;           // Enable local caching (default: true)
  autoClaimAccess?: boolean; // Auto-claim rw access for modules (default: true)
  autoCaching?: boolean;     // Auto-enable caching for modules (default: true)
}
```

### `createModule<T>(definition)`

Creates a data module with standard CRUD operations.

```typescript
interface ModuleDefinition<T extends BaseItem> {
  name: string;           // Module name (folder in storage)
  schema?: JSONSchema;    // JSON Schema for validation
  customExports?: (privateClient, publicClient) => Record<string, any>;
}
```

**Standard exports provided:**
- `getAll()` - Get all items as object
- `getAllAsArray()` - Get all items as sorted array
- `get(id)` - Get single item
- `store(item)` - Store item
- `create(data)` - Create with auto-generated ID/timestamps
- `update(id, updates)` - Update existing item
- `remove(id)` - Delete item
- `onChange(callback)` - Subscribe to changes

### `RemoteStorageProvider`

SolidJS context provider for RemoteStorage.

```tsx
<RemoteStorageProvider
  remoteStorage={rs}           // Required: RemoteStorage instance
  widgetContainerId="widget"   // Optional: Element ID for widget
  widgetOptions={{             // Optional: Widget configuration
    leaveOpen: false,
    autoCloseAfter: 1500
  }}
>
  {children}
</RemoteStorageProvider>
```

### `useRemoteStorage()`

Hook to access RemoteStorage context.

```typescript
const { 
  rs,           // RemoteStorage instance
  status,       // () => 'connected' | 'disconnected' | 'connecting'
  userAddress,  // () => string | null
  isReady,      // () => boolean
  sync,         // () => void
  connect,      // (address: string) => void
  disconnect    // () => void
} = useRemoteStorage();
```

### `useCollection<T>(options)` / `createCollection(options)`

Create a reactive collection from a module.

```typescript
interface CollectionOptions<T extends BaseItem> {
  module: ModuleExports<T>;           // For createCollection
  getModule: (rs) => ModuleExports<T>; // For useCollection
  sortFn?: (a: T, b: T) => number;
  filterFn?: (item: T) => boolean;
}

// Returns:
interface CollectionAPI<T> {
  items: T[];                    // Reactive array
  isLoading: () => boolean;
  error: () => Error | null;
  add: (data) => Promise<T>;     // Optimistic
  update: (id, updates) => Promise<void>;  // Optimistic
  remove: (id) => Promise<void>; // Optimistic
  find: (id) => T | undefined;
  reload: () => Promise<void>;
}
```

### Types

```typescript
// Base interface for all stored items
interface BaseItem {
  id: string;
  createdAt: number;
  updatedAt?: number;
}

// Change event from RemoteStorage
interface ChangeEvent<T> {
  path: string;
  relativePath: string;
  origin: 'window' | 'local' | 'remote' | 'conflict';
  oldValue?: T;
  newValue?: T;
}
```

### Utilities

```typescript
import { generateId, debounce } from './lib/solid-remotestorage';

// Generate unique ID
const id = generateId(); // "1704067200000-abc123xyz"

// Debounce a function
const debouncedSave = debounce(save, 300);
```

## Patterns

### Multiple Modules

```typescript
// src/modules/index.ts
import { NotesModule } from './notes';
import { TodosModule } from './todos';
import { BookmarksModule } from './bookmarks';

export const modules = [NotesModule, TodosModule, BookmarksModule];

// src/remoteStorage.ts
import { createRemoteStorage } from './lib/solid-remotestorage';
import { modules } from './modules';

export const remoteStorage = createRemoteStorage({ modules });
```

### Custom Module Methods

```typescript
const TodosModule = createModule<Todo>({
  name: 'todos',
  schema: { /* ... */ },
  customExports: (privateClient) => ({
    // Add custom methods
    async getCompleted(): Promise<Todo[]> {
      const all = await this.getAllAsArray();
      return all.filter(t => t.completed);
    },
    
    async clearCompleted(): Promise<void> {
      const completed = await this.getCompleted();
      await Promise.all(completed.map(t => this.remove(t.id)));
    }
  })
});
```

### Filtered Collections

```typescript
// Only show incomplete todos
const incompleteTodos = useCollection<Todo>({
  getModule: (rs) => rs.todos,
  filterFn: (todo) => !todo.completed,
  sortFn: (a, b) => a.createdAt - b.createdAt  // Oldest first
});
```

### Connection Status UI

```tsx
function ConnectionBadge() {
  const { status, userAddress } = useRemoteStorage();
  
  return (
    <div class="flex items-center gap-2">
      <span class={`w-2 h-2 rounded-full ${
        status() === 'connected' ? 'bg-green-500' : 'bg-gray-400'
      }`} />
      <span>
        {status() === 'connected' 
          ? `Connected: ${userAddress()}`
          : 'Offline (local storage)'
        }
      </span>
    </div>
  );
}
```

### Manual Sync Button

```tsx
function SyncButton() {
  const { sync, status } = useRemoteStorage();
  
  return (
    <button 
      onClick={sync}
      disabled={status() !== 'connected'}
    >
      Sync Now
    </button>
  );
}
```

## Offline-First Behavior

1. **Without Connection**: Data is stored in IndexedDB locally
2. **On Connect**: Local data syncs to remote storage
3. **Sync Conflicts**: Last write wins (configurable)
4. **Network Loss**: App continues working, syncs when back online

## Best Practices

1. **Always extend `BaseItem`** for your data types
2. **Use optimistic updates** via collection methods
3. **Handle loading states** in UI
4. **Keep modules small** - one entity per module
5. **Use TypeScript** for type safety with module augmentation

## Troubleshooting

### "Loading todos..." forever
- Check browser console for errors
- Verify RemoteStorage is initialized before provider mounts
- Ensure module name matches in schema declaration

### Data not syncing
- Check connection status via `useRemoteStorage()`
- Verify caching is enabled for the module path
- Check browser's IndexedDB for stored data

### TypeScript errors with rs.moduleName
- Add module augmentation to extend RemoteStorage interface
- See example in "Define Your Data Module" section
