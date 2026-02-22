import {
  ICapabilityRegistry,
  ClientCapability,
  ClientCapabilityType,
  CapabilityResult,
} from './ICapabilityRegistry';

/**
 * Capability Registry implementation
 * Manages and invokes client capabilities (browser, filesystem, terminal, editor, git, skill)
 */
export class CapabilityRegistry implements ICapabilityRegistry {
  private capabilities: Map<ClientCapabilityType, ClientCapability> = new Map();

  /**
   * Register a new capability
   */
  register(capability: ClientCapability): void {
    if (this.capabilities.has(capability.type)) {
      throw new Error(`Capability '${capability.type}' is already registered`);
    }
    this.capabilities.set(capability.type, capability);
  }

  /**
   * Unregister a capability
   */
  unregister(type: ClientCapabilityType): void {
    this.capabilities.delete(type);
  }

  /**
   * Get a specific capability
   */
  getCapability(type: ClientCapabilityType): ClientCapability | undefined {
    return this.capabilities.get(type);
  }

  /**
   * List all registered capabilities
   */
  listCapabilities(): ClientCapability[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * Invoke a capability
   */
  async invoke(type: ClientCapabilityType, params: unknown): Promise<CapabilityResult> {
    const capability = this.capabilities.get(type);

    if (!capability) {
      return {
        success: false,
        data: null,
        error: `Capability '${type}' is not registered`,
      };
    }

    if (!capability.available) {
      return {
        success: false,
        data: null,
        error: `Capability '${type}' is not available`,
      };
    }

    try {
      const result = await capability.invoke(params);
      return result;
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check if a capability is registered and available
   */
  isAvailable(type: ClientCapabilityType): boolean {
    const capability = this.capabilities.get(type);
    return capability !== undefined && capability.available;
  }

  /**
   * Clear all capabilities (useful for testing)
   */
  clear(): void {
    this.capabilities.clear();
  }
}

/**
 * Singleton instance of Capability Registry
 */
let capabilityRegistryInstance: CapabilityRegistry | undefined;

export function getCapabilityRegistry(): CapabilityRegistry {
  if (!capabilityRegistryInstance) {
    capabilityRegistryInstance = new CapabilityRegistry();
  }
  return capabilityRegistryInstance;
}

export function resetCapabilityRegistry(): void {
  capabilityRegistryInstance = undefined;
}
