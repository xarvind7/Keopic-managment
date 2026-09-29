import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, ShieldCheck, Sparkles, User, AlertCircle, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMessage } from '../types';

interface StaffChatWidgetProps {
  chatMessages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onMarkAsRead?: () => void;
  empName: string;
  locVal: string;
}

export default function StaffChatWidget({
  chatMessages = [],
  onSendMessage,
  onMarkAsRead,
  empName,
  locVal
}: StaffChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Unread messages count from Admin
  const unreadCount = chatMessages.filter(m => m.sender === 'admin' && !m.read).length;

  useEffect(() => {
    if (isOpen && unreadCount > 0 && onMarkAsRead) {
      onMarkAsRead();
    }
  }, [isOpen, unreadCount, onMarkAsRead]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isOpen]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputText.trim();
    if (!clean) return;
    onSendMessage(clean);
    setInputText('');
  };

  const handlePreset = (text: string) => {
    onSendMessage(text);
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-24 md:bottom-28 right-4 sm:right-6 z-40 no-print">
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            const nextState = !isOpen;
            setIsOpen(nextState);
            if (nextState && unreadCount > 0 && onMarkAsRead) {
              onMarkAsRead();
            }
          }}
          className="relative group flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white rounded-full shadow-[0_8px_30px_rgba(79,70,229,0.5)] border border-cyan-300/40 hover:brightness-110 transition cursor-pointer hardware-accelerated"
        >
          <div className="relative">
            <MessageSquare className="w-4.5 h-4.5 text-cyan-200 group-hover:rotate-6 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full" />
          </div>

          <span className="text-[11px] font-black tracking-wide">
            Admin Chat
          </span>

          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-mono font-black shadow-lg border border-rose-300 animate-pulse"
            >
              {unreadCount}
            </motion.span>
          )}
        </motion.button>
      </div>

      {/* Floating Chat Window Modal/Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="fixed bottom-36 md:bottom-32 right-3 sm:right-6 z-50 w-[calc(100vw-1.5rem)] sm:w-96 h-[500px] max-h-[75vh] liquid-glass-card border border-white/25 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.75)] flex flex-col overflow-hidden"
          >
            {/* Top Specular Sheen */}
            <div className="specular-sheen-top" />
            
            {/* Header */}
            <div className="p-4 admin-glass-panel border-b border-white/10 flex items-center justify-between shrink-0 relative z-10">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 shadow-md flex items-center justify-center">
                  <div className="w-full h-full bg-[#0a0f2d] rounded-[14px] flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-cyan-400" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#0a0f2d] rounded-full" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                    <span>Admin Support</span>
                    <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-mono font-bold border border-cyan-400/30">
                      LIVE
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {empName || 'Staff'} • {locVal || 'Branch'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Presets Bar */}
            <div className="px-3 py-2 admin-glass-tile border-b border-white/10 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0 relative z-10">
              <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" /> Quick:
              </span>
              <button
                type="button"
                onClick={() => handlePreset(' Please verify today\'s entries.')}
                className="px-2.5 py-1 rounded-lg admin-glass-tile hover:border-cyan-400/40 text-cyan-200 text-[10px] font-bold border border-white/15 whitespace-nowrap transition cursor-pointer"
              >
                Entry Check
              </button>

              <button
                type="button"
                onClick={() => handlePreset(' Salary / Advance status request.')}
                className="px-2.5 py-1 rounded-lg admin-glass-tile hover:border-emerald-400/40 text-emerald-300 text-[10px] font-bold border border-white/15 whitespace-nowrap transition cursor-pointer"
              >
                Payout Info
              </button>

              <button
                type="button"
                onClick={() => handlePreset(' Scanner / Printer issue at branch.')}
                className="px-2.5 py-1 rounded-lg admin-glass-tile hover:border-rose-400/40 text-rose-300 text-[10px] font-bold border border-white/15 whitespace-nowrap transition cursor-pointer"
              >
                Hardware Issue
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar relative z-10">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3">
                    <MessageSquare className="w-6 h-6 text-indigo-400" />
                  </div>
                  <p className="text-xs font-bold text-slate-300">Direct Chat with Admin</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Send a message to ask queries, request salary updates, or notify entry checks.
                  </p>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isStaff = msg.sender === 'staff';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400 font-medium">
                        <span className="font-extrabold text-slate-300">
                          {isStaff ? 'You' : 'Admin'}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      <div
                        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                          isStaff
                            ? 'glass-bubble-user rounded-br-xs'
                            : 'glass-bubble-bot rounded-bl-xs'
                        }`}
                      >
                        {msg.text}
                      </div>

                      <div className="mt-0.5 text-[9px] text-slate-500 flex items-center gap-1">
                        {isStaff && (
                          <CheckCheck className={`w-3 h-3 ${msg.read ? 'text-cyan-400' : 'text-slate-500'}`} />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <form onSubmit={handleSend} className="p-3 admin-glass-panel border-t border-white/10 flex items-center gap-2 shrink-0 relative z-10">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your message to Admin..."
                className="flex-1 bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-cyan-400 transition"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-xs hover:brightness-110 disabled:opacity-40 transition flex items-center justify-center cursor-pointer shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
