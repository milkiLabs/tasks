/**
 * Home Page - Enhanced Todo App with Categories and Topics
 * 
 * Features:
 * - Categories and Topics for organization
 * - Advanced filtering (by category, topic, status, priority, search)
 * - Inline editing for todos
 * - Great UX with keyboard shortcuts and smooth interactions
 */

import { Component, createSignal, createMemo, Show, For, batch, onMount } from 'solid-js';
import { useCollection } from '../lib/solid-remotestorage';
import type { Todo, CategoryAssignment } from '../lib/modules/todos';
import type { Category } from '../lib/modules/categories';
import type { Topic } from '../lib/modules/categories';

// ============================================================================
// Types
// ============================================================================

interface FilterState {
  search: string;
  categoryId: string | null;
  topicId: string | null;
  status: 'all' | 'active' | 'completed';
  priority: 'all' | 'low' | 'medium' | 'high';
}

// ============================================================================
// Constants
// ============================================================================

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-800 border-green-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  high: 'bg-red-100 text-red-800 border-red-300',
};

const CATEGORY_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

// ============================================================================
// Home Component
// ============================================================================

const Home: Component = () => {
  // Collections
  const todos = useCollection<Todo>({
    getModule: (rs) => rs.todos,
    sortFn: (a, b) => b.createdAt - a.createdAt,
  });

  const categories = useCollection<Category>({
    getModule: (rs) => rs.categories,
    sortFn: (a, b) => a.name.localeCompare(b.name),
  });

  const topics = useCollection<Topic>({
    getModule: (rs) => rs.topics,
    sortFn: (a, b) => a.name.localeCompare(b.name),
  });

  // UI State
  const [filters, setFilters] = createSignal<FilterState>({
    search: '',
    categoryId: null,
    topicId: null,
    status: 'all',
    priority: 'all',
  });

  const [editingTodoId, setEditingTodoId] = createSignal<string | null>(null);
  const [showAddTodo, setShowAddTodo] = createSignal(false);
  const [showCategoryManager, setShowCategoryManager] = createSignal(false);
  const [showCategoryPicker, setShowCategoryPicker] = createSignal<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = createSignal(false);

  // New todo form state
  const [newTodoTitle, setNewTodoTitle] = createSignal('');
  const [newTodoDescription, setNewTodoDescription] = createSignal('');
  const [newTodoPriority, setNewTodoPriority] = createSignal<'low' | 'medium' | 'high'>('medium');
  const [newTodoDueDate, setNewTodoDueDate] = createSignal('');
  const [newTodoCategories, setNewTodoCategories] = createSignal<CategoryAssignment[]>([]);

  // Category manager state
  const [newCategoryName, setNewCategoryName] = createSignal('');
  const [newCategoryColor, setNewCategoryColor] = createSignal(CATEGORY_COLORS[0]);
  const [newTopicName, setNewTopicName] = createSignal('');
  const [selectedCategoryForTopic, setSelectedCategoryForTopic] = createSignal<string | null>(null);

  // Inline category picker state (for Add Todo modal)
  const [showInlineCategoryPicker, setShowInlineCategoryPicker] = createSignal(false);
  const [categorySearchQuery, setCategorySearchQuery] = createSignal('');
  const [inlineNewCategoryName, setInlineNewCategoryName] = createSignal('');
  const [inlineNewCategoryColor, setInlineNewCategoryColor] = createSignal(CATEGORY_COLORS[0]);
  const [showInlineNewCategory, setShowInlineNewCategory] = createSignal(false);
  const [inlineNewTopicName, setInlineNewTopicName] = createSignal('');
  const [inlineNewTopicForCategory, setInlineNewTopicForCategory] = createSignal<string | null>(null);

  // ============================================================================
  // Computed Values
  // ============================================================================

  // Filtered categories for the inline picker (searchable)
  const filteredCategoriesForPicker = createMemo(() => {
    const query = categorySearchQuery().toLowerCase().trim();
    if (!query) return categories.items;
    return categories.items.filter(c => c.name.toLowerCase().includes(query));
  });

  const filteredTodos = createMemo(() => {
    const f = filters();
    return todos.items.filter((todo) => {
      // Search filter
      if (f.search && !todo.title.toLowerCase().includes(f.search.toLowerCase()) &&
          !todo.description?.toLowerCase().includes(f.search.toLowerCase())) {
        return false;
      }

      // Status filter
      if (f.status === 'active' && todo.completed) return false;
      if (f.status === 'completed' && !todo.completed) return false;

      // Priority filter
      if (f.priority !== 'all' && todo.priority !== f.priority) return false;

      // Category filter
      if (f.categoryId) {
        const hasCategory = todo.categories?.some(c => c.categoryId === f.categoryId);
        if (!hasCategory) return false;
      }

      // Topic filter
      if (f.topicId) {
        const hasTopic = todo.categories?.some(c => c.topicIds?.includes(f.topicId!));
        if (!hasTopic) return false;
      }

      return true;
    });
  });

  const topicsForCategory = createMemo(() => {
    const catId = filters().categoryId;
    if (!catId) return topics.items;
    return topics.items.filter(t => t.categoryId === catId);
  });

  const todoStats = createMemo(() => {
    const all = todos.items;
    const completed = all.filter(t => t.completed).length;
    const active = all.length - completed;
    return { total: all.length, completed, active };
  });

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleAddTodo = async () => {
    const title = newTodoTitle().trim();
    if (!title) return;

    // Build todo object with only defined values (schema validation fails on undefined)
    const todoData: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'> = {
      title,
      completed: false,
    };

    const description = newTodoDescription().trim();
    if (description) {
      todoData.description = description;
    }

    const priority = newTodoPriority();
    if (priority) {
      todoData.priority = priority;
    }

    const dueDate = newTodoDueDate();
    if (dueDate) {
      todoData.dueDate = new Date(dueDate).getTime();
    }

    const categories = newTodoCategories();
    if (categories.length > 0) {
      todoData.categories = categories;
    }

    await todos.add(todoData);

    // Reset form
    batch(() => {
      setNewTodoTitle('');
      setNewTodoDescription('');
      setNewTodoPriority('medium');
      setNewTodoDueDate('');
      setNewTodoCategories([]);
      setShowAddTodo(false);
    });
  };

  const handleToggleTodo = async (todo: Todo) => {
    await todos.update(todo.id, { completed: !todo.completed });
  };

  const handleDeleteTodo = async (id: string) => {
    await todos.remove(id);
  };

  const handleUpdateTodo = async (id: string, updates: Partial<Todo>) => {
    await todos.update(id, updates);
    setEditingTodoId(null);
  };

  const handleAddCategory = async () => {
    const name = newCategoryName().trim();
    if (!name) return;

    await categories.add({
      name,
      color: newCategoryColor(),
    });

    batch(() => {
      setNewCategoryName('');
      setNewCategoryColor(CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)]);
    });
  };

  const handleDeleteCategory = async (id: string) => {
    // Remove category from all todos
    const todosWithCategory = todos.items.filter(t => 
      t.categories?.some(c => c.categoryId === id)
    );
    
    for (const todo of todosWithCategory) {
      const newCategories = todo.categories?.filter(c => c.categoryId !== id);
      if (newCategories && newCategories.length > 0) {
        await todos.update(todo.id, { categories: newCategories });
      } else {
        // Need to remove categories entirely - get full todo and store without categories
        const existingTodo = await todos.find(todo.id);
        if (existingTodo) {
          const { categories: _, ...todoWithoutCategories } = existingTodo;
          await todos.update(todo.id, todoWithoutCategories);
        }
      }
    }

    // Delete topics in this category
    const categoryTopics = topics.items.filter(t => t.categoryId === id);
    for (const topic of categoryTopics) {
      await topics.remove(topic.id);
    }

    await categories.remove(id);
  };

  const handleAddTopic = async () => {
    const name = newTopicName().trim();
    const categoryId = selectedCategoryForTopic();
    if (!name || !categoryId) return;

    const category = categories.items.find(c => c.id === categoryId);
    
    await topics.add({
      name,
      categoryId,
      color: category?.color,
    });

    setNewTopicName('');
  };

  const handleDeleteTopic = async (id: string) => {
    // Remove topic from all todos
    const todosWithTopic = todos.items.filter(t => 
      t.categories?.some(c => c.topicIds?.includes(id))
    );
    
    for (const todo of todosWithTopic) {
      const newCategories = todo.categories?.map(c => ({
        ...c,
        topicIds: c.topicIds?.filter(tId => tId !== id)
      }));
      await todos.update(todo.id, { categories: newCategories });
    }

    await topics.remove(id);
  };

  const toggleCategoryOnTodo = (todoId: string, categoryId: string) => {
    const todo = todos.items.find(t => t.id === todoId);
    if (!todo) return;

    const existing = todo.categories || [];
    const hasCategory = existing.some(c => c.categoryId === categoryId);

    let newCategories: CategoryAssignment[];
    if (hasCategory) {
      newCategories = existing.filter(c => c.categoryId !== categoryId);
    } else {
      newCategories = [...existing, { categoryId, topicIds: [] }];
    }

    if (newCategories.length > 0) {
      todos.update(todoId, { categories: newCategories });
    } else {
      // Remove categories - update with all fields except categories
      const currentTodo = todos.items.find(t => t.id === todoId);
      if (currentTodo) {
        const updates: Partial<Todo> = { title: currentTodo.title, completed: currentTodo.completed };
        if (currentTodo.description) updates.description = currentTodo.description;
        if (currentTodo.priority) updates.priority = currentTodo.priority;
        if (currentTodo.dueDate) updates.dueDate = currentTodo.dueDate;
        todos.update(todoId, updates);
      }
    }
  };

  const toggleTopicOnTodo = (todoId: string, categoryId: string, topicId: string) => {
    const todo = todos.items.find(t => t.id === todoId);
    if (!todo) return;

    const existing = todo.categories || [];
    const categoryAssignment = existing.find(c => c.categoryId === categoryId);
    
    let newCategories: CategoryAssignment[];
    if (!categoryAssignment) {
      // Add category with the topic
      newCategories = [...existing, { categoryId, topicIds: [topicId] }];
    } else {
      const hasTopicAlready = categoryAssignment.topicIds?.includes(topicId);
      newCategories = existing.map(c => {
        if (c.categoryId !== categoryId) return c;
        return {
          ...c,
          topicIds: hasTopicAlready 
            ? c.topicIds?.filter(t => t !== topicId) 
            : [...(c.topicIds || []), topicId]
        };
      });
    }

    if (newCategories.length > 0) {
      todos.update(todoId, { categories: newCategories });
    } else {
      // Remove categories - update with all fields except categories
      const currentTodo = todos.items.find(t => t.id === todoId);
      if (currentTodo) {
        const updates: Partial<Todo> = { title: currentTodo.title, completed: currentTodo.completed };
        if (currentTodo.description) updates.description = currentTodo.description;
        if (currentTodo.priority) updates.priority = currentTodo.priority;
        if (currentTodo.dueDate) updates.dueDate = currentTodo.dueDate;
        todos.update(todoId, updates);
      }
    }
  };

  const toggleCategoryForNewTodo = (categoryId: string) => {
    const existing = newTodoCategories();
    const hasCategory = existing.some(c => c.categoryId === categoryId);

    if (hasCategory) {
      setNewTodoCategories(existing.filter(c => c.categoryId !== categoryId));
    } else {
      setNewTodoCategories([...existing, { categoryId, topicIds: [] }]);
    }
  };

  const toggleTopicForNewTodo = (categoryId: string, topicId: string) => {
    const existing = newTodoCategories();
    const categoryAssignment = existing.find(c => c.categoryId === categoryId);

    if (!categoryAssignment) {
      setNewTodoCategories([...existing, { categoryId, topicIds: [topicId] }]);
    } else {
      const hasTopicAlready = categoryAssignment.topicIds?.includes(topicId);
      setNewTodoCategories(existing.map(c => {
        if (c.categoryId !== categoryId) return c;
        return {
          ...c,
          topicIds: hasTopicAlready 
            ? c.topicIds?.filter(t => t !== topicId) 
            : [...(c.topicIds || []), topicId]
        };
      }));
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      categoryId: null,
      topicId: null,
      status: 'all',
      priority: 'all',
    });
  };

  const hasActiveFilters = createMemo(() => {
    const f = filters();
    return f.search || f.categoryId || f.topicId || f.status !== 'all' || f.priority !== 'all';
  });

  // Inline category creation (from Add Todo modal)
  const handleInlineAddCategory = async () => {
    const name = inlineNewCategoryName().trim();
    if (!name) return;

    const newCat = await categories.add({
      name,
      color: inlineNewCategoryColor(),
    });

    // Auto-select the new category
    toggleCategoryForNewTodo(newCat.id);

    // Reset inline form
    batch(() => {
      setInlineNewCategoryName('');
      setInlineNewCategoryColor(CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)]);
      setShowInlineNewCategory(false);
      setCategorySearchQuery('');
    });
  };

  // Inline topic creation (from Add Todo modal)
  const handleInlineAddTopic = async (categoryId: string) => {
    const name = inlineNewTopicName().trim();
    if (!name) return;

    const category = categories.items.find(c => c.id === categoryId);
    
    const newTopic = await topics.add({
      name,
      categoryId,
      color: category?.color,
    });

    // Auto-select the new topic
    toggleTopicForNewTodo(categoryId, newTopic.id);

    // Reset
    batch(() => {
      setInlineNewTopicName('');
      setInlineNewTopicForCategory(null);
    });
  };

  // Remove a category from the new todo
  const removeCategoryFromNewTodo = (categoryId: string) => {
    setNewTodoCategories(newTodoCategories().filter(c => c.categoryId !== categoryId));
  };

  // Remove a topic from the new todo
  const removeTopicFromNewTodo = (categoryId: string, topicId: string) => {
    setNewTodoCategories(newTodoCategories().map(c => {
      if (c.categoryId !== categoryId) return c;
      return {
        ...c,
        topicIds: c.topicIds?.filter(t => t !== topicId)
      };
    }));
  };

  // Reset inline picker state when closing Add Todo modal
  const closeAddTodoModal = () => {
    batch(() => {
      setShowAddTodo(false);
      setShowInlineCategoryPicker(false);
      setCategorySearchQuery('');
      setShowInlineNewCategory(false);
      setInlineNewCategoryName('');
      setInlineNewTopicName('');
      setInlineNewTopicForCategory(null);
    });
  };

  // ============================================================================
  // Keyboard Shortcuts
  // ============================================================================

  onMount(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
      // Escape to close modals
      if (e.key === 'Escape') {
        batch(() => {
          setShowAddTodo(false);
          setShowCategoryManager(false);
          setShowCategoryPicker(null);
          setEditingTodoId(null);
          setShowMobileFilters(false);
        });
      }
      // Cmd/Ctrl + N to add todo
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setShowAddTodo(true);
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  });

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <header class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div class="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div class="flex items-center justify-between">
            <div class="min-w-0 flex-1">
              <h1 class="text-xl sm:text-2xl font-bold text-gray-900 truncate">Todo App</h1>
              <p class="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
                {todoStats().active} active, {todoStats().completed} completed
              </p>
            </div>
            <div class="flex gap-1.5 sm:gap-2 flex-shrink-0">
              {/* Mobile Filter Button */}
              <button
                onClick={() => setShowMobileFilters(true)}
                class="lg:hidden p-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Filters"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <Show when={hasActiveFilters()}>
                  <span class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-600 rounded-full" />
                </Show>
              </button>
              <button
                onClick={() => setShowCategoryManager(true)}
                class="hidden sm:flex px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors items-center gap-1"
              >
                <span class="hidden sm:inline">📁</span>
                <span class="hidden md:inline">Categories</span>
                <span class="md:hidden">📁</span>
              </button>
              <button
                onClick={() => setShowCategoryManager(true)}
                class="sm:hidden p-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Categories"
              >
                📁
              </button>
              <button
                onClick={() => setShowAddTodo(true)}
                class="hidden sm:flex px-3 sm:px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors items-center gap-1"
              >
                <span>+</span>
                <span class="hidden sm:inline">Add Todo</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div class="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div class="flex gap-4 lg:gap-6">
          {/* Sidebar - Filters (Desktop) */}
          <aside class="hidden lg:block w-64 flex-shrink-0">
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-20">
              <div class="flex items-center justify-between mb-4">
                <h2 class="font-semibold text-gray-900">Filters</h2>
                <Show when={hasActiveFilters()}>
                  <button
                    onClick={clearFilters}
                    class="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Clear all
                  </button>
                </Show>
              </div>

              {/* Search */}
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  id="search-input"
                  type="text"
                  placeholder="Search todos..."
                  value={filters().search}
                  onInput={(e) => setFilters(f => ({ ...f, search: e.currentTarget.value }))}
                  class="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Status Filter */}
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters().status}
                  onChange={(e) => setFilters(f => ({ ...f, status: e.currentTarget.value as any }))}
                  class="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={filters().priority}
                  onChange={(e) => setFilters(f => ({ ...f, priority: e.currentTarget.value as any }))}
                  class="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">🔴 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
              </div>

              {/* Category Filter */}
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <div class="space-y-1">
                  <button
                    onClick={() => setFilters(f => ({ ...f, categoryId: null, topicId: null }))}
                    class={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors ${
                      !filters().categoryId ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100 active:bg-gray-200'
                    }`}
                  >
                    All Categories
                  </button>
                  <For each={categories.items}>
                    {(category) => (
                      <button
                        onClick={() => setFilters(f => ({ 
                          ...f, 
                          categoryId: f.categoryId === category.id ? null : category.id,
                          topicId: null 
                        }))}
                        class={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                          filters().categoryId === category.id ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100 active:bg-gray-200'
                        }`}
                      >
                        <span 
                          class="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ "background-color": category.color }}
                        />
                        <span class="truncate">{category.name}</span>
                      </button>
                    )}
                  </For>
                </div>
              </div>

              {/* Topic Filter (shown when category is selected) */}
              <Show when={filters().categoryId && topicsForCategory().length > 0}>
                <div class="mb-4">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Topic</label>
                  <div class="space-y-1">
                    <button
                      onClick={() => setFilters(f => ({ ...f, topicId: null }))}
                      class={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors ${
                        !filters().topicId ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100 active:bg-gray-200'
                      }`}
                    >
                      All Topics
                    </button>
                    <For each={topicsForCategory()}>
                      {(topic) => (
                        <button
                          onClick={() => setFilters(f => ({ 
                            ...f, 
                            topicId: f.topicId === topic.id ? null : topic.id 
                          }))}
                          class={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors pl-6 ${
                            filters().topicId === topic.id ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100 active:bg-gray-200'
                          }`}
                        >
                          {topic.name}
                        </button>
                      )}
                    </For>
                  </div>
                </div>
              </Show>
            </div>
          </aside>

          {/* Main Content - Todo List */}
          <main class="flex-1 min-w-0 w-full">
            <Show 
              when={!todos.isLoading()} 
              fallback={
                <div class="flex items-center justify-center py-12">
                  <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              }
            >
              <Show 
                when={filteredTodos().length > 0}
                fallback={
                  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                    <div class="text-gray-400 text-4xl mb-2">📝</div>
                    <h3 class="text-lg font-medium text-gray-900 mb-1">
                      {hasActiveFilters() ? 'No matching todos' : 'No todos yet'}
                    </h3>
                    <p class="text-gray-500 text-sm mb-4">
                      {hasActiveFilters() 
                        ? 'Try adjusting your filters' 
                        : 'Click "Add Todo" to create your first todo'}
                    </p>
                    <Show when={hasActiveFilters()}>
                      <button
                        onClick={clearFilters}
                        class="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Clear filters
                      </button>
                    </Show>
                  </div>
                }
              >
                <div class="space-y-2 sm:space-y-3">
                  <For each={filteredTodos()}>
                    {(todo) => (
                      <TodoItem
                        todo={todo}
                        categories={categories.items}
                        topics={topics.items}
                        isEditing={editingTodoId() === todo.id}
                        showCategoryPicker={showCategoryPicker() === todo.id}
                        onToggle={() => handleToggleTodo(todo)}
                        onDelete={() => handleDeleteTodo(todo.id)}
                        onEdit={() => setEditingTodoId(todo.id)}
                        onSave={(updates) => handleUpdateTodo(todo.id, updates)}
                        onCancel={() => setEditingTodoId(null)}
                        onToggleCategoryPicker={() => setShowCategoryPicker(
                          showCategoryPicker() === todo.id ? null : todo.id
                        )}
                        onToggleCategory={(catId) => toggleCategoryOnTodo(todo.id, catId)}
                        onToggleTopic={(catId, topicId) => toggleTopicOnTodo(todo.id, catId, topicId)}
                      />
                    )}
                  </For>
                </div>
              </Show>
            </Show>
          </main>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <Show when={showMobileFilters()}>
        <div class="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            class="fixed inset-0 bg-black/50" 
            onClick={() => setShowMobileFilters(false)}
          />
          
          {/* Drawer */}
          <div class="fixed inset-y-0 left-0 w-full max-w-xs bg-white shadow-xl flex flex-col">
            <div class="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 class="text-lg font-semibold text-gray-900">Filters</h2>
              <div class="flex items-center gap-2">
                <Show when={hasActiveFilters()}>
                  <button
                    onClick={clearFilters}
                    class="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear all
                  </button>
                </Show>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  class="p-2 text-gray-400 hover:text-gray-600 -mr-2"
                >
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div class="flex-1 overflow-y-auto p-4">
              {/* Search */}
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search todos..."
                  value={filters().search}
                  onInput={(e) => setFilters(f => ({ ...f, search: e.currentTarget.value }))}
                  class="w-full px-3 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Status Filter */}
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters().status}
                  onChange={(e) => setFilters(f => ({ ...f, status: e.currentTarget.value as any }))}
                  class="w-full px-3 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={filters().priority}
                  onChange={(e) => setFilters(f => ({ ...f, priority: e.currentTarget.value as any }))}
                  class="w-full px-3 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">🔴 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
              </div>

              {/* Category Filter */}
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <div class="space-y-1">
                  <button
                    onClick={() => setFilters(f => ({ ...f, categoryId: null, topicId: null }))}
                    class={`w-full text-left px-3 py-3 text-base rounded-lg transition-colors ${
                      !filters().categoryId ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100 active:bg-gray-200'
                    }`}
                  >
                    All Categories
                  </button>
                  <For each={categories.items}>
                    {(category) => (
                      <button
                        onClick={() => setFilters(f => ({ 
                          ...f, 
                          categoryId: f.categoryId === category.id ? null : category.id,
                          topicId: null 
                        }))}
                        class={`w-full text-left px-3 py-3 text-base rounded-lg transition-colors flex items-center gap-2 ${
                          filters().categoryId === category.id ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100 active:bg-gray-200'
                        }`}
                      >
                        <span 
                          class="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ "background-color": category.color }}
                        />
                        <span class="truncate">{category.name}</span>
                      </button>
                    )}
                  </For>
                </div>
              </div>

              {/* Topic Filter */}
              <Show when={filters().categoryId && topicsForCategory().length > 0}>
                <div class="mb-4">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Topic</label>
                  <div class="space-y-1">
                    <button
                      onClick={() => setFilters(f => ({ ...f, topicId: null }))}
                      class={`w-full text-left px-3 py-3 text-base rounded-lg transition-colors ${
                        !filters().topicId ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100 active:bg-gray-200'
                      }`}
                    >
                      All Topics
                    </button>
                    <For each={topicsForCategory()}>
                      {(topic) => (
                        <button
                          onClick={() => setFilters(f => ({ 
                            ...f, 
                            topicId: f.topicId === topic.id ? null : topic.id 
                          }))}
                          class={`w-full text-left px-3 py-3 text-base rounded-lg transition-colors pl-6 ${
                            filters().topicId === topic.id ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100 active:bg-gray-200'
                          }`}
                        >
                          {topic.name}
                        </button>
                      )}
                    </For>
                  </div>
                </div>
              </Show>
            </div>

            {/* Apply Button */}
            <div class="p-4 border-t border-gray-200">
              <button
                onClick={() => setShowMobileFilters(false)}
                class="w-full py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Add Todo Modal */}
      <Show when={showAddTodo()}>
        <div class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div class="bg-white rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <div class="p-4 sm:p-6">
              <h2 class="text-lg sm:text-xl font-bold text-gray-900 mb-4">Add New Todo</h2>
              
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    value={newTodoTitle()}
                    onInput={(e) => setNewTodoTitle(e.currentTarget.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                    placeholder="What needs to be done?"
                    class="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autofocus
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newTodoDescription()}
                    onInput={(e) => setNewTodoDescription(e.currentTarget.value)}
                    placeholder="Add more details..."
                    rows={3}
                    class="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={newTodoPriority()}
                      onChange={(e) => setNewTodoPriority(e.currentTarget.value as any)}
                      class="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">🟢 Low</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="high">🔴 High</option>
                    </select>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={newTodoDueDate()}
                      onInput={(e) => setNewTodoDueDate(e.currentTarget.value)}
                      class="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Category Selection for New Todo - Improved */}
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Categories & Topics</label>
                  
                  {/* Selected Categories Display */}
                  <Show when={newTodoCategories().length > 0}>
                    <div class="mb-3 flex flex-wrap gap-2">
                      <For each={newTodoCategories()}>
                        {(assignment) => {
                          const category = () => categories.items.find(c => c.id === assignment.categoryId);
                          const assignedTopics = () => (assignment.topicIds || [])
                            .map(tid => topics.items.find(t => t.id === tid))
                            .filter(Boolean);
                          
                          return (
                            <Show when={category()}>
                              <div class="flex flex-wrap items-center gap-1">
                                <span 
                                  class="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 text-sm rounded-lg"
                                  style={{ 
                                    "background-color": category()!.color + '20',
                                    color: category()!.color
                                  }}
                                >
                                  <span 
                                    class="w-2 h-2 rounded-full" 
                                    style={{ "background-color": category()!.color }}
                                  />
                                  <span class="font-medium">{category()!.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeCategoryFromNewTodo(assignment.categoryId)}
                                    class="ml-0.5 p-0.5 rounded hover:bg-black/10"
                                  >
                                    <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                                    </svg>
                                  </button>
                                </span>
                                <For each={assignedTopics()}>
                                  {(topic) => (
                                    <span class="inline-flex items-center gap-1 pl-2 pr-1 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                      {topic!.name}
                                      <button
                                        type="button"
                                        onClick={() => removeTopicFromNewTodo(assignment.categoryId, topic!.id)}
                                        class="p-0.5 rounded hover:bg-gray-300"
                                      >
                                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                                        </svg>
                                      </button>
                                    </span>
                                  )}
                                </For>
                              </div>
                            </Show>
                          );
                        }}
                      </For>
                    </div>
                  </Show>

                  {/* Add Category Button / Dropdown */}
                  <div class="relative">
                    <button
                      type="button"
                      onClick={() => setShowInlineCategoryPicker(!showInlineCategoryPicker())}
                      class="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg transition-colors"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Category
                    </button>

                    {/* Category Picker Dropdown */}
                    <Show when={showInlineCategoryPicker()}>
                      <div class="absolute left-0 top-full mt-2 w-full sm:w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                        {/* Search Input */}
                        <div class="p-3 border-b border-gray-100">
                          <input
                            type="text"
                            placeholder="Search or create category..."
                            value={categorySearchQuery()}
                            onInput={(e) => setCategorySearchQuery(e.currentTarget.value)}
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            autofocus
                          />
                        </div>

                        {/* Categories List */}
                        <div class="max-h-64 overflow-y-auto p-2">
                          <For each={filteredCategoriesForPicker()}>
                            {(category) => {
                              const isSelected = () => newTodoCategories().some(c => c.categoryId === category.id);
                              const categoryTopics = () => topics.items.filter(t => t.categoryId === category.id);
                              const selectedTopics = () => newTodoCategories().find(c => c.categoryId === category.id)?.topicIds || [];
                              
                              return (
                                <div class="mb-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleCategoryForNewTodo(category.id)}
                                    class={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-colors ${
                                      isSelected() 
                                        ? 'bg-blue-50 text-blue-800' 
                                        : 'hover:bg-gray-100 active:bg-gray-200'
                                    }`}
                                  >
                                    <div class="flex items-center gap-2">
                                      <span 
                                        class="w-3 h-3 rounded-full flex-shrink-0" 
                                        style={{ "background-color": category.color }}
                                      />
                                      <span>{category.name}</span>
                                    </div>
                                    <Show when={isSelected()}>
                                      <svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                      </svg>
                                    </Show>
                                  </button>
                                  
                                  {/* Topics for this category */}
                                  <Show when={isSelected() && (categoryTopics().length > 0 || inlineNewTopicForCategory() === category.id)}>
                                    <div class="ml-5 mt-1 pl-3 border-l-2 border-gray-200">
                                      <div class="flex flex-wrap gap-1 py-1">
                                        <For each={categoryTopics()}>
                                          {(topic) => {
                                            const isTopicSelected = () => selectedTopics().includes(topic.id);
                                            return (
                                              <button
                                                type="button"
                                                onClick={() => toggleTopicForNewTodo(category.id, topic.id)}
                                                class={`px-2 py-1 text-xs rounded transition-colors ${
                                                  isTopicSelected() 
                                                    ? 'bg-gray-800 text-white' 
                                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                                }`}
                                              >
                                                {topic.name}
                                              </button>
                                            );
                                          }}
                                        </For>
                                        
                                        {/* Add Topic Button/Input */}
                                        <Show 
                                          when={inlineNewTopicForCategory() === category.id}
                                          fallback={
                                            <button
                                              type="button"
                                              onClick={() => setInlineNewTopicForCategory(category.id)}
                                              class="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                            >
                                              + Add topic
                                            </button>
                                          }
                                        >
                                          <div class="flex items-center gap-1 w-full mt-1">
                                            <input
                                              type="text"
                                              placeholder="Topic name"
                                              value={inlineNewTopicName()}
                                              onInput={(e) => setInlineNewTopicName(e.currentTarget.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                  e.preventDefault();
                                                  handleInlineAddTopic(category.id);
                                                }
                                                if (e.key === 'Escape') setInlineNewTopicForCategory(null);
                                              }}
                                              class="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                              autofocus
                                            />
                                            <button
                                              type="button"
                                              onClick={() => handleInlineAddTopic(category.id)}
                                              disabled={!inlineNewTopicName().trim()}
                                              class="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                                            >
                                              Add
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setInlineNewTopicForCategory(null)}
                                              class="p-1 text-gray-400 hover:text-gray-600"
                                            >
                                              <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                                              </svg>
                                            </button>
                                          </div>
                                        </Show>
                                      </div>
                                    </div>
                                  </Show>
                                </div>
                              );
                            }}
                          </For>

                          {/* Empty state / Create new */}
                          <Show when={filteredCategoriesForPicker().length === 0 && !showInlineNewCategory()}>
                            <div class="p-3 text-center">
                              <p class="text-sm text-gray-500 mb-2">
                                {categorySearchQuery() ? `No category "${categorySearchQuery()}" found` : 'No categories yet'}
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setInlineNewCategoryName(categorySearchQuery());
                                  setShowInlineNewCategory(true);
                                }}
                                class="text-sm text-blue-600 hover:text-blue-800 font-medium"
                              >
                                + Create "{categorySearchQuery() || 'new category'}"
                              </button>
                            </div>
                          </Show>
                        </div>

                        {/* Create New Category Section */}
                        <Show when={!showInlineNewCategory() && filteredCategoriesForPicker().length > 0}>
                          <div class="p-2 border-t border-gray-100">
                            <button
                              type="button"
                              onClick={() => setShowInlineNewCategory(true)}
                              class="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              Create new category
                            </button>
                          </div>
                        </Show>

                        {/* New Category Form */}
                        <Show when={showInlineNewCategory()}>
                          <div class="p-3 border-t border-gray-100 bg-gray-50">
                            <div class="text-sm font-medium text-gray-700 mb-2">New Category</div>
                            <div class="flex flex-col gap-2">
                              <input
                                type="text"
                                placeholder="Category name"
                                value={inlineNewCategoryName()}
                                onInput={(e) => setInlineNewCategoryName(e.currentTarget.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleInlineAddCategory();
                                  }
                                  if (e.key === 'Escape') setShowInlineNewCategory(false);
                                }}
                                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                autofocus
                              />
                              <div class="flex items-center justify-between">
                                <div class="flex items-center gap-1">
                                  <For each={CATEGORY_COLORS}>
                                    {(color) => (
                                      <button
                                        type="button"
                                        onClick={() => setInlineNewCategoryColor(color)}
                                        class={`w-6 h-6 rounded-full border-2 transition-transform ${
                                          inlineNewCategoryColor() === color ? 'scale-110 border-gray-800' : 'border-transparent hover:scale-105'
                                        }`}
                                        style={{ "background-color": color }}
                                      />
                                    )}
                                  </For>
                                </div>
                                <div class="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setShowInlineNewCategory(false)}
                                    class="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleInlineAddCategory}
                                    disabled={!inlineNewCategoryName().trim()}
                                    class="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                                  >
                                    Create
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Show>

                        {/* Close button at bottom */}
                        <div class="p-2 border-t border-gray-100">
                          <button
                            type="button"
                            onClick={() => setShowInlineCategoryPicker(false)}
                            class="w-full py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    </Show>
                  </div>
                </div>
              </div>
            </div>

            <div class="bg-gray-50 px-4 sm:px-6 py-4 rounded-b-xl flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={closeAddTodoModal}
                class="px-4 py-3 sm:py-2 text-base sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTodo}
                disabled={!newTodoTitle().trim()}
                class="px-4 py-3 sm:py-2 text-base sm:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Todo
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Category Manager Modal */}
      <Show when={showCategoryManager()}>
        <div class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div class="bg-white rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-2xl max-h-[90vh] sm:max-h-[80vh] flex flex-col">
            <div class="p-4 sm:p-6 border-b border-gray-200">
              <div class="flex items-center justify-between">
                <h2 class="text-lg sm:text-xl font-bold text-gray-900">Category Manager</h2>
                <button
                  onClick={() => setShowCategoryManager(false)}
                  class="p-2 -mr-2 text-gray-400 hover:text-gray-600"
                >
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div class="flex-1 overflow-y-auto p-4 sm:p-6">
              {/* Add Category */}
              <div class="mb-6">
                <h3 class="text-sm font-semibold text-gray-700 mb-2">Add Category</h3>
                <div class="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newCategoryName()}
                    onInput={(e) => setNewCategoryName(e.currentTarget.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                    placeholder="Category name"
                    class="flex-1 px-3 py-3 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <div class="flex items-center justify-between sm:justify-start gap-2">
                    <div class="flex items-center gap-1 flex-wrap">
                      <For each={CATEGORY_COLORS}>
                        {(color) => (
                          <button
                            type="button"
                            onClick={() => setNewCategoryColor(color)}
                            class={`w-7 h-7 sm:w-6 sm:h-6 rounded-full border-2 transition-transform ${
                              newCategoryColor() === color ? 'scale-110 border-gray-800' : 'border-transparent hover:scale-105'
                            }`}
                            style={{ "background-color": color }}
                          />
                        )}
                      </For>
                    </div>
                    <button
                      onClick={handleAddCategory}
                      disabled={!newCategoryName().trim()}
                      class="px-4 py-2.5 sm:py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Categories List */}
              <div class="space-y-4">
                <For each={categories.items}>
                  {(category) => {
                    const categoryTopics = () => topics.items.filter(t => t.categoryId === category.id);
                    
                    return (
                      <div class="border border-gray-200 rounded-lg p-4">
                        <div class="flex items-center justify-between mb-3">
                          <div class="flex items-center gap-2">
                            <span 
                              class="w-4 h-4 rounded-full" 
                              style={{ "background-color": category.color }}
                            />
                            <span class="font-medium text-gray-900">{category.name}</span>
                            <span class="text-sm text-gray-500">
                              ({categoryTopics().length} topics)
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            class="text-red-600 hover:text-red-800 text-sm"
                          >
                            Delete
                          </button>
                        </div>

                        {/* Topics */}
                        <div class="pl-6 space-y-2">
                          <div class="flex flex-wrap gap-2">
                            <For each={categoryTopics()}>
                              {(topic) => (
                                <div class="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm">
                                  <span>{topic.name}</span>
                                  <button
                                    onClick={() => handleDeleteTopic(topic.id)}
                                    class="text-gray-400 hover:text-red-600 ml-1"
                                  >
                                    ×
                                  </button>
                                </div>
                              )}
                            </For>
                          </div>

                          {/* Add Topic */}
                          <div class="flex gap-2">
                            <Show 
                              when={selectedCategoryForTopic() === category.id}
                              fallback={
                                <button
                                  onClick={() => setSelectedCategoryForTopic(category.id)}
                                  class="text-sm text-blue-600 hover:text-blue-800"
                                >
                                  + Add topic
                                </button>
                              }
                            >
                              <input
                                type="text"
                                value={newTopicName()}
                                onInput={(e) => setNewTopicName(e.currentTarget.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddTopic();
                                  if (e.key === 'Escape') setSelectedCategoryForTopic(null);
                                }}
                                placeholder="Topic name"
                                class="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                autofocus
                              />
                              <button
                                onClick={handleAddTopic}
                                disabled={!newTopicName().trim()}
                                class="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                              >
                                Add
                              </button>
                              <button
                                onClick={() => setSelectedCategoryForTopic(null)}
                                class="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                              >
                                Cancel
                              </button>
                            </Show>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                </For>

                <Show when={categories.items.length === 0}>
                  <div class="text-center py-8 text-gray-500">
                    <p>No categories yet. Create your first one above!</p>
                  </div>
                </Show>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* Floating Action Button for Mobile */}
      <button
        onClick={() => setShowAddTodo(true)}
        class="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 active:bg-blue-800 transition-all hover:scale-105 active:scale-95 flex items-center justify-center z-30"
        style={{ "box-shadow": "0 4px 14px rgba(59, 130, 246, 0.4)" }}
        title="Add Todo"
      >
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>
    </div>
  );
};

// ============================================================================
// TodoItem Component
// ============================================================================

interface TodoItemProps {
  todo: Todo;
  categories: Category[];
  topics: Topic[];
  isEditing: boolean;
  showCategoryPicker: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onSave: (updates: Partial<Todo>) => void;
  onCancel: () => void;
  onToggleCategoryPicker: () => void;
  onToggleCategory: (categoryId: string) => void;
  onToggleTopic: (categoryId: string, topicId: string) => void;
}

const TodoItem: Component<TodoItemProps> = (props) => {
  const [editTitle, setEditTitle] = createSignal(props.todo.title);
  const [editDescription, setEditDescription] = createSignal(props.todo.description || '');
  const [editPriority, setEditPriority] = createSignal(props.todo.priority || 'medium');
  const [editDueDate, setEditDueDate] = createSignal(
    props.todo.dueDate ? new Date(props.todo.dueDate).toISOString().split('T')[0] : ''
  );

  // Reset edit state when editing starts
  const resetEditState = () => {
    setEditTitle(props.todo.title);
    setEditDescription(props.todo.description || '');
    setEditPriority(props.todo.priority || 'medium');
    setEditDueDate(props.todo.dueDate ? new Date(props.todo.dueDate).toISOString().split('T')[0] : '');
  };

  // Get categories for this todo
  const todoCategories = createMemo(() => {
    return (props.todo.categories || []).map(assignment => {
      const category = props.categories.find(c => c.id === assignment.categoryId);
      const assignedTopics = (assignment.topicIds || [])
        .map(tid => props.topics.find(t => t.id === tid))
        .filter(Boolean);
      return { category, topics: assignedTopics };
    }).filter(item => item.category);
  });

  const handleSave = () => {
    // Build updates object with only defined values
    const updates: Partial<Todo> = {
      title: editTitle().trim(),
    };

    const description = editDescription().trim();
    if (description) {
      updates.description = description;
    }

    const priority = editPriority();
    if (priority) {
      updates.priority = priority as Todo['priority'];
    }

    const dueDate = editDueDate();
    if (dueDate) {
      updates.dueDate = new Date(dueDate).getTime();
    }

    props.onSave(updates);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOverdue = () => {
    if (!props.todo.dueDate || props.todo.completed) return false;
    return props.todo.dueDate < Date.now();
  };

  return (
    <div 
      class={`bg-white rounded-lg shadow-sm border transition-all ${
        props.todo.completed ? 'opacity-60' : ''
      } ${props.isEditing ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:shadow-md'}`}
    >
      <Show
        when={!props.isEditing}
        fallback={
          // Edit Mode
          <div class="p-3 sm:p-4 space-y-3">
            <input
              type="text"
              value={editTitle()}
              onInput={(e) => setEditTitle(e.currentTarget.value)}
              class="w-full px-3 py-3 sm:py-2 text-base sm:text-lg font-medium border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              autofocus
              onFocus={resetEditState}
            />
            <textarea
              value={editDescription()}
              onInput={(e) => setEditDescription(e.currentTarget.value)}
              placeholder="Description (optional)"
              rows={2}
              class="w-full px-3 py-3 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div class="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <select
                value={editPriority()}
                onChange={(e) => setEditPriority(e.currentTarget.value as any)}
                class="px-3 py-3 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
              </select>
              <input
                type="date"
                value={editDueDate()}
                onInput={(e) => setEditDueDate(e.currentTarget.value)}
                class="px-3 py-3 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button
                onClick={props.onCancel}
                class="px-4 py-2.5 sm:py-1.5 text-base sm:text-sm text-gray-600 hover:text-gray-800 active:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                class="px-4 py-2.5 sm:py-1.5 text-base sm:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800"
              >
                Save
              </button>
            </div>
          </div>
        }
      >
        {/* View Mode */}
        <div class="p-3 sm:p-4">
          <div class="flex items-start gap-3">
            {/* Checkbox */}
            <button
              onClick={props.onToggle}
              class={`flex-shrink-0 w-6 h-6 sm:w-5 sm:h-5 mt-0.5 rounded-full border-2 transition-colors flex items-center justify-center ${
                props.todo.completed 
                  ? 'bg-green-500 border-green-500 text-white' 
                  : 'border-gray-300 hover:border-green-500 active:bg-green-50'
              }`}
            >
              <Show when={props.todo.completed}>
                <svg class="w-3.5 h-3.5 sm:w-3 sm:h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </Show>
            </button>

            {/* Content */}
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                  <h3 
                    class={`font-medium text-gray-900 break-words ${props.todo.completed ? 'line-through' : ''}`}
                    onDblClick={props.onEdit}
                  >
                    {props.todo.title}
                  </h3>
                  <Show when={props.todo.description}>
                    <p class="text-sm text-gray-500 mt-1 break-words">{props.todo.description}</p>
                  </Show>
                </div>

                {/* Actions - Always visible on mobile, hover on desktop */}
                <div class="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                  <button
                    onClick={props.onEdit}
                    class="p-2 sm:p-1.5 text-gray-400 hover:text-blue-600 active:bg-blue-50 rounded-lg sm:rounded"
                    title="Edit"
                  >
                    <svg class="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={props.onToggleCategoryPicker}
                    class="p-2 sm:p-1.5 text-gray-400 hover:text-purple-600 active:bg-purple-50 rounded-lg sm:rounded"
                    title="Manage categories"
                  >
                    <svg class="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </button>
                  <button
                    onClick={props.onDelete}
                    class="p-2 sm:p-1.5 text-gray-400 hover:text-red-600 active:bg-red-50 rounded-lg sm:rounded"
                    title="Delete"
                  >
                    <svg class="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Meta info row */}
              <div class="flex flex-wrap items-center gap-2 mt-2">
                {/* Priority badge */}
                <Show when={props.todo.priority}>
                  <span class={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${PRIORITY_COLORS[props.todo.priority!]}`}>
                    {props.todo.priority === 'high' ? '🔴' : props.todo.priority === 'medium' ? '🟡' : '🟢'} {props.todo.priority}
                  </span>
                </Show>

                {/* Due date */}
                <Show when={props.todo.dueDate}>
                  <span class={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${
                    isOverdue() ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDate(props.todo.dueDate!)}
                  </span>
                </Show>

                {/* Categories */}
                <For each={todoCategories()}>
                  {(item) => (
                    <div class="flex items-center gap-1">
                      <span 
                        class="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full"
                        style={{ 
                          "background-color": item.category!.color + '20',
                          color: item.category!.color
                        }}
                      >
                        <span 
                          class="w-2 h-2 rounded-full" 
                          style={{ "background-color": item.category!.color }}
                        />
                        {item.category!.name}
                      </span>
                      <For each={item.topics as Topic[]}>
                        {(topic) => (
                          <span class="inline-flex items-center px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                            {topic.name}
                          </span>
                        )}
                      </For>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </div>

          {/* Category Picker Dropdown */}
          <Show when={props.showCategoryPicker}>
            <div class="mt-3 pt-3 border-t border-gray-100">
              <div class="text-sm font-medium text-gray-700 mb-2">Assign Categories & Topics</div>
              <div class="space-y-2">
                <For each={props.categories}>
                  {(category) => {
                    const isAssigned = () => props.todo.categories?.some(c => c.categoryId === category.id);
                    const categoryTopics = () => props.topics.filter(t => t.categoryId === category.id);
                    const assignment = () => props.todo.categories?.find(c => c.categoryId === category.id);

                    return (
                      <div>
                        <button
                          onClick={() => props.onToggleCategory(category.id)}
                          class={`inline-flex items-center gap-2 px-3 py-2.5 sm:py-1.5 text-sm rounded-lg border transition-colors ${
                            isAssigned() 
                              ? 'border-2' 
                              : 'border-gray-300 hover:border-gray-400 active:bg-gray-100'
                          }`}
                          style={{ 
                            "border-color": isAssigned() ? category.color : undefined,
                            "background-color": isAssigned() ? category.color + '20' : undefined
                          }}
                        >
                          <span 
                            class="w-3 h-3 rounded-full" 
                            style={{ "background-color": category.color }}
                          />
                          {category.name}
                          <Show when={isAssigned()}>
                            <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                            </svg>
                          </Show>
                        </button>

                        <Show when={isAssigned() && categoryTopics().length > 0}>
                          <div class="flex flex-wrap gap-1.5 sm:gap-1 mt-2 sm:mt-1 ml-4 sm:ml-6">
                            <For each={categoryTopics()}>
                              {(topic) => {
                                const isTopicAssigned = () => assignment()?.topicIds?.includes(topic.id);
                                
                                return (
                                  <button
                                    onClick={() => props.onToggleTopic(category.id, topic.id)}
                                    class={`px-2.5 sm:px-2 py-1.5 sm:py-0.5 text-sm sm:text-xs rounded border transition-colors ${
                                      isTopicAssigned() 
                                        ? 'bg-gray-800 text-white border-gray-800' 
                                        : 'border-gray-300 hover:border-gray-400 active:bg-gray-100'
                                    }`}
                                  >
                                    {topic.name}
                                  </button>
                                );
                              }}
                            </For>
                          </div>
                        </Show>
                      </div>
                    );
                  }}
                </For>

                <Show when={props.categories.length === 0}>
                  <p class="text-sm text-gray-500">No categories available. Create one first!</p>
                </Show>
              </div>

              <button
                onClick={props.onToggleCategoryPicker}
                class="mt-3 px-3 py-2 sm:py-1 text-sm text-gray-500 hover:text-gray-700 active:bg-gray-100 rounded-lg"
              >
                Close
              </button>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
};

export default Home;
