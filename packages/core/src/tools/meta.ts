import { tool } from 'ai';
import { z } from 'zod';

/**
 * Meta tools for agent control flow.
 * These don't need a browser session - they control the agent loop itself.
 */
export function createMetaTools() {
  return {
    done: tool({
      description:
        'Call this when you have completed the task. Pass your final answer or results. This will end the agent loop.',
      parameters: z.object({
        answer: z
          .string()
          .describe('Your final answer, results, or summary of what was accomplished'),
      }),
      // No execute - presence of this tool call signals completion.
      // The agent loop checks for this tool call to terminate.
    }),

    askUser: tool({
      description:
        'Ask the user a question when you need clarification, credentials, or cannot proceed without input. The agent will pause and wait for the user\'s response.',
      parameters: z.object({
        question: z
          .string()
          .describe('The question to ask the user'),
      }),
      // No execute - handled by the agent loop / CLI / web UI
    }),
  };
}
