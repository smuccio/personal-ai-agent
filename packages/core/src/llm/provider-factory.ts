import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import type { LanguageModel } from 'ai';
import type { ModelConfig } from './types.js';

/**
 * Creates a Vercel AI SDK LanguageModel instance from a provider/model config.
 * This is the ONLY place provider-specific packages are imported.
 * The rest of the codebase works with the generic LanguageModel interface.
 */
export function createModel(config: ModelConfig): LanguageModel {
  switch (config.provider) {
    case 'openrouter': {
      const openrouter = createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY,
      });
      return openrouter.chat(config.model);
    }

    case 'bedrock': {
      const bedrock = createAmazonBedrock({
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      });
      return bedrock(config.model);
    }

    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}
