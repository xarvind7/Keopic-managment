import { AnimatePresence, motion } from 'motion/react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  show: boolean;
  onClose: () => void;
}

export default function ShortcutsModal({ show, onClose }: ShortcutsModalProps) {
  const list = [
    { label: 'Add New Row', kbd: 'Ctrl + N' },
    { label: 'Save & Recalculate', kbd: 'Ctrl + S' },
    { label: 'Search Entries', kbd: 'Ctrl + F' },
    { label: 'Toggle Light/Dark Theme', kbd: 'Ctrl + T' },
    { label: 'Export PDF Report', kbd: 'Ctrl + P' },
    { label: 'Toggle Shortcuts Help', kbd: '?' },
  ];

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.35 }}
            className="relative w-full max-w-md mx-4 p-6 rounded-3xl border bg-white/85 dark:bg-slate-900/85 backdrop-blur-3xl border-white/35 dark:border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] overflow-hidden"
          >
            {/* Top Specular Sheen */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Keyboard className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white">Keyboard Shortcuts</h3>
              </div>
              <button 
                onClick={onClose} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {list.map((item, idx) => (
                <div 
                  key={idx} 
                  className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                >
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{item.label}</span>
                  <span className="kbd text-xs font-bold font-mono px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                    {item.kbd}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
