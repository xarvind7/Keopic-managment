import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, animate } from 'motion/react';

interface AnimatedCounterProps {
  value: number;
  isCurrency?: boolean;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
  showDiffBadge?: boolean;
}

export function AnimatedCounter({
  value,
  isCurrency = false,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 0.6,
  className = '',
  showDiffBadge = true,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [diff, setDiff] = useState<number | null>(null);
  const [changeId, setChangeId] = useState(0);
  const prevValueRef = useRef(value);
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      if (value > 0) {
        const controls = animate(0, value, {
          duration: Math.min(0.75, Math.max(0.35, duration)),
          ease: [0.16, 1, 0.3, 1], // easeOutExpo
          onUpdate: (latest) => setDisplayValue(latest),
        });
        return () => controls.stop();
      }
      return;
    }

    const start = prevValueRef.current;
    const end = value;
    prevValueRef.current = value;

    const delta = end - start;
    if (Math.abs(delta) < 0.001) {
      setDisplayValue(end);
      return;
    }

    setDiff(delta);
    setChangeId((prev) => prev + 1);

    const controls = animate(start, end, {
      duration: duration,
      ease: [0.16, 1, 0.3, 1], // smooth spring-like cubic bezier
      onUpdate: (latest) => {
        setDisplayValue(latest);
      },
      onComplete: () => {
        setDisplayValue(end);
      },
    });

    const timer = setTimeout(() => {
      setDiff(null);
    }, 1600);

    return () => {
      controls.stop();
      clearTimeout(timer);
    };
  }, [value, duration]);

  const rounded =
    decimals > 0
      ? Number(displayValue.toFixed(decimals))
      : Math.round(displayValue);

  const formattedNumber = rounded.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const currencySymbol = isCurrency ? (prefix ? prefix : '₹') : prefix;
  const fullText = `${currencySymbol}${formattedNumber}${suffix}`;

  return (
    <span className="inline-flex items-center gap-1 relative overflow-visible">
      {/* Animated Count-Up Text with Framer Motion Entry/Exit on Value Change */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={`num-${changeId}`}
          initial={{
            opacity: 0.7,
            y: diff && diff > 0 ? 4 : diff && diff < 0 ? -4 : 0,
            scale: 0.97,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          exit={{
            opacity: 0,
            y: diff && diff > 0 ? -4 : 4,
            scale: 0.97,
          }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className={`inline-block tabular-nums tracking-tight ${className}`}
        >
          {fullText}
        </motion.span>
      </AnimatePresence>

      {/* Floating Delta Badge showing the live diff (+₹200 / -₹100) */}
      {showDiffBadge && diff !== null && Math.abs(diff) >= 0.5 && (
        <AnimatePresence>
          <motion.span
            initial={{ opacity: 0, y: diff > 0 ? 5 : -5, scale: 0.75 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: diff > 0 ? -6 : 6, scale: 0.75 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={`text-[9px] font-black px-1 py-0.5 rounded leading-none shadow-xs shrink-0 select-none ${
              diff > 0
                ? 'bg-emerald-400/30 text-emerald-100 border border-emerald-300/40 backdrop-blur-xs'
                : 'bg-rose-400/30 text-rose-100 border border-rose-300/40 backdrop-blur-xs'
            }`}
          >
            {diff > 0 ? '+' : ''}
            {isCurrency ? '₹' : ''}
            {Math.round(diff).toLocaleString('en-IN')}
          </motion.span>
        </AnimatePresence>
      )}
    </span>
  );
}
