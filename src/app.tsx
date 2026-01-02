import { Suspense, type Component } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import { RemoteStorageProvider } from './lib/solid-remotestorage';
import { remoteStorage } from './lib/remoteStorageInstance';
import ReloadPrompt from './components/ReloadPrompt';
import InstallPrompt from './components/InstallPrompt';

const App: Component<{ children: Element }> = (props) => {
  const location = useLocation();

  return (
    <RemoteStorageProvider remoteStorage={remoteStorage} widgetContainerId="rs-widget">
      <main>
        <Suspense>{props.children}</Suspense>
      </main>
      <ReloadPrompt />
      <InstallPrompt />
    </RemoteStorageProvider>
  );
};

export default App;
