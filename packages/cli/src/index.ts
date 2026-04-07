#!/usr/bin/env node

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
  .argument('<task>', 'The task to perform (e.g., "go to linkedin and search for AI engineers")')
  .option('-m, --model <model>', 'LLM model to use (e.g., anthropic/claude-sonnet-4-20250514)')
  .option('-p, --provider <provider>', 'LLM provider (openrouter or bedrock)', 'openrouter')
  .option('-b, --budget <budget>', 'Maximum budget in USD', '0.50')
  .option('-s, --steps <steps>', 'Maximum steps', '30')
  .option('--profile <profile>', 'Kernel browser profile ID for persistent sessions')
  .option('--no-stealth', 'Disable stealth mode')
  .action(runCommand);

// TODO: Add session management commands
// program.command('session').description('Manage browser sessions')...

// TODO: Add config commands
// program.command('config').description('Manage agent configuration')...

program.parse();
