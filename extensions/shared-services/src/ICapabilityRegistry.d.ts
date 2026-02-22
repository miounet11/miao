/**
 * Capability Registry for managing and invoking client capabilities
 */
export interface ICapabilityRegistry {
    /**
     * Register a new capability
     */
    register(capability: ClientCapability): void;
    /**
     * Unregister a capability
     */
    unregister(type: ClientCapabilityType): void;
    /**
     * Get a specific capability
     */
    getCapability(type: ClientCapabilityType): ClientCapability | undefined;
    /**
     * List all registered capabilities
     */
    listCapabilities(): ClientCapability[];
    /**
     * Invoke a capability
     */
    invoke(type: ClientCapabilityType, params: unknown): Promise<CapabilityResult>;
}
export type ClientCapabilityType = 'browser' | 'filesystem' | 'terminal' | 'editor' | 'git' | 'skill';
export interface ClientCapability {
    type: ClientCapabilityType;
    name: string;
    description: string;
    available: boolean;
    invoke(params: unknown): Promise<CapabilityResult>;
}
export interface CapabilityResult {
    success: boolean;
    data: unknown;
    error?: string;
}
//# sourceMappingURL=ICapabilityRegistry.d.ts.map