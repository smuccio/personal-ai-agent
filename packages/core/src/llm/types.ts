export type ProviderName = 'openrouter' | 'bedrock';

export interface ModelConfig {
  /** LLM provider to use */
  provider: ProviderName;
  /** Model identifier (e.g., 'anthropic/claude-sonnet-4-20250514' for OpenRouter, 'anthropic.claude-3-5-sonnet-20241022-v2:0' for Bedrock) */
  model: string;
  /** Maximum budget in USD for this agent run */
  maxBudget?: number;
  /** Temperature for generation (0-1) */
  temperature?: number;
}

export interface ProviderConfig {
  openrouter?: {
    apiKey: string;
  };
  bedrock?: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}
