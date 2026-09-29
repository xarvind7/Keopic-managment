import { useState } from 'react';
import { Plus, Trash2, IndianRupee, ArrowUpRight, HandCoins, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PaymentEntry } from '../types';
import { formatMoney } from '../utils/calculations';

interface PaymentsCardProps {
  payments: PaymentEntry[];
  onAddPayment: (type?: 'sent_to_sir' | 'advance_received') => void;
  onUpdatePayment: (id: string, field: keyof PaymentEntry, value: any) => void;
  onDeletePayment: (id: string) => void;
  isPrintMode?: boolean;
  grossSales?: number;
}

export default function PaymentsCard({
  payments,
  onAddPayment,
  onUpdatePayment,
  onDeletePayment,
  isPrintMode = false,
  grossSales = 0,
}: PaymentsCardProps) {
  const [activeCategory, setActiveCategory] = useState<'sent_to_sir' | 'advance_received'>('sent_to_sir');

  const sentPayments = payments.filter(p => !p.type || p.type === 'sent_to_sir');
  const advancePayments = payments.filter(p => p.type === 'advance_received');

  const totalSent = sentPayments.reduce((sum, p) => sum + (Number(p.amt) || 0), 0);
  const totalAdvance = advancePayments.reduce((sum, p) => sum + (Number(p.amt) || 0), 0);

  const displayedPayments = activeCategory === 'sent_to_sir' ? sentPayments : advancePayments;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
      className="liquid-glass-card p-5 space-y-4 transition-all duration-300 relative overflow-hidden group shadow-2xl border border-white/35 dark:border-white/15 backdrop-blur-2xl"
    >
      {/* Top Specular Sheen */}
      <div 
        className="absolute top-0 left-0 right-0 h-[1.5px] transition-all duration-500 pointer-events-none" 
        style={{
          background: activeCategory === 'sent_to_sir' 
            ? 'linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.6), transparent)' 
            : 'linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.6), transparent)'
        }}
      />
      
      {/* Category Selection Tabs */}
      {!isPrintMode && (
        <div className="flex items-center gap-1.5 p-1 bg-white/20 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/25 dark:border-white/10">
          <button
            type="button"
            onClick={() => setActiveCategory('sent_to_sir')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeCategory === 'sent_to_sir'
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Cash Sent to Sir</span>
            {sentPayments.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-white/20 rounded-full text-[10px] font-mono">
                {sentPayments.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('advance_received')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeCategory === 'advance_received'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <HandCoins className="w-3.5 h-3.5" />
            <span>Advance Received</span>
            {advancePayments.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-white/20 rounded-full text-[10px] font-mono">
                {advancePayments.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div 
            className="w-1.5 h-5 rounded-full" 
            style={{ backgroundColor: activeCategory === 'sent_to_sir' ? 'var(--color-accent-primary)' : '#f59e0b' }}
          ></div>
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              {activeCategory === 'sent_to_sir' ? 'Cash Sent to Sir (Sales Cash)' : 'Advance Money Received from Sir'}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">
              {activeCategory === 'sent_to_sir'
                ? 'Photobooth cash handed over to Sir/Management'
                : 'Advance money given by Sir (counted with sales cash for Sir remittance)'}
            </p>
          </div>
        </div>

        {!isPrintMode && (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onAddPayment(activeCategory)} 
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-black rounded-xl border transition duration-150 shadow-sm cursor-pointer shrink-0"
            style={{
              color: activeCategory === 'sent_to_sir' ? 'var(--color-accent-primary)' : '#d97706',
              backgroundColor: activeCategory === 'sent_to_sir' ? 'rgba(var(--color-accent-rgb), 0.12)' : 'rgba(245, 158, 11, 0.12)',
              borderColor: activeCategory === 'sent_to_sir' ? 'rgba(var(--color-accent-rgb), 0.25)' : 'rgba(245, 158, 11, 0.25)',
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Entry</span>
          </motion.button>
        )}
      </div>

      {/* Helper explanation box for Advance Received */}
      {activeCategory === 'advance_received' && !isPrintMode && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-300 text-[11px] font-medium">
          <Info className="w-4 h-4 shrink-0 text-amber-500" />
          <span>Advance money given by Sir is counted along with Sales Cash. When you send money to Sir, it is deducted from this total cash. Salary stays untouched!</span>
        </div>
      )}

      {/* List of Entries */}
      <div className={`space-y-2 pr-1 custom-scrollbar ${isPrintMode ? '' : 'max-h-52 overflow-y-auto'}`}>
        <AnimatePresence initial={false}>
          {displayedPayments.map((p) => (
            <motion.div 
              key={p.id} 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 liquid-glass p-3 bg-slate-50/50 dark:bg-slate-900/30 backdrop-blur-sm flex-wrap sm:flex-nowrap border border-slate-200/50 dark:border-slate-800/50 rounded-xl hover:border-indigo-400/40 transition shadow-sm"
            >
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm text-xs font-black"
                style={{
                  color: (p.type || 'sent_to_sir') === 'sent_to_sir' ? 'var(--color-accent-primary)' : '#d97706',
                  backgroundColor: (p.type || 'sent_to_sir') === 'sent_to_sir' ? 'rgba(var(--color-accent-rgb), 0.12)' : 'rgba(245, 158, 11, 0.12)'
                }}
              >
                <IndianRupee className="w-4 h-4" />
              </div>
              
              {/* Entry Date */}
              {isPrintMode ? (
                <div className="font-bold text-slate-700 dark:text-slate-300 w-28 text-center">{p.date || '-'}</div>
              ) : (
                <input 
                  type="date" 
                  value={p.date || ''} 
                  onChange={(e) => onUpdatePayment(p.id, 'date', e.target.value)}
                  className="bg-slate-100 dark:bg-slate-800/50 focus:outline-none text-xs text-slate-700 dark:text-slate-200 font-semibold w-28 color-scheme-dark border border-slate-200/50 dark:border-slate-700/50 rounded-lg px-2 py-1 transition focus:border-indigo-500"
                />
              )}
   
              {/* Entry Description Note */}
              {isPrintMode ? (
                <div className="text-xs flex-1 min-w-[80px] text-slate-700 dark:text-slate-200 font-medium">
                  {p.note || '(No description)'}
                </div>
              ) : (
                <input 
                  type="text" 
                  placeholder={activeCategory === 'sent_to_sir' ? "Transfer Note (e.g. Cash to Sir)" : "Advance Note (e.g. Salary Advance)"} 
                  value={p.note} 
                  onChange={(e) => onUpdatePayment(p.id, 'note', e.target.value)}
                  className="pay-note bg-transparent focus:outline-none text-xs flex-1 min-w-[80px] text-slate-700 dark:text-slate-200 font-medium"
                />
              )}
              
              <div className="flex items-center gap-1">
                <span className={`font-bold text-xs ${activeCategory === 'sent_to_sir' ? 'text-accent' : 'text-amber-500'}`}>₹</span>
                {isPrintMode ? (
                  <div className={`text-sm font-bold text-right w-20 ${activeCategory === 'sent_to_sir' ? 'text-accent' : 'text-amber-500'}`}>
                    {formatMoney(Number(p.amt) || 0, 0)}
                  </div>
                ) : (
                  <input 
                    type="number" 
                    min="0"
                    placeholder="0" 
                    value={p.amt} 
                    onChange={(e) => onUpdatePayment(p.id, 'amt', e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0))}
                    className={`pay-amt bg-transparent focus:outline-none text-sm font-bold text-right w-20 focus:ring-1 rounded-lg px-1.5 py-0.5 border border-transparent ${
                      activeCategory === 'sent_to_sir' ? 'text-accent focus:border-indigo-400' : 'text-amber-500 focus:border-amber-400'
                    }`}
                  />
                )}
              </div>

              {!isPrintMode && (
                <motion.button 
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onDeletePayment(p.id)} 
                  className="text-slate-400 hover:text-rose-500 p-1 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {displayedPayments.length === 0 && (
          <div className="text-center py-6 text-slate-400 text-xs font-medium italic">
            {activeCategory === 'sent_to_sir' ? 'No cash sent to Sir recorded yet' : 'No advance money taken from Sir'}
          </div>
        )}
      </div>

      {/* Summary Totals & Adjustment Footer */}
      {(() => {
        const extraCashSentToSir = Math.max(0, totalSent - grossSales);
        const netRemainingAdvance = Math.max(0, totalAdvance - extraCashSentToSir);

        return (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div 
                className="p-3 rounded-xl transition-colors duration-300 flex items-center justify-between"
                style={{ backgroundColor: 'rgba(var(--color-accent-rgb), 0.08)' }}
              >
                <div>
                  <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Total Sent to Sir</span>
                  {grossSales > 0 && extraCashSentToSir > 0 && (
                    <span className="text-[10px] text-cyan-500 font-bold">
                      +{formatMoney(extraCashSentToSir)} extra over sales ({formatMoney(grossSales)})
                    </span>
                  )}
                </div>
                <span className="text-base font-black text-accent font-mono">
                  {formatMoney(totalSent, 0)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-extrabold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">Advance Received</span>
                  {extraCashSentToSir > 0 && (
                    <span className="text-[10px] text-amber-500 font-bold">
                      Initial Total: {formatMoney(totalAdvance)}
                    </span>
                  )}
                </div>
                <span className="text-base font-black text-amber-500 font-mono">
                  {formatMoney(totalAdvance, 0)}
                </span>
              </div>
            </div>

            {/* Advance Adjustment Breakdown Box */}
            {totalAdvance > 0 && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900/90 to-purple-950/70 border border-indigo-500/30 space-y-2 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 flex items-center gap-1">
                    <span>🔄 Advance Money Adjustment Logic</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold">
                    Automated
                  </span>
                </div>

                {extraCashSentToSir > 0 ? (
                  <div className="text-xs text-slate-200 space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Total Advance Taken:</span>
                      <span className="font-bold text-amber-400">{formatMoney(totalAdvance)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Extra Cash Paid to Sir (Sent {formatMoney(totalSent)} - Sales {formatMoney(grossSales)}):</span>
                      <span className="font-bold text-cyan-400">-{formatMoney(extraCashSentToSir)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-black pt-1.5 border-t border-white/10">
                      <span className="text-emerald-300">Remaining Advance to Deduct from Salary:</span>
                      <span className="text-emerald-400 font-mono text-sm">{formatMoney(netRemainingAdvance)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Full Advance will be deducted from Salary Payout:</span>
                    <span className="font-bold font-mono text-amber-400">{formatMoney(totalAdvance)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}
    </motion.div>
  );
}

