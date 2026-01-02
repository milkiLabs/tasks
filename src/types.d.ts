// Type declarations for modules without TypeScript definitions

declare module 'remotestorage-widget' {
  import type RemoteStorage from 'remotestoragejs';

  interface WidgetOptions {
    leaveOpen?: boolean;
    autoCloseAfter?: number;
    skipInitial?: boolean;
    logging?: boolean;
    modalBackdrop?: boolean;
  }

  class Widget {
    constructor(remoteStorage: RemoteStorage, options?: WidgetOptions);
    attach(elementId?: string): void;
  }

  export default Widget;
}

// PWA virtual module types
declare module 'virtual:pwa-register/solid' {
  import type { Accessor, Setter } from 'solid-js';
  import type { RegisterSWOptions } from 'vite-plugin-pwa/types';

  export type { RegisterSWOptions };

  export function useRegisterSW(options?: RegisterSWOptions): {
    needRefresh: [Accessor<boolean>, Setter<boolean>];
    offlineReady: [Accessor<boolean>, Setter<boolean>];
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  };
}

declare module 'virtual:pwa-register' {
  import type { RegisterSWOptions } from 'vite-plugin-pwa/types';

  export type { RegisterSWOptions };

  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;
}
