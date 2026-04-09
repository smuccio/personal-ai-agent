import type { ModelConfig } from '../llm/types.js';

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  provider: (process.env.DEFAULT_PROVIDER as 'openrouter' | 'bedrock') || 'bedrock',
  model: process.env.DEFAULT_MODEL || 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
};

export const VISION_MODEL_CONFIG: ModelConfig = {
  provider: (process.env.DEFAULT_PROVIDER as 'openrouter' | 'bedrock') || 'bedrock',
  model: process.env.VISION_MODEL || 'us.anthropic.claude-sonnet-4-20250514-v1:0',
};

export const DEFAULT_MAX_STEPS = parseInt(process.env.MAX_STEPS || '30', 10);
export const DEFAULT_MAX_BUDGET = parseFloat(process.env.MAX_BUDGET || '1.00');
export const DEFAULT_BROWSER_TIMEOUT = 300;
