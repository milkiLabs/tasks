/**
 * InstallPrompt Component
 * 
 * Provides an install button for PWA installation on both desktop and mobile.
 * Uses the beforeinstallprompt event to trigger the native install prompt.
 * Also shows a manual install hint for iOS devices (which don't support beforeinstallprompt).
 */

import { Component, Show, createSignal, onMount, onCleanup } from 'solid-js';

// Type for the beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Extend WindowEventMap to include beforeinstallprompt
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

const InstallPrompt: Component = () => {
  const [deferredPrompt, setDeferredPrompt] = createSignal<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = createSignal(false);
  const [showIOSHint, setShowIOSHint] = createSignal(false);
  const [isInstalling, setIsInstalling] = createSignal(false);

  // Detect iOS devices
  const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  };

  // Detect if app is already installed (standalone mode)
  const isStandalone = () => {
    return window.matchMedia('(display-mode: standalone)').matches || 
           (window.navigator as any).standalone === true;
  };

  onMount(() => {
    // Check if already installed
    if (isStandalone()) {
      setIsInstalled(true);
      return;
    }

    // Show iOS hint for Safari on iOS
    if (isIOS()) {
      setShowIOSHint(true);
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e);
      // Hide iOS hint if we get the native prompt
      setShowIOSHint(false);
    };

    // Listen for successful install
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    onCleanup(() => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    });
  });

  const handleInstallClick = async () => {
    const prompt = deferredPrompt();
    if (!prompt) return;

    setIsInstalling(true);
    
    try {
      // Show the install prompt
      await prompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await prompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setIsInstalled(true);
      } else {
        console.log('User dismissed the install prompt');
      }
    } catch (error) {
      console.error('Error during installation:', error);
    } finally {
      setIsInstalling(false);
      // Clear the deferred prompt
      setDeferredPrompt(null);
    }
  };

  const dismissIOSHint = () => {
    setShowIOSHint(false);
  };

  // Don't render anything if already installed
  if (isInstalled()) {
    return null;
  }

  return (
    <>
      {/* Desktop/Android Install Button - Fixed position in corner */}
      <Show when={deferredPrompt()}>
        <button
          onClick={handleInstallClick}
          disabled={isInstalling()}
          class="fixed bottom-20 right-4 z-40 flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed sm:px-4 sm:py-2"
          aria-label="Install App"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span class="hidden sm:inline text-sm font-medium">
            {isInstalling() ? 'Installing...' : 'Install App'}
          </span>
        </button>
      </Show>

      {/* iOS Safari Hint */}
      <Show when={showIOSHint()}>
        <div class="fixed bottom-4 left-4 right-4 z-50 animate-slide-up sm:left-auto sm:right-4 sm:max-w-sm">
          <div class="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
            <div class="flex items-start gap-3">
              {/* Icon */}
              <div class="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              
              {/* Content */}
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900">Install this app</p>
                <p class="text-sm text-gray-500 mt-1">
                  Tap <svg class="inline-block w-4 h-4 -mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1.5v15m0 0l-4-4m4 4l4-4M5 22.5h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
                  </svg> then "Add to Home Screen"
                </p>
              </div>

              {/* Close button */}
              <button
                onClick={dismissIOSHint}
                class="flex-shrink-0 text-gray-400 hover:text-gray-500 focus:outline-none"
                aria-label="Close"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
};

export default InstallPrompt;
