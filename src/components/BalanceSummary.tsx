import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Calculator, 
  Calendar, 
  Info, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  Coins, 
  Wallet, 
  CheckCircle2, 
  TrendingDown, 
  TrendingUp,
  Navigation
} from 'lucide-react';
import { formatMoney, CalculationResult } from '../utils/calculations';
import { AnimatedCounter } from './AnimatedCounter';

interface BalanceSummaryProps {
  grossSales: number;
  totalPaid: number;
  netBalance: number;
  finalPayable: number;
  totalIncentive: number;
  stats: CalculationResult;
}

export default function BalanceSummary({
  grossSales,
  totalPaid,
  netBalance,
  finalPayable,
  totalIncentive,
  stats,
}: BalanceSummaryProps) {
  const [showLedger, setShowLedger] = useState(false);
  const isDeficit = netBalance < 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: 0.2 }}
      className="max-w-7xl mx-auto px-4 mt-6 space-y-6"
    >
      {/* Visual Title Header */}
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-sm">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Financial Insights</h3>
            <p className="text-[10px] text-slate-400 font-medium">Real-time calculations of earnings, commissions & settlements</p>
          </div>
        </div>
        
        {/* Toggle Calculation Audit Button */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowLedger(!showLedger)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold border border-slate-200/50 dark:border-slate-700/50 transition cursor-pointer"
        >
          <Calculator className="w-3.5 h-3.5 text-indigo-500" />
          <span>{showLedger ? 'Hide Audit Ledger' : 'Audit Calculations'}</span>
          {showLedger ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </motion.button>
      </div>

      {/* Grid of Dashboard Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Card 1: Personal Earning & Settlement Status (Sir's Account) */}
        <motion.div 
          whileHover={{ y: -3 }} 
          transition={{ duration: 0.2 }} 
          className="lg:col-span-7 liquid-glass-card p-6 bg-gradient-to-br from-slate-900/80 via-indigo-950/75 to-slate-950/85 backdrop-blur-3xl border border-white/25 dark:border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.2)] relative overflow-hidden group"
        >
          {/* Specular highlight along top edge */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />
          {/* Decorative glows */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/15 rounded-full blur-2xl group-hover:bg-indigo-500/25 transition duration-500 pointer-events-none"></div>
          <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-purple-500/15 rounded-full blur-3xl group-hover:bg-purple-500/25 transition duration-500 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
            
            {/* Header Area */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
                  <Wallet className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 block">Personal Ledger</span>
                  <h4 className="text-xs font-bold text-white/90">Salary & Earnings Tracker</h4>
                </div>
              </div>

              {/* Dynamic Settlement Badge */}
              <div className="flex items-center">
                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Main Salary Untouched</span>
                </span>
              </div>
            </div>

            {/* Earnings and Payout breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 py-1">
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10 hover:bg-white/10 transition">
                <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider block mb-1">Fixed Main Salary</span>
                <div className="text-lg font-black text-white tracking-tight flex items-center min-h-[28px]">
                  <AnimatedCounter value={stats.netEarnedSalary} isCurrency duration={0.65} />
                </div>
                <div className="text-[9px] text-white/50 font-medium mt-1">Base monthly salary</div>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10 hover:bg-white/10 transition">
                <span className="text-[9px] font-bold text-emerald-300 uppercase tracking-wider block mb-1">Incentives Earned</span>
                <div className="text-lg font-black text-emerald-400 tracking-tight flex items-center min-h-[28px]">
                  <AnimatedCounter value={totalIncentive} isCurrency duration={0.65} />
                </div>
                <div className="text-[9px] text-white/50 font-medium mt-1">Sales commission</div>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition">
                <span className="text-[9px] font-bold text-purple-300 uppercase tracking-wider block mb-1">Target Rewards</span>
                <div className="text-lg font-black text-purple-300 tracking-tight flex items-center min-h-[28px]">
                  <AnimatedCounter value={stats.totalTargets} isCurrency duration={0.65} />
                </div>
                <div className="text-[9px] text-purple-200/60 font-medium mt-1">Milestone bonuses</div>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 hover:bg-yellow-500/15 transition">
                <span className="text-[9px] font-bold text-yellow-300 uppercase tracking-wider block mb-1">Extra H Work (OT)</span>
                <div className="text-lg font-black text-yellow-300 tracking-tight flex items-center min-h-[28px]">
                  <AnimatedCounter value={stats.overtimePay || 0} prefix="+₹" duration={0.65} />
                </div>
                <div className="text-[9px] text-yellow-200/70 font-medium mt-1">
                  {stats.formattedPayableExtra || '0h 0m'} paid ({stats.formattedTotalExtra || '0h 0m'} logged @₹{stats.perHourSalary.toFixed(0)}/h)
                </div>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 transition">
                <span className="text-[9px] font-bold text-emerald-300 uppercase tracking-wider block mb-1">4 Free Offs Pay</span>
                <div className="text-lg font-black text-emerald-300 tracking-tight flex items-center min-h-[28px]">
                  <AnimatedCounter value={stats.unavailedWeekOffPay || 0} prefix="+₹" duration={0.65} />
                </div>
                <div className="text-[9px] text-emerald-200/70 font-medium mt-1">
                  {stats.unavailedWeekOffs || 0} Worked ({stats.accruedWeekOffs || 0}/4 Accrued @₹{stats.perDaySalary.toFixed(0)}/d)
                </div>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/15 transition">
                <span className="text-[9px] font-bold text-teal-300 uppercase tracking-wider block mb-1">Conveyance Claim</span>
                <div className="text-lg font-black text-teal-300 tracking-tight flex items-center min-h-[28px]">
                  <AnimatedCounter value={stats.totalConveyance || 0} prefix="+₹" duration={0.65} />
                </div>
                <div className="text-[9px] text-teal-200/70 font-medium mt-1">
                  {stats.conveyanceEntries?.length || 0} Claims (Sir se lena hai)
                </div>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/15 transition">
                <span className="text-[9px] font-bold text-amber-300 uppercase tracking-wider block mb-1">Advance Taken</span>
                <div className="text-lg font-black text-amber-400 tracking-tight flex items-center min-h-[28px]">
                  <AnimatedCounter value={stats.totalAdvance || 0} isCurrency duration={0.65} />
                </div>
                <div className="text-[9px] text-amber-200/70 font-medium mt-1">Advance taken from Sir</div>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/15 transition sm:col-span-2 md:col-span-1">
                <span className="text-[9px] font-bold text-cyan-300 uppercase tracking-wider block mb-1">Net Payable Salary</span>
                <div className="text-lg font-black text-cyan-300 tracking-tight font-extrabold flex items-center min-h-[28px]">
                  <AnimatedCounter value={finalPayable} isCurrency duration={0.65} />
                </div>
                <div className="text-[9px] text-cyan-200/70 font-medium mt-1">Base + Inc + OT + Offs + Conv</div>
              </div>
            </div>

            {/* Visual Progress Bar - Salary Breakdown Share */}
            <div className="space-y-2 bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-white/70">Incentives, Targets, Extra Hours, Offs & Conveyance Share</span>
                <span className="text-indigo-300">
                  {finalPayable > 0 ? Math.round(((totalIncentive + stats.totalTargets + (stats.overtimePay || 0) + (stats.unavailedWeekOffPay || 0) + (stats.totalConveyance || 0)) / finalPayable) * 100) : 0}% of Total Earnings
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden p-0.5 border border-white/10">
                <div 
                  className="bg-gradient-to-r from-indigo-500 via-purple-500 via-amber-500 via-teal-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, finalPayable > 0 ? ((totalIncentive + stats.totalTargets + (stats.overtimePay || 0) + (stats.unavailedWeekOffPay || 0) + (stats.totalConveyance || 0)) / finalPayable) * 100 : 0))}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-white/50 font-medium">
                <span>Fixed Main Salary: {formatMoney(stats.netEarnedSalary)}</span>
                <span>Total Net Payable Salary: {formatMoney(finalPayable)}</span>
              </div>
            </div>

          </div>
        </motion.div>

        {/* Card 2: Store Revenue & Cashflow Performance (Business Sheet) */}
        <motion.div 
          whileHover={{ y: -3 }} 
          transition={{ duration: 0.2 }}
          className={`lg:col-span-5 liquid-glass-card p-6 border transition-all duration-300 relative overflow-hidden group backdrop-blur-2xl shadow-xl ${
            isDeficit 
              ? 'bg-gradient-to-br from-rose-500/10 via-slate-900/40 to-slate-950/60 border-rose-500/30' 
              : 'bg-gradient-to-br from-emerald-500/10 via-slate-900/40 to-slate-950/60 border-emerald-500/30'
          }`}
        >
          {/* Specular highlight along top edge */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
            
            {/* Header Area */}
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/60 pb-4">
              <div className="flex items-center gap-2">
                <span className={`p-1.5 rounded-lg ${isDeficit ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                  {isDeficit ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                </span>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 block">Cashflow Sheet</span>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Store Financial Summary</h4>
                </div>
              </div>
              
              <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                isDeficit 
                  ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 border border-rose-200/30' 
                  : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-300 border border-emerald-200/30'
              }`}>
                {isDeficit ? 'Deficit Active' : 'Net Surplus'}
              </span>
            </div>

            {/* Cashflow Metrics */}
            <div className="space-y-4">
              {/* Highlight Grid showing Gross Sales, Advance Money, Total Accountable, Sent To Sir, and Remaining Cash */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-500/5 dark:bg-white/5 p-3.5 rounded-2xl border border-slate-200/50 dark:border-white/10">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">1. Gross Sales Revenue</span>
                  <div className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center min-h-[28px]">
                    <AnimatedCounter value={grossSales} isCurrency duration={0.65} />
                  </div>
                  <span className="text-[9px] text-slate-400 font-medium block mt-1">Total photobooth billing</span>
                </div>

                <div className="bg-amber-500/10 p-3.5 rounded-2xl border border-amber-500/20">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 dark:text-amber-400 block mb-1">2. Advance Money (From Sir)</span>
                  <div className="text-xl font-black text-amber-600 dark:text-amber-300 tracking-tight flex items-center min-h-[28px]">
                    <AnimatedCounter value={stats.totalAdvance || 0} prefix="+₹" duration={0.65} />
                  </div>
                  <span className="text-[9px] text-amber-600/70 dark:text-amber-300/70 font-medium block mt-1">Float/Advance given by Sir</span>
                </div>

                <div className="bg-indigo-500/10 p-3.5 rounded-2xl border border-indigo-500/20">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 block mb-1">Total Accountable Cash</span>
                  <div className="text-xl font-black text-indigo-300 tracking-tight flex items-center min-h-[28px]">
                    <AnimatedCounter value={stats.totalAccountableCash || (grossSales + (stats.totalAdvance || 0))} isCurrency duration={0.65} />
                  </div>
                  <span className="text-[9px] text-indigo-300/70 font-medium block mt-1">Sales + Advance count together</span>
                </div>

                <div className="bg-emerald-500/10 p-3.5 rounded-2xl border border-emerald-500/20">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 dark:text-emerald-400 block mb-1">Total Cash Sent To Sir</span>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-300 tracking-tight flex items-center min-h-[28px]">
                    <AnimatedCounter value={totalPaid} isCurrency duration={0.65} />
                  </div>
                  <span className="text-[9px] text-emerald-600/70 dark:text-emerald-300/70 font-medium block mt-1">Transferred / Handed to Sir</span>
                </div>
              </div>

              {/* Outstanding / Remaining Balance Box */}
              <div className={`p-4 rounded-2xl border transition-all duration-300 ${
                netBalance > 0 
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' 
                  : netBalance === 0
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider block opacity-80">
                      {netBalance > 0 ? 'Sir Ko Bhejna Baaki (Cash In Hand)' : netBalance === 0 ? 'Store Cash Account Status' : 'Extra Cash Sent to Sir'}
                    </span>
                    <div className="text-2xl font-black tracking-tight mt-0.5 flex items-center min-h-[32px]">
                      <AnimatedCounter value={Math.abs(netBalance)} isCurrency duration={0.65} />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-black/20 border border-white/10 inline-block">
                      {netBalance > 0 ? 'Pending Transfer' : netBalance === 0 ? 'Fully Settled ✓' : 'Overpaid / Credit'}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] opacity-75 font-medium mt-2">
                  {netBalance > 0 
                    ? `(Sales ${formatMoney(grossSales)} + Advance ${formatMoney(stats.totalAdvance || 0)}) - Sent ${formatMoney(totalPaid)}`
                    : netBalance === 0 
                    ? 'All cash collected from sales and advance received has been completely remitted to Sir.'
                    : `You have sent ${formatMoney(Math.abs(netBalance))} extra cash to Sir beyond total sales & advance.`}
                </p>
              </div>

              {/* Detailed Breakdown list */}
              <div className="space-y-1.5 text-xs border-t border-slate-100 dark:border-slate-800/50 pt-3">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-500">1. Gross Photobooth Sales:</span>
                  <span className="text-slate-800 dark:text-slate-200">{formatMoney(grossSales)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-500">2. Plus Advance Money (From Sir):</span>
                  <span className="text-amber-500">+{formatMoney(stats.totalAdvance || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-indigo-400 border-t border-dashed border-slate-700/50 pt-1">
                  <span>3. Total Cash Accountable (Sales + Advance):</span>
                  <span>{formatMoney(stats.totalAccountableCash || (grossSales + (stats.totalAdvance || 0)))}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-500">4. Less Cash Sent To Sir:</span>
                  <span className="text-emerald-500">-{formatMoney(totalPaid)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200/50 dark:border-slate-800/40 pt-2 font-black">
                  <span className="text-slate-700 dark:text-slate-200">Net Remaining Store Cash Balance:</span>
                  <span className={netBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                    {formatMoney(netBalance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Sales Composition Contribution Breakdown */}
            <div className="space-y-2 pt-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Sales Contribution & Units Sold</span>
              <div className="w-full bg-slate-100 dark:bg-slate-800/50 rounded-full h-2.5 overflow-hidden flex">
                <div 
                  className="bg-indigo-500 h-full hover:opacity-90 transition"
                  style={{ width: `${grossSales > 0 ? ((stats.totalStand + stats.totalMagnet) / grossSales) * 100 : 50}%` }}
                  title="Stand + Magnet"
                ></div>
                <div 
                  className="bg-cyan-500 h-full hover:opacity-90 transition"
                  style={{ width: `${grossSales > 0 ? (stats.totalFrame / grossSales) * 100 : 50}%` }}
                  title="Frame"
                ></div>
              </div>
              <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest pt-0.5">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block"></span> 
                  Stand+Magnet: {grossSales > 0 ? Math.round(((stats.totalStand + stats.totalMagnet) / grossSales) * 100) : 0}%
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 inline-block"></span> 
                  Frame: {grossSales > 0 ? Math.round((stats.totalFrame / grossSales) * 100) : 0}%
                </span>
              </div>

              {/* Item Units Breakdown */}
              <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/40">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">Total Items Sold:</span>
                  <span className="font-extrabold text-amber-600 dark:text-amber-400 font-mono text-sm">
                    {stats.totalItemsSold} Pcs
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center font-bold">
                  <div className="bg-purple-500/10 text-purple-600 dark:text-purple-300 p-1.5 rounded-lg border border-purple-500/20">
                    <span className="block text-[8px] uppercase text-purple-400 font-black">Magnet (@₹250)</span>
                    <span className="text-xs font-black">{stats.magnetUnits} Pcs</span>
                  </div>
                  <div className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 p-1.5 rounded-lg border border-indigo-500/20">
                    <span className="block text-[8px] uppercase text-indigo-400 font-black">Stand (@₹200)</span>
                    <span className="text-xs font-black">{stats.standUnits} Pcs</span>
                  </div>
                  <div className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 p-1.5 rounded-lg border border-cyan-500/20">
                    <span className="block text-[8px] uppercase text-cyan-400 font-black">Frame Rate</span>
                    <span className="text-xs font-black">Custom</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </motion.div>

      </div>

      {/* Expanded Calculations Ledger Block */}
      <AnimatePresence>
        {showLedger && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden no-print"
          >
            <div className="liquid-glass-card p-6 border border-slate-200 dark:border-slate-800/80 bg-white/45 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl shadow-lg">
              <div className="flex items-center gap-2 pb-3.5 border-b border-slate-200 dark:border-slate-800/80 mb-5">
                <Calculator className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                <h4 className="text-xs uppercase font-black text-slate-600 dark:text-slate-300 tracking-wider">Salary Index Calculations Audit Ledger</h4>
              </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs font-semibold">
            {/* Left Hand: Attendance & Prorated Salary */}
            <div className="space-y-4">
              <h5 className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 border-b border-slate-200/50 dark:border-slate-800/50 pb-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                Base Salary & Prorating
              </h5>
              
              <div className="space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Total days in month:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{stats.daysInMonth} Days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Fixed target base salary:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{formatMoney(stats.daysInMonth * stats.perDaySalary)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Computed per day rate:</span>
                  <span className="font-bold text-indigo-500">{formatMoney(stats.perDaySalary, 2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 dark:border-slate-800/40 pt-2.5">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    Present days count: <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{stats.presentDays} Days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    Absent days count: <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  </span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{stats.absentDays} Days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    Week Off days count: <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  </span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{stats.weekOffs} Days</span>
                </div>
              </div>
            </div>

            {/* Right Hand: Adjustments & Total Payable */}
            <div className="space-y-4">
              <h5 className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 border-b border-slate-200/50 dark:border-slate-800/50 pb-2">
                <Info className="w-4 h-4 text-emerald-500" />
                Ledger Formula Breakdown
              </h5>

              <div className="space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    Week Off adjustment:
                  </span>
                  <span className="font-bold text-slate-500">
                    No adjustments (Main salary untouched)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Absent days deductions:</span>
                  <span className="font-bold text-slate-500">No deductions (Main salary untouched)</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 dark:border-slate-800/40 pt-2.5 font-bold">
                  <span className="text-slate-700 dark:text-slate-300">1. Net Earned Base Salary:</span>
                  <span className="text-slate-900 dark:text-white font-extrabold">{formatMoney(stats.netEarnedSalary, 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">2. Commissions (Incentives):</span>
                  <span className="font-bold text-emerald-500">+{formatMoney(stats.totalIncentive, 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">3. Extra Earned Targets Log:</span>
                  <span className="font-bold text-emerald-500">+{formatMoney(stats.totalTargets, 2)}</span>
                </div>
                <div className="flex justify-between bg-yellow-500/10 p-2 rounded-lg text-yellow-800 dark:text-yellow-200">
                  <span className="font-bold text-yellow-600 dark:text-yellow-300">
                    4. Extra Hours Overtime ({stats.formattedPayableExtra || '0h 0m'} paid @ {formatMoney(stats.perHourSalary, 1)}/hr) [{stats.formattedTotalExtra || '0h 0m'} logged]:
                  </span>
                  <span className="font-black text-yellow-600 dark:text-yellow-400">+{formatMoney(stats.overtimePay || 0, 2)}</span>
                </div>
                <div className="flex justify-between bg-emerald-500/10 p-2 rounded-lg text-emerald-800 dark:text-emerald-200">
                  <span className="font-bold text-emerald-600 dark:text-emerald-300">
                    5. 4 Free Week-Offs Encashment ({stats.unavailedWeekOffs || 0} Worked Offs, {stats.accruedWeekOffs || 0}/4 Accrued @ {formatMoney(stats.perDaySalary, 1)}/day):
                  </span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">+{formatMoney(stats.unavailedWeekOffPay || 0, 2)}</span>
                </div>
                <div className="flex justify-between bg-teal-500/10 p-2 rounded-lg text-teal-800 dark:text-teal-200">
                  <span className="font-bold text-teal-600 dark:text-teal-300">
                    6. Conveyance Allowance Claim ({stats.conveyanceEntries?.length || 0} Travel Claims - Sir se lena hai):
                  </span>
                  <span className="font-black text-teal-600 dark:text-teal-400">+{formatMoney(stats.totalConveyance || 0, 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">7. Advance Money Received from Sir:</span>
                  <span className="font-bold text-amber-500">{formatMoney(stats.totalAdvance || 0, 2)}</span>
                </div>
                {(stats.extraCashSentToSir || 0) > 0 && (
                  <div className="flex justify-between bg-cyan-500/10 p-2 rounded-lg text-cyan-700 dark:text-cyan-300">
                    <span className="font-semibold">8. Less Extra Cash Paid to Sir (Sent {formatMoney(stats.totalPaid)} vs Sales {formatMoney(stats.grossSales)}):</span>
                    <span className="font-extrabold text-cyan-600 dark:text-cyan-400">-{formatMoney(stats.extraCashSentToSir || 0, 2)}</span>
                  </div>
                )}
                <div className="flex justify-between bg-amber-500/10 p-2 rounded-lg text-amber-800 dark:text-amber-200">
                  <span className="font-extrabold">Net Adjusted Advance to Deduct (7 - 8):</span>
                  <span className="font-black text-amber-600 dark:text-amber-400">-{formatMoney(stats.netRemainingAdvance || 0, 2)}</span>
                </div>
                <div className="flex justify-between border-t-2 border-dashed border-slate-200 dark:border-slate-700 pt-2.5 font-black text-sm text-slate-800 dark:text-slate-100">
                  <span>Net Payable Salary (1+2+3+4+5+6 - Net Advance):</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-black">{formatMoney(stats.finalPayable, 2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Informational Notice */}
          <div className="mt-5 p-3.5 rounded-xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 flex items-start gap-2.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            <Clock className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <p>
              <strong>Policy Reminder:</strong> Standard daily working shift is 9 hours. All extra duty hours are logged in working records, while overtime payment is credited for days where extra duty is at least 1 hour (60 minutes). Daily incentives are calculated on Present days (10% commission on Stand+Magnet sales when daily total across Stand+Magnet+Frame is ₹500+, and 7% on all Frame sales). Logged payments represent cash sent to Sir from photobooth sales.
            </p>
          </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
