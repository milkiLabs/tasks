/**
 * RemoteStorage instance for the Todo app
 * 
 * This file creates and exports the configured RemoteStorage instance.
 * Import this in your app to access RemoteStorage functionality.
 */

import { createRemoteStorage } from './solid-remotestorage';
import { TodosModule } from './modules/todos';
import { CategoriesModule, TopicsModule } from './modules/categories';

/**
 * Configured RemoteStorage instance
 * 
 * - Todos module is loaded and ready to use
 * - Categories and Topics modules for organization
 * - Caching is enabled for offline-first support
 * - Access is claimed automatically
 */
export const remoteStorage = createRemoteStorage({
  modules: [TodosModule, CategoriesModule, TopicsModule],
  logging: false,  // Set to true for debugging
});

export default remoteStorage;
