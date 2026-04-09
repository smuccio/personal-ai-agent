'use client';

import { useState, useRef, useEffect } from 'react';

interface AgentStep {
  stepNumber: number;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  text?: string;
  cost?: number;
  cumulativeCost?: number;
  timestamp: number;
}

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  steps?: AgentStep[];
  totalCost?: number;
  totalSteps?: number;
  liveViewUrl?: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
  const [showBrowser, setShowBrowser] = useState(true);
  const [currentCost, setCurrentCost] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stepsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    stepsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isRunning) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsRunning(true);
    setSteps([]);
    setCurrentCost(0);
    setCurrentStep(0);

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: input }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      // Handle SSE streaming
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'browser:ready') {
                  setLiveViewUrl(data.liveViewUrl);
                } else if (data.type === 'step') {
                  const step: AgentStep = {
                    stepNumber: data.stepNumber,
                    toolName: data.toolName,
                    toolArgs: data.toolArgs,
                    text: data.text,
                    cost: data.cost,
                    cumulativeCost: data.cumulativeCost,
                    timestamp: Date.now(),
                  };
                  setSteps((prev) => [...prev, step]);
                  setCurrentCost(data.cumulativeCost || 0);
                  setCurrentStep(data.stepNumber);
                } else if (data.type === 'done') {
                  const agentMsg: Message = {
                    id: crypto.randomUUID(),
                    role: 'agent',
                    content: data.answer,
                    totalCost: data.totalCost,
                    totalSteps: data.totalSteps,
                    liveViewUrl: data.liveViewUrl,
                  };
                  setMessages((prev) => [...prev, agentMsg]);
                } else if (data.type === 'error') {
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: crypto.randomUUID(),
                      role: 'agent',
                      content: `Error: ${data.error}`,
                    },
                  ]);
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'agent',
          content: `Error: ${(error as Error).message}`,
        },
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  const toolIcon = (name?: string) => {
    if (!name) return '💭';
    const icons: Record<string, string> = {
      navigate: '🔗', click: '👆', type: '⌨️', screenshot: '📸',
      visionClick: '🎯', visionType: '🎯', extractText: '📄',
      extractLinks: '🔗', extractTable: '📊', scrollDown: '⬇️',
      scrollUp: '⬆️', pressKey: '⌨️', fillForm: '📝', done: '✅',
      askUser: '❓', hover: '👆', selectOption: '📋', goBack: '◀️',
      goForward: '▶️', getPageInfo: '📋', waitForElement: '⏳',
      waitForPageLoad: '⏳', scrollToElement: '🎯', submitForm: '📤',
      getCurrentUrl: '🔗', getPageTitle: '📄', visionScroll: '⬇️',
    };
    return icons[name] || '🔧';
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left panel: Chat + Steps */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Personal AI Agent
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Kernel + Bedrock
            </p>
          </div>
          <div className="flex items-center gap-4">
            {isRunning && (
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" style={{ animation: 'pulse-dot 1.4s ease-in-out infinite' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" style={{ animation: 'pulse-dot 1.4s ease-in-out 0.2s infinite' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" style={{ animation: 'pulse-dot 1.4s ease-in-out 0.4s infinite' }} />
                </div>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Step {currentStep}
                </span>
              </div>
            )}
            {currentCost > 0 && (
              <span className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: 'var(--surface-3)', color: 'var(--text-secondary)' }}>
                ${currentCost.toFixed(4)}
              </span>
            )}
            <button
              onClick={() => setShowBrowser(!showBrowser)}
              className="text-xs px-3 py-1.5 rounded transition-colors"
              style={{
                backgroundColor: showBrowser ? 'var(--accent)' : 'var(--surface-3)',
                color: showBrowser ? 'white' : 'var(--text-secondary)',
              }}
            >
              {showBrowser ? 'Hide Browser' : 'Show Browser'}
            </button>
          </div>
        </header>

        <div className="flex flex-1 min-h-0">
          {/* Chat area */}
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0 && !isRunning && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <div className="text-4xl mb-4">🤖</div>
                    <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                      What should I do?
                    </p>
                    <p className="text-sm mt-2" style={{ color: 'var(--text-tertiary)' }}>
                      I can navigate websites, fill forms, extract data, and automate multi-step workflows.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-6 justify-center">
                      {[
                        'Go to Hacker News and get the top 5 headlines',
                        'Search Google for "AI agents 2025"',
                        'Go to GitHub trending and extract repos',
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setInput(suggestion)}
                          className="text-xs px-3 py-2 rounded-lg border transition-colors hover:border-indigo-500"
                          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--surface-2)' }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in`}>
                  <div
                    className="max-w-[85%] rounded-xl px-4 py-3"
                    style={{
                      backgroundColor: msg.role === 'user' ? 'var(--accent)' : 'var(--surface-2)',
                      border: msg.role === 'agent' ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                    {msg.totalCost !== undefined && (
                      <div className="flex gap-3 mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {msg.totalSteps} steps
                        </span>
                        <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                          ${msg.totalCost.toFixed(4)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="border-t p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Describe a task..."
                  className="flex-1 rounded-xl px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500/50"
                  style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  disabled={isRunning}
                />
                <button
                  type="submit"
                  disabled={isRunning || !input.trim()}
                  className="px-5 py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-40"
                  style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                >
                  {isRunning ? 'Running...' : 'Run'}
                </button>
              </div>
            </form>
          </div>

          {/* Steps panel */}
          {steps.length > 0 && (
            <div className="w-72 border-l overflow-y-auto" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
              <div className="sticky top-0 px-4 py-3 border-b text-xs font-medium" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}>
                Agent Steps ({steps.length})
              </div>
              <div className="p-3 space-y-1">
                {steps.map((step, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 px-2.5 py-2 rounded-lg text-xs animate-slide-in"
                    style={{ backgroundColor: step.toolName === 'done' ? 'rgba(34,197,94,0.1)' : 'var(--surface-2)' }}
                  >
                    <span className="flex-shrink-0 mt-0.5">{toolIcon(step.toolName)}</span>
                    <div className="min-w-0">
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {step.toolName || 'thinking'}
                      </span>
                      {step.toolArgs && step.toolName === 'navigate' && (
                        <p className="truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                          {String(step.toolArgs.url || '')}
                        </p>
                      )}
                      {step.toolArgs && step.toolName === 'click' && (
                        <p className="truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                          {String(step.toolArgs.selector || '')}
                        </p>
                      )}
                      {step.toolArgs && step.toolName === 'type' && (
                        <p className="truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                          &quot;{String(step.toolArgs.text || '')}&quot;
                        </p>
                      )}
                      {step.cost !== undefined && (
                        <span className="font-mono" style={{ color: 'var(--text-tertiary)' }}>
                          ${step.cost.toFixed(4)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={stepsEndRef} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Browser live view */}
      {showBrowser && liveViewUrl && (
        <div className="w-[550px] border-l flex flex-col" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--success)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Live Browser</span>
            </div>
            <button
              onClick={() => setShowBrowser(false)}
              className="text-xs px-2 py-1 rounded transition-colors hover:bg-white/5"
              style={{ color: 'var(--text-tertiary)' }}
            >
              ✕
            </button>
          </div>
          <iframe
            src={liveViewUrl}
            className="flex-1 w-full bg-black"
            title="Browser Live View"
          />
        </div>
      )}
    </div>
  );
}
