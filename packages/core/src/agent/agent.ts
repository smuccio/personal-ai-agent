import { generateText, type CoreMessage } from 'ai';
import type { LanguageModel } from 'ai';
import { createModel } from '../llm/provider-factory.js';
import { createBrowserSession, type BrowserSession } from '../browser/browser-session.js';
import { createAllTools } from '../tools/index.js';
import { AGENT_SYSTEM_PROMPT } from './system-prompt.js';
import { CostTracker } from '../observability/cost-tracker.js';
import { AgentLogger } from '../observability/logger.js';
import { AgentEventEmitter } from '../observability/event-emitter.js';
import type { ModelConfig } from '../llm/types.js';

export interface AgentConfig {
  model: ModelConfig;
  maxSteps?: number;
  maxBudget?: number;
  browser?: {
    stealth?: boolean;
    timeout?: number;
    profileId?: string;
  };
  /** Called on each step completion */
  onStep?: (event: StepEvent) => void;
}

export interface StepEvent {
  stepNumber: number;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: unknown;
  text?: string;
  cost?: number;
  cumulativeCost?: number;
}

export interface AgentResult {
  answer: string;
  totalSteps: number;
  totalCost: number;
  liveViewUrl: string;
  logPath: string;
}

/**
 * Creates and runs a browser automation agent.
 *
 * 1. Spins up a Kernel cloud browser
 * 2. Connects Playwright via CDP
 * 3. Runs an LLM agent loop (model decides tools -> tools execute -> repeat)
 * 4. Returns final answer + metadata
 * 5. Cleans up browser session
 */
export async function createAgent(
  task: string,
  config: AgentConfig
): Promise<AgentResult> {
  const model: LanguageModel = createModel(config.model);
  const maxSteps = config.maxSteps ?? 30;
  const maxBudget = config.maxBudget ?? 1.0;
  const costTracker = new CostTracker();
  const logger = new AgentLogger();
  const emitter = new AgentEventEmitter();

  let session: BrowserSession | null = null;
  let stepCount = 0;

  try {
    // 1. Create browser session
    session = await createBrowserSession({
      stealth: config.browser?.stealth ?? true,
      timeout: config.browser?.timeout ?? 300,
      profileId: config.browser?.profileId,
    });

    emitter.emitTyped('browser:ready', {
      liveViewUrl: session.liveViewUrl,
      sessionId: session.sessionId,
    });

    if (config.onStep) {
      config.onStep({
        stepNumber: 0,
        text: `Browser ready. Live view: ${session.liveViewUrl}`,
      });
    }

    // 2. Build tools bound to this session
    const tools = createAllTools(session);

    // 3. Run agent loop
    const result = await generateText({
      model,
      system: AGENT_SYSTEM_PROMPT,
      prompt: task,
      tools,
      maxSteps,
      onStepFinish: async (event) => {
        stepCount++;
        const startTime = Date.now();

        // Extract tool call info
        const toolCall = event.toolCalls?.[0];
        const toolName = toolCall?.toolName;
        const toolArgs = toolCall?.args as Record<string, unknown> | undefined;
        const toolResult = event.toolResults?.[0]?.result;

        // Track cost
        const usage = event.usage;
        if (usage) {
          costTracker.addStep(
            stepCount,
            config.model.model,
            usage.promptTokens ?? 0,
            usage.completionTokens ?? 0
          );
        }

        // Log
        logger.log({
          timestamp: new Date().toISOString(),
          step: stepCount,
          tool: toolName,
          args: toolArgs,
          result: toolResult,
          model: config.model.model,
          inputTokens: usage?.promptTokens,
          outputTokens: usage?.completionTokens,
          cost: costTracker.getStepCost(stepCount)?.cost,
          durationMs: Date.now() - startTime,
        });

        // Emit events
        emitter.emitTyped('step:complete', {
          stepNumber: stepCount,
          toolName,
          result: toolResult,
          durationMs: Date.now() - startTime,
        });

        emitter.emitTyped('cost:updated', {
          stepCost: costTracker.getStepCost(stepCount)?.cost ?? 0,
          cumulativeCost: costTracker.getCumulativeCost(),
        });

        // Notify caller
        if (config.onStep) {
          config.onStep({
            stepNumber: stepCount,
            toolName,
            toolArgs,
            toolResult,
            text: event.text,
            cost: costTracker.getStepCost(stepCount)?.cost,
            cumulativeCost: costTracker.getCumulativeCost(),
          });
        }

        // Check budget
        if (costTracker.getCumulativeCost() >= maxBudget) {
          // Budget exceeded - the loop will stop at maxSteps naturally
          // but we log a warning
          logger.log({
            timestamp: new Date().toISOString(),
            step: stepCount,
            error: `Budget exceeded: $${costTracker.getCumulativeCost().toFixed(4)} >= $${maxBudget}`,
          });
        }
      },
    });

    // 4. Extract final answer
    // Check if the last tool call was 'done'
    let answer = result.text || '';
    const lastStep = result.steps?.[result.steps.length - 1];
    if (lastStep?.toolCalls) {
      const doneCall = lastStep.toolCalls.find((tc) => tc.toolName === 'done');
      if (doneCall) {
        answer = (doneCall.args as { answer: string }).answer || answer;
      }
    }

    emitter.emitTyped('agent:done', {
      answer,
      totalSteps: stepCount,
      totalCost: costTracker.getCumulativeCost(),
    });

    return {
      answer: answer || 'Task completed.',
      totalSteps: stepCount,
      totalCost: costTracker.getCumulativeCost(),
      liveViewUrl: session.liveViewUrl,
      logPath: logger.getLogPath(),
    };
  } catch (error) {
    emitter.emitTyped('agent:error', {
      error: (error as Error).message,
      stepNumber: stepCount,
    });
    throw error;
  } finally {
    if (session) {
      await session.destroy();
    }
  }
}
