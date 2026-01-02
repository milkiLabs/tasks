import { createContext, useContext, createSignal, onMount, type ParentComponent } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import remoteStorage, { initWidget, type Todo } from './remotestorage';

/**
 * Connection status for RemoteStorage
 */
export type ConnectionStatus = 'disconnected' | 'connected' | 'connecting';

/**
 * The shape of our RemoteStorage context
 */
interface RemoteStorageContextValue {
  // Connection state
  status: () => ConnectionStatus;
  userAddress: () => string | null;
  
  // Todos state and operations
  todos: Todo[];
  addTodo: (title: string) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  removeTodo: (id: string) => Promise<void>;
  updateTodo: (id: string, updates: Partial<Omit<Todo, 'id'>>) => Promise<void>;
  
  // Loading state
  isLoading: () => boolean;
  
  // Manual sync
  sync: () => void;
}

const RemoteStorageContext = createContext<RemoteStorageContextValue>();

/**
 * RemoteStorage Provider Component
 * 
 * This provider wraps your app and provides RemoteStorage functionality
 * to all child components through SolidJS context.
 * 
 * It handles:
 * - Initializing the RemoteStorage widget
 * - Managing connection state
 * - Syncing todos to/from storage
 * - Providing reactive todo state
 */
export const RemoteStorageProvider: ParentComponent<{ widgetContainerId?: string }> = (props) => {
  // Reactive state for connection status
  const [status, setStatus] = createSignal<ConnectionStatus>('disconnected');
  const [userAddress, setUserAddress] = createSignal<string | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);
  
  // Store for todos - using SolidJS store for fine-grained reactivity
  const [todos, setTodos] = createStore<Todo[]>([]);

  /**
   * Load all todos from RemoteStorage
   */
  const loadTodos = async () => {
    try {
      const storedTodos = await remoteStorage.todos.getAll();
      const todoArray = Object.values(storedTodos).sort((a, b) => b.createdAt - a.createdAt);
      setTodos(todoArray);
    } catch (error) {
      console.error('Error loading todos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Add a new todo
   */
  const addTodo = async (title: string) => {
    if (!title.trim()) return;
    
    const todo: Todo = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      completed: false,
      createdAt: Date.now()
    };
    
    // Optimistic update - add to local state immediately
    setTodos(produce((todos) => {
      todos.unshift(todo);
    }));
    
    // Persist to RemoteStorage
    await remoteStorage.todos.store(todo);
  };

  /**
   * Toggle todo completion status
   */
  const toggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    const updatedTodo = { ...todo, completed: !todo.completed };
    
    // Optimistic update
    setTodos(produce((todos) => {
      const index = todos.findIndex(t => t.id === id);
      if (index !== -1) {
        todos[index].completed = !todos[index].completed;
      }
    }));
    
    // Persist
    await remoteStorage.todos.store(updatedTodo);
  };

  /**
   * Remove a todo
   */
  const removeTodo = async (id: string) => {
    // Optimistic update
    setTodos(produce((todos) => {
      const index = todos.findIndex(t => t.id === id);
      if (index !== -1) {
        todos.splice(index, 1);
      }
    }));
    
    // Persist
    await remoteStorage.todos.remove(id);
  };

  /**
   * Update a todo with partial data
   */
  const updateTodo = async (id: string, updates: Partial<Omit<Todo, 'id'>>) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    const updatedTodo = { ...todo, ...updates };
    
    // Optimistic update
    setTodos(produce((todos) => {
      const index = todos.findIndex(t => t.id === id);
      if (index !== -1) {
        Object.assign(todos[index], updates);
      }
    }));
    
    // Persist
    await remoteStorage.todos.store(updatedTodo);
  };

  /**
   * Manual sync trigger
   */
  const sync = () => {
    if (remoteStorage.sync) {
      remoteStorage.startSync();
    }
  };

  onMount(() => {
    // Initialize the widget
    initWidget(props.widgetContainerId);
    
    // Track if initial load has happened
    let initialLoadDone = false;
    
    // Set up RemoteStorage event listeners
    
    // Fired when connection is established
    remoteStorage.on('connected', () => {
      setStatus('connected');
      setUserAddress(remoteStorage.remote.userAddress);
      console.log('RemoteStorage connected:', remoteStorage.remote.userAddress);
    });
    
    // Fired when disconnected
    remoteStorage.on('disconnected', () => {
      setStatus('disconnected');
      setUserAddress(null);
      console.log('RemoteStorage disconnected');
      // Keep local todos even when disconnected (offline-first)
    });
    
    // Fired when ready (storage is ready to use, may or may not be connected)
    remoteStorage.on('ready', () => {
      console.log('RemoteStorage ready');
      if (!initialLoadDone) {
        initialLoadDone = true;
        loadTodos();
      }
    });
    
    // Fired on errors
    remoteStorage.on('error', (error) => {
      console.error('RemoteStorage error:', error);
    });
    
    // Listen for changes to todos (from other tabs/devices/sync)
    // This is the proper way to react to data changes
    remoteStorage.todos.onChange((event: any) => {
      console.log('Todo change detected:', event.origin, event.relativePath);
      
      // Only reload for remote changes, not our own window changes
      if (event.origin === 'remote' || event.origin === 'local') {
        loadTodos();
      }
    });
  });

  const value: RemoteStorageContextValue = {
    status,
    userAddress,
    todos,
    addTodo,
    toggleTodo,
    removeTodo,
    updateTodo,
    isLoading,
    sync
  };

  return (
    <RemoteStorageContext.Provider value={value}>
      {props.children}
    </RemoteStorageContext.Provider>
  );
};

/**
 * Hook to use RemoteStorage context
 * 
 * Usage:
 * ```tsx
 * const { todos, addTodo, toggleTodo, removeTodo, status } = useRemoteStorage();
 * ```
 */
export function useRemoteStorage() {
  const context = useContext(RemoteStorageContext);
  if (!context) {
    throw new Error('useRemoteStorage must be used within a RemoteStorageProvider');
  }
  return context;
}
