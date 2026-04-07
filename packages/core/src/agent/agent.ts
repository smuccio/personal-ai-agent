import { generateText } from 'ai';
import type { LanguageModel } from 'ai';
import { createModel } from '../llm/provider-factory.js';
import { createBrowserSession, type BrowserSession } from '../browser/browser-session.js';
import { allTools } from '../tools/index.js';
import { AGENT_SYSTEM_PROMPT } from './system-prompt.js';
import type { ModelConfig } from '../llm/types.js';

export interface AgentConfig {
  /** LLM model configuration */
  model: ModelConfig;
  /** Maximum steps before stopping (default: 30) */
  maxSteps?: number;
  /** Maximum budget in USD (default: 0.50) */
  maxBudget?: number;
  /** Browser options */
  browser?: {
    stealth?: boolean;
    timeout?: number;
    profileId?: string;
  };
  /** Callback for each step completion */
  onStepFinish?: (step: StepResult) => void | Promise<void>;
}

export interface StepResult {
  stepNumber: number;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: unknown;
  text?: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface AgentResult {
  /** Final text response from the agent */
  answer: string;
  /** Total steps taken */
  totalSteps: number;
  /** Total cost in USD */
  totalCost: number;
  /** Browser live view URL */
  liveViewUrl: string;
}

/**
 * Creates and runs a browser automation agent.
 *
 * Flow:
 * 1. Creates a Kernel cloud browser
 * 2. Connects Playwright via CDP
 * 3. Runs an agent loop (LLM decides tools → tools execute → repeat)
 * 4. Returns final answer + metadata
 * 5. Cleans up browser session
 */
export async function createAgent(
  task: string,
  config: AgentConfig
): Promise<AgentResult> {
  const model: LanguageModel = createModel(config.model);
  const maxSteps = config.maxSteps ?? 30;

  let session: BrowserSession | null = null;

  try {
    // 1. Create browser session
    session = await createBrowserSession({
      stealth: config.browser?.stealth ?? true,
      timeout: config.browser?.timeout ?? 300,
      profileId: config.browser?.profileId,
    });

    console.log(`🌐 Browser live view: ${session.liveViewUrl}`);

    // 2. Build tools with browser session context
    // TODO: Pass session to tool factories so they can access page + sessionId
    const tools = allTools;

    // 3. Run agent loop
    const result = await generateText({
      model,
      system: AGENT_SYSTEM_PROMPT,
      prompt: task,
      tools,
      maxSteps,
      onStepFinish: async (step) => {
        // TODO: Update cost tracker
        // TODO: Emit events
        if (config.onStepFinish) {
          await config.onStepFinish({
            stepNumber: 0, // TODO: track step count
            text: step.text,
          });
        }
      },
    });

    return {
      answer: result.text || 'Task completed (no text response)',
      totalSteps: result.steps?.length ?? 0,
      totalCost: 0, // TODO: calculate from cost tracker
      liveViewUrl: session.liveViewUrl,
    };
  } finally {
    // 4. Always cleanup
    if (session) {
      await session.destroy();
    }
  }
}
