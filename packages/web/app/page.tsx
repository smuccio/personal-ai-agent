'use client';

import { useState } from 'react';

interface AgentStep {
  stepNumber: number;
  toolName?: string;
  text?: string;
  timestamp: number;
}

interface Message {
  role: 'user' | 'agent';
  content: string;
  steps?: AgentStep[];
  cost?: number;
  liveViewUrl?: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isRunning) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsRunning(true);

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: input }),
      });

      // TODO: Handle SSE streaming of agent steps
      const result = await response.json();

      if (result.liveViewUrl) {
        setLiveViewUrl(result.liveViewUrl);
      }

      const agentMessage: Message = {
        role: 'agent',
        content: result.answer || 'Task completed',
        cost: result.totalCost,
        liveViewUrl: result.liveViewUrl,
      };
      setMessages((prev) => [...prev, agentMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'agent', content: `Error: ${(error as Error).message}` },
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Main chat area */}
      <div className="flex flex-col flex-1">
        <header className="border-b border-zinc-800 px-6 py-4">
          <h1 className="text-xl font-semibold text-white">Personal AI Agent</h1>
          <p className="text-sm text-zinc-400">Browser automation powered by Kernel + LLMs</p>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full text-zinc-500">
              <div className="text-center">
                <p className="text-lg">What would you like me to do?</p>
                <p className="text-sm mt-2">
                  Try: &quot;Go to Hacker News and extract the top 5 headlines&quot;
                </p>
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-zinc-100'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.cost !== undefined && (
                  <p className="text-xs mt-2 opacity-60">Cost: ${msg.cost.toFixed(4)}</p>
                )}
              </div>
            </div>
          ))}
          {isRunning && (
            <div className="flex justify-start">
              <div className="bg-zinc-800 text-zinc-400 rounded-lg px-4 py-3 animate-pulse">
                Agent is working...
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t border-zinc-800 p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe a task... (e.g., 'Go to LinkedIn and search for AI engineers in NYC')"
              className="flex-1 bg-zinc-800 text-white rounded-lg px-4 py-3 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isRunning}
            />
            <button
              type="submit"
              disabled={isRunning || !input.trim()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Run
            </button>
          </div>
        </form>
      </div>

      {/* Browser live view panel */}
      {liveViewUrl && (
        <div className="w-[600px] border-l border-zinc-800 flex flex-col">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <span className="text-sm font-medium text-zinc-300">Live Browser View</span>
            <button
              onClick={() => setLiveViewUrl(null)}
              className="text-zinc-500 hover:text-zinc-300 text-sm"
            >
              Close
            </button>
          </div>
          <iframe
            src={liveViewUrl}
            className="flex-1 w-full"
            title="Kernel Browser Live View"
          />
        </div>
      )}
    </div>
  );
}
