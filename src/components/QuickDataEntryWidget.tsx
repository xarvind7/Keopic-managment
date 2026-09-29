import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  CheckCircle2, 
  Sparkles, 
  Clock, 
  Flame, 
  ShoppingBag,
  TrendingUp,
  Calendar,
  RotateCcw
} from 'lucide-react';
import { motion } from 'motion/react';
import { DailyEntry, AttendanceStatus } from '../types';
import { formatMoney } from '../utils/calculations';

interface QuickDataEntryWidgetProps {
  entries: DailyEntry[];
  onAddOrUpdateEntry: (entry: Partial<DailyEntry> & { date: string }) => void;
  triggerToast: (title: string, message: string, isError?: boolean) => void;
}

export default function QuickDataEntryWidget({
  entries,
  onAddOrUpdateEntry,
  triggerToast
}: QuickDataEntryWidgetProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Helper parsers to safely extract unit counts when loading from saved entry
  // If stored value is >= 200/250, assume it's rupee amount -> convert to unit count
  const parseStandUnits = (val: any): number => {
    const num = Number(val) || 0;
    if (num === 0) return 0;
    if (num >= 200) return Math.round(num / 200);
    return num;
  };

  const parseMagnetUnits = (val: any): number => {
    const num = Number(val) || 0;
    if (num === 0) return 0;
    if (num >= 250) return Math.round(num / 250);
    return num;
  };

  // Find if entry exists for selected date
  const currentEntry = entries.find(e => e.date === selectedDate);

  const [status, setStatus] = useState<AttendanceStatus>('Present');
  const [inTime, setInTime] = useState('10:00');
  const [outTime, setOutTime] = useState('19:00');
  const [standUnits, setStandUnits] = useState<number>(0);
  const [magnetUnits, setMagnetUnits] = useState<number>(0);
  const [frameRevenue, setFrameRevenue] = useState<number>(0);

  // Load date entry when selectedDate or entries list changes
  useEffect(() => {
    const matched = entries.find(e => e.date === selectedDate);
    if (matched) {
      setStatus(matched.status || 'Present');
      setInTime(matched.inTime || '10:00');
      setOutTime(matched.outTime || '19:00');
      setStandUnits(parseStandUnits(matched.stand));
      setMagnetUnits(parseMagnetUnits(matched.magnet));
      setFrameRevenue(Number(matched.frame) || 0);
    } else {
      setStatus('Present');
      setInTime('10:00');
      setOutTime('19:00');
      setStandUnits(0);
      setMagnetUnits(0);
      setFrameRevenue(0);
    }
  }, [selectedDate, entries]);

  // Exact fixed rates requested
  // 1 Stand = ₹200
  // 1 Magnet = ₹250
  // Frame = Direct Rupee Amount
  const standSalesAmt = standUnits * 200;
  const magnetSalesAmt = magnetUnits * 250;
  const totalUnits = standUnits + magnetUnits;
  const grossSales = standSalesAmt + magnetSalesAmt + frameRevenue;

  // Calculate incentive for preview (10% on Stand+Magnet if total sales >= 500, and 7% on Frame)
  let estIncentive = 0;
  if (status === 'Present') {
    if (grossSales >= 500) {
      estIncentive += (standSalesAmt + magnetSalesAmt) * 0.10;
    }
    estIncentive += frameRevenue * 0.07;
  }

  const handleQuickSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const standToSave = status === 'Present' ? standSalesAmt : 0;
    const magnetToSave = status === 'Present' ? magnetSalesAmt : 0;
    const frameToSave = status === 'Present' ? frameRevenue : 0;

    onAddOrUpdateEntry({
      date: selectedDate,
      status,
      inTime: status === 'Present' ? inTime : '',
      outTime: status === 'Present' ? outTime : '',
      stand: standToSave,
      magnet: magnetToSave,
      frame: frameToSave,
    });

    triggerToast(
      'Row Updated!', 
      `Logged for ${selectedDate}: 1-Tap Stand ₹${standToSave} (${standUnits} pcs), Magnet ₹${magnetToSave} (${magnetUnits} pcs), Frame ₹${frameToSave}`
    );
  };

  // Quick Date Selectors
  const setTodayDate = () => setSelectedDate(todayStr);
  const setYesterdayDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="liquid-glass p-4 sm:p-6 rounded-3xl shadow-2xl border border-white/15 bg-gradient-to-br from-slate-900/95 via-indigo-950/60 to-slate-900/95 backdrop-blur-2xl text-white relative overflow-hidden">
      
      {/* Background ambient light */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 text-white shadow-lg shadow-cyan-500/25 shrink-0">
            <Zap className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
                Fast Daily Data Entry (1-Tap)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold border border-cyan-400/30">
                Live Row Sync
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium mt-0.5">
              1 Stand = ₹200 • 1 Magnet = ₹250 • Frame = Direct Amount (₹)
            </p>
          </div>
        </div>

        {/* Date Selection Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={setTodayDate}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
              selectedDate === todayStr 
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30' 
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={setYesterdayDate}
            className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition cursor-pointer"
          >
            Yesterday
          </button>
          
          <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-xl border border-white/15">
            <Calendar className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-extrabold text-white focus:outline-none cursor-pointer color-scheme-dark"
            />
          </div>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleQuickSave} className="mt-4 space-y-4">
        
        {/* Row 1: Attendance Status & Shift Times */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-black/20 p-3 rounded-2xl border border-white/10">
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300 block mb-1">
              Attendance Status
            </label>
            <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
              {(['Present', 'Absent', 'Week Off'] as const).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                    status === s
                      ? s === 'Present'
                        ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                        : s === 'Absent'
                        ? 'bg-rose-500 text-white shadow-md font-extrabold'
                        : 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {status === 'Present' && (
            <>
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300 block mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" /> Shift In Time
                </label>
                <input
                  type="time"
                  value={inTime}
                  onChange={(e) => setInTime(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-cyan-400 transition"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300 block mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-purple-400" /> Shift Out Time
                </label>
                <input
                  type="time"
                  value={outTime}
                  onChange={(e) => setOutTime(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-purple-400 transition"
                />
              </div>
            </>
          )}
        </div>

        {/* Row 2: 1-Tap Inputs for Stand, Magnet, and Frame */}
        {status === 'Present' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 1. Stand Input: 1 Stand = ₹200 */}
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-indigo-500/30 hover:border-indigo-400/60 transition shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-300 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-indigo-400" />
                  1 Stand = ₹200
                </span>
                <span className="text-xs font-mono font-black text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-lg border border-indigo-500/30">
                  ₹{formatMoney(standSalesAmt)}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                  <span>Stand Quantity (Pcs)</span>
                  <span>Amount: ₹{standSalesAmt}</span>
                </div>
                <input
                  type="number"
                  min="0"
                  value={standUnits || ''}
                  onChange={(e) => setStandUnits(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="0"
                  className="w-full bg-black/60 border border-indigo-500/40 rounded-xl px-3 py-2 text-lg font-black font-mono text-white text-right focus:outline-none focus:border-indigo-400 transition"
                />
              </div>

              {/* 1-Tap Quick Increment & Decrement Chips */}
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setStandUnits(prev => Math.max(0, prev - 1))}
                  className="px-2 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/30 border border-indigo-500/30 text-xs font-bold text-indigo-300 transition cursor-pointer"
                  title="-1 Stand"
                >
                  -1
                </button>
                <button
                  type="button"
                  onClick={() => setStandUnits(prev => prev + 1)}
                  className="flex-1 py-1.5 rounded-xl bg-indigo-500/25 hover:bg-indigo-500/45 border border-indigo-400/40 text-xs font-black text-indigo-200 transition cursor-pointer shadow-md hover:scale-105 active:scale-95"
                  title="1 Stand = ₹200"
                >
                  +1 Stand
                </button>
                <button
                  type="button"
                  onClick={() => setStandUnits(prev => prev + 5)}
                  className="py-1.5 px-2.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/30 border border-indigo-500/30 text-xs font-bold text-indigo-300 transition cursor-pointer"
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => setStandUnits(prev => prev + 10)}
                  className="py-1.5 px-2.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/30 border border-indigo-500/30 text-xs font-bold text-indigo-300 transition cursor-pointer"
                >
                  +10
                </button>
                <button
                  type="button"
                  onClick={() => setStandUnits(0)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-slate-400 transition cursor-pointer"
                  title="Reset Stand"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 2. Magnet Input: 1 Magnet = ₹250 */}
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-purple-500/30 hover:border-purple-400/60 transition shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-purple-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  1 Magnet = ₹250
                </span>
                <span className="text-xs font-mono font-black text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded-lg border border-purple-500/30">
                  ₹{formatMoney(magnetSalesAmt)}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                  <span>Magnet Quantity (Pcs)</span>
                  <span>Amount: ₹{magnetSalesAmt}</span>
                </div>
                <input
                  type="number"
                  min="0"
                  value={magnetUnits || ''}
                  onChange={(e) => setMagnetUnits(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="0"
                  className="w-full bg-black/60 border border-purple-500/40 rounded-xl px-3 py-2 text-lg font-black font-mono text-white text-right focus:outline-none focus:border-purple-400 transition"
                />
              </div>

              {/* 1-Tap Quick Increment & Decrement Chips */}
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setMagnetUnits(prev => Math.max(0, prev - 1))}
                  className="px-2 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/30 border border-purple-500/30 text-xs font-bold text-purple-300 transition cursor-pointer"
                  title="-1 Magnet"
                >
                  -1
                </button>
                <button
                  type="button"
                  onClick={() => setMagnetUnits(prev => prev + 1)}
                  className="flex-1 py-1.5 rounded-xl bg-purple-500/25 hover:bg-purple-500/45 border border-purple-400/40 text-xs font-black text-purple-200 transition cursor-pointer shadow-md hover:scale-105 active:scale-95"
                  title="1 Magnet = ₹250"
                >
                  +1 Magnet
                </button>
                <button
                  type="button"
                  onClick={() => setMagnetUnits(prev => prev + 5)}
                  className="py-1.5 px-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/30 border border-purple-500/30 text-xs font-bold text-purple-300 transition cursor-pointer"
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => setMagnetUnits(prev => prev + 10)}
                  className="py-1.5 px-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/30 border border-purple-500/30 text-xs font-bold text-purple-300 transition cursor-pointer"
                >
                  +10
                </button>
                <button
                  type="button"
                  onClick={() => setMagnetUnits(0)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-slate-400 transition cursor-pointer"
                  title="Reset Magnet"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 3. Frame Input: ONLY Amount (no count) */}
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-cyan-500/30 hover:border-cyan-400/60 transition shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-cyan-400" />
                  Frame Sales (Amount Only)
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                  7% Commission
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                  <span>Frame Amount (₹)</span>
                  <span>Direct Revenue</span>
                </div>
                <input
                  type="number"
                  min="0"
                  value={frameRevenue || ''}
                  onChange={(e) => setFrameRevenue(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0"
                  className="w-full bg-black/60 border border-cyan-500/40 rounded-xl px-3 py-2 text-lg font-black font-mono text-white text-right focus:outline-none focus:border-cyan-400 transition"
                />
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex items-center gap-1.5 pt-1">
                {[500, 1000, 2000].map((amt) => (
                  <button
                    type="button"
                    key={amt}
                    onClick={() => setFrameRevenue(prev => prev + amt)}
                    className="flex-1 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/30 text-[11px] font-extrabold text-cyan-200 transition cursor-pointer"
                  >
                    +₹{amt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setFrameRevenue(0)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-slate-400 transition cursor-pointer"
                  title="Reset Frame"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Live Calculation Bar & Submit Action */}
        <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Row Date</span>
              <span className="text-xs font-black font-mono text-cyan-300">{selectedDate}</span>
            </div>
            <div className="h-6 w-px bg-white/10"></div>
            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Gross Sales</span>
              <span className="text-sm font-black font-mono text-white">₹{formatMoney(grossSales)}</span>
            </div>
            <div className="h-6 w-px bg-white/10"></div>
            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Est. Incentive</span>
              <span className="text-sm font-black font-mono text-emerald-400">₹{formatMoney(estIncentive)}</span>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:brightness-110 text-white font-extrabold text-xs shadow-lg shadow-indigo-500/30 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>Update Date Row ({selectedDate})</span>
          </motion.button>
        </div>

      </form>
    </div>
  );
}
