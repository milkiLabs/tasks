/**
 * Utility functions for solid-remotestorage
 */

/**
 * Generate a unique ID for new items.
 * Combines timestamp with random string for uniqueness.
 * 
 * @example
 * ```ts
 * const id = generateId(); // "1704067200000-x7k2m9p3q"
 * ```
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create a debounced version of a function.
 * Useful for rate-limiting API calls or expensive operations.
 * 
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 * 
 * @example
 * ```ts
 * const debouncedSave = debounce(saveData, 300);
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Deep clone an object (simple implementation for JSON-serializable data)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if a value is a plain object
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Merge two objects, with source taking precedence
 */
export function merge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  return { ...target, ...source };
}
