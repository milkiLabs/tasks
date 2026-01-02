import { createSignal, For, Show } from 'solid-js';
import { useRemoteStorage, useCollection } from '../lib/solid-remotestorage';
import type { Todo } from '../lib/modules/todos';

/**
 * Todo Item Component
 * 
 * Displays a single todo with toggle and delete functionality
 */
function TodoItem(props: { 
  id: string; 
  title: string; 
  completed: boolean;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <li class="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100 group hover:shadow-md transition-shadow">
      <input
        type="checkbox"
        checked={props.completed}
        onChange={() => props.onToggle(props.id)}
        class="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
      />
      <span 
        class={`flex-1 ${props.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}
      >
        {props.title}
      </span>
      <button
        type="button"
        onClick={() => props.onRemove(props.id)}
        class="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity px-2 py-1 rounded hover:bg-red-50"
        aria-label="Delete todo"
      >
        ✕
      </button>
    </li>
  );
}

/**
 * Todo Input Component
 * 
 * Form for adding new todos
 */
function TodoInput(props: { onAdd: (title: string) => void }) {
  const [inputValue, setInputValue] = createSignal('');

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (inputValue().trim()) {
      props.onAdd(inputValue());
      setInputValue('');
    }
  };

  return (
    <form onSubmit={handleSubmit} class="flex gap-2">
      <input
        type="text"
        value={inputValue()}
        onInput={(e) => setInputValue(e.currentTarget.value)}
        placeholder="What needs to be done?"
        class="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
      />
      <button
        type="submit"
        class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-200 transition-colors font-medium"
      >
        Add
      </button>
    </form>
  );
}

/**
 * Connection Status Badge
 * 
 * Shows the current RemoteStorage connection status
 */
function ConnectionStatus() {
  const { status, userAddress } = useRemoteStorage();

  return (
    <div class="flex items-center gap-2 text-sm">
      <span 
        class={`w-2 h-2 rounded-full ${
          status() === 'connected' ? 'bg-green-500' : 
          status() === 'connecting' ? 'bg-yellow-500' : 
          'bg-gray-400'
        }`} 
      />
      <span class="text-gray-600">
        {status() === 'connected' ? (
          <>Connected as <span class="font-medium">{userAddress()}</span></>
        ) : status() === 'connecting' ? (
          'Connecting...'
        ) : (
          'Not connected (data stored locally)'
        )}
      </span>
    </div>
  );
}

/**
 * Home Page - Todo App
 * 
 * Main todo list component that uses RemoteStorage for persistence.
 * 
 * This demonstrates the useCollection hook from solid-remotestorage:
 * - Reactive items array
 * - Optimistic CRUD operations
 * - Automatic sync with RemoteStorage
 */
export default function Home() {
  // Use the collection hook to get reactive todos
  const todos = useCollection<Todo>({
    getModule: (rs) => rs.todos,
    sortFn: (a, b) => b.createdAt - a.createdAt  // Newest first
  });

  // Calculate stats
  const completedCount = () => todos.items.filter(t => t.completed).length;
  const totalCount = () => todos.items.length;

  // Handlers using collection methods
  const handleAdd = (title: string) => {
    todos.add({ title, completed: false });
  };

  const handleToggle = (id: string) => {
    const todo = todos.find(id);
    if (todo) {
      todos.update(id, { completed: !todo.completed });
    }
  };

  const handleRemove = (id: string) => {
    todos.remove(id);
  };

  return (
    <section class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div class="max-w-xl mx-auto">
        {/* Header */}
        <div class="text-center mb-8">
          <h1 class="text-4xl font-bold text-gray-800 mb-2">
            📝 Todo App
          </h1>
          <p class="text-gray-600 mb-4">
            Powered by SolidJS + RemoteStorage
          </p>
          <ConnectionStatus />
        </div>

        {/* Widget container - RemoteStorage widget will be attached here */}
        <div id="rs-widget" class="flex justify-center mb-6" />

        {/* Todo Input */}
        <div class="mb-6">
          <TodoInput onAdd={handleAdd} />
        </div>

        {/* Stats */}
        <Show when={totalCount() > 0}>
          <div class="flex justify-between text-sm text-gray-500 mb-4 px-1">
            <span>{totalCount()} {totalCount() === 1 ? 'task' : 'tasks'} total</span>
            <span>{completedCount()} completed</span>
          </div>
        </Show>

        {/* Todo List */}
        <Show 
          when={!todos.isLoading()} 
          fallback={
            <div class="text-center py-8 text-gray-500">
              Loading todos...
            </div>
          }
        >
          <Show 
            when={todos.items.length > 0}
            fallback={
              <div class="text-center py-12 text-gray-500">
                <p class="text-4xl mb-4">🎉</p>
                <p>No todos yet. Add one above!</p>
              </div>
            }
          >
            <ul class="space-y-2">
              <For each={todos.items}>
                {(todo) => (
                  <TodoItem
                    id={todo.id}
                    title={todo.title}
                    completed={todo.completed}
                    onToggle={handleToggle}
                    onRemove={handleRemove}
                  />
                )}
              </For>
            </ul>
          </Show>
        </Show>

        {/* Info Box */}
        <div class="mt-8 p-4 bg-white/50 rounded-lg border border-white">
          <h2 class="font-semibold text-gray-700 mb-2">ℹ️ How it works</h2>
          <ul class="text-sm text-gray-600 space-y-1">
            <li>• <strong>Offline-first:</strong> Todos work without internet connection</li>
            <li>• <strong>Connect storage:</strong> Click the widget above to sync across devices</li>
            <li>• <strong>Privacy:</strong> Your data is stored in YOUR storage, not ours</li>
            <li>• <strong>Standards-based:</strong> Works with any remoteStorage provider</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
