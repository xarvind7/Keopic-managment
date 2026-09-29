import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Building, 
  ShoppingBag, 
  Calendar, 
  CreditCard, 
  Shield, 
  ArrowRightLeft,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';
import { ActivityLog } from '../../types';
import { subscribeToActivityLogs } from '../../services/activityService';

export default function ActivityLogsTab() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string>('ALL');

  useEffect(() => {
    const unsub = subscribeToActivityLogs((data) => {
      setLogs(data);
    });
    return () => unsub();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (selectedEntity !== 'ALL' && log.entity.toLowerCase() !== selectedEntity.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (log.actor || '').toLowerCase().includes(q) ||
          (log.action || '').toLowerCase().includes(q) ||
          (log.details || '').toLowerCase().includes(q) ||
          (log.entity || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, selectedEntity, searchQuery]);

  const getEntityIcon = (entity: string) => {
    switch (entity.toLowerCase()) {
      case 'sales':
        return <ShoppingBag className="w-4 h-4 text-emerald-400" />;
      case 'attendance':
        return <Calendar className="w-4 h-4 text-cyan-400" />;
      case 'inventory':
      case 'stock':
        return <ArrowRightLeft className="w-4 h-4 text-amber-400" />;
      case 'payroll':
        return <CreditCard className="w-4 h-4 text-purple-400" />;
      case 'auth':
      case 'session':
        return <Shield className="w-4 h-4 text-indigo-400" />;
      default:
        return <Activity className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0a0f2d]/80 backdrop-blur-xl p-5 rounded-2xl border border-indigo-500/20 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 shadow-lg flex items-center justify-center">
            <div className="w-full h-full bg-[#0a0f2d] rounded-[10px] flex items-center justify-center">
              <Activity className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              System Audit & Activity Logs
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-400/30">
                REALTIME
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Live audit trail of staff sales, attendance entries, stock transfers, payroll actions & logins.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{logs.length} Total Events Logged</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-[#0a0f2d]/60 p-3 rounded-xl border border-indigo-500/20">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search logs by staff name, action or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#131b4d] border border-indigo-500/30 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="px-3 py-2 bg-[#131b4d] border border-indigo-500/30 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">All Categories</option>
            <option value="sales">Sales</option>
            <option value="attendance">Attendance</option>
            <option value="inventory">Inventory & Stock</option>
            <option value="payroll">Payroll</option>
            <option value="auth">Auth & Session</option>
          </select>
        </div>
      </div>

      {/* Logs Table / List */}
      <div className="bg-[#0a0f2d]/90 backdrop-blur-xl rounded-2xl border border-indigo-500/20 shadow-2xl overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Activity className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p className="font-bold text-slate-300">No activity logs recorded yet</p>
            <p className="text-xs mt-1">Actions performed across staff counters and admin panel will stream here in real time.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
            {filteredLogs.map((log) => (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                key={log.id}
                className="p-4 hover:bg-white/[0.02] transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-950/60 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    {getEntityIcon(log.entity)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{log.actor}</span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-bold uppercase">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">({log.entity})</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">{log.details}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono shrink-0 sm:self-center">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{new Date(log.created_at).toLocaleString()}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
