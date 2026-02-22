/**
 * Model Configuration Schema for Miaoda IDE
 * Supports flexible 3-tier configuration system
 */

export type MembershipTier = 'free' | 'pro' | 'enterprise' | 'custom';

export type ProviderType =
  | 'openai'
  | 'anthropic'
  | 'ollama'
  | 'azure'
  | 'google'
  | 'deepseek'
  | 'custom';

/**
 * Complete model configuration
 */
export interface ModelConfig {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Display name in Chinese */
  nameCN?: string;

  /** Provider type */
  provider: ProviderType;

  /** API key (optional, can come from cloud) */
  apiKey?: string;

  /** API endpoint URL */
  apiUrl: string;

  /** Model identifier */
  model: string;

  /** Maximum tokens */
  maxTokens?: number;

  /** Temperature (0-2) */
  temperature?: number;

  /** Enable streaming */
  streaming?: boolean;

  /** Custom headers */
  headers?: Record<string, string>;

  /** Required membership tier */
  membership?: MembershipTier;

  /** Configuration source */
  source: 'cloud' | 'user' | 'preset';

  /** Is this configuration enabled */
  enabled?: boolean;

  /** Context window size */
  contextWindow?: number;

  /** Supports vision/images */
  supportsVision?: boolean;

  /** Supports function calling */
  supportsFunctions?: boolean;

  /** Description */
  description?: string;

  /** Description in Chinese */
  descriptionCN?: string;

  /** Created timestamp */
  createdAt?: number;

  /** Updated timestamp */
  updatedAt?: number;
}

/**
 * Cloud configuration response
 */
export interface CloudConfigResponse {
  /** Available models */
  models: ModelConfig[];

  /** Last update timestamp */
  updated_at: number;

  /** Cache TTL in seconds */
  cache_ttl: number;

  /** User membership tier */
  membership: MembershipTier;
}

/**
 * Provider preset template
 */
export interface ProviderPreset {
  /** Preset ID */
  id: string;

  /** Display name */
  name: string;

  /** Display name in Chinese */
  nameCN: string;

  /** Provider type */
  provider: ProviderType;

  /** Default API URL */
  defaultApiUrl: string;

  /** Default model */
  defaultModel: string;

  /** Requires API key */
  requiresApiKey: boolean;

  /** Setup instructions */
  instructions: string;

  /** Setup instructions in Chinese */
  instructionsCN: string;

  /** Icon/logo URL */
  icon?: string;
}

/**
 * User configuration storage
 */
export interface UserModelConfig {
  /** Active model ID */
  activeModelId?: string;

  /** User-defined models */
  customModels: ModelConfig[];

  /** Disabled cloud model IDs */
  disabledCloudModels: string[];

  /** Last sync timestamp */
  lastSync?: number;
}

/**
 * Configuration validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Built-in provider presets
 */
export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    nameCN: 'OpenAI',
    provider: 'openai',
    defaultApiUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4',
    requiresApiKey: true,
    instructions: 'Get your API key from https://platform.openai.com/api-keys',
    instructionsCN: '从 https://platform.openai.com/api-keys 获取您的 API 密钥',
    icon: 'openai-icon'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    nameCN: 'Anthropic',
    provider: 'anthropic',
    defaultApiUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-opus-4',
    requiresApiKey: true,
    instructions: 'Get your API key from https://console.anthropic.com/settings/keys',
    instructionsCN: '从 https://console.anthropic.com/settings/keys 获取您的 API 密钥',
    icon: 'anthropic-icon'
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    nameCN: 'Ollama (本地)',
    provider: 'ollama',
    defaultApiUrl: 'http://localhost:11434',
    defaultModel: 'llama2',
    requiresApiKey: false,
    instructions: 'Install Ollama from https://ollama.ai and run locally',
    instructionsCN: '从 https://ollama.ai 安装 Ollama 并在本地运行',
    icon: 'ollama-icon'
  },
  {
    id: 'azure',
    name: 'Azure OpenAI',
    nameCN: 'Azure OpenAI',
    provider: 'azure',
    defaultApiUrl: 'https://YOUR_RESOURCE.openai.azure.com',
    defaultModel: 'gpt-4',
    requiresApiKey: true,
    instructions: 'Configure your Azure OpenAI resource endpoint and API key',
    instructionsCN: '配置您的 Azure OpenAI 资源端点和 API 密钥',
    icon: 'azure-icon'
  },
  {
    id: 'google',
    name: 'Google AI',
    nameCN: '谷歌 AI',
    provider: 'google',
    defaultApiUrl: 'https://generativelanguage.googleapis.com/v1',
    defaultModel: 'gemini-pro',
    requiresApiKey: true,
    instructions: 'Get your API key from https://makersuite.google.com/app/apikey',
    instructionsCN: '从 https://makersuite.google.com/app/apikey 获取您的 API 密钥',
    icon: 'google-icon'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    nameCN: '深度求索',
    provider: 'deepseek',
    defaultApiUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    requiresApiKey: true,
    instructions: 'Get your API key from https://platform.deepseek.com',
    instructionsCN: '从 https://platform.deepseek.com 获取您的 API 密钥',
    icon: 'deepseek-icon'
  }
];

/**
 * Default cloud models (fallback when cloud is unavailable)
 */
export const DEFAULT_CLOUD_MODELS: ModelConfig[] = [
  {
    id: 'cloud-gpt-3.5',
    name: 'GPT-3.5 Turbo',
    nameCN: 'GPT-3.5 Turbo',
    provider: 'openai',
    apiUrl: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo',
    maxTokens: 4096,
    temperature: 0.7,
    streaming: true,
    membership: 'free',
    source: 'cloud',
    enabled: true,
    contextWindow: 4096,
    supportsFunctions: true,
    description: 'Fast and efficient model for general tasks',
    descriptionCN: '快速高效的通用任务模型'
  },
  {
    id: 'cloud-gpt-4',
    name: 'GPT-4',
    nameCN: 'GPT-4',
    provider: 'openai',
    apiUrl: 'https://api.openai.com/v1',
    model: 'gpt-4',
    maxTokens: 8192,
    temperature: 0.7,
    streaming: true,
    membership: 'pro',
    source: 'cloud',
    enabled: true,
    contextWindow: 8192,
    supportsFunctions: true,
    supportsVision: true,
    description: 'Most capable model for complex tasks',
    descriptionCN: '最强大的复杂任务模型'
  },
  {
    id: 'cloud-claude-opus',
    name: 'Claude Opus 4',
    nameCN: 'Claude Opus 4',
    provider: 'anthropic',
    apiUrl: 'https://api.anthropic.com/v1',
    model: 'claude-opus-4',
    maxTokens: 4096,
    temperature: 0.7,
    streaming: true,
    membership: 'pro',
    source: 'cloud',
    enabled: true,
    contextWindow: 200000,
    supportsFunctions: true,
    supportsVision: true,
    description: 'Most powerful Claude model',
    descriptionCN: '最强大的 Claude 模型'
  }
];
