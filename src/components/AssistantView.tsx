import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { AssistantMessage } from '../types';
import { Bot, User, Send, Sparkles, RefreshCw, Lightbulb, Zap } from 'lucide-react';

export const AssistantView: React.FC = () => {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      content: `Hello! I am your **CareerHub Placement AI Mentor**. I'm here to help you navigate campus recruitment, company interview rounds, technical deep-dives, resume bullet enhancement, and salary negotiation.\n\nHow can I help power your placement journey today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const samplePrompts = [
    "How to prepare for campus placement interviews in 30 days?",
    "Give me a bullet-proof answer for 'Tell me about yourself'",
    "What core technical questions does Google / Microsoft ask for SDE-1?",
    "How to explain my capstone project using the STAR method?",
    "What missing full-stack skills should I learn to pass ATS filters?",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input.trim();
    if (!query || loading) return;

    const userMsg: AssistantMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.askAssistant(query);
      const aiMsg: AssistantMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        content: res.reply || "I am analyzing your placement request...",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: AssistantMessage = {
        id: `error-${Date.now()}`,
        sender: 'assistant',
        content: `⚠️ Sorry, I encountered an issue: ${err.message || 'Unable to connect to AI engine.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] rounded-3xl bg-[#0f1b3b] border border-slate-800 overflow-hidden shadow-xl">
      {/* Assistant Header */}
      <div className="p-4 sm:p-5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-white text-base sm:text-lg">CareerHub AI Mentor</h2>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                Online
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Campus placement strategies, mock answers, and technical interview guidance
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setMessages([
              {
                id: 'welcome',
                sender: 'assistant',
                content: `Chat reset. What career topic or placement question would you like to explore?`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ]);
          }}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-all"
          title="Clear chat history"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Suggested Prompts Pill Tray */}
      <div className="px-4 py-2.5 bg-slate-900/50 border-b border-slate-800/80 overflow-x-auto flex items-center gap-2 no-scrollbar">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-400 shrink-0">
          <Lightbulb className="w-3.5 h-3.5" />
          <span>Quick Prompts:</span>
        </div>
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            className="shrink-0 px-3 py-1 rounded-full bg-slate-800/80 hover:bg-cyan-950/60 border border-slate-700 hover:border-cyan-700/50 text-xs text-slate-300 hover:text-cyan-300 transition-all truncate max-w-xs"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div
              key={m.id}
              className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold ${
                  isUser
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gradient-to-tr from-cyan-950 to-blue-950 border border-cyan-800 text-cyan-300'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`rounded-2xl p-4 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none shadow-md shadow-cyan-600/20'
                    : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans text-sm space-y-2">
                  {m.content.split('\n\n').map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
                <div
                  className={`text-[10px] mt-2 font-medium ${
                    isUser ? 'text-cyan-100 text-right' : 'text-slate-400'
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 mr-auto max-w-md">
            <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-300 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 rounded-tl-none text-slate-400 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>CareerHub AI is formulating placement strategy...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-4 bg-slate-900/95 border-t border-slate-800">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about company interview rounds, resume bullets, or placement roadmaps..."
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 focus:border-cyan-500 focus:outline-none text-sm text-white placeholder-slate-400 transition-all"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span>Send</span>
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
