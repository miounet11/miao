import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CapabilityRegistry,
  getCapabilityRegistry,
  resetCapabilityRegistry,
} from '../CapabilityRegistry';
import { ClientCapability, ClientCapabilityType } from '../ICapabilityRegistry';

/**
 * Feature: miaoda-ide, Task: 3.4
 * Unit tests for Capability Registry implementation
 */
describe('CapabilityRegistry', () => {
  let registry: CapabilityRegistry;

  beforeEach(() => {
    registry = new CapabilityRegistry();
  });

  describe('register and getCapability', () => {
    it('should register a capability', () => {
      const capability: ClientCapability = {
        type: 'browser',
        name: 'Browser Automation',
        description: 'Playwright-based browser automation',
        available: true,
        invoke: async () => ({ success: true, data: {} }),
      };

      registry.register(capability);

      const retrieved = registry.getCapability('browser');
      expect(retrieved).toBe(capability);
    });

    it('should throw if capability already registered', () => {
      const capability: ClientCapability = {
        type: 'browser',
        name: 'Browser',
        description: 'Test',
        available: true,
        invoke: async () => ({ success: true, data: {} }),
      };

      registry.register(capability);

      expect(() => {
        registry.register(capability);
      }).toThrow("Capability 'browser' is already registered");
    });

    it('should return undefined for unregistered capability', () => {
      const capability = registry.getCapability('filesystem');
      expect(capability).toBeUndefined();
    });
  });

  describe('unregister', () => {
    it('should unregister a capability', () => {
      const capability: ClientCapability = {
        type: 'terminal',
        name: 'Terminal',
        description: 'Command execution',
        available: true,
        invoke: async () => ({ success: true, data: {} }),
      };

      registry.register(capability);
      expect(registry.getCapability('terminal')).toBeDefined();

      registry.unregister('terminal');
      expect(registry.getCapability('terminal')).toBeUndefined();
    });

    it('should not throw when unregistering non-existent capability', () => {
      expect(() => {
        registry.unregister('browser');
      }).not.toThrow();
    });
  });

  describe('listCapabilities', () => {
    it('should list all registered capabilities', () => {
      const cap1: ClientCapability = {
        type: 'browser',
        name: 'Browser',
        description: 'Test',
        available: true,
        invoke: async () => ({ success: true, data: {} }),
      };

      const cap2: ClientCapability = {
        type: 'filesystem',
        name: 'Filesystem',
        description: 'Test',
        available: true,
        invoke: async () => ({ success: true, data: {} }),
      };

      registry.register(cap1);
      registry.register(cap2);

      const capabilities = registry.listCapabilities();
      expect(capabilities).toHaveLength(2);
      expect(capabilities).toContain(cap1);
      expect(capabilities).toContain(cap2);
    });

    it('should return empty array when no capabilities registered', () => {
      const capabilities = registry.listCapabilities();
      expect(capabilities).toEqual([]);
    });
  });

  describe('invoke', () => {
    it('should invoke a capability successfully', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        success: true,
        data: { result: 'done' },
      });

      const capability: ClientCapability = {
        type: 'browser',
        name: 'Browser',
        description: 'Test',
        available: true,
        invoke: mockInvoke,
      };

      registry.register(capability);

      const result = await registry.invoke('browser', { action: 'navigate' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ result: 'done' });
      expect(mockInvoke).toHaveBeenCalledWith({ action: 'navigate' });
    });

    it('should return error if capability not registered', async () => {
      const result = await registry.invoke('browser', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe("Capability 'browser' is not registered");
    });

    it('should return error if capability not available', async () => {
      const capability: ClientCapability = {
        type: 'browser',
        name: 'Browser',
        description: 'Test',
        available: false, // Not available
        invoke: async () => ({ success: true, data: {} }),
      };

      registry.register(capability);

      const result = await registry.invoke('browser', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe("Capability 'browser' is not available");
    });

    it('should handle capability invocation errors', async () => {
      const capability: ClientCapability = {
        type: 'browser',
        name: 'Browser',
        description: 'Test',
        available: true,
        invoke: async () => {
          throw new Error('Invocation failed');
        },
      };

      registry.register(capability);

      const result = await registry.invoke('browser', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invocation failed');
    });
  });

  describe('isAvailable', () => {
    it('should return true for registered and available capability', () => {
      const capability: ClientCapability = {
        type: 'browser',
        name: 'Browser',
        description: 'Test',
        available: true,
        invoke: async () => ({ success: true, data: {} }),
      };

      registry.register(capability);

      expect(registry.isAvailable('browser')).toBe(true);
    });

    it('should return false for registered but unavailable capability', () => {
      const capability: ClientCapability = {
        type: 'browser',
        name: 'Browser',
        description: 'Test',
        available: false,
        invoke: async () => ({ success: true, data: {} }),
      };

      registry.register(capability);

      expect(registry.isAvailable('browser')).toBe(false);
    });

    it('should return false for unregistered capability', () => {
      expect(registry.isAvailable('browser')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all capabilities', () => {
      const cap1: ClientCapability = {
        type: 'browser',
        name: 'Browser',
        description: 'Test',
        available: true,
        invoke: async () => ({ success: true, data: {} }),
      };

      const cap2: ClientCapability = {
        type: 'filesystem',
        name: 'Filesystem',
        description: 'Test',
        available: true,
        invoke: async () => ({ success: true, data: {} }),
      };

      registry.register(cap1);
      registry.register(cap2);

      expect(registry.listCapabilities()).toHaveLength(2);

      registry.clear();

      expect(registry.listCapabilities()).toHaveLength(0);
    });
  });

  describe('Singleton', () => {
    it('should return same instance', () => {
      const instance1 = getCapabilityRegistry();
      const instance2 = getCapabilityRegistry();

      expect(instance1).toBe(instance2);
    });

    it('should reset singleton', () => {
      const instance1 = getCapabilityRegistry();
      resetCapabilityRegistry();
      const instance2 = getCapabilityRegistry();

      expect(instance1).not.toBe(instance2);
    });
  });
});
