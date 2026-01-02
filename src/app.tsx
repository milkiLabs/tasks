import { Suspense, type Component } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import { RemoteStorageProvider } from './lib/solid-remotestorage';
import { remoteStorage } from './lib/remoteStorageInstance';
import { RemoteStorageWidget } from './components/RemoteStorageWidget';
import ReloadPrompt from './components/ReloadPrompt';
import InstallPrompt from './components/InstallPrompt';

const App: Component<{ children: Element }> = (props) => {
  const location = useLocation();

  return (
    <RemoteStorageProvider remoteStorage={remoteStorage}>
      <main>
        <Suspense>{props.children}</Suspense>
      </main>
      <RemoteStorageWidget rs={remoteStorage} />
      <ReloadPrompt />
      <InstallPrompt />
    </RemoteStorageProvider>
  );
};

export default App;
