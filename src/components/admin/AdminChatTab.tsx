import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Search, CheckCheck, User, Building, MapPin, Sparkles, Clock, Check, RefreshCw, ArrowLeft } from 'lucide-react';
import { ChatMessage } from '../../types';
import { saveUserDataToCloud } from '../../lib/supabase';
import { getTotalHoursForEntries } from '../WorkHoursCard';
import { performCalculations } from '../../utils/calculations';

interface CloudRecordItem {
  id: string;
  data: any;
}

interface AdminChatTabProps {
  records: CloudRecordItem[];
  onSelectStaffForDetail?: (record: CloudRecordItem) => void;
}

export default function AdminChatTab({
  records = [],
  onSelectStaffForDetail
}: AdminChatTabProps) {
  const [selectedUid, setSelectedUid] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [mobileShowThread, setMobileShowThread] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter valid user records (excluding system records like admin_staff_codes)
  const staffRecords = records.filter(r => r.id !== 'admin_staff_codes');

  // Select first staff by default if none selected
  useEffect(() => {
    if (!selectedUid && staffRecords.length > 0) {
      setSelectedUid(staffRecords[0].id);
    }
  }, [staffRecords, selectedUid]);

  // Active staff record
  const activeRecord = staffRecords.find(r => r.id === selectedUid) || staffRecords[0];

  // Get active chat messages
  const activeChatMessages: ChatMessage[] = activeRecord?.data?.chatMessages || [];

  // Scroll to bottom of chat on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatMessages, selectedUid]);

  // Auto-mark messages as read when Admin selects a channel
  useEffect(() => {
    if (!activeRecord) return;
    const msgs: ChatMessage[] = activeRecord.data?.chatMessages || [];
    const hasUnreadStaff = msgs.some(m => m.sender === 'staff' && !m.read);

    if (hasUnreadStaff) {
      const updatedMsgs = msgs.map(m =>
        m.sender === 'staff' ? { ...m, read: true } : m
      );
      const updatedPayload = {
        ...activeRecord.data,
        chatMessages: updatedMsgs,
        updatedAt: Date.now()
      };

      saveUserDataToCloud(activeRecord.id, updatedPayload).catch(err => {
        console.error('Failed to mark staff chat as read:', err);
      });
    }
  }, [selectedUid, activeRecord]);

  // Send message from Admin
  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !activeRecord) return;

    const newMsg: ChatMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      sender: 'admin',
      senderName: 'Admin / Management',
      text,
      timestamp: Date.now(),
      read: false
    };

    const existingMsgs: ChatMessage[] = activeRecord.data?.chatMessages || [];
    const updatedMsgs = [...existingMsgs, newMsg];

    const updatedPayload = {
      ...activeRecord.data,
      chatMessages: updatedMsgs,
      updatedAt: Date.now()
    };

    saveUserDataToCloud(activeRecord.id, updatedPayload)
      .then(() => {
        setInputText('');
      })
      .catch(err => {
        console.error('Failed to send admin chat message:', err);
      });
  };

  // Filter staff list by search query
  const filteredStaffList = staffRecords.filter(r => {
    const emp = (r.data?.meta?.empName || '').toLowerCase();
    const loc = (r.data?.meta?.locVal || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return emp.includes(q) || loc.includes(q);
  });

  // Calculate unread badge count per staff
  const getUnreadCount = (r: CloudRecordItem) => {
    const msgs: ChatMessage[] = r.data?.chatMessages || [];
    return msgs.filter(m => m.sender === 'staff' && !m.read).length;
  };

  // Total unread staff messages across all accounts
  const totalUnreadStaff = staffRecords.reduce((acc, r) => acc + getUnreadCount(r), 0);

  // Active staff details for top banner
  const activeMeta = activeRecord?.data?.meta || {};
  const activeEntries = activeRecord?.data?.entries || [];
  const activeTargets = activeRecord?.data?.targets || [];
  const activePayments = activeRecord?.data?.payments || [];
  const activeCalc = performCalculations(
    activeEntries,
    activeTargets,
    activePayments,
    activeMeta.baseSalary || 17000,
    activeMeta.monthVal || '2026-07'
  );
  const activeWorkHours = getTotalHoursForEntries(activeEntries);

  return (
    <div className="h-[calc(100vh-170px)] min-h-[500px] flex flex-col md:flex-row gap-4 p-2 sm:p-6 bg-transparent">
      {/* LEFT COLUMN: STAFF CHANNEL CHANNELS */}
      <div className={`w-full md:w-80 lg:w-96 ${mobileShowThread ? 'hidden md:flex' : 'flex'} flex-col admin-glass-panel border border-white/10 rounded-3xl overflow-hidden shrink-0 shadow-xl relative`}>
        <div className="specular-sheen-top" />
        
        {/* Search & Channel Header */}
        <div className="p-4 admin-glass-tile border-b border-white/10 space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <span>Staff Chat Channels</span>
            </h3>

            {totalUnreadStaff > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-mono font-black shadow-md border border-rose-400">
                {totalUnreadStaff} New
              </span>
            )}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search staff or location..."
              className="w-full bg-white/5 border border-white/15 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-cyan-400"
            />
          </div>
        </div>

        {/* Staff Channels List */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar relative z-10">
          {filteredStaffList.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No staff accounts found.
            </div>
          ) : (
            filteredStaffList.map(r => {
              const meta = r.data?.meta || {};
              const msgs: ChatMessage[] = r.data?.chatMessages || [];
              const lastMsg = msgs[msgs.length - 1];
              const unread = getUnreadCount(r);
              const isSelected = r.id === selectedUid;

              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelectedUid(r.id);
                    setMobileShowThread(true);
                  }}
                  className={`w-full p-3.5 text-left flex items-start gap-3 transition cursor-pointer ${
                    isSelected
                      ? 'admin-glass-tile border-l-4 border-cyan-400 shadow-sm'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 shrink-0">
                    {meta.profilePic ? (
                      <img
                        src={meta.profilePic}
                        alt="Profile"
                        className="w-full h-full object-cover rounded-[14px]"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#0b1238] rounded-[14px] flex items-center justify-center font-black text-xs text-cyan-300 uppercase">
                        {(meta.empName || 'S').slice(0, 2)}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#0b1238] rounded-full" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className="text-xs font-bold text-slate-100 truncate">
                        {meta.empName || 'Staff Member'}
                      </h4>
                      {lastMsg && (
                        <span className="text-[9.5px] text-slate-400 font-mono shrink-0">
                          {new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-400 flex items-center gap-1 truncate mb-1">
                      <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span>{meta.locVal || 'Branch'} • {meta.monthVal || '-'}</span>
                    </p>

                    <p className="text-[11px] text-slate-400 truncate italic">
                      {lastMsg ? (
                        <span className={lastMsg.sender === 'staff' ? 'text-cyan-300 font-medium' : 'text-slate-400'}>
                          {lastMsg.sender === 'admin' ? 'You: ' : ''}{lastMsg.text}
                        </span>
                      ) : (
                        'No chat messages yet'
                      )}
                    </p>
                  </div>

                  {unread > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-mono font-black shrink-0 self-center">
                      {unread}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: ACTIVE CHAT THREAD */}
      {activeRecord ? (
        <div className={`flex-1 ${!mobileShowThread ? 'hidden md:flex' : 'flex'} flex-col admin-glass-panel border border-white/10 rounded-3xl overflow-hidden shadow-xl relative`}>
          <div className="specular-sheen-top" />
          
          {/* Active Header Bar */}
          <div className="p-3 sm:p-4 admin-glass-tile border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0 relative z-10">
            <div className="flex items-center gap-2.5">
              {/* Mobile Back Button */}
              <button
                type="button"
                onClick={() => setMobileShowThread(false)}
                className="md:hidden p-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-cyan-300 border border-indigo-400/30 transition cursor-pointer flex items-center gap-1"
                title="Back to Channels"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-xs font-bold">Channels</span>
              </button>

              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 shadow-md shrink-0">
                {activeMeta.profilePic ? (
                  <img
                    src={activeMeta.profilePic}
                    alt="Staff"
                    className="w-full h-full object-cover rounded-[14px]"
                  />
                ) : (
                  <div className="w-full h-full bg-[#080d2c] rounded-[14px] flex items-center justify-center font-black text-sm text-cyan-300 uppercase">
                    {(activeMeta.empName || 'S').slice(0, 2)}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                  <span>{activeMeta.empName || 'Staff Member'}</span>
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-extrabold border border-cyan-400/30">
                    ⏱️ {activeWorkHours.formatted} Work
                  </span>
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5">
                  <span>📍 {activeMeta.locVal || 'Main Counter'}</span>
                  <span>•</span>
                  <span>🗓️ {activeMeta.monthVal || '-'}</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-mono font-bold">₹{Math.round(activeCalc.grossSales).toLocaleString('en-IN')} Sales</span>
                </p>
              </div>
            </div>

            {onSelectStaffForDetail && (
              <button
                type="button"
                onClick={() => onSelectStaffForDetail(activeRecord)}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl admin-glass-tile hover:border-cyan-400/40 text-cyan-200 text-xs font-bold border border-white/15 transition cursor-pointer"
              >
                View Ledger
              </button>
            )}
          </div>

          {/* Preset Admin Quick Replies */}
          <div className="px-4 py-2 admin-glass-panel border-b border-white/10 flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0 relative z-10">
            <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Admin Replies:
            </span>
            <button
              type="button"
              onClick={() => handleSendMessage(' Approved! Thank you.')}
              className="px-2.5 py-1 rounded-lg admin-glass-tile hover:border-emerald-400/40 text-emerald-300 text-[10px] font-bold border border-white/15 whitespace-nowrap transition cursor-pointer"
            >
               Approved
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage(' Please check and re-verify today\'s daily entry totals.')}
              className="px-2.5 py-1 rounded-lg admin-glass-tile hover:border-amber-400/40 text-amber-300 text-[10px] font-bold border border-white/15 whitespace-nowrap transition cursor-pointer"
            >
              ⚠️ Re-check Entries
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage(' Salary payout processed! Voucher generated in Payroll.')}
              className="px-2.5 py-1 rounded-lg admin-glass-tile hover:border-indigo-400/40 text-indigo-300 text-[10px] font-bold border border-white/15 whitespace-nowrap transition cursor-pointer"
            >
              💰 Salary Paid
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage(' Great sales performance today! Keep it up! ')}
              className="px-2.5 py-1 rounded-lg admin-glass-tile hover:border-purple-400/40 text-purple-300 text-[10px] font-bold border border-white/15 whitespace-nowrap transition cursor-pointer"
            >
              🌟 Great Work!
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar relative z-10">
            {activeChatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-3">
                  <MessageSquare className="w-7 h-7 text-cyan-400" />
                </div>
                <h4 className="text-sm font-bold text-slate-200">Start Live Chat with {activeMeta.empName || 'Staff'}</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Send real-time updates, clear queries, or confirm daily entry submissions directly.
                </p>
              </div>
            ) : (
              activeChatMessages.map(msg => {
                const isAdmin = msg.sender === 'admin';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-2 mb-1 text-[10px] text-slate-400 font-medium">
                      <span className="font-extrabold text-slate-300">
                        {isAdmin ? 'Admin (You)' : msg.senderName || 'Staff'}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div
                      className={`max-w-[80%] px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-md ${
                        isAdmin
                          ? 'glass-bubble-user rounded-br-xs'
                          : 'glass-bubble-bot rounded-bl-xs'
                      }`}
                    >
                      {msg.text}
                    </div>

                    {!isAdmin && (
                      <span className="text-[9px] text-cyan-400 mt-0.5 font-mono">
                        {msg.read ? '✓ Read' : 'Unread'}
                      </span>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Admin Textarea Input */}
          <div className="p-3 admin-glass-panel border-t border-white/10 flex items-center gap-3 shrink-0 relative z-10">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Type message to ${activeMeta.empName || 'Staff'}...`}
              className="flex-1 bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-hidden focus:border-cyan-400 transition"
            />

            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim()}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white font-extrabold text-xs hover:brightness-110 disabled:opacity-40 transition flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8 admin-glass-panel border border-white/10 rounded-3xl text-slate-400 text-xs">
          Select a staff member from the left channel list to open live chat.
        </div>
      )}
    </div>
  );
}
