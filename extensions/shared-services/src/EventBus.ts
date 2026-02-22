import * as vscode from 'vscode';
import { IEventBus } from './IEventBus';

/**
 * In-process Event Bus implementation
 * Provides type-safe event publishing and subscription within Extension Host
 */
export class EventBus implements IEventBus {
  private handlers: Map<string, Set<(payload: unknown) => void>> = new Map();
  private requestHandlers: Map<string, (payload: unknown) => Promise<unknown>> = new Map();

  /**
   * Emit an event to all subscribers
   */
  emit<T>(event: string, payload: T): void {
    const eventHandlers = this.handlers.get(event);
    if (!eventHandlers) {
      return;
    }

    for (const handler of eventHandlers) {
      try {
        handler(payload);
      } catch (error) {
        console.error(`Error in event handler for '${event}':`, error);
      }
    }
  }

  /**
   * Subscribe to an event
   * @returns Disposable to unsubscribe
   */
  on<T>(event: string, handler: (payload: T) => void): vscode.Disposable {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }

    const eventHandlers = this.handlers.get(event)!;
    const typedHandler = handler as (payload: unknown) => void;
    eventHandlers.add(typedHandler);

    return new vscode.Disposable(() => {
      eventHandlers.delete(typedHandler);
      if (eventHandlers.size === 0) {
        this.handlers.delete(event);
      }
    });
  }

  /**
   * Subscribe to an event once (auto-unsubscribe after first invocation)
   * @returns Disposable to unsubscribe
   */
  once<T>(event: string, handler: (payload: T) => void): vscode.Disposable {
    const disposable = this.on<T>(event, (payload) => {
      disposable.dispose();
      handler(payload);
    });
    return disposable;
  }

  /**
   * Request-response pattern with timeout
   */
  async request<TReq, TRes>(
    channel: string,
    payload: TReq,
    timeout: number = 5000
  ): Promise<TRes> {
    const requestHandler = this.requestHandlers.get(channel);
    if (!requestHandler) {
      throw new Error(`No handler registered for channel '${channel}'`);
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${timeout}ms for channel '${channel}'`));
      }, timeout);
    });

    const responsePromise = requestHandler(payload) as Promise<TRes>;

    return Promise.race([responsePromise, timeoutPromise]);
  }

  /**
   * Register a request handler for a channel
   * @returns Disposable to unregister
   */
  onRequest<TReq, TRes>(
    channel: string,
    handler: (payload: TReq) => Promise<TRes>
  ): vscode.Disposable {
    if (this.requestHandlers.has(channel)) {
      throw new Error(`Request handler already registered for channel '${channel}'`);
    }

    const typedHandler = handler as (payload: unknown) => Promise<unknown>;
    this.requestHandlers.set(channel, typedHandler);

    return new vscode.Disposable(() => {
      this.requestHandlers.delete(channel);
    });
  }

  /**
   * Get the number of subscribers for an event
   */
  getSubscriberCount(event: string): number {
    return this.handlers.get(event)?.size ?? 0;
  }

  /**
   * Clear all handlers (useful for testing)
   */
  clear(): void {
    this.handlers.clear();
    this.requestHandlers.clear();
  }
}

/**
 * Singleton instance of Event Bus
 */
let eventBusInstance: EventBus | undefined;

export function getEventBus(): EventBus {
  if (!eventBusInstance) {
    eventBusInstance = new EventBus();
  }
  return eventBusInstance;
}

export function resetEventBus(): void {
  eventBusInstance = undefined;
}
