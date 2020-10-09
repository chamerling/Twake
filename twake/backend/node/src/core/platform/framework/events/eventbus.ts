import { Disposable, Listener, TypedEvent, TypeEventInterface } from "./typed-event";

export class EventBus {
  private map: Map<string, TypeEventInterface<any>>;
  private static instance: EventBus;
  private constructor() {
    this.map = new Map<string, TypeEventInterface<any>>();
  }

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }

    return EventBus.instance;
  }

  namespace<T>(namespace: string): TypeEventInterface<T> {
    return {
      emit(event: T) {
        EventBus.getInstance().assertExists<T>(namespace).emit(event);
      },
      on(listener: Listener<T>): Disposable {
        return EventBus.getInstance().assertExists<T>(namespace).on(listener);
      },
      once(listener: Listener<T>): void {
        EventBus.getInstance().assertExists<T>(namespace).once(listener);
      },
      off(listener: Listener<T>): void {
        return EventBus.getInstance().assertExists<T>(namespace).off(listener);
      }
    };
  }

  private assertExists<T>(namespace: string): TypeEventInterface<T> {
    if (!this.map.has(namespace)) {
      this.map.set(namespace, new TypedEvent<T>());
    }

    return this.map.get(namespace);
  }
}
