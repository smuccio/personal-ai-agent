#!/usr/bin/env node

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from project root (handles npm workspace CWD issues)
config({ path: resolve(process.cwd(), '.env') });
// Also try two levels up in case CWD is the cli package
if (!process.env.KERNEL_API_KEY) {
  config({ path: resolve(process.cwd(), '../../.env') });
}
import { Command } from 'commander';
import { runCommand } from './commands/run.js';

const program = new Command();

program
  .name('agent')
  .description('Personal AI Agent - Browser automation powered by Kernel + LLMs')
  .version('0.1.0');

program
  .command('run')
  .description('Run a browser automation task')
  .argument('<task>', 'The task to perform (e.g., "go to google.com and search for AI news")')
  .option('-m, --model <model>', 'LLM model ID (e.g., anthropic.claude-3-5-haiku-20241022-v1:0)')
  .option('-p, --provider <provider>', 'LLM provider: bedrock or openrouter')
  .option('-b, --budget <budget>', 'Maximum budget in USD')
  .option('-s, --steps <steps>', 'Maximum steps')
  .option('--profile <profile>', 'Kernel browser profile ID for persistent sessions')
  .option('--no-stealth', 'Disable stealth mode')
  .action(runCommand);

program.parse();
