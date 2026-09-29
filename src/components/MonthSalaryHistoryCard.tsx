import React, { useState } from 'react';
import { 
  Calendar, 
  CircleDollarSign, 
  TrendingUp, 
  Layers, 
  ChevronRight, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRightLeft,
  CalendarCheck,
  Zap,
  HelpCircle,
  Edit3,
  Check,
  Download,
  FileSpreadsheet,
  FileText,
  Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MonthData, MetaConfig } from '../types';
import { performCalculations, formatMoney, getDaysInMonth } from '../utils/calculations';
import { exportAllMonthsExcel, exportAllMonthsPDF, exportAllMonthsJSON } from '../utils/exportAllMonths';

interface MonthSalaryHistoryCardProps {
  currentMonth: string;
  allMonthsData: Record<string, MonthData>;
  meta?: MetaConfig;
  onSelectMonth: (monthVal: string) => void;
  onUpdateMonthSalary: (monthVal: string, newSalary: number) => void;
  onTriggerToast?: (title: string, desc: string, isErr?: boolean) => void;
  isPrintMode?: boolean;
}

export default function MonthSalaryHistoryCard({
  currentMonth,
  allMonthsData,
  meta = { empName: 'Staff Member', monthVal: '2026-08', locVal: 'Main Counter', baseSalary: 17000 },
  onSelectMonth,
  onUpdateMonthSalary,
  onTriggerToast,
  isPrintMode = false,
}: MonthSalaryHistoryCardProps) {
  const [editingMonth, setEditingMonth] = useState<string | null>(null);
  const [editSalaryVal, setEditSalaryVal] = useState<number>(17000);
  const [showFormulaGuide, setShowFormulaGuide] = useState<boolean>(false);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);

  // Collect all known months and sort chronologically
  const availableMonths = Object.keys(allMonthsData);
  if (!availableMonths.includes(currentMonth)) {
    availableMonths.push(currentMonth);
  }

  // Ensure default August and September exist for clear presentation if not present
  if (!availableMonths.includes('2026-08')) availableMonths.push('2026-08');
  if (!availableMonths.includes('2026-09')) availableMonths.push('2026-09');

  const sortedMonths = Array.from(new Set(availableMonths)).sort();

  const handleStartEdit = (monthVal: string, currentSalary: number) => {
    setEditingMonth(monthVal);
    setEditSalaryVal(currentSalary);
  };

  const handleSaveSalary = (monthVal: string) => {
    if (editSalaryVal > 0) {
      onUpdateMonthSalary(monthVal, editSalaryVal);
    }
    setEditingMonth(null);
  };

  // Helper to format month name (e.g. '2026-08' -> 'August 2026')
  const formatMonthTitle = (monthKey: string) => {
    if (!monthKey || !monthKey.includes('-')) return monthKey;
    const [y, m] = monthKey.split('-');
    const date = new Date(Number(y), Number(m) - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="liquid-glass-card p-5 space-y-4 shadow-2xl border border-white/35 dark:border-white/15 relative overflow-hidden backdrop-blur-2xl"
    >
      {/* Top Specular Sheen */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent pointer-events-none" />
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>Month-Wise Salary & Data Isolation Ledger</span>
              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black rounded-full border border-emerald-300 dark:border-emerald-800">
                Dynamic & Isolated
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Each month calculates with its own independent salary, worked days, and missed off payments.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Download All Months Report Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold rounded-xl shadow-md transition cursor-pointer active:scale-95"
              title="Download consolidated reports for all months"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download All Months Report</span>
            </button>

            {showExportMenu && (
              <div 
                className="absolute right-0 mt-2 w-64 rounded-2xl glass-dropdown shadow-2xl z-50 overflow-hidden text-slate-800 dark:text-slate-100 p-1.5 space-y-1"
                onClick={() => setShowExportMenu(false)}
              >
                <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  Export Consolidated Format
                </div>

                <button
                  type="button"
                  onClick={() => {
                    try {
                      exportAllMonthsExcel(allMonthsData, meta);
                      onTriggerToast?.('Excel Report Downloaded', 'Downloaded multi-sheet all months master workbook');
                    } catch (e) {
                      console.error('All months Excel export error:', e);
                      onTriggerToast?.('Export Failed', 'Failed to generate Excel file', true);
                    }
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-bold rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center gap-2.5 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="block">All Months Excel (.xlsx)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Multi-sheet summary + month tabs</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    try {
                      exportAllMonthsPDF(allMonthsData, meta);
                      onTriggerToast?.('Master PDF Downloaded', 'Exported consolidated all months statement');
                    } catch (e) {
                      console.error('All months PDF export error:', e);
                      onTriggerToast?.('Export Failed', 'Failed to generate PDF', true);
                    }
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-bold rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 flex items-center gap-2.5 transition cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div>
                    <span className="block">All Months Master PDF (.pdf)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Consolidated multi-page statement</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    try {
                      exportAllMonthsJSON(allMonthsData, meta);
                      onTriggerToast?.('Data Archive Saved', 'Downloaded JSON backup of all months');
                    } catch (e) {
                      console.error('All months JSON export error:', e);
                      onTriggerToast?.('Export Failed', 'Failed to generate JSON', true);
                    }
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2.5 transition cursor-pointer"
                >
                  <Archive className="w-4 h-4 text-slate-500 shrink-0" />
                  <div>
                    <span className="block">All Months JSON Archive (.json)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Full raw database backup</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFormulaGuide(!showFormulaGuide)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>{showFormulaGuide ? 'Hide Rules' : 'Calculation Rules'}</span>
          </button>
        </div>
      </div>

      {/* Formula Explainer Collapse */}
      <AnimatePresence>
        {showFormulaGuide && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-xs space-y-2.5 text-slate-700 dark:text-slate-300"
          >
            <div className="font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-500" />
              <span>Standard Monthly Payroll & Per-Day Calculation Formulas</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-emerald-200/80 dark:border-emerald-900/50 shadow-sm">
                <span className="font-bold text-slate-900 dark:text-slate-100 block mb-0.5">1. Per-Day Salary</span>
                <code className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-bold block">
                  Monthly Salary ÷ Month Days
                </code>
                <span className="text-[10px] text-slate-500 block mt-1">e.g. ₹17,000 / 31 = ₹548.39/day</span>
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-emerald-200/80 dark:border-emerald-900/50 shadow-sm">
                <span className="font-bold text-slate-900 dark:text-slate-100 block mb-0.5">2. Main Earned Salary</span>
                <code className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-bold block">
                  Per-Day Salary × Worked Days
                </code>
                <span className="text-[10px] text-slate-500 block mt-1">Worked = Present + Allowed Paid Offs</span>
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-emerald-200/80 dark:border-emerald-900/50 shadow-sm">
                <span className="font-bold text-slate-900 dark:text-slate-100 block mb-0.5">3. Missed Weekly Off Pay</span>
                <code className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-bold block">
                  (4 - Offs Taken) × Per-Day Rate
                </code>
                <span className="text-[10px] text-slate-500 block mt-1">Continuous duty on weekly offs compensated</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Multi-Month Isolation Comparison Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-800">
              <th className="py-3 px-3.5">Month</th>
              <th className="py-3 px-3.5 text-right">Monthly Salary</th>
              <th className="py-3 px-3.5 text-center">Days</th>
              <th className="py-3 px-3.5 text-right">Per-Day Rate</th>
              <th className="py-3 px-3.5 text-center">Worked Days</th>
              <th className="py-3 px-3.5 text-right">Main Salary</th>
              <th className="py-3 px-3.5 text-center">Offs (Taken/Missed)</th>
              <th className="py-3 px-3.5 text-right">Extra Off Pay</th>
              <th className="py-3 px-3.5 text-right font-black">Total Earnings</th>
              {!isPrintMode && <th className="py-3 px-3 text-center">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
            {sortedMonths.map((mVal) => {
              const mData = allMonthsData[mVal] || { entries: [], targets: [], payments: [], dailyGoal: 5000 };
              const mSalary = mData.baseSalary || (mVal === '2026-09' ? 18000 : 17000);
              const calcs = performCalculations(mData.entries, mData.targets, mData.payments, mSalary, mVal);
              const isSelected = mVal === currentMonth;

              return (
                <tr 
                  key={mVal}
                  className={`transition-colors ${
                    isSelected 
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/40 font-bold border-l-4 border-emerald-500' 
                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* Month Name & Indicator */}
                  <td className="py-3 px-3.5">
                    <div className="flex items-center gap-2">
                      <Calendar className={`w-4 h-4 ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                      <div>
                        <span className="font-black text-slate-900 dark:text-white block">
                          {formatMonthTitle(mVal)}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Active Selected
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Monthly Base Salary (Editable per month) */}
                  <td className="py-3 px-3.5 text-right">
                    {editingMonth === mVal ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-slate-400">₹</span>
                        <input
                          type="number"
                          value={editSalaryVal}
                          onChange={(e) => setEditSalaryVal(Number(e.target.value))}
                          className="w-20 px-1.5 py-1 text-right bg-white dark:bg-slate-800 border border-emerald-500 rounded font-mono font-bold text-xs"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveSalary(mVal)}
                          className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer"
                          title="Save Month Salary"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1 group/sal">
                        <span className="font-mono font-black text-slate-800 dark:text-slate-200">
                          {formatMoney(mSalary)}
                        </span>
                        {!isPrintMode && (
                          <button
                            onClick={() => handleStartEdit(mVal, mSalary)}
                            className="opacity-0 group-hover/sal:opacity-100 p-0.5 text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                            title={`Edit ${formatMonthTitle(mVal)} Salary`}
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Days in Month */}
                  <td className="py-3 px-3.5 text-center font-mono text-slate-600 dark:text-slate-400">
                    {calcs.daysInMonth}d
                  </td>

                  {/* Per-Day Salary */}
                  <td className="py-3 px-3.5 text-right font-mono text-slate-700 dark:text-slate-300">
                    {formatMoney(calcs.perDaySalary, 0)}/d
                  </td>

                  {/* Worked Days */}
                  <td className="py-3 px-3.5 text-center">
                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono font-bold rounded-md">
                      {calcs.workedDays} / {calcs.daysInMonth}d
                    </span>
                  </td>

                  {/* Main Salary Earned */}
                  <td className="py-3 px-3.5 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                    {formatMoney(calcs.mainSalary)}
                  </td>

                  {/* Weekly Offs Taken vs Missed */}
                  <td className="py-3 px-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5 font-mono text-xs">
                      <span className="text-amber-600 dark:text-amber-400 font-bold" title="Offs Taken">
                        {calcs.weekOffs} taken
                      </span>
                      <span className="text-slate-400">/</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold" title="Missed Offs Worked">
                        {calcs.missedWeekOffs} missed
                      </span>
                    </div>
                  </td>

                  {/* Extra Off Pay */}
                  <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    +{formatMoney(calcs.extraOffPayment)}
                  </td>

                  {/* Total Earnings */}
                  <td className="py-3 px-3.5 text-right font-mono font-black text-emerald-700 dark:text-emerald-300 text-sm">
                    {formatMoney(calcs.finalPayable)}
                  </td>

                  {/* Action Column */}
                  {!isPrintMode && (
                    <td className="py-3 px-3 text-center">
                      {isSelected ? (
                        <span className="px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-bold rounded-lg shadow-sm">
                          Viewing
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelectMonth(mVal)}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-200 text-[11px] font-bold rounded-lg transition cursor-pointer"
                        >
                          Switch Month
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-500 font-medium">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Complete isolation verified: Editing September's salary never alters August's records or calculations.</span>
        </div>
        <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
          <span>Active Month Base:</span>
          <span className="font-mono text-emerald-600 dark:text-emerald-400">
            {formatMoney(allMonthsData[currentMonth]?.baseSalary || (currentMonth === '2026-09' ? 18000 : 17000))}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
