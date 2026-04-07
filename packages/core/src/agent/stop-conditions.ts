/**
 * Stop conditions for the agent loop.
 * These determine when the agent should terminate execution.
 */

import { createHash } from 'crypto';

interface StepInfo {
  toolName?: string;
  toolArgs?: Record<string, unknown>;
}

/**
 * Tracks cumulative cost and checks against budget.
 */
export class BudgetTracker {
  private cumulativeCost = 0;
  private readonly maxBudget: number;

  constructor(maxBudget: number) {
    this.maxBudget = maxBudget;
  }

  addCost(inputTokens: number, outputTokens: number, model: string): void {
    // Approximate pricing per million tokens (configurable later)
    const pricing: Record<string, { input: number; output: number }> = {
      // OpenRouter models
      'anthropic/claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
      'anthropic/claude-haiku-4-20250414': { input: 0.80, output: 4.0 },
      'deepseek/deepseek-chat-v3-0324': { input: 0.14, output: 0.28 },
      // Bedrock models
      'anthropic.claude-3-5-sonnet-20241022-v2:0': { input: 3.0, output: 15.0 },
      'anthropic.claude-3-5-haiku-20241022-v1:0': { input: 0.80, output: 4.0 },
    };

    const price = pricing[model] || { input: 3.0, output: 15.0 }; // default to Sonnet pricing
    const cost =
      (inputTokens / 1_000_000) * price.input +
      (outputTokens / 1_000_000) * price.output;

    this.cumulativeCost += cost;
  }

  isExceeded(): boolean {
    return this.cumulativeCost >= this.maxBudget;
  }

  getCost(): number {
    return this.cumulativeCost;
  }
}

/**
 * Detects when the agent is stuck in a loop (repeating the same tool calls).
 */
export class LoopDetector {
  private recentSteps: string[] = [];
  private readonly windowSize: number;
  private readonly threshold: number;

  constructor(windowSize = 5, threshold = 3) {
    this.windowSize = windowSize;
    this.threshold = threshold;
  }

  addStep(step: StepInfo): void {
    const hash = createHash('sha256')
      .update(JSON.stringify({ tool: step.toolName, args: step.toolArgs }))
      .digest('hex')
      .slice(0, 16);

    this.recentSteps.push(hash);
    if (this.recentSteps.length > this.windowSize) {
      this.recentSteps.shift();
    }
  }

  isLooping(): boolean {
    if (this.recentSteps.length < this.threshold) return false;

    const last = this.recentSteps[this.recentSteps.length - 1];
    const repeatCount = this.recentSteps
      .slice(-this.threshold)
      .filter((h) => h === last).length;

    return repeatCount >= this.threshold;
  }
}
