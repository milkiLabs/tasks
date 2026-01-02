/**
 * ReloadPrompt Component
 * 
 * Shows a toast notification when:
 * - The app is ready to work offline
 * - A new version is available and needs refresh (only when app is installed)
 */

import { Component, Show, createSignal, onMount } from 'solid-js';
import { useRegisterSW } from 'virtual:pwa-register/solid';

const ReloadPrompt: Component = () => {
  const [isInstalled, setIsInstalled] = createSignal(false);

  // Check if the app is installed (running in standalone mode)
  onMount(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);
  });

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  // Only show needRefresh prompt if the app is installed
  // Always show offlineReady prompt
  const shouldShow = () => offlineReady() || (needRefresh() && isInstalled());

  return (
    <Show when={shouldShow()}>
      <div class="fixed bottom-4 right-4 z-50 max-w-sm animate-slide-up">
        <div class="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
          <div class="flex items-start gap-3">
            {/* Icon */}
            <div class={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              needRefresh() ? 'bg-blue-100' : 'bg-green-100'
            }`}>
              <Show 
                when={needRefresh()}
                fallback={
                  <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                }
              >
                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </Show>
            </div>
            
            {/* Content */}
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900">
                <Show 
                  when={needRefresh()}
                  fallback="Ready to work offline"
                >
                  New version available
                </Show>
              </p>
              <p class="text-sm text-gray-500 mt-1">
                <Show 
                  when={needRefresh()}
                  fallback="The app has been cached for offline use."
                >
                  Click reload to update to the latest version.
                </Show>
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={close}
              class="flex-shrink-0 text-gray-400 hover:text-gray-500 focus:outline-none"
              aria-label="Close"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Action buttons */}
          <Show when={needRefresh()}>
            <div class="mt-4 flex gap-2">
              <button
                onClick={() => updateServiceWorker(true)}
                class="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Reload
              </button>
              <button
                onClick={close}
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Later
              </button>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
};

export default ReloadPrompt;
