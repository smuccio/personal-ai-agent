import { mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface LogEntry {
  timestamp: string;
  step: number;
  tool?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  durationMs?: number;
  error?: string;
}

/**
 * Structured JSONL logger for agent runs.
 * Writes to ~/.personal-ai-agent/logs/run-<timestamp>.jsonl
 */
export class AgentLogger {
  private logPath: string;

  constructor(runId?: string) {
    const logDir = join(homedir(), '.personal-ai-agent', 'logs');
    mkdirSync(logDir, { recursive: true });

    const id = runId || new Date().toISOString().replace(/[:.]/g, '-');
    this.logPath = join(logDir, `run-${id}.jsonl`);
  }

  log(entry: LogEntry): void {
    const line = JSON.stringify({
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
    });
    appendFileSync(this.logPath, line + '\n');
  }

  getLogPath(): string {
    return this.logPath;
  }
}
