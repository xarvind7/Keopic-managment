import { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  User as UserIcon, 
  RefreshCw, 
  Lightbulb, 
  TrendingUp, 
  Target, 
  Zap,
  MessageSquare,
  BarChart2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MetaConfig } from '../types';
import { CalculationResult } from '../utils/calculations';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonth: string;
  meta: MetaConfig;
  stats: CalculationResult;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export default function AiAssistantModal({
  isOpen,
  onClose,
  selectedMonth,
  meta,
  stats,
}: AiAssistantModalProps) {
  const [activeTab, setActiveTab] = useState<'insights' | 'chat'>('insights');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Hello ${meta.empName || 'there'}! I'm your AI Sales & Commission Copilot for **${selectedMonth}**.\n\nAsk me anything about your incentive targets, Stand vs Magnet sales strategy, or daily revenue optimization!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  // Generate Analysis when opening modal or changing month
  const fetchAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          meta,
          stats,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reach AI service.');
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setAnalysis(data.analysis);
    } catch (err: any) {
      setAnalysisError(err?.message || 'Unable to generate AI analysis at this time.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (isOpen && !analysis && !isAnalyzing) {
      fetchAnalysis();
    }
  }, [isOpen, selectedMonth]);

  const handleSendMessage = async (textToSend?: string) => {
    const msgText = (textToSend || inputMessage).trim();
    if (!msgText || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: msgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsChatLoading(true);

    try {
      const apiMessages = [...chatMessages, userMsg].map((m) => ({
        role: m.role,
        content: m.text,
      }));

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          context: {
            employeeName: meta.empName,
            location: meta.locVal,
            selectedMonth,
            totalStand: stats.totalStand,
            standUnits: stats.standUnits,
            totalMagnet: stats.totalMagnet,
            magnetUnits: stats.magnetUnits,
            totalFrame: stats.totalFrame,
            grossSales: stats.grossSales,
            totalIncentive: stats.totalIncentive,
            finalPayable: stats.finalPayable,
            presentDays: stats.presentDays,
          },
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: data.reply || 'Sorry, I could not process that request.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: `⚠️ Error: ${err?.message || 'Could not connect to AI advisor. Please try again.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const quickPrompts = [
    'How do I boost my magnet sales?',
    'What is my current sales average per day?',
    'How many units do I need to earn more commission?',
    'Give me top photobooth sales tips!',
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 glass-scrim"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
            className="relative w-full max-w-2xl liquid-glass-card rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border border-white/25 flex flex-col max-h-[90vh] overflow-hidden"
          >
            {/* Top Specular Sheen */}
            <div className="specular-sheen-top" />
            
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-600/90 via-purple-600/90 to-pink-600/90 text-white flex items-center justify-between relative z-10 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md shadow-inner border border-white/20">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
              <div>
                <h2 className="text-base font-black tracking-tight flex items-center gap-1.5">
                  AI Sales Advisor & Insights
                  <span className="text-[10px] uppercase font-extrabold bg-amber-400 text-slate-900 px-1.5 py-0.5 rounded-md">
                    Gemini 3.6
                  </span>
                </h2>
                <p className="text-xs text-indigo-100 opacity-90 font-medium">
                  Smart commission analysis & performance tips for {selectedMonth}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/20 transition cursor-pointer text-white/90 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-white/10 admin-glass-panel px-4 pt-2 relative z-10">
            <button
              onClick={() => setActiveTab('insights')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition cursor-pointer ${
                activeTab === 'insights'
                  ? 'border-cyan-400 text-cyan-300 admin-glass-tile shadow-xs'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              Performance Insights
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition cursor-pointer ${
                activeTab === 'chat'
                  ? 'border-cyan-400 text-cyan-300 admin-glass-tile shadow-xs'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Sales Copilot Chat
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 relative z-10">
            {activeTab === 'insights' && (
              <div className="space-y-4">
                {/* Stats Summary Strip */}
                <div className="grid grid-cols-3 gap-2 p-3 admin-glass-tile rounded-2xl relative overflow-hidden border border-white/15">
                  <div className="specular-sheen-top" />
                  <div className="text-center relative z-10">
                    <span className="block text-[10px] font-extrabold uppercase text-cyan-400">
                      Gross Revenue
                    </span>
                    <span className="text-sm font-black font-mono text-white">
                      ₹{stats.grossSales.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="text-center border-x border-white/10 relative z-10">
                    <span className="block text-[10px] font-extrabold uppercase text-purple-400">
                      Items Sold
                    </span>
                    <span className="text-sm font-black font-mono text-white">
                      {stats.magnetUnits} Mag / {stats.standUnits} Std
                    </span>
                  </div>
                  <div className="text-center relative z-10">
                    <span className="block text-[10px] font-extrabold uppercase text-emerald-400">
                      Commission
                    </span>
                    <span className="text-sm font-black font-mono text-emerald-400">
                      ₹{stats.totalIncentive.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Analysis State */}
                {isAnalyzing ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="inline-flex items-center justify-center p-3 bg-indigo-500/20 rounded-2xl text-cyan-400 animate-spin border border-indigo-400/30">
                      <RefreshCw className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-300">
                      Gemini AI is analyzing your sales figures, attendance, and commission breakdown...
                    </p>
                  </div>
                ) : analysisError ? (
                  <div className="p-4 bg-rose-500/20 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <p className="font-bold">{analysisError}</p>
                      <button
                        onClick={fetchAnalysis}
                        className="px-3 py-1 bg-rose-600 text-white font-extrabold text-[11px] rounded-lg hover:bg-rose-700 transition cursor-pointer"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 admin-glass-tile rounded-2xl border border-white/15 text-xs leading-relaxed text-slate-200 whitespace-pre-line font-sans relative overflow-hidden">
                      <div className="specular-sheen-top" />
                      <div className="relative z-10">{analysis}</div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={fetchAnalysis}
                        disabled={isAnalyzing}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 admin-glass-tile hover:border-cyan-400/40 text-cyan-300 font-extrabold text-xs rounded-xl transition cursor-pointer border border-white/15"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                        Refresh Analysis
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="flex flex-col h-[380px]">
                {/* Chat Message List */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'glass-bubble-user font-medium rounded-tr-xs'
                            : 'glass-bubble-bot rounded-tl-xs whitespace-pre-line'
                        }`}
                      >
                        {msg.text}
                        <span
                          className={`block text-[9px] mt-1 font-sans opacity-70 ${
                            msg.role === 'user' ? 'text-indigo-200 text-right' : 'text-slate-400'
                          }`}
                        >
                          {msg.timestamp}
                        </span>
                      </div>

                      {msg.role === 'user' && (
                        meta.profilePic ? (
                          <img src={meta.profilePic} alt="User" className="w-7 h-7 rounded-lg object-cover border border-cyan-400/40 shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/30 border border-indigo-400/30 text-cyan-300 flex items-center justify-center text-xs font-bold shrink-0">
                            <UserIcon className="w-4 h-4" />
                          </div>
                        )
                      )}
                    </div>
                  ))}

                  {isChatLoading && (
                    <div className="flex items-center gap-2 text-xs text-cyan-400 italic">
                      <Bot className="w-4 h-4 animate-bounce text-cyan-400" />
                      Gemini is thinking...
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Quick Suggestion Chips */}
                <div className="pt-2 pb-1 flex flex-wrap gap-1.5">
                  {quickPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      disabled={isChatLoading}
                      className="text-[10px] font-bold px-2.5 py-1 admin-glass-tile text-indigo-200 hover:text-cyan-300 rounded-lg border border-white/15 hover:border-cyan-400/40 transition cursor-pointer"
                    >
                      ⚡ {prompt}
                    </button>
                  ))}
                </div>

                {/* Input Controls */}
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask AI about targets, sales tips, or commission..."
                    className="flex-1 px-3 py-2 text-xs bg-white/5 border border-white/15 rounded-xl focus:outline-hidden focus:border-cyan-400 text-white placeholder-slate-400 transition"
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!inputMessage.trim() || isChatLoading}
                    className="p-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:brightness-110 disabled:opacity-40 text-white rounded-xl transition cursor-pointer shadow-md"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    )}
    </AnimatePresence>
  );
}
