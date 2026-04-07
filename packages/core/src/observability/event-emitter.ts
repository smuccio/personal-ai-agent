import { EventEmitter } from 'events';

/**
 * Event types emitted during agent execution.
 * Subscribe from CLI (terminal rendering) or Web (SSE streaming).
 */
export interface AgentEvents {
  'step:start': { stepNumber: number; toolName?: string };
  'step:complete': {
    stepNumber: number;
    toolName?: string;
    result?: unknown;
    durationMs: number;
  };
  'screenshot:captured': { stepNumber: number; base64: string };
  'cost:updated': { stepCost: number; cumulativeCost: number };
  'agent:done': { answer: string; totalSteps: number; totalCost: number };
  'agent:error': { error: string; stepNumber: number };
  'browser:ready': { liveViewUrl: string; sessionId: string };
}

export class AgentEventEmitter extends EventEmitter {
  emitTyped<K extends keyof AgentEvents>(
    event: K,
    data: AgentEvents[K]
  ): boolean {
    return this.emit(event, data);
  }

  onTyped<K extends keyof AgentEvents>(
    event: K,
    listener: (data: AgentEvents[K]) => void
  ): this {
    return this.on(event, listener);
  }
}
