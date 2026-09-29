import { useState } from 'react';
import { CalendarCheck, Sparkles, Coins, CheckCircle2, AlertCircle, Info, ChevronDown, ChevronUp, Clock, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CalculationResult } from '../utils/calculations';
import { AnimatedCounter } from './AnimatedCounter';

interface FreeWeekOffsCardProps {
  stats: CalculationResult;
  monthVal?: string;
  entriesCount?: number;
}

export default function FreeWeekOffsCard({ stats, monthVal = '', entriesCount = 0 }: FreeWeekOffsCardProps) {
  const [showPolicyDetail, setShowPolicyDetail] = useState(false);

  const {
    daysInMonth,
    perDaySalary,
    weekOffs,
    allowedWeekOffs,
    accruedWeekOffs = 0,
    effectiveDays = 0,
    unavailedWeekOffs,
    unavailedWeekOffPay,
    extraWeekOffs,
    isMonthCompleted
  } = stats;

  const milestoneDays = [8, 16, 24, Math.min(30, daysInMonth)];

  // Month completion status
  const totalLogged = entriesCount || stats.processedEntries?.length || 0;
  const isMonthFullyLogged = isMonthCompleted || totalLogged >= daysInMonth;

  // Format month name nicely (e.g. August 2026)
  let formattedMonth = monthVal;
  try {
    if (monthVal && monthVal.includes('-')) {
      const [y, m] = monthVal.split('-');
      const d = new Date(Number(y), Number(m) - 1, 1);
      formattedMonth = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    }
  } catch {
    formattedMonth = monthVal;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="liquid-glass-card p-5 sm:p-6 rounded-3xl border border-white/35 dark:border-white/15 shadow-2xl overflow-hidden relative group bg-gradient-to-br from-indigo-900/20 via-purple-900/15 to-slate-900/30 backdrop-blur-2xl"
    >
      {/* Top Specular Sheen */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent pointer-events-none" />
      {/* Background ambient lighting */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700 pointer-events-none"></div>
      <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-2xl pointer-events-none"></div>

      <div className="relative z-10 space-y-5">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-800/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  4 Free Week Offs Policy
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  {formattedMonth}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mt-0.5">
                4 Free Week-Offs & Extra Duty Calculation
              </h3>
            </div>
          </div>

          {/* Month Completion Indicator Badge */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {isMonthFullyLogged ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Month Completed ({totalLogged}/{daysInMonth} Days)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30">
                <Clock className="w-3.5 h-3.5" />
                Month in Progress ({totalLogged}/{daysInMonth} Days)
              </span>
            )}
          </div>
        </div>

        {/* Visual 4 Week-Off Quota Matrix with 10, 17, 25, 30 Days Milestones */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              Monthly 4 Free Week-Offs Milestones:
            </span>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                Current: {effectiveDays} Days ({accruedWeekOffs}/4 Accrued)
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-semibold">
                {weekOffs} Availed &bull; {unavailedWeekOffs} Worked (Paid)
              </span>
            </div>
          </div>

          {/* Progressive Milestones Indicator Bar */}
          <div className="grid grid-cols-4 gap-2 bg-black/10 dark:bg-white/5 p-2.5 rounded-2xl border border-white/10">
            {[
              { slot: 1, day: 8, label: '8 Days', offName: '1st Off' },
              { slot: 2, day: 16, label: '16 Days', offName: '2nd Off' },
              { slot: 3, day: 24, label: '24 Days', offName: '3rd Off' },
              { slot: 4, day: Math.min(30, daysInMonth), label: daysInMonth > 30 ? '30-31 Days' : `${daysInMonth} Days`, offName: '4th Off' },
            ].map(m => {
              const isReached = effectiveDays >= m.day || accruedWeekOffs >= m.slot;
              return (
                <div 
                  key={m.slot}
                  className={`p-2 rounded-xl text-center border transition-all ${
                    isReached
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'bg-white/5 border-white/10 text-slate-400 opacity-60'
                  }`}
                >
                  <div className="text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1">
                    {isReached && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
                    <span>{m.label}</span>
                  </div>
                  <div className="text-[9px] font-bold mt-0.5">
                    {isReached ? `${m.offName} Active` : `Target: ${m.offName}`}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 4 Cards Grid with Progressive Milestones */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[1, 2, 3, 4].map(slotNum => {
              const targetDay = milestoneDays[slotNum - 1];
              const isAccrued = slotNum <= accruedWeekOffs;
              const isAvailed = slotNum <= weekOffs;

              return (
                <div
                  key={slotNum}
                  className={`p-3 rounded-xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                    isAvailed
                      ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300 shadow-sm'
                      : isAccrued
                      ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shadow-md shadow-emerald-500/5'
                      : 'bg-slate-500/10 dark:bg-slate-800/40 border-slate-400/20 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider opacity-80">
                      Week Off #{slotNum}
                    </span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-black/20 text-white/90">
                      {targetDay}d
                    </span>
                  </div>

                  {isAvailed ? (
                    <div>
                      <div className="text-xs font-black flex items-center gap-1 text-amber-800 dark:text-amber-200">
                        <CheckCircle2 className="w-3 h-3 text-amber-500" />
                        Availed (Leave)
                      </div>
                      <div className="text-[9px] opacity-75 font-medium mt-0.5">
                        Free Paid Off
                      </div>
                    </div>
                  ) : isAccrued ? (
                    <div>
                      <div className="text-xs font-black flex items-center gap-1 text-emerald-800 dark:text-emerald-200">
                        <Sparkles className="w-3 h-3 text-emerald-500" />
                        Worked on Duty
                      </div>
                      <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                        +₹{Math.round(perDaySalary)} Extra Pay
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1 text-slate-400">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Pending ({targetDay}d)
                      </div>
                      <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Unlocks on Day {targetDay}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 4 Metrics Highlight Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          <div className="bg-slate-100/70 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Allowed Free Offs
            </span>
            <div className="text-lg font-black text-slate-800 dark:text-slate-100">
              {allowedWeekOffs} Days
            </div>
            <div className="text-[9px] text-slate-400 font-medium mt-0.5">
              Included in base salary
            </div>
          </div>

          <div className="bg-amber-500/10 dark:bg-amber-500/15 p-3 rounded-xl border border-amber-500/20">
            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block mb-1">
              Offs Availed (Taken)
            </span>
            <div className="text-lg font-black text-amber-600 dark:text-amber-300">
              {weekOffs} Days
            </div>
            <div className="text-[9px] text-amber-700/70 dark:text-amber-300/70 font-medium mt-0.5">
              Leave taken by staff
            </div>
          </div>

          <div className="bg-indigo-500/10 dark:bg-indigo-500/15 p-3 rounded-xl border border-indigo-500/20">
            <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">
              Per Day Salary Rate
            </span>
            <div className="text-lg font-black text-indigo-600 dark:text-indigo-300 flex items-center min-h-[28px]">
              <AnimatedCounter value={perDaySalary} isCurrency duration={0.6} />
            </div>
            <div className="text-[9px] text-indigo-700/70 dark:text-indigo-300/70 font-medium mt-0.5">
              Base ÷ {daysInMonth} Days
            </div>
          </div>

          <div className="bg-emerald-500/15 dark:bg-emerald-500/20 p-3 rounded-xl border border-emerald-500/40 shadow-sm">
            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              Unused Off Extra Pay
            </span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 flex items-center min-h-[28px]">
              <AnimatedCounter value={unavailedWeekOffPay} prefix="+₹" duration={0.65} />
            </div>
            <div className="text-[9px] text-emerald-700 dark:text-emerald-300 font-bold mt-0.5">
              {unavailedWeekOffs} Days @ ₹{Math.round(perDaySalary)}/day
            </div>
          </div>

        </div>

        {/* Dynamic Condition Status Banner */}
        <div className={`p-4 rounded-xl border text-xs leading-relaxed flex items-start gap-3 ${
          unavailedWeekOffPay > 0
            ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
            : extraWeekOffs > 0
            ? 'bg-rose-500/10 dark:bg-rose-500/15 border-rose-500/30 text-rose-900 dark:text-rose-200'
            : 'bg-indigo-500/10 dark:bg-indigo-500/15 border-indigo-500/30 text-indigo-900 dark:text-indigo-200'
        }`}>
          <div className="p-1.5 rounded-lg bg-white/20 dark:bg-black/20 shrink-0 mt-0.5">
            {unavailedWeekOffPay > 0 ? (
              <Sparkles className="w-4 h-4 text-emerald-500" />
            ) : extraWeekOffs > 0 ? (
              <AlertCircle className="w-4 h-4 text-rose-500" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-indigo-500" />
            )}
          </div>

          <div className="flex-1 space-y-1">
            <div className="font-extrabold text-sm">
              {unavailedWeekOffPay > 0 ? (
                <>🎉 Week-Off Duty Bonus Applied: +₹{unavailedWeekOffPay.toLocaleString('en-IN')}</>
              ) : extraWeekOffs > 0 ? (
                <>⚠ {extraWeekOffs} Extra Week-Offs Deducted as Auto Absent</>
              ) : (
                <>✔ 4/4 Free Week-Offs Availed (Full Base Salary Paid)</>
              )}
            </div>
            
            <p className="text-[11px] opacity-90">
              {unavailedWeekOffPay > 0 ? (
                <>
                  Aapke <strong>{effectiveDays} din</strong> me <strong>{accruedWeekOffs} week-offs</strong> qualify huye hain aur aapne keval <strong>{weekOffs} off</strong> liya hai. Bache huye <strong>{unavailedWeekOffs} week-off dinon</strong> par duty karne ka extra payment (<strong>+₹{unavailedWeekOffPay.toLocaleString('en-IN')}</strong>) salary me add ho gaya hai.
                </>
              ) : extraWeekOffs > 0 ? (
                <>
                  Aapne 4 allowed week-offs se jyada ({weekOffs} week-offs) liye hain. 4 ke baad ke {extraWeekOffs} week-offs ko Auto Absent mankar salary se deduct (-₹{stats.salaryDeduction}) kiya gaya hai.
                </>
              ) : effectiveDays < 8 ? (
                <>
                  Abhi mahine ke <strong>{effectiveDays}/8 din</strong> huye hain. Pehle 8 din pure hone par 1st week-off qualify hoga aur agar aap off nahi lenge to uska extra payment add hoga.
                </>
              ) : (
                <>
                  Aapne qualify huye {accruedWeekOffs} week-offs me se {weekOffs} off use kar liye hain. Base salary pura credit ho raha hai.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Expandable Policy Explanation Dropdown */}
        <div className="border-t border-slate-200/50 dark:border-slate-800/50 pt-3">
          <button
            onClick={() => setShowPolicyDetail(!showPolicyDetail)}
            className="flex items-center justify-between w-full text-left text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
              How 4 Free Week-Offs & Encashment Rule Works (नियम व गणना की जानकारी)
            </span>
            {showPolicyDetail ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <AnimatePresence>
            {showPolicyDetail && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-3 text-xs space-y-2 text-slate-600 dark:text-slate-300 bg-slate-100/50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800/50"
              >
                <div className="flex items-start gap-2">
                  <span className="font-black text-indigo-500">1.</span>
                  <p><strong>Monthly 4 Free Week Offs:</strong> Har mahine total 4 week-offs allow hote hain jo base salary me included hote hain.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-black text-indigo-500">2.</span>
                  <p><strong>Progressive Milestones (8, 16, 24, 30-31 Din):</strong> Week-off ka extra duty payment in milestones par unlock hota hai:
                    <br />&bull; <strong>8 Din:</strong> 1st week-off qualify (off nahi liya to 1 off ka paisa add)
                    <br />&bull; <strong>16 Din:</strong> 2nd week-off qualify (off nahi liya to 2 offs ka paisa add)
                    <br />&bull; <strong>24 Din:</strong> 3rd week-off qualify (off nahi liya to 3 offs ka paisa add)
                    <br />&bull; <strong>30-31 Din:</strong> 4th week-off qualify (month complete hone par sabhi unavailed offs ka paisa add)
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-black text-indigo-500">3.</span>
                  <p><strong>More than 4 Week Offs:</strong> Agar koi 4 se jyada week-offs leta hai, to 4 ke baad ke sabhi extra offs Auto Absent mankar salary se deduct kiye jaate hain.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </motion.div>
  );
}
