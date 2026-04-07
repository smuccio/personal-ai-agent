/**
 * Prepare-step logic for dynamic model switching and context management.
 *
 * Key behaviors:
 * 1. Use a cheap model for navigation/text steps
 * 2. Switch to a vision-capable model after screenshot() calls
 * 3. Prune context when conversation gets too long
 * 4. Inject guidance if agent appears stuck
 */

import { createModel } from '../llm/provider-factory.js';
import type { ModelConfig } from '../llm/types.js';

export interface PrepareStepContext {
  stepNumber: number;
  lastToolName?: string;
  isLooping: boolean;
  defaultConfig: ModelConfig;
  visionConfig: ModelConfig;
}

/**
 * Determines which model to use for the next step.
 * Returns a different model config if the step requires vision capabilities.
 */
export function selectModelForStep(context: PrepareStepContext): ModelConfig {
  // After a screenshot call, use the vision model for the next step
  if (context.lastToolName === 'screenshot') {
    return context.visionConfig;
  }

  // Default to the cheap/fast model
  return context.defaultConfig;
}

/**
 * Builds guidance message to inject when the agent appears stuck.
 */
export function getLoopBreakingGuidance(
  lastToolName?: string,
  attempts?: number
): string | null {
  if (!attempts || attempts < 3) return null;

  return `You appear to be stuck repeating the same action (${lastToolName}). Try a different approach:
- If a CSS selector isn't working, try using screenshot + vision tools instead
- If you can't find an element, try scrolling the page first
- If the page hasn't loaded, try waiting or navigating again
- If you're truly stuck, call askUser to get help from the user`;
}
