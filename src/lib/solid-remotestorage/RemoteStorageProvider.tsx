/**
 * RemoteStorage Provider and Context for SolidJS
 * 
 * Provides reactive RemoteStorage state to your entire application.
 */

import { 
  createContext, 
  useContext, 
  createSignal, 
  onMount, 
  onCleanup,
  type ParentComponent,
  type Accessor
} from 'solid-js';
import type RemoteStorage from 'remotestoragejs';

/**
 * Connection status for RemoteStorage
 */
export type ConnectionStatus = 'disconnected' | 'connected' | 'connecting';

/**
 * Context value shape
 */
interface RemoteStorageContextValue {
  /** The RemoteStorage instance */
  rs: RemoteStorage;
  /** Current connection status */
  status: Accessor<ConnectionStatus>;
  /** Connected user's address (e.g., "user@provider.com") */
  userAddress: Accessor<string | null>;
  /** Whether RemoteStorage is ready for use */
  isReady: Accessor<boolean>;
  /** Trigger a manual sync */
  sync: () => void;
  /** Connect to a remote storage */
  connect: (userAddress: string) => void;
  /** Disconnect from remote storage */
  disconnect: () => void;
}

const RemoteStorageContext = createContext<RemoteStorageContextValue>();

/**
 * Props for RemoteStorageProvider
 */
export interface RemoteStorageProviderProps {
  /** The RemoteStorage instance to provide */
  remoteStorage: RemoteStorage;
}

/**
 * RemoteStorage Provider Component
 * 
 * Wraps your app to provide RemoteStorage functionality via context.
 * Handles connection state, widget initialization, and event subscriptions.
 * 
 * @example
 * ```tsx
 * import { RemoteStorageProvider } from './lib/solid-remotestorage';
 * import { remoteStorage } from './remoteStorage';
 * 
 * function App() {
 *   return (
 *     <RemoteStorageProvider 
 *       remoteStorage={remoteStorage}
 *       widgetContainerId="rs-widget"
 *     >
 *       <MyApp />
 *     </RemoteStorageProvider>
 *   );
 * }
 * ```
 */
export const RemoteStorageProvider: ParentComponent<RemoteStorageProviderProps> = (props) => {
  const [status, setStatus] = createSignal<ConnectionStatus>('disconnected');
  const [userAddress, setUserAddress] = createSignal<string | null>(null);
  const [isReady, setIsReady] = createSignal(false);

  const rs = props.remoteStorage;

  const sync = () => {
    if (rs.sync) {
      rs.startSync();
    }
  };

  const connect = (address: string) => {
    rs.connect(address);
  };

  const disconnect = () => {
    rs.disconnect();
  };

  onMount(() => {
    // Event handlers
    const handleConnected = () => {
      setStatus('connected');
      setUserAddress(rs.remote.userAddress);
    };

    const handleDisconnected = () => {
      setStatus('disconnected');
      setUserAddress(null);
    };

    const handleReady = () => {
      setIsReady(true);
    };

    const handleError = (error: unknown) => {
      console.error('RemoteStorage error:', error);
    };

    // Subscribe to events
    rs.on('connected', handleConnected);
    rs.on('disconnected', handleDisconnected);
    rs.on('ready', handleReady);
    rs.on('error', handleError);

    // Check if already connected
    if (rs.remote.connected) {
      setStatus('connected');
      setUserAddress(rs.remote.userAddress);
    }

    // Cleanup on unmount - RemoteStorage does have an off method
    onCleanup(() => {
      // Use removeEventListener (the type definition doesn't expose it but it exists)
      (rs as any).removeEventListener('connected', handleConnected);
      (rs as any).removeEventListener('disconnected', handleDisconnected);
      (rs as any).removeEventListener('ready', handleReady);
      (rs as any).removeEventListener('error', handleError);
    });
  });

  const value: RemoteStorageContextValue = {
    rs,
    status,
    userAddress,
    isReady,
    sync,
    connect,
    disconnect
  };

  return (
    <RemoteStorageContext.Provider value={value}>
      {props.children}
    </RemoteStorageContext.Provider>
  );
};

/**
 * Hook to access RemoteStorage context
 * 
 * @throws Error if used outside of RemoteStorageProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { status, userAddress, sync } = useRemoteStorage();
 *   
 *   return (
 *     <div>
 *       Status: {status()}
 *       {userAddress() && <span>Logged in as {userAddress()}</span>}
 *       <button onClick={sync}>Sync Now</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useRemoteStorage(): RemoteStorageContextValue {
  const context = useContext(RemoteStorageContext);
  
  if (!context) {
    throw new Error(
      'useRemoteStorage must be used within a RemoteStorageProvider. ' +
      'Wrap your app with <RemoteStorageProvider remoteStorage={rs}>.'
    );
  }
  
  return context;
}
