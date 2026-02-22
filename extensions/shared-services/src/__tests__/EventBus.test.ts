import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus, getEventBus, resetEventBus } from '../EventBus';

/**
 * Feature: miaoda-ide, Task: 3.1
 * Unit tests for Event Bus implementation
 */
describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('emit and on', () => {
    it('should emit events to subscribers', () => {
      const handler = vi.fn();
      eventBus.on('test:event', handler);

      eventBus.emit('test:event', { data: 'hello' });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ data: 'hello' });
    });

    it('should support multiple subscribers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('test:event', handler1);
      eventBus.on('test:event', handler2);

      eventBus.emit('test:event', { data: 'hello' });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should not throw if no subscribers', () => {
      expect(() => {
        eventBus.emit('nonexistent:event', {});
      }).not.toThrow();
    });

    it('should handle errors in handlers gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const normalHandler = vi.fn();

      eventBus.on('test:event', errorHandler);
      eventBus.on('test:event', normalHandler);

      eventBus.emit('test:event', {});

      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(normalHandler).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Disposable', () => {
    it('should unsubscribe when disposed', () => {
      const handler = vi.fn();
      const disposable = eventBus.on('test:event', handler);

      eventBus.emit('test:event', {});
      expect(handler).toHaveBeenCalledTimes(1);

      disposable.dispose();
      eventBus.emit('test:event', {});
      expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should clean up empty event handler sets', () => {
      const handler = vi.fn();
      const disposable = eventBus.on('test:event', handler);

      expect(eventBus.getSubscriberCount('test:event')).toBe(1);

      disposable.dispose();
      expect(eventBus.getSubscriberCount('test:event')).toBe(0);
    });
  });

  describe('once', () => {
    it('should auto-unsubscribe after first invocation', () => {
      const handler = vi.fn();
      eventBus.once('test:event', handler);

      eventBus.emit('test:event', { data: 'first' });
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ data: 'first' });

      eventBus.emit('test:event', { data: 'second' });
      expect(handler).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should support manual disposal before invocation', () => {
      const handler = vi.fn();
      const disposable = eventBus.once('test:event', handler);

      disposable.dispose();
      eventBus.emit('test:event', {});

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('request-response', () => {
    it('should handle request-response pattern', async () => {
      eventBus.onRequest<{ input: number }, { output: number }>('math:double', async (payload) => {
        return { output: payload.input * 2 };
      });

      const result = await eventBus.request<{ input: number }, { output: number }>(
        'math:double',
        { input: 21 }
      );

      expect(result).toEqual({ output: 42 });
    });

    it('should timeout if handler takes too long', async () => {
      eventBus.onRequest('slow:channel', async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return { result: 'done' };
      });

      await expect(
        eventBus.request('slow:channel', {}, 100)
      ).rejects.toThrow('Request timeout after 100ms');
    });

    it('should throw if no handler registered', async () => {
      await expect(
        eventBus.request('nonexistent:channel', {})
      ).rejects.toThrow("No handler registered for channel 'nonexistent:channel'");
    });

    it('should throw if handler already registered', () => {
      eventBus.onRequest('test:channel', async () => ({}));

      expect(() => {
        eventBus.onRequest('test:channel', async () => ({}));
      }).toThrow("Request handler already registered for channel 'test:channel'");
    });

    it('should unregister handler when disposed', async () => {
      const disposable = eventBus.onRequest('test:channel', async () => ({ result: 'ok' }));

      disposable.dispose();

      await expect(
        eventBus.request('test:channel', {})
      ).rejects.toThrow("No handler registered for channel 'test:channel'");
    });
  });

  describe('getSubscriberCount', () => {
    it('should return correct subscriber count', () => {
      expect(eventBus.getSubscriberCount('test:event')).toBe(0);

      const disposable1 = eventBus.on('test:event', () => {});
      expect(eventBus.getSubscriberCount('test:event')).toBe(1);

      const disposable2 = eventBus.on('test:event', () => {});
      expect(eventBus.getSubscriberCount('test:event')).toBe(2);

      disposable1.dispose();
      expect(eventBus.getSubscriberCount('test:event')).toBe(1);

      disposable2.dispose();
      expect(eventBus.getSubscriberCount('test:event')).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all handlers', () => {
      eventBus.on('event1', () => {});
      eventBus.on('event2', () => {});
      eventBus.onRequest('channel1', async () => ({}));

      expect(eventBus.getSubscriberCount('event1')).toBe(1);
      expect(eventBus.getSubscriberCount('event2')).toBe(1);

      eventBus.clear();

      expect(eventBus.getSubscriberCount('event1')).toBe(0);
      expect(eventBus.getSubscriberCount('event2')).toBe(0);
    });
  });

  describe('Singleton', () => {
    it('should return same instance', () => {
      const instance1 = getEventBus();
      const instance2 = getEventBus();

      expect(instance1).toBe(instance2);
    });

    it('should reset singleton', () => {
      const instance1 = getEventBus();
      resetEventBus();
      const instance2 = getEventBus();

      expect(instance1).not.toBe(instance2);
    });
  });
});
