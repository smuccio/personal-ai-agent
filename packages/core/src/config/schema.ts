import { z } from 'zod';

export const ProviderNameSchema = z.enum(['openrouter', 'bedrock']);

export const ModelConfigSchema = z.object({
  provider: ProviderNameSchema,
  model: z.string().min(1),
  maxBudget: z.number().positive().optional(),
  temperature: z.number().min(0).max(1).optional(),
});

export const AgentConfigSchema = z.object({
  model: ModelConfigSchema,
  maxSteps: z.number().int().positive().max(100).optional().default(30),
  maxBudget: z.number().positive().optional().default(0.5),
  browser: z
    .object({
      stealth: z.boolean().optional().default(true),
      timeout: z.number().int().positive().optional().default(300),
      profileId: z.string().optional(),
    })
    .optional(),
});

export type ValidatedAgentConfig = z.infer<typeof AgentConfigSchema>;
