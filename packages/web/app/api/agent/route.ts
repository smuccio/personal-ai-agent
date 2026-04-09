import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const { task, model, provider, budget } = await request.json();

  if (!task) {
    return new Response(JSON.stringify({ error: 'Task is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Stream agent execution via SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Dynamic import to avoid bundling issues with Node.js modules
        const { createAgent, DEFAULT_MODEL_CONFIG, DEFAULT_MAX_BUDGET } = await import(
          '@personal-ai-agent/core'
        );

        const modelConfig = {
          provider: (provider || DEFAULT_MODEL_CONFIG.provider) as 'bedrock' | 'openrouter',
          model: model || DEFAULT_MODEL_CONFIG.model,
        };

        const result = await createAgent(task, {
          model: modelConfig,
          maxBudget: budget ? parseFloat(budget) : DEFAULT_MAX_BUDGET,
          onStep: (event) => {
            if (event.stepNumber === 0 && event.text) {
              // Browser ready
              const urlMatch = event.text.match(/https?:\/\/[^\s]+/);
              if (urlMatch) {
                send({ type: 'browser:ready', liveViewUrl: urlMatch[0] });
              }
            } else {
              send({
                type: 'step',
                stepNumber: event.stepNumber,
                toolName: event.toolName,
                toolArgs: event.toolArgs,
                text: event.text,
                cost: event.cost,
                cumulativeCost: event.cumulativeCost,
              });
            }
          },
        });

        send({
          type: 'done',
          answer: result.answer,
          totalSteps: result.totalSteps,
          totalCost: result.totalCost,
          liveViewUrl: result.liveViewUrl,
        });
      } catch (error) {
        send({ type: 'error', error: (error as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
