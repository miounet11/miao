export type MembershipTier = 'free' | 'pro' | 'enterprise' | 'custom';

export type ProviderType =
  | 'openai'
  | 'anthropic'
  | 'ollama'
  | 'azure'
  | 'google'
  | 'deepseek'
  | 'custom';

export interface ModelConfig {
  id: string;
  name: string;
  nameCN?: string;
  provider: ProviderType;
  apiKey?: string;
  apiUrl: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  streaming?: boolean;
  headers?: Record<string, string>;
  membership?: MembershipTier;
  source: 'cloud' | 'user' | 'preset';
  enabled?: boolean;
  contextWindow?: number;
  supportsVision?: boolean;
  supportsFunctions?: boolean;
  description?: string;
  descriptionCN?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface ProviderPreset {
  id: string;
  name: string;
  nameCN: string;
  provider: ProviderType;
  defaultApiUrl: string;
  defaultModel: string;
  requiresApiKey: boolean;
  instructions: string;
  instructionsCN: string;
  icon?: string;
}

export interface Message {
  type: string;
  [key: string]: any;
}
