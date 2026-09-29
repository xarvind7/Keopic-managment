import { AnimatePresence, motion } from 'motion/react';
import { Check, X } from 'lucide-react';

interface ToastProps {
  show: boolean;
  title: string;
  msg: string;
  isError?: boolean;
  onClose: () => void;
}

export default function Toast({ show, title, msg, isError = false, onClose }: ToastProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl border text-white text-sm font-bold flex items-center gap-3 max-w-sm backdrop-blur-md ${
            isError 
              ? 'bg-rose-600/90 border-rose-500/30' 
              : 'bg-emerald-600/90 border-emerald-500/30'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg backdrop-blur-sm flex-shrink-0">
            {isError ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm leading-tight">{title}</div>
            {msg && <div className="text-xs opacity-90 font-medium mt-0.5">{msg}</div>}
          </div>
          <button 
            onClick={onClose} 
            className="text-white/60 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
