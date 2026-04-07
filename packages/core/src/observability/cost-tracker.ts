/**
 * Tracks token usage and costs across the agent run.
 * Provides per-step and cumulative cost breakdowns.
 */

export interface StepCost {
  stepNumber: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: number;
}

export class CostTracker {
  private steps: StepCost[] = [];

  /** Known pricing per million tokens */
  private static readonly PRICING: Record<string, { input: number; output: number }> = {
    // OpenRouter
    'anthropic/claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
    'anthropic/claude-haiku-4-20250414': { input: 0.80, output: 4.0 },
    'deepseek/deepseek-chat-v3-0324': { input: 0.14, output: 0.28 },
    'google/gemini-2.5-flash-preview': { input: 0.15, output: 0.60 },
    'openai/gpt-4o': { input: 2.50, output: 10.0 },
    'openai/gpt-4o-mini': { input: 0.15, output: 0.60 },
    // Bedrock
    'anthropic.claude-3-5-sonnet-20241022-v2:0': { input: 3.0, output: 15.0 },
    'anthropic.claude-3-5-haiku-20241022-v1:0': { input: 0.80, output: 4.0 },
  };

  addStep(
    stepNumber: number,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): StepCost {
    const pricing = CostTracker.PRICING[model] || { input: 3.0, output: 15.0 };
    const cost =
      (inputTokens / 1_000_000) * pricing.input +
      (outputTokens / 1_000_000) * pricing.output;

    const step: StepCost = {
      stepNumber,
      model,
      inputTokens,
      outputTokens,
      cost,
      timestamp: Date.now(),
    };

    this.steps.push(step);
    return step;
  }

  getCumulativeCost(): number {
    return this.steps.reduce((sum, s) => sum + s.cost, 0);
  }

  getTotalTokens(): { input: number; output: number } {
    return this.steps.reduce(
      (totals, s) => ({
        input: totals.input + s.inputTokens,
        output: totals.output + s.outputTokens,
      }),
      { input: 0, output: 0 }
    );
  }

  getStepCost(stepNumber: number): StepCost | undefined {
    return this.steps.find((s) => s.stepNumber === stepNumber);
  }

  getSummary(): string {
    const totalCost = this.getCumulativeCost();
    const totalTokens = this.getTotalTokens();
    const modelBreakdown = new Map<string, number>();

    for (const step of this.steps) {
      modelBreakdown.set(
        step.model,
        (modelBreakdown.get(step.model) || 0) + step.cost
      );
    }

    let summary = `\n💰 Cost Summary:\n`;
    summary += `   Total: $${totalCost.toFixed(4)}\n`;
    summary += `   Steps: ${this.steps.length}\n`;
    summary += `   Tokens: ${totalTokens.input.toLocaleString()} in / ${totalTokens.output.toLocaleString()} out\n`;

    if (modelBreakdown.size > 1) {
      summary += `   By model:\n`;
      for (const [model, cost] of modelBreakdown) {
        summary += `     ${model}: $${cost.toFixed(4)}\n`;
      }
    }

    return summary;
  }
}
