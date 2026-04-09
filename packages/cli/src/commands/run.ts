import ora from 'ora';
import chalk from 'chalk';
import { createAgent, DEFAULT_MODEL_CONFIG, DEFAULT_MAX_STEPS, DEFAULT_MAX_BUDGET } from '@personal-ai-agent/core';
import type { ModelConfig, StepEvent } from '@personal-ai-agent/core';

interface RunOptions {
  model?: string;
  provider?: string;
  budget?: string;
  steps?: string;
  profile?: string;
  stealth: boolean;
}

export async function runCommand(task: string, options: RunOptions) {
  console.log(chalk.bold('\n🤖 Personal AI Agent\n'));
  console.log(chalk.dim(`Task: ${task}\n`));

  const spinner = ora('Creating browser session...').start();

  try {
    const modelConfig: ModelConfig = {
      provider: (options.provider as 'openrouter' | 'bedrock') || DEFAULT_MODEL_CONFIG.provider,
      model: options.model || DEFAULT_MODEL_CONFIG.model,
    };

    console.log(chalk.dim(`Model: ${modelConfig.provider}/${modelConfig.model}`));
    console.log(chalk.dim(`Budget: $${options.budget || DEFAULT_MAX_BUDGET}`));
    console.log('');

    const result = await createAgent(task, {
      model: modelConfig,
      maxSteps: parseInt(options.steps || String(DEFAULT_MAX_STEPS), 10),
      maxBudget: parseFloat(options.budget || String(DEFAULT_MAX_BUDGET)),
      browser: {
        stealth: options.stealth,
        profileId: options.profile,
      },
      onStep: (event: StepEvent) => {
        if (event.stepNumber === 0) {
          // Browser ready event
          spinner.succeed('Browser ready');
          console.log(chalk.cyan(`  🌐 Live view: ${event.text?.match(/https?:\/\/[^\s]+/)?.[0] || ''}\n`));
          spinner.start('Agent thinking...');
          return;
        }

        if (event.toolName) {
          const costStr = event.cumulativeCost
            ? chalk.dim(` ($${event.cumulativeCost.toFixed(4)})`)
            : '';

          spinner.text = `Step ${event.stepNumber}: ${chalk.yellow(event.toolName)}${costStr}`;

          // Show tool details for key actions
          if (event.toolName === 'navigate' && event.toolArgs?.url) {
            spinner.info(`Step ${event.stepNumber}: ${chalk.yellow('navigate')} → ${event.toolArgs.url}${costStr}`);
            spinner.start('Agent thinking...');
          } else if (event.toolName === 'click' && event.toolArgs?.selector) {
            spinner.info(`Step ${event.stepNumber}: ${chalk.yellow('click')} → ${event.toolArgs.selector}${costStr}`);
            spinner.start('Agent thinking...');
          } else if (event.toolName === 'type') {
            spinner.info(`Step ${event.stepNumber}: ${chalk.yellow('type')} → "${event.toolArgs?.text}"${costStr}`);
            spinner.start('Agent thinking...');
          } else if (event.toolName === 'screenshot') {
            spinner.info(`Step ${event.stepNumber}: ${chalk.yellow('screenshot')} 📸${costStr}`);
            spinner.start('Agent analyzing screenshot...');
          } else if (event.toolName === 'extractText') {
            spinner.info(`Step ${event.stepNumber}: ${chalk.yellow('extractText')}${costStr}`);
            spinner.start('Agent thinking...');
          } else if (event.toolName === 'done') {
            spinner.succeed(`Step ${event.stepNumber}: ${chalk.green('done')}${costStr}`);
          } else {
            spinner.info(`Step ${event.stepNumber}: ${chalk.yellow(event.toolName)}${costStr}`);
            spinner.start('Agent thinking...');
          }
        }
      },
    });

    // Final output
    console.log('\n' + chalk.bold.green('✅ Task completed\n'));
    console.log(chalk.bold('Result:'));
    console.log(result.answer);
    console.log('\n' + chalk.dim('─'.repeat(50)));
    console.log(chalk.dim(`Steps: ${result.totalSteps}`));
    console.log(chalk.dim(`Cost:  $${result.totalCost.toFixed(4)}`));
    console.log(chalk.dim(`Log:   ${result.logPath}`));
    console.log(chalk.dim(`View:  ${result.liveViewUrl}`));
  } catch (error) {
    spinner.fail('Agent error');
    console.error('\n' + chalk.red((error as Error).message));
    if ((error as Error).stack) {
      console.error(chalk.dim((error as Error).stack));
    }
    process.exit(1);
  }
}
