import React, { useState } from 'react';
import { Clock, Calendar, Sparkles, TrendingUp, CheckCircle2, AlertCircle, Sun, Moon, Search, Filter } from 'lucide-react';
import { motion } from 'motion/react';
import { DailyEntry } from '../types';

interface WorkHoursCardProps {
  entries: DailyEntry[];
}

export function calculateHoursWorked(inTime?: string, outTime?: string, status?: string): {
  hours: number;
  minutes: number;
  formatted: string;
  decimal: number;
  extraMinutes: number;
  extraFormatted: string;
  isPayableOvertime: boolean;
} {
  if (status !== 'Present' || !inTime || !outTime) {
    return { hours: 0, minutes: 0, formatted: '0h 0m', decimal: 0, extraMinutes: 0, extraFormatted: '-', isPayableOvertime: false };
  }

  const [inH, inM] = inTime.split(':').map(Number);
  const [outH, outM] = outTime.split(':').map(Number);

  if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) {
    return { hours: 0, minutes: 0, formatted: '0h 0m', decimal: 0, extraMinutes: 0, extraFormatted: '-', isPayableOvertime: false };
  }

  let totalMins = (outH * 60 + outM) - (inH * 60 + inM);
  if (totalMins < 0) {
    totalMins += 24 * 60; // handle overnight shifts
  }

  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const decimal = parseFloat((totalMins / 60).toFixed(2));

  const extraMins = Math.max(0, totalMins - 540); // 9h shift = 540m
  const extraH = Math.floor(extraMins / 60);
  const extraM = extraMins % 60;
  const extraFormatted = extraMins > 0 ? `+${extraH}h${extraM > 0 ? ` ${extraM}m` : ''}` : '-';
  const isPayableOvertime = extraMins >= 60;

  return {
    hours: hrs,
    minutes: mins,
    formatted: `${hrs}h ${mins > 0 ? `${mins}m` : ''}`,
    decimal,
    extraMinutes: extraMins,
    extraFormatted,
    isPayableOvertime
  };
}

export function getTotalHoursForEntries(entries: any[]): {
  totalMinutes: number;
  formatted: string;
  hoursDecimal: string;
} {
  let totalMins = 0;
  if (Array.isArray(entries)) {
    entries.forEach(entry => {
      const res = calculateHoursWorked(entry.inTime, entry.outTime, entry.status);
      totalMins += res.hours * 60 + res.minutes;
    });
  }
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return {
    totalMinutes: totalMins,
    formatted: `${hrs}h ${mins > 0 ? `${mins}m` : ''}`.trim() || '0h 0m',
    hoursDecimal: (totalMins / 60).toFixed(1),
  };
}

export default function WorkHoursCard({ entries }: WorkHoursCardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDayFilter, setSelectedDayFilter] = useState('ALL');

  // Compute aggregate stats across all entries
  let totalMinutesWorked = 0;
  let presentDaysCount = 0;
  let maxShiftMins = 0;
  let maxShiftDate = '-';

  const processedList = entries.map(entry => {
    const timeData = calculateHoursWorked(entry.inTime, entry.outTime, entry.status);
    if (entry.status === 'Present' && timeData.decimal > 0) {
      const shiftMins = timeData.hours * 60 + timeData.minutes;
      totalMinutesWorked += shiftMins;
      presentDaysCount++;

      if (shiftMins > maxShiftMins) {
        maxShiftMins = shiftMins;
        maxShiftDate = entry.date;
      }
    }
    return {
      ...entry,
      timeData,
    };
  });

  const totalHoursDecimal = (totalMinutesWorked / 60).toFixed(1);
  const totalHrsInt = Math.floor(totalMinutesWorked / 60);
  const totalMinsRem = totalMinutesWorked % 60;

  const avgDailyMins = presentDaysCount > 0 ? Math.round(totalMinutesWorked / presentDaysCount) : 0;
  const avgDailyHrsFormatted = `${Math.floor(avgDailyMins / 60)}h ${avgDailyMins % 60}m`;
  const avgDailyDecimal = (avgDailyMins / 60).toFixed(1);

  // Filter entries based on search and day filter
  const filteredList = processedList.filter(item => {
    const matchesSearch = item.date.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.day && item.day.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDay = selectedDayFilter === 'ALL' || (item.day && item.day.toUpperCase() === selectedDayFilter.toUpperCase());
    return matchesSearch && matchesDay;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="liquid-glass p-5 space-y-5 rounded-3xl border border-white/25 dark:border-white/15 bg-gradient-to-br from-slate-900/80 via-indigo-950/70 to-slate-950/85 backdrop-blur-3xl text-white shadow-[0_20px_60px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.2)] relative overflow-hidden"
    >
      {/* Specular highlight on top edge */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 text-white shadow-lg shadow-cyan-500/25 shrink-0">
            <Clock className="w-5 h-5 text-cyan-200 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
                Daily Work Hours Tracking (कार्य के घंटे)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold border border-cyan-400/30">
                {entries.length} Days Logged
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium mt-0.5">
              Detailed breakdown of daily shift duration (In Time → Out Time)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-black px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
            Total: {totalHrsInt}h {totalMinsRem}m
          </span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Monthly Hours */}
        <div className="bg-white/[0.04] p-3.5 rounded-2xl border border-white/10 space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">
            Total Work Hours
          </span>
          <div className="text-lg font-black font-mono text-cyan-300 flex items-baseline gap-1">
            <span>{totalHrsInt}h {totalMinsRem}m</span>
          </div>
          <span className="text-[10px] text-slate-400 font-bold block">
            ({totalHoursDecimal} hrs total)
          </span>
        </div>

        {/* Avg Daily Hours */}
        <div className="bg-white/[0.04] p-3.5 rounded-2xl border border-white/10 space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">
            Avg Shift Duration
          </span>
          <div className="text-lg font-black font-mono text-indigo-300 flex items-baseline gap-1">
            <span>{avgDailyHrsFormatted}</span>
          </div>
          <span className="text-[10px] text-indigo-400 font-bold block">
            ~{avgDailyDecimal} hrs / present day
          </span>
        </div>

        {/* Present Days */}
        <div className="bg-white/[0.04] p-3.5 rounded-2xl border border-white/10 space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">
            Active Work Days
          </span>
          <div className="text-lg font-black font-mono text-emerald-300 flex items-baseline gap-1">
            <span>{presentDaysCount} Days</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold block">
            Full Shift Logged
          </span>
        </div>

        {/* Longest Shift */}
        <div className="bg-white/[0.04] p-3.5 rounded-2xl border border-white/10 space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">
            Longest Shift
          </span>
          <div className="text-lg font-black font-mono text-amber-300 flex items-baseline gap-1">
            <span>{Math.floor(maxShiftMins / 60)}h {maxShiftMins % 60}m</span>
          </div>
          <span className="text-[10px] text-amber-400 font-bold block truncate">
            {maxShiftDate !== '-' ? `Date: ${maxShiftDate}` : 'No shift logged'}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-black/30 p-2.5 rounded-2xl border border-white/10">
        <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/15 flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search date or day (e.g. 2026-08-01, Saturday)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none w-full font-bold"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-cyan-400 shrink-0 hidden sm:inline" />
          {['ALL', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
            <button
              type="button"
              key={day}
              onClick={() => setSelectedDayFilter(day)}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition shrink-0 cursor-pointer ${
                selectedDayFilter === day
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/30'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
              }`}
            >
              {day === 'ALL' ? 'All Days' : day.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Daily Entries Hours List / Table */}
      <div className="space-y-2 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
        {filteredList.length === 0 ? (
          <div className="p-8 text-center bg-black/20 rounded-2xl border border-white/5 text-slate-400 text-xs font-bold">
            No work hours data found matching your search.
          </div>
        ) : (
          filteredList.map((entry) => {
            const isPresent = entry.status === 'Present';
            const isWeekOff = entry.status === 'Week Off';
            const isAbsent = entry.status === 'Absent';
            
            const hoursDec = entry.timeData.decimal;
            // Standard shift benchmark = 9 hours
            const shiftPercent = Math.min(100, Math.round((hoursDec / 9) * 100));

            return (
              <div
                key={entry.id}
                className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isWeekOff
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                    : isAbsent
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-200'
                    : hoursDec >= 9.0
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-white'
                    : 'bg-indigo-900/20 border-white/10 text-slate-200'
                }`}
              >
                {/* Left: Date, Day & Status */}
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl text-center min-w-[52px] font-mono border ${
                    isWeekOff 
                      ? 'bg-amber-500/20 border-amber-500/30 text-amber-300' 
                      : isAbsent 
                      ? 'bg-rose-500/20 border-rose-500/30 text-rose-300' 
                      : 'bg-cyan-500/20 border-cyan-400/30 text-cyan-200'
                  }`}>
                    <span className="text-[10px] font-black uppercase block tracking-widest">{entry.day.slice(0, 3)}</span>
                    <span className="text-xs font-bold">{entry.date.slice(8)}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black font-mono text-white">{entry.date}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                        isWeekOff
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : isAbsent
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {entry.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-300 font-medium">
                      {isPresent ? (
                        <>
                          <span className="flex items-center gap-1">
                            <Sun className="w-3 h-3 text-amber-400" />
                            <span>In: <strong>{entry.inTime || '10:00'}</strong></span>
                          </span>
                          <span>→</span>
                          <span className="flex items-center gap-1">
                            <Moon className="w-3 h-3 text-indigo-400" />
                            <span>Out: <strong>{entry.outTime || '19:00'}</strong></span>
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400 italic">No shift logged</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Hours Worked Badge & Progress Bar */}
                <div className="flex items-center gap-4 justify-between sm:justify-end">
                  {/* Shift Progress Bar */}
                  {isPresent && (
                    <div className="w-28 sm:w-36 space-y-1">
                      <div className="flex justify-between text-[9px] font-mono font-bold text-slate-300">
                        <span>Shift Progress</span>
                        <span>{shiftPercent}%</span>
                      </div>
                      <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden p-0.5 border border-white/10">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            hoursDec >= 9.0
                              ? 'bg-gradient-to-r from-emerald-400 to-teal-400 shadow-sm shadow-emerald-400/50'
                              : 'bg-gradient-to-r from-amber-400 to-orange-400'
                          }`}
                          style={{ width: `${shiftPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Hours Badge */}
                  <div className="text-right shrink-0">
                    {isPresent ? (
                      <div>
                        <span className="text-sm sm:text-base font-black font-mono text-cyan-300 bg-cyan-500/15 px-3 py-1 rounded-xl border border-cyan-400/30 inline-block shadow-md">
                          {entry.timeData.formatted}
                        </span>
                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                          <span className="text-[9px] text-slate-400 font-mono">
                            ({entry.timeData.decimal} hrs)
                          </span>
                          {entry.timeData.extraMinutes > 0 && (
                            <span className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded ${
                              entry.timeData.isPayableOvertime 
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                                : 'bg-slate-500/20 text-slate-400'
                            }`}>
                              {entry.timeData.extraFormatted} {entry.timeData.isPayableOvertime ? 'OT Pay' : '(<1h)'}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-slate-400 px-3 py-1 rounded-xl bg-white/5 border border-white/10 inline-block">
                        0h 0m
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
