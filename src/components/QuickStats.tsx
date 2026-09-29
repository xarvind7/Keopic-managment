import { Box, Zap, Grid3X3, BarChart3, Coins, Wallet, ShoppingBag, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { STAND_UNIT_PRICE, MAGNET_UNIT_PRICE } from '../utils/calculations';
import { DailyEntry } from '../types';
import { AnimatedCounter } from './AnimatedCounter';

interface QuickStatsProps {
  totalStand: number;
  totalMagnet: number;
  totalFrame: number;
  grossSales: number;
  totalIncentive: number;
  finalPayable: number;
  entries?: DailyEntry[];
  overtimePay?: number;
  formattedTotalExtra?: string;
  formattedPayableExtra?: string;
  perHourSalary?: number;
  unavailedWeekOffPay?: number;
  unavailedWeekOffs?: number;
}

interface SparklineProps {
  data: number[];
  gradientId: string;
  strokeColor?: string;
  fillColorFrom?: string;
  fillColorTo?: string;
  height?: number;
}

function Sparkline({
  data,
  gradientId,
  strokeColor = '#ffffff',
  fillColorFrom = 'rgba(255,255,255,0.4)',
  fillColorTo = 'rgba(255,255,255,0.0)',
  height = 24
}: SparklineProps) {
  if (!data || data.length === 0) {
    return <div className="h-6 w-full opacity-20 border-b border-dashed border-white/40 my-1" />;
  }

  const points = data.length === 1 ? [data[0], data[0]] : data;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;

  const w = 120;
  const h = height;
  const paddingY = 3;
  const usableH = h - paddingY * 2;

  const coords = points.map((val, idx) => {
    const x = (idx / (points.length - 1)) * w;
    const y = h - paddingY - ((val - min) / range) * usableH;
    return { x, y, val };
  });

  const pathD = coords.reduce((acc, curr, idx) => {
    if (idx === 0) return `M ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
    const prev = coords[idx - 1];
    const cx1 = prev.x + (curr.x - prev.x) / 2;
    const cy1 = prev.y;
    const cx2 = prev.x + (curr.x - prev.x) / 2;
    const cy2 = curr.y;
    return `${acc} C ${cx1.toFixed(1)},${cy1.toFixed(1)} ${cx2.toFixed(1)},${cy2.toFixed(1)} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
  }, '');

  const fillD = `${pathD} L ${w},${h} L 0,${h} Z`;
  const lastPoint = coords[coords.length - 1];

  return (
    <div className="w-full h-6 overflow-hidden relative my-0.5 group/sparkline cursor-pointer" title={`Latest: ${lastPoint?.val || 0} | Peak: ${max}`}>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColorFrom} />
            <stop offset="100%" stopColor={fillColorTo} />
          </linearGradient>
        </defs>
        <path d={fillD} fill={`url(#${gradientId})`} />
        <motion.path
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.9 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-xs"
        />
        {lastPoint && (
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r="2"
            fill="#ffffff"
            className="animate-pulse"
          />
        )}
      </svg>
    </div>
  );
}

export default function QuickStats({
  totalStand,
  totalMagnet,
  totalFrame,
  grossSales,
  totalIncentive,
  finalPayable,
  entries = [],
  overtimePay = 0,
  formattedTotalExtra = '0h 0m',
  formattedPayableExtra,
  perHourSalary = 0,
  unavailedWeekOffPay = 0,
  unavailedWeekOffs = 0,
}: QuickStatsProps) {
  const framePercent = grossSales > 0 ? Math.round((totalFrame / grossSales) * 100) : 0;

  const standUnits = Math.round(totalStand / STAND_UNIT_PRICE);
  const magnetUnits = Math.round(totalMagnet / MAGNET_UNIT_PRICE);
  const totalItemsSold = standUnits + magnetUnits;

  // Extract daily trends chronologically
  const sortedEntries = [...entries].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const standSeries = sortedEntries.map(e => Number(e.stand) || 0);
  const magnetSeries = sortedEntries.map(e => Number(e.magnet) || 0);
  const frameSeries = sortedEntries.map(e => Number(e.frame) || 0);
  const grossSeries = sortedEntries.map(e => (Number(e.stand) || 0) + (Number(e.magnet) || 0) + (Number(e.frame) || 0));

  const calcTrendBadge = (series: number[]) => {
    if (series.length < 2) return null;
    const last = series[series.length - 1];
    const prev = series[series.length - 2];
    const diff = last - prev;
    if (diff > 0) {
      return (
        <span className="inline-flex items-center text-[9px] font-black text-emerald-200 bg-emerald-400/20 px-1 rounded">
          <TrendingUp className="w-2.5 h-2.5 mr-0.5" />+{diff}
        </span>
      );
    } else if (diff < 0) {
      return (
        <span className="inline-flex items-center text-[9px] font-black text-rose-200 bg-rose-400/20 px-1 rounded">
          <TrendingDown className="w-2.5 h-2.5 mr-0.5" />{diff}
        </span>
      );
    }
    return null;
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.04, duration: 0.35, ease: 'easeOut' as const }
    })
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
      {/* Stand Card */}
      <motion.div
        custom={0}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        whileHover={{ y: -4, scale: 1.015 }}
        whileTap={{ scale: 0.98 }}
        className="liquid-glass-card p-3.5 text-white bg-gradient-to-br from-indigo-500/80 via-indigo-600/75 to-indigo-800/85 backdrop-blur-2xl border border-white/35 dark:border-white/20 shadow-[0_12px_28px_rgba(99,102,241,0.25)] hover:shadow-[0_16px_36px_rgba(99,102,241,0.45)] transition-all duration-300 relative overflow-hidden group cursor-default"
      >
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/15 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
        <div className="flex items-center justify-between mb-1 relative z-10">
          <span className="text-[10px] font-black uppercase tracking-wider opacity-90 flex items-center gap-1">
            Stand {calcTrendBadge(standSeries)}
          </span>
          <Box className="w-4 h-4 opacity-80" />
        </div>
        <h3 className="text-lg font-black money-value tracking-tight relative z-10 flex items-center min-h-[28px]">
          <AnimatedCounter value={totalStand} isCurrency duration={0.65} />
        </h3>
        
        {/* Inline Sparkline for Stand Sales */}
        <Sparkline
          data={standSeries}
          gradientId="sparkline-stand"
          strokeColor="#ffffff"
          fillColorFrom="rgba(255,255,255,0.4)"
          fillColorTo="rgba(255,255,255,0.0)"
        />

        <div className="text-[10px] opacity-90 mt-0.5 font-bold relative z-10 flex items-center justify-between">
          <AnimatedCounter value={standUnits} suffix=" pcs" showDiffBadge={false} duration={0.5} />
          <span className="opacity-75">@₹{STAND_UNIT_PRICE}</span>
        </div>
      </motion.div>

      {/* Magnet Card */}
      <motion.div
        custom={1}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        whileHover={{ y: -4, scale: 1.015 }}
        whileTap={{ scale: 0.98 }}
        className="liquid-glass-card p-3.5 text-white bg-gradient-to-br from-purple-500/80 via-purple-600/75 to-purple-800/85 backdrop-blur-2xl border border-white/35 dark:border-white/20 shadow-[0_12px_28px_rgba(168,85,247,0.25)] hover:shadow-[0_16px_36px_rgba(168,85,247,0.45)] transition-all duration-300 relative overflow-hidden group cursor-default"
      >
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/15 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
        <div className="flex items-center justify-between mb-1 relative z-10">
          <span className="text-[10px] font-black uppercase tracking-wider opacity-90 flex items-center gap-1">
            Magnet {calcTrendBadge(magnetSeries)}
          </span>
          <Zap className="w-4 h-4 opacity-80" />
        </div>
        <h3 className="text-lg font-black money-value tracking-tight relative z-10 flex items-center min-h-[28px]">
          <AnimatedCounter value={totalMagnet} isCurrency duration={0.65} />
        </h3>
        
        {/* Inline Sparkline for Magnet Sales */}
        <Sparkline
          data={magnetSeries}
          gradientId="sparkline-magnet"
          strokeColor="#ffffff"
          fillColorFrom="rgba(255,255,255,0.4)"
          fillColorTo="rgba(255,255,255,0.0)"
        />

        <div className="text-[10px] opacity-90 mt-0.5 font-bold relative z-10 flex items-center justify-between">
          <AnimatedCounter value={magnetUnits} suffix=" pcs" showDiffBadge={false} duration={0.5} />
          <span className="opacity-75">@₹{MAGNET_UNIT_PRICE}</span>
        </div>
      </motion.div>

      {/* Frame Card */}
      <motion.div
        custom={2}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        whileHover={{ y: -4, scale: 1.015 }}
        whileTap={{ scale: 0.98 }}
        className="liquid-glass-card p-3.5 text-white bg-gradient-to-br from-cyan-500/80 via-teal-600/75 to-cyan-800/85 backdrop-blur-2xl border border-white/35 dark:border-white/20 shadow-[0_12px_28px_rgba(6,182,212,0.25)] hover:shadow-[0_16px_36px_rgba(6,182,212,0.45)] transition-all duration-300 relative overflow-hidden group cursor-default"
      >
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/15 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
        <div className="flex items-center justify-between mb-1 relative z-10">
          <span className="text-[10px] font-black uppercase tracking-wider opacity-90 flex items-center gap-1">
            Frame {calcTrendBadge(frameSeries)}
          </span>
          <Grid3X3 className="w-4 h-4 opacity-80" />
        </div>
        <h3 className="text-lg font-black money-value tracking-tight relative z-10 flex items-center min-h-[28px]">
          <AnimatedCounter value={totalFrame} isCurrency duration={0.65} />
        </h3>
        
        {/* Inline Sparkline for Frame Sales */}
        <Sparkline
          data={frameSeries}
          gradientId="sparkline-frame"
          strokeColor="#ffffff"
          fillColorFrom="rgba(255,255,255,0.4)"
          fillColorTo="rgba(255,255,255,0.0)"
        />

        <div className="text-[10px] opacity-90 mt-0.5 font-bold relative z-10 flex items-center justify-between">
          <span>{grossSales > 0 ? <AnimatedCounter value={framePercent} suffix="% sales" showDiffBadge={false} duration={0.5} /> : 'Frame'}</span>
          <span className="opacity-85 bg-white/20 px-1 rounded backdrop-blur-sm">Custom Rate</span>
        </div>
      </motion.div>

      {/* Total Items Sold Card */}
      <motion.div
        custom={3}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        whileHover={{ y: -4, scale: 1.015 }}
        whileTap={{ scale: 0.98 }}
        className="liquid-glass-card p-3.5 text-white bg-gradient-to-br from-amber-500/80 via-orange-600/75 to-amber-800/85 backdrop-blur-2xl border border-white/35 dark:border-white/20 shadow-[0_12px_28px_rgba(245,158,11,0.25)] hover:shadow-[0_16px_36px_rgba(245,158,11,0.45)] transition-all duration-300 relative overflow-hidden group cursor-default"
      >
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/15 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
        <div className="flex items-center justify-between mb-1 relative z-10">
          <span className="text-[10px] font-black uppercase tracking-wider opacity-90">Items Sold</span>
          <ShoppingBag className="w-4 h-4 opacity-80" />
        </div>
        <h3 className="text-lg font-black tracking-tight relative z-10 font-mono flex items-center min-h-[28px]">
          <AnimatedCounter value={totalItemsSold} suffix=" Pcs" duration={0.65} />
        </h3>
        <div className="text-[10px] opacity-90 mt-1 font-bold relative z-10 truncate flex items-center gap-1">
          <AnimatedCounter value={magnetUnits} suffix=" Mag" showDiffBadge={false} duration={0.5} />
          <span>•</span>
          <AnimatedCounter value={standUnits} suffix=" Std" showDiffBadge={false} duration={0.5} />
        </div>
      </motion.div>

      {/* Gross Card */}
      <motion.div
        custom={4}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        whileHover={{ y: -4, scale: 1.015 }}
        whileTap={{ scale: 0.98 }}
        className="liquid-glass-card p-3.5 text-white bg-gradient-to-br from-slate-800/85 via-slate-900/80 to-slate-950/90 backdrop-blur-2xl border border-white/30 dark:border-white/20 shadow-[0_12px_28px_rgba(15,23,42,0.3)] hover:shadow-[0_16px_36px_rgba(15,23,42,0.5)] transition-all duration-300 relative overflow-hidden group cursor-default"
      >
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/15 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
        <div className="flex items-center justify-between mb-1 relative z-10">
          <span className="text-[10px] font-black uppercase tracking-wider opacity-90">Gross</span>
          <BarChart3 className="w-4 h-4 opacity-80 text-indigo-400" />
        </div>
        <h3 className="text-lg font-black money-value tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300 relative z-10 flex items-center min-h-[28px]">
          <AnimatedCounter value={grossSales} isCurrency duration={0.65} />
        </h3>
        
        {/* Inline Sparkline for Gross Sales */}
        <Sparkline
          data={grossSeries}
          gradientId="sparkline-gross"
          strokeColor="#818cf8"
          fillColorFrom="rgba(129,140,248,0.35)"
          fillColorTo="rgba(129,140,248,0.0)"
        />

        <div className="text-[10px] opacity-85 mt-0.5 font-bold relative z-10">Total Revenue</div>
      </motion.div>

      {/* Incentive Card */}
      <motion.div
        custom={5}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        whileHover={{ y: -4, scale: 1.015 }}
        whileTap={{ scale: 0.98 }}
        className="liquid-glass-card p-3.5 text-white bg-gradient-to-br from-emerald-500/80 via-emerald-600/75 to-teal-800/85 backdrop-blur-2xl border border-white/35 dark:border-white/20 shadow-[0_12px_28px_rgba(16,185,129,0.25)] hover:shadow-[0_16px_36px_rgba(16,185,129,0.45)] transition-all duration-300 relative overflow-hidden group cursor-default"
      >
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/15 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
        <div className="flex items-center justify-between mb-1 relative z-10">
          <span className="text-[10px] font-black uppercase tracking-wider opacity-90">Incentive</span>
          <Coins className="w-4 h-4 opacity-80" />
        </div>
        <h3 className="text-lg font-black money-value tracking-tight relative z-10 flex items-center min-h-[28px]">
          <AnimatedCounter value={totalIncentive} isCurrency duration={0.65} />
        </h3>
        <div className="text-[10px] opacity-85 mt-1 font-bold relative z-10">Commissions</div>
      </motion.div>

      {/* Extra Hours Work Payment (OT) Card */}
      <motion.div
        custom={6}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        whileHover={{ y: -4, scale: 1.015 }}
        whileTap={{ scale: 0.98 }}
        className="liquid-glass-card p-3.5 text-white bg-gradient-to-br from-amber-600/80 via-yellow-600/75 to-orange-800/85 backdrop-blur-2xl border border-white/35 dark:border-white/20 shadow-[0_12px_28px_rgba(234,179,8,0.25)] hover:shadow-[0_16px_36px_rgba(234,179,8,0.45)] transition-all duration-300 relative overflow-hidden group cursor-default"
      >
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/15 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
        <div className="flex items-center justify-between mb-1 relative z-10">
          <span className="text-[10px] font-black uppercase tracking-wider opacity-90">Extra H Work</span>
          <Clock className="w-4 h-4 opacity-85 text-yellow-200" />
        </div>
        <h3 className="text-lg font-black money-value tracking-tight text-white relative z-10 flex items-center min-h-[28px]">
          <AnimatedCounter value={overtimePay} prefix="+₹" duration={0.65} />
        </h3>
        <div className="text-[10px] opacity-95 mt-1 font-bold relative z-10 flex items-center justify-between gap-1">
          <span 
            className="bg-black/25 px-1.5 py-0.5 rounded text-[9px] truncate backdrop-blur-sm"
            title={`Total extra logged: ${formattedTotalExtra}. Paid OT (days with ≥1h): ${formattedPayableExtra || '0h 0m'}`}
          >
            {formattedPayableExtra ? `${formattedPayableExtra} Paid` : `${formattedTotalExtra} Logged`}
          </span>
          <span className="opacity-80 shrink-0">@₹{perHourSalary.toFixed(0)}/h</span>
        </div>
      </motion.div>

      {/* Net Salary Card with smooth ambient border lighting */}
      <motion.div
        custom={7}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        whileHover={{ y: -4, scale: 1.015 }}
        whileTap={{ scale: 0.98 }}
        className="liquid-glass-card p-3.5 text-white bg-gradient-to-br from-blue-600/85 via-indigo-600/80 to-blue-800/90 backdrop-blur-2xl border border-white/40 dark:border-white/25 shadow-[0_12px_28px_rgba(59,130,246,0.3)] hover:shadow-[0_16px_36px_rgba(59,130,246,0.5)] transition-all duration-300 relative overflow-hidden group cursor-default"
      >
        {/* Subtle traveling light line along top edge */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent opacity-80 pointer-events-none" />
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/15 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
        <div className="flex items-center justify-between mb-1 relative z-10">
          <span className="text-[10px] font-black uppercase tracking-wider opacity-90">Net Salary</span>
          <Wallet className="w-4 h-4 opacity-80" />
        </div>
        <h3 className="text-lg font-black money-value tracking-tight relative z-10 flex items-center min-h-[28px]">
          <AnimatedCounter value={finalPayable} isCurrency duration={0.65} />
        </h3>
        <div className="text-[10px] opacity-85 mt-1 font-bold relative z-10 flex items-center justify-between">
          <span>Final Payable</span>
          {unavailedWeekOffPay > 0 && (
            <span className="bg-emerald-400/30 text-emerald-100 text-[9px] px-1 py-0.5 rounded font-black border border-emerald-300/40 backdrop-blur-sm">
              +{unavailedWeekOffs} Offs Paid
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
}



