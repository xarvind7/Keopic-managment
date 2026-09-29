import { useState, useMemo } from 'react';
import { Trash2, Plus, CalendarRange, Search, RotateCcw, Sparkles, ChevronDown, ChevronUp, Building2, MapPin, X, Target, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DailyEntry } from '../types';
import { calculateDayName, formatMoney } from '../utils/calculations';
import { calculateHoursWorked } from './WorkHoursCard';

interface DailyEntriesTableProps {
  entries: DailyEntry[];
  searchFilter: string;
  setSearchFilter: (val: string) => void;
  onUpdateEntry: (id: string, field: keyof DailyEntry, value: any) => void;
  onAddRow: () => void;
  onDeleteRow: (id: string) => void;
  onFillMonth: () => void;
  onUndoToday?: () => void;
  isPrintMode?: boolean;
  dailyGoal?: number;
  locVal?: string;
  selectedBranchFilter?: string;
  onBranchFilterChange?: (branch: string) => void;
}

export default function DailyEntriesTable({
  entries,
  searchFilter,
  setSearchFilter,
  onUpdateEntry,
  onAddRow,
  onDeleteRow,
  onFillMonth,
  onUndoToday,
  isPrintMode = false,
  dailyGoal = 5000,
  locVal,
  selectedBranchFilter,
  onBranchFilterChange,
}: DailyEntriesTableProps) {
  const [internalBranchFilter, setInternalBranchFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Present' | 'Absent' | 'Week Off' | 'GOAL_HIT'>('ALL');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const activeBranchFilter = selectedBranchFilter !== undefined ? selectedBranchFilter : internalBranchFilter;

  const handleBranchChange = (newBranch: string) => {
    if (onBranchFilterChange) {
      onBranchFilterChange(newBranch);
    } else {
      setInternalBranchFilter(newBranch);
    }
  };

  // Collect summary counts for filter chips
  const counts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let weekOff = 0;
    let goalHit = 0;
    entries.forEach(e => {
      if (e.status === 'Present') present++;
      else if (e.status === 'Absent') absent++;
      else if (e.status === 'Week Off') weekOff++;
      const total = (Number(e.stand) || 0) + (Number(e.magnet) || 0) + (Number(e.frame) || 0);
      if (total >= dailyGoal) goalHit++;
    });
    return { present, absent, weekOff, goalHit };
  }, [entries, dailyGoal]);

  // Collect available branch names dynamically from metadata and entries
  const availableBranches = useMemo(() => {
    const branchSet = new Set<string>();

    if (locVal) branchSet.add(locVal);

    entries.forEach(e => {
      if (e.locVal) branchSet.add(e.locVal);
    });

    if (branchSet.size === 0) {
      branchSet.add('Connaught Place');
    }

    return Array.from(branchSet);
  }, [entries, locVal]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExpandAll = () => {
    const allExpanded = filteredEntries.every(e => expandedIds[e.id]);
    const newState: Record<string, boolean> = {};
    if (!allExpanded) {
      filteredEntries.forEach(e => { newState[e.id] = true; });
    }
    setExpandedIds(newState);
  };
  
  // Filter entries based on search input, branch selection, and statusFilter
  const filteredEntries = entries.filter(entry => {
    const entryLoc = entry.locVal || locVal || 'Connaught Place';
    if (activeBranchFilter !== 'ALL' && entryLoc !== activeBranchFilter) {
      return false;
    }

    if (statusFilter === 'Present' && entry.status !== 'Present') return false;
    if (statusFilter === 'Absent' && entry.status !== 'Absent') return false;
    if (statusFilter === 'Week Off' && entry.status !== 'Week Off') return false;
    if (statusFilter === 'GOAL_HIT') {
      const total = (Number(entry.stand) || 0) + (Number(entry.magnet) || 0) + (Number(entry.frame) || 0);
      if (total < dailyGoal) return false;
    }

    const searchLower = searchFilter.toLowerCase();
    const dateStr = entry.date || '';
    const dayStr = entry.day || '';
    const statusStr = entry.status || '';
    const standStr = String(entry.stand || '');
    const magnetStr = String(entry.magnet || '');
    const frameStr = String(entry.frame || '');
    const branchStr = entryLoc.toLowerCase();
    
    return (
      dateStr.toLowerCase().includes(searchLower) ||
      dayStr.toLowerCase().includes(searchLower) ||
      statusStr.toLowerCase().includes(searchLower) ||
      standStr.includes(searchLower) ||
      magnetStr.includes(searchLower) ||
      frameStr.includes(searchLower) ||
      branchStr.includes(searchLower)
    );
  });

  // Check if today is present in the entries
  const todayStr = new Date().toISOString().split('T')[0];
  const hasTodayEntry = entries.some(entry => entry.date === todayStr);

  // Calculate totals for footer
  let totalStand = 0;
  let totalMagnet = 0;
  let totalFrame = 0;
  let totalIncentive = 0;

  filteredEntries.forEach(entry => {
    const stand = Number(entry.stand) || 0;
    const magnet = Number(entry.magnet) || 0;
    const frame = Number(entry.frame) || 0;
    totalStand += stand;
    totalMagnet += magnet;
    totalFrame += frame;

    let inc = 0;
    if (entry.status === 'Present') {
      if (stand + magnet + frame >= 500) {
        inc += (stand + magnet) * 0.10;
      }
      inc += frame * 0.07;
    }
    totalIncentive += inc;
  });

  const getStatusClass = (status: string) => {
    if (status === 'Present') return 'status-present';
    if (status === 'Absent') return 'status-absent';
    return 'status-weekoff';
  };

  const handleDateChange = (id: string, dateVal: string) => {
    onUpdateEntry(id, 'date', dateVal);
    onUpdateEntry(id, 'day', calculateDayName(dateVal));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
      className="liquid-glass-card shadow-2xl border border-white/35 dark:border-white/15 overflow-hidden transition-all duration-300 relative backdrop-blur-2xl"
    >
      {/* Table Header Section */}
      <div 
        className="px-4 sm:px-5 py-4 border-b border-white/20 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r transition-all duration-300 backdrop-blur-xl"
        style={{
          backgroundImage: 'linear-gradient(90deg, rgba(var(--color-accent-rgb), 0.12), transparent)'
        }}
      >
        <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: 'var(--color-accent-primary)' }}></div>
            <h2 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Daily Entries</h2>
            <span 
              className="text-xs font-black px-2.5 py-1 rounded-full border transition-all duration-300"
              style={{
                color: 'var(--color-accent-primary)',
                backgroundColor: 'rgba(var(--color-accent-rgb), 0.12)',
                borderColor: 'rgba(var(--color-accent-rgb), 0.25)',
              }}
            >
              {filteredEntries.length} row{filteredEntries.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Toggle Expand All button for mobile */}
          <button
            onClick={toggleExpandAll}
            className="sm:hidden text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          >
            {filteredEntries.every(e => expandedIds[e.id]) ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
        
        {!isPrintMode && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Branch Filter Dropdown */}
            <div className="relative flex-1 sm:flex-initial min-w-[150px]">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 focus-within:border-indigo-500 transition-all shadow-sm">
                <Building2 className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                <select
                  value={activeBranchFilter}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  className="bg-transparent text-xs text-slate-700 dark:text-slate-200 font-extrabold focus:outline-none w-full cursor-pointer pr-1"
                  aria-label="Filter entries by branch"
                >
                  <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                    All Branches ({entries.length})
                  </option>
                  {availableBranches.map((branchName) => (
                    <option key={branchName} value={branchName} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                      📍 {branchName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search bar */}
            <div className="relative flex-1 sm:flex-initial min-w-[140px]">
              <input
                type="text"
                placeholder="Search entries..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8 pr-7 py-1.5 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-200 focus:outline-none w-full sm:w-48 transition-all focus-accent shadow-sm font-medium"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Fill Month */}
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onFillMonth} 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/60 dark:bg-slate-800/60 text-cyan-700 dark:text-cyan-300 font-extrabold text-xs rounded-xl border border-cyan-200/70 dark:border-cyan-800/70 shadow-sm hover:bg-cyan-50 dark:hover:bg-cyan-950/50 transition cursor-pointer" 
              title="Fill selected month"
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Fill Month</span>
            </motion.button>

            {/* Undo Today */}
            {onUndoToday && hasTodayEntry && (
              <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onUndoToday} 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/60 dark:bg-slate-800/60 text-rose-700 dark:text-rose-300 font-extrabold text-xs rounded-xl border border-rose-200/70 dark:border-rose-800/70 shadow-sm hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer" 
              title="Reset today's entry (Undo Today)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Undo Today</span>
            </motion.button>
            )}

            {/* Add Row */}
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onAddRow} 
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-white font-extrabold text-xs rounded-xl transition duration-150 cursor-pointer shadow-lg hover:brightness-110"
              style={{
                background: 'linear-gradient(135deg, var(--color-accent-primary), var(--color-accent-hover))',
                boxShadow: '0 8px 20px var(--color-accent-shadow)'
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Row</span>
            </motion.button>
          </div>
        )}
      </div>

      {/* Quick Status Filter Toolbar */}
      {!isPrintMode && (
        <div className="px-4 sm:px-5 py-2.5 bg-white/25 dark:bg-slate-900/40 backdrop-blur-xl border-b border-white/20 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1 flex items-center gap-1 shrink-0">
              <Filter className="w-3 h-3" />
              Filter:
            </span>
            
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                statusFilter === 'ALL'
                  ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                  : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>All</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-black/15 dark:bg-white/20">
                {entries.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('Present')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                statusFilter === 'Present'
                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 font-extrabold'
                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              <span>Present</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-600/20">
                {counts.present}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('Absent')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                statusFilter === 'Absent'
                  ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/30 font-extrabold'
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20'
              }`}
            >
              <span>Absent</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-600/20">
                {counts.absent}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('Week Off')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                statusFilter === 'Week Off'
                  ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30 font-extrabold'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20'
              }`}
            >
              <span>Week Off</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-600/20">
                {counts.weekOff}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('GOAL_HIT')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                statusFilter === 'GOAL_HIT'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-sm shadow-orange-500/30 font-extrabold'
                  : 'bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:bg-orange-500/20'
              }`}
            >
              <Target className="w-3 h-3" />
              <span>Goal Met (₹{dailyGoal}+)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-orange-600/20">
                {counts.goalHit}
              </span>
            </button>
          </div>

          {/* Active filter summary indicator */}
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            Showing <span className="font-black text-slate-800 dark:text-slate-200">{filteredEntries.length}</span> of {entries.length} days
          </div>
        </div>
      )}

      {/* MOBILE CARD-BASED VIEW (< 640px) */}
      <div className="block sm:hidden p-3 space-y-3">
        <AnimatePresence initial={false}>
          {filteredEntries.map((entry) => {
            const stand = Number(entry.stand) || 0;
            const magnet = Number(entry.magnet) || 0;
            const frame = Number(entry.frame) || 0;
            const dailyGrossSales = stand + magnet + frame;
            
            let inc = 0;
            if (entry.status === 'Present') {
              if (stand + magnet + frame >= 500) {
                inc += (stand + magnet) * 0.10;
              }
              inc += frame * 0.07;
            }

            const isPresent = entry.status === 'Present';
            const isAbsent = entry.status === 'Absent';
            const isWeekOff = entry.status === 'Week Off';

            const targetGoal = dailyGoal && dailyGoal > 0 ? dailyGoal : 5000;
            const isGoalExceeded = isPresent && dailyGrossSales >= targetGoal;
            const isExpanded = !!expandedIds[entry.id];

            return (
              <motion.div 
                key={entry.id}
                layout
                initial={{ opacity: 0, y: -14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: -24, scale: 0.96 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className={`p-3.5 rounded-2xl border transition-colors duration-150 ${
                  isWeekOff
                    ? 'bg-amber-500/10 border-amber-500/20'
                    : isAbsent
                    ? 'bg-rose-500/10 border-rose-500/20'
                    : isGoalExceeded
                    ? 'bg-emerald-500/15 border-emerald-500/30'
                    : 'bg-white/70 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80'
                }`}
              >
              {/* Card Header Summary */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {!isPrintMode ? (
                    <input 
                      type="date" 
                      value={entry.date} 
                      onChange={(e) => handleDateChange(entry.id, e.target.value)}
                      className="table-input px-2 py-1 text-xs font-bold rounded-lg"
                    />
                  ) : (
                    <span className="font-bold text-xs">{entry.date}</span>
                  )}
                  <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-200/60 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">
                    {entry.day}
                  </span>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md flex items-center gap-1 border border-indigo-500/20">
                    <MapPin className="w-2.5 h-2.5" />
                    <span>{entry.locVal || locVal || 'Main Counter'}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {!isPrintMode ? (
                    <select 
                      value={entry.status}
                      onChange={(e) => onUpdateEntry(entry.id, 'status', e.target.value)}
                      className={`font-bold focus:outline-none text-center rounded-lg px-2 py-1 text-xs backdrop-blur-sm cursor-pointer ${getStatusClass(entry.status)}`}
                    >
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
                      <option value="Week Off">Week Off</option>
                    </select>
                  ) : (
                    <span className={`font-bold text-xs px-2 py-0.5 rounded-md ${getStatusClass(entry.status)}`}>
                      {entry.status}
                    </span>
                  )}

                  <button
                    onClick={() => toggleExpand(entry.id)}
                    className="p-1.5 rounded-xl bg-slate-200/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition cursor-pointer"
                    aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Goal Exceeded Tag if present */}
              {isGoalExceeded && (
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] uppercase tracking-wider shadow-sm">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Goal Exceeded ({formatMoney(dailyGrossSales)})</span>
                </div>
              )}

              {/* Essential Sales & Incentive Row */}
              <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Sales</span>
                  <span className="text-base font-black text-slate-900 dark:text-slate-100 font-mono">
                    {formatMoney(dailyGrossSales)}
                  </span>
                </div>

                <div className="text-right flex items-center gap-2">
                  {inc > 0 && (
                    <div className="text-right">
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-500 block">Incentive</span>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        +{formatMoney(inc, 2)}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => toggleExpand(entry.id)}
                    className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline ml-1 cursor-pointer"
                  >
                    <span>{isExpanded ? 'Hide' : 'Details'}</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Expanded Row Details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3 overflow-hidden text-xs"
                  >
                    {/* Timing & Work Hours */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">In Time</label>
                        {!isPrintMode ? (
                          <input 
                            type="time" 
                            value={entry.inTime} 
                            onChange={(e) => onUpdateEntry(entry.id, 'inTime', e.target.value)}
                            className="table-input px-2 py-1 text-xs text-center w-full"
                            disabled={isWeekOff}
                          />
                        ) : (
                          <span className="font-bold">{entry.inTime || '-'}</span>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Out Time</label>
                        {!isPrintMode ? (
                          <input 
                            type="time" 
                            value={entry.outTime} 
                            onChange={(e) => onUpdateEntry(entry.id, 'outTime', e.target.value)}
                            className="table-input px-2 py-1 text-xs text-center w-full"
                            disabled={isWeekOff}
                          />
                        ) : (
                          <span className="font-bold">{entry.outTime || '-'}</span>
                        )}
                      </div>
                      <div className="text-center">
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Work Hrs</label>
                        <div className="mt-1 flex flex-col items-center gap-0.5">
                          {(() => {
                            const wh = calculateHoursWorked(entry.inTime, entry.outTime, entry.status);
                            return (
                              <>
                                <span className="px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-400 font-extrabold text-[11px] border border-indigo-400/30 inline-block">
                                  {wh.formatted}
                                </span>
                                {wh.extraMinutes > 0 && (
                                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                    wh.isPayableOvertime 
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                                      : 'bg-slate-500/20 text-slate-400'
                                  }`}>
                                    {wh.extraFormatted} {wh.isPayableOvertime ? 'OT ₹' : '(<1h)'}
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Item Breakdown Inputs */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Stand (₹)</label>
                        {!isPrintMode ? (
                          <input 
                            type="number" 
                            min="0"
                            placeholder="0" 
                            value={entry.stand} 
                            onChange={(e) => onUpdateEntry(entry.id, 'stand', e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0))}
                            className="table-input font-semibold px-2 py-1.5 text-right w-full text-xs"
                            disabled={isWeekOff}
                          />
                        ) : (
                          <span className="font-bold">{formatMoney(stand)}</span>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-purple-500 block mb-1">Magnet (₹)</label>
                        {!isPrintMode ? (
                          <input 
                            type="number" 
                            min="0"
                            placeholder="0" 
                            value={entry.magnet} 
                            onChange={(e) => onUpdateEntry(entry.id, 'magnet', e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0))}
                            className="table-input font-semibold px-2 py-1.5 text-right w-full text-xs"
                            disabled={isWeekOff}
                          />
                        ) : (
                          <span className="font-bold">{formatMoney(magnet)}</span>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-cyan-500 block mb-1">Frame (₹)</label>
                        {!isPrintMode ? (
                          <input 
                            type="number" 
                            min="0"
                            placeholder="0" 
                            value={entry.frame} 
                            onChange={(e) => onUpdateEntry(entry.id, 'frame', e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0))}
                            className="table-input font-semibold px-2 py-1.5 text-right w-full text-xs"
                            disabled={isWeekOff}
                          />
                        ) : (
                          <span className="font-bold">{formatMoney(frame)}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions Footer inside Card */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="text-xs">
                        <span className="text-slate-400 font-bold">Incentive: </span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400">
                          {formatMoney(inc, 2)}
                        </span>
                      </div>
                      {!isPrintMode && (
                        <button
                          onClick={() => onDeleteRow(entry.id)}
                          className="px-2.5 py-1 text-xs text-rose-500 hover:bg-rose-500/10 rounded-lg transition font-bold flex items-center gap-1 border border-rose-500/20 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Row</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {filteredEntries.length === 0 && (
          <motion.div 
            key="empty-state-mobile"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="py-8 text-center text-slate-400 font-medium"
          >
            No records match the current filter
          </motion.div>
        )}
        </AnimatePresence>

        {/* Mobile Totals Summary Card */}
        {filteredEntries.length > 0 && (
          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2 border border-slate-800 shadow-lg mt-4">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 block border-b border-slate-800 pb-2">
              ∑ Total Monthly Sales Summary
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Stand Sales</span>
                <span className="font-mono font-bold text-indigo-300">{formatMoney(totalStand)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Magnet Sales</span>
                <span className="font-mono font-bold text-purple-300">{formatMoney(totalMagnet)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Frame Sales</span>
                <span className="font-mono font-bold text-cyan-300">{formatMoney(totalFrame)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Incentive</span>
                <span className="font-mono font-bold text-emerald-400">{formatMoney(totalIncentive, 2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DESKTOP TABLE VIEW (>= 640px) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-white/40 dark:bg-slate-900/60 backdrop-blur-xl border-b border-white/25 dark:border-white/10 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
              <th className="py-3 px-4 text-left w-44">Date</th>
              <th className="py-3 px-2 text-center w-24">Day</th>
              <th className="py-3 px-3 text-center w-28">Status</th>
              <th className="py-3 px-2 text-center w-28">In Time</th>
              <th className="py-3 px-2 text-center w-28">Out Time</th>
              <th className="py-3 px-2 text-center w-24 bg-indigo-500/5 text-indigo-400">Work Hrs</th>
              <th className="py-3 px-2 text-right">Stand (₹)</th>
              <th className="py-3 px-2 text-right">Magnet (₹)</th>
              <th className="py-3 px-2 text-right">Frame (₹)</th>
              <th className="py-3 px-4 text-right bg-emerald-500/5 dark:bg-emerald-500/10 text-emerald-600 w-32">★ Incentive</th>
              {!isPrintMode && <th className="py-3 px-2 text-center w-12"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
            <AnimatePresence initial={false}>
              {filteredEntries.map((entry) => {
                const stand = Number(entry.stand) || 0;
                const magnet = Number(entry.magnet) || 0;
                const frame = Number(entry.frame) || 0;
                const dailyGrossSales = stand + magnet + frame;
                
                let inc = 0;
                if (entry.status === 'Present') {
                  if (stand + magnet + frame >= 500) {
                    inc += (stand + magnet) * 0.10;
                  }
                  inc += frame * 0.07;
                }

                const isPresent = entry.status === 'Present';
                const isAbsent = entry.status === 'Absent';
                const isWeekOff = entry.status === 'Week Off';

                const targetGoal = dailyGoal && dailyGoal > 0 ? dailyGoal : 5000;
                const isGoalExceeded = isPresent && dailyGrossSales >= targetGoal;

                const isBlueDay = isPresent && inc === 0;
                const isEligible = isPresent && inc > 0;

                let rowClass = 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30 text-slate-700 dark:text-slate-300';
                if (isWeekOff) {
                  rowClass = 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/15 dark:hover:bg-amber-500/20 shadow-[inset_4px_0_0_#f59e0b]';
                } else if (isAbsent) {
                  rowClass = 'bg-rose-500/10 dark:bg-rose-500/15 text-rose-800 dark:text-rose-200 hover:bg-rose-500/15 dark:hover:bg-rose-500/20 shadow-[inset_4px_0_0_#f43f5e]';
                } else if (isGoalExceeded) {
                  rowClass = 'bg-emerald-500/20 dark:bg-emerald-500/25 text-emerald-950 dark:text-emerald-100 hover:bg-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.35),inset_4px_0_0_#10b981] border-y border-emerald-500/40 relative z-10 font-bold';
                } else if (isBlueDay) {
                  rowClass = 'bg-blue-500/10 dark:bg-blue-500/15 text-blue-800 dark:text-blue-200 hover:bg-blue-500/15 dark:hover:bg-blue-500/20 shadow-[inset_4px_0_0_#3b82f6]';
                } else if (isEligible) {
                  rowClass = 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/15 dark:hover:bg-emerald-500/20 shadow-[inset_4px_0_0_#10b981]';
                }

                return (
                  <motion.tr 
                    key={entry.id} 
                    layout="position"
                    initial={{ opacity: 0, y: -12, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -25, scale: 0.98 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className={`transition-colors duration-150 border-b border-slate-200 dark:border-slate-800 group ${rowClass}`}
                  >
                  {/* Date */}
                  <td className="p-2 relative">
                    {isGoalExceeded && (
                      <div className="flex items-center justify-center mb-1">
                        <span 
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] uppercase tracking-wider shadow-md shadow-emerald-500/50"
                          title={`Daily Goal Exceeded! Sales: ${formatMoney(dailyGrossSales)} >= Goal: ${formatMoney(targetGoal)}`}
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Goal Exceeded</span>
                        </span>
                      </div>
                    )}
                    {isPrintMode ? (
                      <div className="px-2 py-1.5 text-center font-bold">
                        {entry.date}
                      </div>
                    ) : (
                      <input 
                        type="date" 
                        value={entry.date} 
                        onChange={(e) => handleDateChange(entry.id, e.target.value)}
                        className="table-date-input table-input px-2 py-1.5 text-center focus:outline-none w-full text-xs font-medium"
                      />
                    )}
                    <div className="flex items-center justify-center gap-1 text-[9px] font-extrabold text-indigo-500 dark:text-indigo-400 mt-0.5 opacity-90">
                      <MapPin className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate max-w-[110px]">{entry.locVal || locVal || 'Main Counter'}</span>
                    </div>
                  </td>
                  {/* Day (Read-only) */}
                  <td className="p-2 text-center font-bold text-[10px] uppercase tracking-wider">
                    {entry.day}
                  </td>
                  {/* Status Selection */}
                  <td className="p-2 text-center">
                    {isPrintMode ? (
                      <div className={`font-bold rounded-lg p-1.5 text-xs text-center border ${getStatusClass(entry.status)}`}>
                        {entry.status}
                      </div>
                    ) : (
                      <select 
                        value={entry.status}
                        onChange={(e) => onUpdateEntry(entry.id, 'status', e.target.value)}
                        className={`status-select font-bold focus:outline-none text-center rounded-lg p-1.5 text-xs w-full backdrop-blur-sm transition-colors cursor-pointer ${getStatusClass(entry.status)}`}
                      >
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Week Off">Week Off</option>
                      </select>
                    )}
                  </td>
                  {/* In Time */}
                  <td className="p-2 text-center">
                    {isWeekOff ? (
                      <span className="font-bold text-amber-600 dark:text-amber-400 text-[11px] uppercase tracking-wider">Week Off</span>
                    ) : isPrintMode ? (
                      <span className="font-semibold">{entry.status === 'Present' ? entry.inTime : '-'}</span>
                    ) : (
                      <input 
                        type="time" 
                        value={entry.inTime} 
                        onChange={(e) => onUpdateEntry(entry.id, 'inTime', e.target.value)}
                        className="in-time-input table-input px-2 py-1 text-[11px] text-center w-full focus:outline-none"
                      />
                    )}
                  </td>
                  {/* Out Time */}
                  <td className="p-2 text-center">
                    {isWeekOff ? (
                      <span className="font-bold text-amber-600 dark:text-amber-400 text-[11px] uppercase tracking-wider">Week Off</span>
                    ) : isPrintMode ? (
                      <span className="font-semibold">{entry.status === 'Present' ? entry.outTime : '-'}</span>
                    ) : (
                      <input 
                        type="time" 
                        value={entry.outTime} 
                        onChange={(e) => onUpdateEntry(entry.id, 'outTime', e.target.value)}
                        className="out-time-input table-input px-2 py-1 text-[11px] text-center w-full focus:outline-none"
                      />
                    )}
                  </td>
                  {/* Work Hours */}
                  <td className="p-2 text-center bg-indigo-500/5 font-mono">
                    {isWeekOff ? (
                      <span className="font-bold text-amber-600 dark:text-amber-400 text-[10px]">Off</span>
                    ) : isAbsent ? (
                      <span className="font-bold text-rose-500 text-[10px]">Absent</span>
                    ) : (
                      (() => {
                        const wh = calculateHoursWorked(entry.inTime, entry.outTime, entry.status);
                        return (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-300 font-extrabold text-xs border border-indigo-400/30">
                              {wh.formatted}
                            </span>
                            {wh.extraMinutes > 0 && (
                              <span 
                                title={wh.isPayableOvertime ? `Payable Overtime: ${wh.extraFormatted}` : `Extra duty logged: ${wh.extraFormatted} (Below 1h pay threshold)`}
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                  wh.isPayableOvertime 
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                                    : 'bg-slate-500/20 text-slate-400'
                                }`}
                              >
                                {wh.extraFormatted} {wh.isPayableOvertime ? 'OT ₹' : '(<1h)'}
                              </span>
                            )}
                          </div>
                        );
                      })()
                    )}
                  </td>
                  {/* Stand */}
                  <td className="p-2 text-right">
                    {isWeekOff ? (
                      <span className="font-bold pr-2 text-amber-600 dark:text-amber-400 text-[11px] uppercase tracking-wider">Week Off</span>
                    ) : isPrintMode ? (
                      <span className="font-bold pr-2">{entry.status === 'Present' && stand > 0 ? formatMoney(stand, 0) : '-'}</span>
                    ) : (
                      <input 
                        type="number" 
                        min="0"
                        placeholder="0" 
                        value={entry.stand} 
                        onChange={(e) => onUpdateEntry(entry.id, 'stand', e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0))}
                        className="stand table-input font-semibold px-2 py-1.5 text-right w-full focus:ring-2 focus:ring-indigo-500/20 text-xs focus:outline-none"
                      />
                    )}
                  </td>
                  {/* Magnet */}
                  <td className="p-2 text-right">
                    {isWeekOff ? (
                      <span className="font-bold pr-2 text-amber-600 dark:text-amber-400 text-[11px] uppercase tracking-wider">Week Off</span>
                    ) : isPrintMode ? (
                      <span className="font-bold pr-2">{entry.status === 'Present' && magnet > 0 ? formatMoney(magnet, 0) : '-'}</span>
                    ) : (
                      <input 
                        type="number" 
                        min="0"
                        placeholder="0" 
                        value={entry.magnet} 
                        onChange={(e) => onUpdateEntry(entry.id, 'magnet', e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0))}
                        className="magnet table-input font-semibold px-2 py-1.5 text-right w-full focus:ring-2 focus:ring-purple-500/20 text-xs focus:outline-none"
                      />
                    )}
                  </td>
                  {/* Frame */}
                  <td className="p-2 text-right">
                    {isWeekOff ? (
                      <span className="font-bold pr-2 text-amber-600 dark:text-amber-400 text-[11px] uppercase tracking-wider">Week Off</span>
                    ) : isPrintMode ? (
                      <span className="font-bold pr-2">{entry.status === 'Present' && frame > 0 ? formatMoney(frame, 0) : '-'}</span>
                    ) : (
                      <input 
                        type="number" 
                        min="0"
                        placeholder="0" 
                        value={entry.frame} 
                        onChange={(e) => onUpdateEntry(entry.id, 'frame', e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0))}
                        className="frame table-input font-semibold px-2 py-1.5 text-right w-full focus:ring-2 focus:ring-cyan-500/20 text-xs focus:outline-none"
                      />
                    )}
                  </td>
                  {/* Incentive (Calculated) */}
                  <td className="p-2 bg-emerald-500/5 dark:bg-emerald-500/10 text-right px-4">
                    {isWeekOff ? (
                      <span className="font-bold text-amber-600 dark:text-amber-400 text-[11px] uppercase tracking-wider">Week Off</span>
                    ) : isPrintMode ? (
                      <span className="font-black text-emerald-600 text-sm">{inc > 0 ? formatMoney(inc, 2) : '-'}</span>
                    ) : (
                      <input 
                        type="text" 
                        readOnly 
                        value={inc.toFixed(2)} 
                        className="inc-f bg-transparent text-right font-black text-emerald-600 w-full text-sm focus:outline-none"
                      />
                    )}
                  </td>
                  {/* Delete Button */}
                  {!isPrintMode && (
                    <td className="p-2 text-center">
                      <button 
                        onClick={() => onDeleteRow(entry.id)} 
                        className="text-slate-300 hover:text-rose-500 p-2 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer" 
                        title="Delete Row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </motion.tr>
              );
            })}
            
            {filteredEntries.length === 0 && (
              <motion.tr
                key="empty-state-desktop"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <td colSpan={isPrintMode ? 10 : 11} className="py-8 text-center text-slate-400 font-medium">
                  No records match the current filter
                </td>
              </motion.tr>
            )}
            </AnimatePresence>
          </tbody>
          
          {/* Table Footer - Totals */}
          <tfoot 
            className="bg-slate-50/95 dark:bg-slate-800/80 font-bold border-t-2 sticky bottom-0 backdrop-blur-md z-10"
            style={{ borderTopColor: 'var(--color-accent-primary)' }}
          >
            <tr className="text-slate-700 dark:text-slate-300">
              <td colSpan={6} className="py-4 px-4 text-left text-xs uppercase tracking-wide text-slate-500 font-black">
                ∑ Totals & Averages
              </td>
              <td className="py-4 px-2 text-right font-bold text-accent">
                {formatMoney(totalStand, 2)}
              </td>
              <td className="py-4 px-2 text-right font-bold text-purple-600 dark:text-purple-400">
                {formatMoney(totalMagnet, 2)}
              </td>
              <td className="py-4 px-2 text-right font-bold text-cyan-600 dark:text-cyan-400">
                {formatMoney(totalFrame, 2)}
              </td>
              <td className="py-4 px-4 text-right font-extrabold text-sm text-emerald-600 bg-emerald-500/5 dark:bg-emerald-500/10">
                {formatMoney(totalIncentive, 2)}
              </td>
              {!isPrintMode && <td></td>}
            </tr>
          </tfoot>
        </table>
      </div>
    </motion.div>
  );
}

