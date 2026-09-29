import { Plus, Trash2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TargetEntry } from '../types';
import { formatMoney } from '../utils/calculations';

interface TargetsLogCardProps {
  targets: TargetEntry[];
  onAddTarget: () => void;
  onUpdateTarget: (id: string, field: keyof TargetEntry, value: any) => void;
  onDeleteTarget: (id: string) => void;
  isPrintMode?: boolean;
}

export default function TargetsLogCard({
  targets,
  onAddTarget,
  onUpdateTarget,
  onDeleteTarget,
  isPrintMode = false,
}: TargetsLogCardProps) {
  const totalTargetsAmount = targets.reduce((sum, t) => sum + (Number(t.amt) || 0), 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: 0.15 }}
      whileHover={{ y: -2 }}
      className="liquid-glass-card p-5 space-y-4 transition-all duration-300 relative overflow-hidden group shadow-2xl border border-white/35 dark:border-white/15 backdrop-blur-2xl"
    >
      {/* Top Specular Sheen */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 rounded-full" style={{ backgroundColor: 'var(--color-accent-primary)' }}></div>
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Targets Log</h3>
        </div>
        {!isPrintMode && (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAddTarget} 
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-black rounded-lg border transition duration-150 shadow-sm cursor-pointer"
            style={{
              color: 'var(--color-accent-primary)',
              backgroundColor: 'rgba(var(--color-accent-rgb), 0.12)',
              borderColor: 'rgba(var(--color-accent-rgb), 0.25)',
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </motion.button>
        )}
      </div>

      <div className={`space-y-2 pr-1 custom-scrollbar ${isPrintMode ? '' : 'max-h-52 overflow-y-auto'}`}>
        <AnimatePresence initial={false}>
          {targets.map((t) => (
            <motion.div 
              key={t.id} 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, height: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex items-center gap-2 liquid-glass p-2.5 rounded-xl border text-xs backdrop-blur-sm transition-all duration-300 ${
                t.status === 'Paid'
                  ? 'bg-slate-500/5 border-slate-500/10 opacity-60'
                  : 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20 shadow-sm hover:border-emerald-500/40'
              }`}
            >
              {isPrintMode ? (
                <div className="flex items-center justify-center w-5 h-5 rounded-md border border-slate-300 dark:border-slate-700">
                  {t.status === 'Paid' && <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onUpdateTarget(t.id, 'status', t.status === 'Paid' ? 'Pending' : 'Paid')}
                  className={`flex items-center justify-center w-5 h-5 rounded-md border transition-all cursor-pointer ${
                    t.status === 'Paid'
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                      : 'border-slate-300 dark:border-slate-700 text-transparent hover:border-emerald-500/50 hover:bg-emerald-500/5'
                  }`}
                  title={t.status === 'Paid' ? 'Mark Pending' : 'Mark Paid'}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              )}
              
              {isPrintMode ? (
                <div className="font-bold text-slate-700 dark:text-slate-300 w-28 text-center">{t.date}</div>
              ) : (
                <input 
                  type="date" 
                  value={t.date} 
                  onChange={(e) => onUpdateTarget(t.id, 'date', e.target.value)}
                  className="bg-slate-100 dark:bg-slate-800/50 focus:outline-none text-xs text-slate-700 dark:text-slate-200 font-semibold w-28 color-scheme-dark border border-slate-200/50 dark:border-slate-700/50 rounded-lg px-2 py-1 transition focus:border-indigo-500 text-center"
                />
              )}
              
              {isPrintMode ? (
                <div className={`flex-1 min-w-0 text-slate-700 dark:text-slate-200 ${t.status === 'Paid' ? 'line-through text-slate-400' : ''}`}>
                  {t.note || '(No description)'}
                </div>
              ) : (
                <input 
                  type="text" 
                  placeholder="Target Note" 
                  value={t.note} 
                  onChange={(e) => onUpdateTarget(t.id, 'note', e.target.value)}
                  className={`target-note bg-transparent focus:outline-none flex-1 px-1 min-w-0 text-slate-700 dark:text-slate-200 transition-all ${
                    t.status === 'Paid' ? 'line-through text-slate-400' : ''
                  }`}
                />
              )}
              
              <span className={`font-bold text-sm transition-all ${t.status === 'Paid' ? 'text-slate-400' : 'text-emerald-500'}`}>₹</span>
              {isPrintMode ? (
                <div className={`font-bold text-right w-20 text-sm ${t.status === 'Paid' ? 'text-slate-400 font-medium' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatMoney(Number(t.amt) || 0, 0)}
                </div>
              ) : (
                <input 
                  type="number" 
                  min="0"
                  placeholder="0" 
                  value={t.amt} 
                  onChange={(e) => onUpdateTarget(t.id, 'amt', e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0))}
                  className={`target-amt bg-transparent focus:outline-none font-bold text-right w-20 text-sm focus:ring-1 focus:ring-emerald-500/30 rounded px-1 transition-all ${
                    t.status === 'Paid' ? 'text-slate-400 font-medium' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                />
              )}
              {!isPrintMode && (
                <motion.button 
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onDeleteTarget(t.id)} 
                  className="text-slate-400 hover:text-rose-500 p-1 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {targets.length === 0 && (
          <div className="text-center py-6 text-slate-400 text-xs font-medium italic">
            No targets logged for this session
          </div>
        )}
      </div>

      <div 
        className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center p-3 rounded-xl transition-colors duration-300"
        style={{
          backgroundColor: 'rgba(var(--color-accent-rgb), 0.08)'
        }}
      >
        <span className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">Total Targets Value</span>
        <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono" id="summary-targets-total">
          {formatMoney(totalTargetsAmount, 2)}
        </span>
      </div>
    </motion.div>
  );
}
