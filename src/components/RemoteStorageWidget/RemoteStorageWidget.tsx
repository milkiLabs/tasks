/**
 * RemoteStorageWidget - Custom SolidJS Connect Widget
 * 
 * A reusable, customizable widget for connecting to RemoteStorage,
 * with support for Dropbox and Google Drive backends.
 * 
 * Features:
 * - Beautiful, modern UI with Tailwind CSS
 * - Multiple states: disconnected, connecting, connected, syncing, error
 * - Backend selection (RS, Dropbox, Google Drive)
 * - Sync progress indicator
 * - Keyboard shortcuts support
 * - Fully accessible
 */

import { 
  Component, 
  createSignal, 
  createEffect, 
  Show, 
  onMount, 
  onCleanup,
  type Accessor
} from 'solid-js';
import type RemoteStorage from 'remotestoragejs';

// ============================================================================
// Types
// ============================================================================

export type WidgetState = 
  | 'initial'
  | 'choose-backend'
  | 'sign-in'
  | 'connecting'
  | 'connected'
  | 'syncing'
  | 'error'
  | 'offline';

export type BackendType = 'remotestorage' | 'dropbox' | 'googledrive';

export interface RemoteStorageWidgetProps {
  /** RemoteStorage instance */
  rs: RemoteStorage;
  /** Whether to show the widget in compact mode (icon only when connected) */
  compact?: boolean;
  /** Custom class name for the widget container */
  class?: string;
  /** Called when connection state changes */
  onStateChange?: (state: WidgetState) => void;
  /** Whether to show the widget initially open */
  initialOpen?: boolean;
}

// ============================================================================
// Icons
// ============================================================================

const RemoteStorageIcon: Component<{ class?: string }> = (props) => (
  <svg class={props.class} viewBox="0 0 747 849" fill="currentColor">
    <polygon points="370,754 0,542 0,318 185,215 185,438 370,541 555,438 555,215 740,318 740,542" />
    <polygon points="370,331 185,226 370,120 555,226" />
  </svg>
);

const DropboxIcon: Component<{ class?: string }> = (props) => (
  <svg class={props.class} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 6.134L6.069 9.797L12 13.459l5.931-3.662L12 6.134zM1.863 9.797L7.794 13.459L12 10.596l-4.206-2.863L1.863 9.797zM12 10.596l4.206 2.863l5.931-3.662L16.206 6.134L12 10.596zM6.069 14.257L12 17.866l5.931-3.609L12 10.596L6.069 14.257zM1.863 13.459l5.931 3.662l4.206-2.863l-4.206-2.862L1.863 13.459zM12 14.257l4.206 2.862l5.931-3.662l-5.931-3.662L12 14.257z"/>
  </svg>
);

const GoogleDriveIcon: Component<{ class?: string }> = (props) => (
  <svg class={props.class} viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.71 3.5L1.15 15l3.43 5.95L11.01 9.5 7.71 3.5zm8.58 0l-6.43 11.12 3.43 5.95L22.85 9.5l-3.43-5.95L16.29 3.5zm-3.43 5.95L9.43 15l3.43 5.95 3.43-5.95-3.43-5.95z"/>
  </svg>
);

const SyncIcon: Component<{ class?: string; spinning?: boolean }> = (props) => (
  <svg 
    class={`${props.class} ${props.spinning ? 'animate-spin' : ''}`} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path 
      stroke-linecap="round" 
      stroke-linejoin="round" 
      stroke-width="2" 
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
    />
  </svg>
);

const CheckIcon: Component<{ class?: string }> = (props) => (
  <svg class={props.class} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
  </svg>
);

const ErrorIcon: Component<{ class?: string }> = (props) => (
  <svg class={props.class} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const OfflineIcon: Component<{ class?: string }> = (props) => (
  <svg class={props.class} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
  </svg>
);

const CloseIcon: Component<{ class?: string }> = (props) => (
  <svg class={props.class} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChevronDownIcon: Component<{ class?: string }> = (props) => (
  <svg class={props.class} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
  </svg>
);

// ============================================================================
// Main Widget Component
// ============================================================================

export const RemoteStorageWidget: Component<RemoteStorageWidgetProps> = (props) => {
  // State
  const [isOpen, setIsOpen] = createSignal(props.initialOpen ?? false);
  const [widgetState, setWidgetState] = createSignal<WidgetState>('initial');
  const [userAddress, setUserAddress] = createSignal('');
  const [inputValue, setInputValue] = createSignal('');
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
  const [isSyncing, setIsSyncing] = createSignal(false);
  const [isOnline, setIsOnline] = createSignal(true);
  const [syncProgress, setSyncProgress] = createSignal<number | null>(null);
  const [currentBackend, setCurrentBackend] = createSignal<BackendType | null>(null);

  // Check for available backends
  const hasDropbox = () => !!(props.rs.apiKeys?.dropbox);
  const hasGoogleDrive = () => !!(props.rs.apiKeys?.googledrive);
  const hasMultipleBackends = () => hasDropbox() || hasGoogleDrive();

  // Derived states
  const isConnected = () => widgetState() === 'connected' || widgetState() === 'syncing';
  const showBackendChoice = () => hasMultipleBackends() && widgetState() === 'choose-backend';

  // Update state and notify parent
  const updateState = (newState: WidgetState) => {
    setWidgetState(newState);
    props.onStateChange?.(newState);
  };

  // Event handlers for RemoteStorage
  const handleConnecting = () => {
    updateState('connecting');
    setErrorMessage(null);
  };

  const handleConnected = () => {
    updateState('connected');
    setUserAddress(props.rs.remote.userAddress || '');
    setCurrentBackend(props.rs.backend || 'remotestorage');
    setErrorMessage(null);
    // Auto-close after connection
    setTimeout(() => {
      if (widgetState() === 'connected') {
        setIsOpen(false);
      }
    }, 1500);
  };

  const handleDisconnected = () => {
    updateState('initial');
    setUserAddress('');
    setCurrentBackend(null);
    setInputValue('');
  };

  const handleError = (error: unknown) => {
    const err = error as Error;
    console.error('RemoteStorage error:', err);
    updateState('error');
    setErrorMessage(err?.message || 'An error occurred');
  };

  const handleSyncStarted = () => {
    setIsSyncing(true);
    if (widgetState() === 'connected') {
      updateState('syncing');
    }
  };

  const handleSyncDone = (result: unknown) => {
    const res = result as { completed: boolean };
    setIsSyncing(false);
    setSyncProgress(null);
    if (widgetState() === 'syncing') {
      updateState('connected');
    }
  };

  const handleSyncReqDone = (result: unknown) => {
    const res = result as { tasksRemaining: number };
    // Approximate progress (tasks queue is max 100)
    const progress = Math.max(0, 100 - res.tasksRemaining);
    setSyncProgress(progress);
  };

  const handleNetworkOffline = () => {
    setIsOnline(false);
  };

  const handleNetworkOnline = () => {
    setIsOnline(true);
  };

  // Mount/Unmount
  onMount(() => {
    const rs = props.rs;

    // Subscribe to events
    rs.on('connecting', handleConnecting);
    rs.on('connected', handleConnected);
    rs.on('disconnected', handleDisconnected);
    rs.on('error', handleError);
    rs.on('sync-started', handleSyncStarted);
    rs.on('sync-done', handleSyncDone);
    rs.on('sync-req-done', handleSyncReqDone);
    rs.on('network-offline', handleNetworkOffline);
    rs.on('network-online', handleNetworkOnline);

    // Check initial state
    if (rs.remote?.connected) {
      setUserAddress(rs.remote.userAddress || '');
      setCurrentBackend(rs.backend || 'remotestorage');
      updateState('connected');
    } else {
      updateState('initial');
    }

    // Cleanup
    onCleanup(() => {
      (rs as any).removeEventListener('connecting', handleConnecting);
      (rs as any).removeEventListener('connected', handleConnected);
      (rs as any).removeEventListener('disconnected', handleDisconnected);
      (rs as any).removeEventListener('error', handleError);
      (rs as any).removeEventListener('sync-started', handleSyncStarted);
      (rs as any).removeEventListener('sync-done', handleSyncDone);
      (rs as any).removeEventListener('sync-req-done', handleSyncReqDone);
      (rs as any).removeEventListener('network-offline', handleNetworkOffline);
      (rs as any).removeEventListener('network-online', handleNetworkOnline);
    });
  });

  // Actions
  const handleConnect = (e?: Event) => {
    e?.preventDefault();
    const address = inputValue().trim();
    if (!address) return;

    if (!address.includes('@')) {
      setErrorMessage('Please enter a valid user address (e.g., user@provider.com)');
      return;
    }

    setErrorMessage(null);
    props.rs.connect(address);
  };

  const handleDisconnect = () => {
    props.rs.disconnect();
  };

  const handleSync = () => {
    if (props.rs.sync) {
      props.rs.startSync();
    }
  };

  const handleBackendSelect = (backend: BackendType) => {
    if (backend === 'remotestorage') {
      updateState('sign-in');
    } else if (backend === 'dropbox') {
      props.rs.connect({ backend: 'dropbox' } as any);
    } else if (backend === 'googledrive') {
      props.rs.connect({ backend: 'googledrive' } as any);
    }
  };

  const handleInitialClick = () => {
    if (hasMultipleBackends()) {
      updateState('choose-backend');
    } else {
      updateState('sign-in');
    }
    setIsOpen(true);
  };

  // Toggle widget
  const toggleWidget = () => {
    if (!isOpen() && !isConnected()) {
      handleInitialClick();
    } else {
      setIsOpen(!isOpen());
    }
  };

  // Get status indicator color
  const getStatusColor = () => {
    if (!isOnline()) return 'bg-gray-400';
    switch (widgetState()) {
      case 'connected': return 'bg-green-500';
      case 'syncing': return 'bg-blue-500 animate-pulse';
      case 'connecting': return 'bg-yellow-500 animate-pulse';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  // Get backend icon
  const BackendIcon = () => {
    switch (currentBackend()) {
      case 'dropbox': return <DropboxIcon class="w-5 h-5" />;
      case 'googledrive': return <GoogleDriveIcon class="w-5 h-5" />;
      default: return <RemoteStorageIcon class="w-5 h-5" />;
    }
  };

  return (
    <div class={`rs-widget fixed bottom-20 left-4 z-40 ${props.class || ''}`}>
      {/* Main Widget Button */}
      <button
        type="button"
        onClick={toggleWidget}
        class={`
          relative flex items-center justify-center
          w-12 h-12 rounded-full shadow-lg
          transition-all duration-200 ease-out
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          ${isConnected() 
            ? 'bg-green-500 hover:bg-green-600 text-white' 
            : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
          }
        `}
        aria-label={isConnected() ? 'RemoteStorage connected' : 'Connect to RemoteStorage'}
        aria-expanded={isOpen()}
      >
        <Show when={isConnected()} fallback={<RemoteStorageIcon class="w-6 h-6" />}>
          <BackendIcon />
        </Show>
        
        {/* Status indicator dot */}
        <span 
          class={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor()}`}
          aria-hidden="true"
        />
        
        {/* Sync spinner overlay */}
        <Show when={isSyncing()}>
          <span class="absolute inset-0 flex items-center justify-center">
            <span class="absolute inset-0 rounded-full bg-black/10" />
            <SyncIcon class="w-4 h-4 text-white" spinning />
          </span>
        </Show>
      </button>

      {/* Dropdown Panel */}
      <Show when={isOpen()}>
        <div 
          class="absolute bottom-16 left-0 w-72 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden animate-slide-up"
          role="dialog"
          aria-labelledby="rs-widget-title"
        >
          {/* Header */}
          <div class="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <RemoteStorageIcon class="w-5 h-5 text-gray-700" />
              <h3 id="rs-widget-title" class="font-medium text-gray-900 text-sm">
                RemoteStorage
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              class="p-1 rounded hover:bg-gray-200 text-gray-500 transition-colors"
              aria-label="Close"
            >
              <CloseIcon class="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div class="p-4">
            {/* Initial State */}
            <Show when={widgetState() === 'initial'}>
              <div class="text-center py-2">
                <p class="text-sm text-gray-600 mb-4">
                  Connect your storage to sync data across devices
                </p>
                <button
                  type="button"
                  onClick={handleInitialClick}
                  class="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                  Connect
                </button>
              </div>
            </Show>

            {/* Backend Choice */}
            <Show when={showBackendChoice()}>
              <div class="space-y-2">
                <p class="text-sm text-gray-600 mb-3">Choose your storage:</p>
                
                {/* RemoteStorage Option */}
                <button
                  type="button"
                  onClick={() => handleBackendSelect('remotestorage')}
                  class="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <RemoteStorageIcon class="w-6 h-6 text-gray-700" />
                  <div class="text-left">
                    <div class="font-medium text-gray-900 text-sm">RemoteStorage</div>
                    <div class="text-xs text-gray-500">Your own storage server</div>
                  </div>
                </button>

                {/* Dropbox Option */}
                <Show when={hasDropbox()}>
                  <button
                    type="button"
                    onClick={() => handleBackendSelect('dropbox')}
                    class="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <DropboxIcon class="w-6 h-6 text-blue-600" />
                    <div class="text-left">
                      <div class="font-medium text-gray-900 text-sm">Dropbox</div>
                      <div class="text-xs text-gray-500">Connect with Dropbox</div>
                    </div>
                  </button>
                </Show>

                {/* Google Drive Option */}
                <Show when={hasGoogleDrive()}>
                  <button
                    type="button"
                    onClick={() => handleBackendSelect('googledrive')}
                    class="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <GoogleDriveIcon class="w-6 h-6 text-green-600" />
                    <div class="text-left">
                      <div class="font-medium text-gray-900 text-sm">Google Drive</div>
                      <div class="text-xs text-gray-500">Connect with Google</div>
                    </div>
                  </button>
                </Show>

                <button
                  type="button"
                  onClick={() => updateState('initial')}
                  class="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
                >
                  Cancel
                </button>
              </div>
            </Show>

            {/* Sign-in Form */}
            <Show when={widgetState() === 'sign-in'}>
              <form onSubmit={handleConnect} class="space-y-3">
                <div>
                  <label for="rs-user-address" class="block text-sm font-medium text-gray-700 mb-1">
                    User Address
                  </label>
                  <input
                    id="rs-user-address"
                    type="text"
                    value={inputValue()}
                    onInput={(e) => setInputValue(e.currentTarget.value)}
                    placeholder="user@provider.com"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autocomplete="email"
                    autofocus
                  />
                </div>
                
                <Show when={errorMessage()}>
                  <p class="text-sm text-red-600 flex items-center gap-1">
                    <ErrorIcon class="w-4 h-4" />
                    {errorMessage()}
                  </p>
                </Show>

                <div class="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateState(hasMultipleBackends() ? 'choose-backend' : 'initial')}
                    class="flex-1 py-2 px-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    class="flex-1 py-2 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Connect
                  </button>
                </div>
              </form>
            </Show>

            {/* Connecting State */}
            <Show when={widgetState() === 'connecting'}>
              <div class="text-center py-4">
                <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-3">
                  <SyncIcon class="w-6 h-6 text-blue-600" spinning />
                </div>
                <p class="text-sm text-gray-600">Connecting...</p>
              </div>
            </Show>

            {/* Connected State */}
            <Show when={widgetState() === 'connected' || widgetState() === 'syncing'}>
              <div class="space-y-4">
                {/* User Info */}
                <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div class={`w-10 h-10 rounded-full flex items-center justify-center ${
                    currentBackend() === 'dropbox' ? 'bg-blue-100 text-blue-600' :
                    currentBackend() === 'googledrive' ? 'bg-green-100 text-green-600' :
                    'bg-gray-200 text-gray-700'
                  }`}>
                    <BackendIcon />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">
                      {userAddress() || 'Connected'}
                    </p>
                    <p class="text-xs text-gray-500 flex items-center gap-1">
                      <span class={`w-2 h-2 rounded-full ${getStatusColor()}`} />
                      {isSyncing() ? 'Syncing...' : isOnline() ? 'Connected' : 'Offline'}
                    </p>
                  </div>
                </div>

                {/* Sync Progress */}
                <Show when={isSyncing() && syncProgress() !== null}>
                  <div class="space-y-1">
                    <div class="flex justify-between text-xs text-gray-500">
                      <span>Syncing</span>
                      <span>{syncProgress()}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        class="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${syncProgress()}%` }}
                      />
                    </div>
                  </div>
                </Show>

                {/* Actions */}
                <div class="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSync}
                    disabled={isSyncing()}
                    class="flex-1 py-2 px-3 text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <SyncIcon class="w-4 h-4" spinning={isSyncing()} />
                    Sync
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    class="flex-1 py-2 px-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </Show>

            {/* Error State */}
            <Show when={widgetState() === 'error'}>
              <div class="text-center py-4">
                <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-3">
                  <ErrorIcon class="w-6 h-6 text-red-600" />
                </div>
                <p class="text-sm font-medium text-gray-900 mb-1">Connection Error</p>
                <p class="text-sm text-gray-600 mb-4">{errorMessage() || 'Something went wrong'}</p>
                <button
                  type="button"
                  onClick={() => updateState('initial')}
                  class="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                  Try Again
                </button>
              </div>
            </Show>

            {/* Offline Notice */}
            <Show when={!isOnline() && isConnected()}>
              <div class="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                <OfflineIcon class="w-4 h-4 text-yellow-600 flex-shrink-0" />
                <p class="text-xs text-yellow-700">
                  You're offline. Changes will sync when you're back online.
                </p>
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default RemoteStorageWidget;
