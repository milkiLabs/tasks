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
