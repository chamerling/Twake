export interface Listener<T> {
  (event: T): void;
}

export interface Disposable {
  dispose(): void;
}

export interface TypeEventInterface<T> {
  /**
   * Adds a listener which will be called on each event received from emit
   * @param listener
   */
  on(listener: Listener<T>): Disposable;

  /**
   * Adds a listener which will be called once
   * @param listeber
   */
  once(listener: Listener<T>): void;

  /**
   * Remove the listener
   * @param listener
   */
  off(listener: Listener<T>): void;

  /**
   * Emit an event
   * @param event
   */
  emit(event: T):void;
}

export class TypedEvent<T> implements TypeEventInterface<T> {
  private listeners: Listener<T>[] = [];
  private listenersOncer: Listener<T>[] = [];

  on = (listener: Listener<T>): Disposable => {
    this.listeners.push(listener);
    return {
      dispose: () => this.off(listener)
    };
  }

  once = (listener: Listener<T>): void => {
    this.listenersOncer.push(listener);
  }

  off = (listener: Listener<T>): void => {
    const callbackIndex = this.listeners.indexOf(listener);
    if (callbackIndex > -1) {
      this.listeners.splice(callbackIndex, 1);
    }
  }

  emit = (event: T):void => {
    this.listeners.forEach((listener) => listener(event));

    if (this.listenersOncer.length > 0) {
      const toCall = this.listenersOncer;
      this.listenersOncer = [];
      toCall.forEach((listener) => listener(event));
    }
  }
}