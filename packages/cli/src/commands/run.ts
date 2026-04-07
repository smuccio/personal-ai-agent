import ora from 'ora';
import chalk from 'chalk';
import { createAgent } from '@personal-ai-agent/core';
import type { ModelConfig } from '@personal-ai-agent/core';

interface RunOptions {
  model?: string;
  provider: string;
  budget: string;
  steps: string;
  profile?: string;
  stealth: boolean;
}

export async function runCommand(task: string, options: RunOptions) {
  const spinner = ora('Starting agent...').start();

  try {
    const modelConfig: ModelConfig = {
      provider: options.provider as 'openrouter' | 'bedrock',
      model: options.model || process.env.DEFAULT_MODEL || 'anthropic/claude-sonnet-4-20250514',
    };

    spinner.text = `Creating browser session...`;

    const result = await createAgent(task, {
      model: modelConfig,
      maxSteps: parseInt(options.steps, 10),
      maxBudget: parseFloat(options.budget),
      browser: {
        stealth: options.stealth,
        profileId: options.profile,
      },
      onStepFinish: (step) => {
        if (step.toolName) {
          spinner.text = `Step ${step.stepNumber}: ${step.toolName}`;
        } else if (step.text) {
          spinner.text = `Step ${step.stepNumber}: thinking...`;
        }
      },
    });

    spinner.succeed('Task completed!');

    console.log('\n' + chalk.bold('Result:'));
    console.log(result.answer);
    console.log('\n' + chalk.dim(`Steps: ${result.totalSteps}`));
    console.log(chalk.dim(`Cost: $${result.totalCost.toFixed(4)}`));
    console.log(chalk.dim(`Live view: ${result.liveViewUrl}`));
  } catch (error) {
    spinner.fail('Agent error');
    console.error(chalk.red((error as Error).message));
    process.exit(1);
  }
}
