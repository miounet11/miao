/**
 * Shared Services Layer
 * Core interfaces and types for Miaoda IDE extensions
 */

export * from './IEventBus';
export * from './ICapabilityRegistry';
export * from './ILLMAdapter';
export * from './IContextAnalyzer';
export * from './EventBus';
export * from './CapabilityRegistry';
export * from './LLMAdapter';
export * from './KeychainService';
export * from './ContextAnalyzer';
export * from './ChatHistoryStorage';

// LLM Providers
export * from './llm/llm-error';
export * from './llm/providers/openai-provider';
export * from './llm/providers/anthropic-provider';
export * from './llm/providers/proxy-provider';

// Auth Integration
export * from './auth-integration';

// Auto Updater
export * from './auto-updater';

// Usage Tracker
export * from './usage-tracker';

// Telemetry
export * from './telemetry/crash-reporter';
export * from './telemetry/usage-analytics';
export * from './telemetry/telemetry-manager';

// Performance
export * from './performance/performance-monitor';
export * from './performance/llm-request-optimizer';
export * from './performance/lazy-loader';

// Accessibility
export * from './accessibility/accessibility-manager';
export * from './accessibility/aria-helper';

// Code Completion
export * from './completion/inline-completion-provider';
export * from './completion/debounce-controller';
export * from './completion/completion-cache';

// Code Generation
export * from './codegen/code-generator';

// Code Review
export * from './review/code-reviewer';
export * from './review/code-review-provider';

// Scaffolding
export {
	ScaffoldingGenerator,
	ProjectType,
	TechStack,
	ScaffoldingRequest,
	FileStructure,
	ScaffoldingResponse,
	IScaffoldingGenerator,
} from './scaffold/scaffolding-generator';
export type { ValidationResult as ScaffoldValidationResult } from './scaffold/scaffolding-generator';

// Configuration System
export * from './ModelConfigSchema';
export * from './ConfigurationManager';
export * from './CloudConfigService';

// Enhanced Persistent Storage System
export * from './DatabaseSchema';
export * from './SQLiteStorage';
export * from './SemanticSearch';
export * from './UnifiedStorage';
export * from './ProjectContextManager';
export * from './EnhancedChatHistoryStorage';
export * from './DataMigration';

// Storage API Client
export * from './StorageAPIClient';

