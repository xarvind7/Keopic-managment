import { Plus, Trash2, Check, Navigation, IndianRupee, MapPin, Fuel } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConveyanceEntry } from '../types';
import { formatMoney } from '../utils/calculations';

interface ConveyanceLogCardProps {
  conveyances: ConveyanceEntry[];
  onAddConveyance: () => void;
  onUpdateConveyance: (id: string, field: keyof ConveyanceEntry, value: any) => void;
  onDeleteConveyance: (id: string) => void;
  isPrintMode?: boolean;
}

export default function ConveyanceLogCard({
  conveyances,
  onAddConveyance,
  onUpdateConveyance,
  onDeleteConveyance,
  isPrintMode = false,
}: ConveyanceLogCardProps) {
  const totalConveyanceAmount = conveyances.reduce((sum, c) => sum + (Number(c.amt) || 0), 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: 0.12 }}
      whileHover={{ y: -2 }}
      className="liquid-glass-card p-5 space-y-4 transition-all duration-300 relative overflow-hidden group shadow-2xl border border-white/35 dark:border-white/15 backdrop-blur-2xl"
    >
      {/* Top Specular Sheen Reflex */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-teal-400/50 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-sm">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                Conveyance Log
              </h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                Sir Se Lena Hai
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Travel & petrol claims added directly to salary (++ INR)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Total Badge */}
          <div className="text-right hidden sm:block">
            <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Total Conveyance</span>
            <span className="text-sm font-black text-teal-600 dark:text-teal-400">
              +{formatMoney(totalConveyanceAmount)}
            </span>
          </div>

          {!isPrintMode && (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onAddConveyance} 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-xl border border-teal-500/30 bg-teal-500/15 text-teal-700 dark:text-teal-300 hover:bg-teal-500/25 transition duration-150 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Claim</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Itemized List */}
      <div className={`space-y-2 pr-1 custom-scrollbar ${isPrintMode ? '' : 'max-h-60 overflow-y-auto'}`}>
        <AnimatePresence initial={false}>
          {conveyances.map((c) => (
            <motion.div 
              key={c.id} 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, height: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex items-center gap-2 liquid-glass p-2.5 rounded-xl border text-xs backdrop-blur-sm transition-all duration-300 ${
                c.status === 'Approved' || c.status === 'Claimed'
                  ? 'bg-teal-500/5 dark:bg-teal-500/10 border-teal-500/30 shadow-sm'
                  : 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40'
              }`}
            >
              {/* Status Toggle / Checkmark */}
              {isPrintMode ? (
                <div className="flex items-center justify-center w-5 h-5 rounded-md border border-slate-300 dark:border-slate-700 shrink-0">
                  {(c.status === 'Approved' || c.status === 'Claimed') && (
                    <Check className="w-3.5 h-3.5 text-teal-500 stroke-[3]" />
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onUpdateConveyance(
                    c.id, 
                    'status', 
                    (c.status === 'Approved' || c.status === 'Claimed') ? 'Pending' : 'Approved'
                  )}
                  className={`flex items-center justify-center w-5 h-5 rounded-md border transition-all cursor-pointer shrink-0 ${
                    c.status === 'Approved' || c.status === 'Claimed'
                      ? 'bg-teal-500 border-teal-500 text-white shadow-sm'
                      : 'border-amber-400 dark:border-amber-600/50 text-transparent hover:bg-amber-500/10'
                  }`}
                  title={c.status === 'Approved' ? 'Mark as Pending' : 'Mark as Approved / Claimed'}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              )}
              
              {/* Date Input */}
              {isPrintMode ? (
                <div className="font-bold text-slate-700 dark:text-slate-300 w-28 text-center shrink-0">
                  {c.date}
                </div>
              ) : (
                <div className="relative shrink-0">
                  <input 
                    type="date" 
                    value={c.date} 
                    onChange={(e) => onUpdateConveyance(c.id, 'date', e.target.value)}
                    className="bg-slate-100 dark:bg-slate-800/60 focus:outline-none text-xs text-slate-700 dark:text-slate-200 font-semibold w-30 border border-slate-200/60 dark:border-slate-700/60 rounded-lg px-2 py-1 transition focus:border-teal-500 text-center"
                    title="Kis date ko conveyance provide hua / travel hua"
                  />
                </div>
              )}
              
              {/* Travel Purpose / Reason Note */}
              <div className="flex-1 min-w-[130px] relative">
                {isPrintMode ? (
                  <div className="text-slate-600 dark:text-slate-400 truncate font-medium">
                    {c.note || 'Conveyance / Travel Allowance Claim'}
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <input 
                      type="text" 
                      placeholder="Purpose (e.g. Stock visit / Petrol / Auto)" 
                      value={c.note} 
                      onChange={(e) => onUpdateConveyance(c.id, 'note', e.target.value)}
                      className="bg-transparent focus:outline-none text-slate-700 dark:text-slate-200 font-medium w-full placeholder-slate-400 text-xs px-2 py-1 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-teal-500 rounded-lg transition"
                    />
                  </div>
                )}
              </div>

              {/* Amount (₹) - Kitna rupi lena hai sir se */}
              <div className="flex items-center gap-1 font-mono font-black shrink-0">
                <span className="text-teal-600 dark:text-teal-400 text-xs">+₹</span>
                {isPrintMode ? (
                  <div className="text-teal-600 dark:text-teal-400 font-black min-w-16 text-right">
                    {formatMoney(Number(c.amt) || 0).replace('₹', '')}
                  </div>
                ) : (
                  <input 
                    type="number" 
                    placeholder="0" 
                    value={c.amt} 
                    onChange={(e) => onUpdateConveyance(
                      c.id, 
                      'amt', 
                      e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0)
                    )}
                    className="bg-slate-100 dark:bg-slate-800/60 text-right focus:outline-none text-xs text-teal-600 dark:text-teal-300 font-black w-20 border border-slate-200/60 dark:border-slate-700/60 rounded-lg px-2 py-1 transition focus:border-teal-500"
                    title="Kitna rupi lena ha sir se"
                  />
                )}
              </div>

              {/* Delete Button */}
              {!isPrintMode && (
                <motion.button 
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => onDeleteConveyance(c.id)} 
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                  title="Delete Claim"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {conveyances.length === 0 && (
          <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white/5 space-y-2">
            <div className="w-10 h-10 mx-auto rounded-full bg-teal-500/10 flex items-center justify-center text-teal-500">
              <Fuel className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              No conveyance claims logged for this month yet.
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Click <span className="font-bold text-teal-600 dark:text-teal-400">+ Add Claim</span> to record travel date & amount to receive from Sir.
            </p>
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {conveyances.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            <span>{conveyances.length} Claim{conveyances.length > 1 ? 's' : ''} added to salary (++)</span>
          </div>
          <div className="font-bold text-slate-700 dark:text-slate-200">
            Net Claim from Sir:{' '}
            <span className="font-black text-teal-600 dark:text-teal-400 text-sm">
              +{formatMoney(totalConveyanceAmount)}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
