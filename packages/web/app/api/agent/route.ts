import { NextRequest, NextResponse } from 'next/server';

// TODO: Import from @personal-ai-agent/core once transpilePackages is set up
// import { createAgent } from '@personal-ai-agent/core';

export async function POST(request: NextRequest) {
  try {
    const { task, model, provider, budget } = await request.json();

    if (!task) {
      return NextResponse.json({ error: 'Task is required' }, { status: 400 });
    }

    // TODO: Wire up to core agent
    // For now, return a placeholder
    // In production, this will:
    // 1. Create agent with SSE streaming
    // 2. Stream step events back to the client
    // 3. Return final result

    return NextResponse.json({
      answer: `[Placeholder] Would execute: "${task}"`,
      totalSteps: 0,
      totalCost: 0,
      liveViewUrl: null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
