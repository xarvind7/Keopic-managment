import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { DailyEntry, TargetEntry, PaymentEntry } from '../types';
import { formatMoney } from '../utils/calculations';

interface PerformanceChartProps {
  entries: DailyEntry[];
  targets: TargetEntry[];
  payments: PaymentEntry[];
  grossSales: number;
  totalIncentive: number;
  totalPaid: number;
  maxDailySales: number;
  maxDailyDate: string;
  dailyAverage: number;
  totalTargets: number;
}

type ChartView = 'mix' | 'sales' | 'pay';

export default function PerformanceChart({
  entries,
  targets,
  payments,
  grossSales,
  totalIncentive,
  totalPaid,
  maxDailySales,
  maxDailyDate,
  dailyAverage,
  totalTargets,
}: PerformanceChartProps) {
  const [view, setView] = useState<ChartView>('mix');

  const chartData = useMemo(() => {
    let cumulativePresent = 0;
    return entries
      .filter(e => e.date)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(entry => {
        const stand = Number(entry.stand) || 0;
        const magnet = Number(entry.magnet) || 0;
        const frame = Number(entry.frame) || 0;

        if (entry.status === 'Present') {
          cumulativePresent++;
        }

        let inc = 0;
        if (entry.status === 'Present') {
          if (stand + magnet + frame >= 500) {
            inc += (stand + magnet) * 0.10;
          }
          inc += frame * 0.07;
        }

        const dateTargets = targets
          .filter(t => t.date === entry.date)
          .reduce((sum, t) => sum + (Number(t.amt) || 0), 0);

        return {
          date: entry.date,
          displayDate: entry.date.split('-').slice(1).join('-'), // MM-DD
          Stand: stand,
          Magnet: magnet,
          Frame: frame,
          Incentive: Number(inc.toFixed(2)),
          Targets: dateTargets,
          Attendance: cumulativePresent,
        };
      });
  }, [entries, targets]);

  const stats = useMemo(() => {
    const incRate = grossSales > 0 ? (totalIncentive / grossSales) * 100 : 0;
    const paidRatio = grossSales > 0 ? (totalPaid / grossSales) * 100 : 0;
    const peakRatio = grossSales > 0 ? (maxDailySales / Math.max(grossSales, maxDailySales)) * 100 : 0;
    const runRatio = maxDailySales > 0 ? (dailyAverage / maxDailySales) * 100 : 0;

    return {
      incRate,
      paidRatio,
      peakRatio,
      runRatio,
    };
  }, [grossSales, totalIncentive, totalPaid, maxDailySales, dailyAverage]);

  return (
    <div className="liquid-glass-card chart-shell p-5 shadow-2xl border border-white/35 dark:border-white/15 relative overflow-hidden backdrop-blur-2xl">
      {/* Specular highlight on top edge */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      {/* Header Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: 'var(--color-accent-primary)' }}></div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-accent">Command View</span>
            <h2 className="text-base font-black tracking-tight text-slate-800 dark:text-white uppercase">Performance Analytics</h2>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="segmented-control" role="group" aria-label="Chart view">
            <button
              onClick={() => setView('mix')}
              className={view === 'mix' ? 'active' : ''}
            >
              Mix
            </button>
            <button
              onClick={() => setView('sales')}
              className={view === 'sales' ? 'active' : ''}
            >
              Sales
            </button>
            <button
              onClick={() => setView('pay')}
              className={view === 'pay' ? 'active' : ''}
            >
              Pay
            </button>
          </div>
          <span className="text-xs text-cyan-700 dark:text-cyan-300 font-bold px-3 py-1.5 rounded-lg bg-cyan-50/80 dark:bg-cyan-950/60 border border-cyan-200/60 dark:border-cyan-800/60">
            {entries.length} tracked day{entries.length === 1 ? '' : 's'} - {formatMoney(totalTargets)} targets
          </span>
        </div>
      </div>

      {/* Grid of Micro Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="chart-stat">
          <div className="text-[10px] text-slate-500 uppercase font-black">Peak Day</div>
          <strong className="block text-sm font-black mt-1 text-slate-800 dark:text-slate-200">
            {maxDailyDate === '-' ? '-' : `${maxDailyDate} - ${formatMoney(maxDailySales)}`}
          </strong>
          <div className="mini-sparkline mt-2">
            <span style={{ width: `${stats.peakRatio}%` }}></span>
          </div>
        </div>
        <div className="chart-stat">
          <div className="text-[10px] text-slate-500 uppercase font-black">Run Rate</div>
          <strong className="block text-sm font-black mt-1 text-slate-800 dark:text-slate-200">
            {formatMoney(dailyAverage)}
          </strong>
          <div className="mini-sparkline mt-2">
            <span style={{ width: `${stats.runRatio}%` }}></span>
          </div>
        </div>
        <div className="chart-stat">
          <div className="text-[10px] text-slate-500 uppercase font-black">Incentive Rate</div>
          <strong className="block text-sm font-black mt-1 text-slate-800 dark:text-slate-200">
            {stats.incRate.toFixed(1)}%
          </strong>
          <div className="mini-sparkline mt-2">
            <span style={{ width: `${stats.incRate * 5}%` }}></span>
          </div>
        </div>
        <div className="chart-stat">
          <div className="text-[10px] text-slate-500 uppercase font-black">Paid Ratio</div>
          <strong className="block text-sm font-black mt-1 text-slate-800 dark:text-slate-200">
            {stats.paidRatio.toFixed(1)}%
          </strong>
          <div className="mini-sparkline mt-2">
            <span style={{ width: `${stats.paidRatio}%` }}></span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[22rem] relative w-full">
        {chartData.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-slate-400">
            No entry data to display
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: -5, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.12)" />
              <XAxis 
                dataKey="displayDate" 
                tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              
              {/* Sales Axis (Left) */}
              {view !== 'pay' && (
                <YAxis 
                  yAxisId="sales"
                  orientation="left"
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val}`}
                />
              )}

              {/* Pay Axis (Right) */}
              {view !== 'sales' && (
                <YAxis 
                  yAxisId="pay"
                  orientation="right"
                  tick={{ fill: '#10b981', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val}`}
                />
              )}

              {/* Attendance Axis (Right secondary) */}
              {view === 'pay' && (
                <YAxis 
                  yAxisId="attendance"
                  orientation="left"
                  tick={{ fill: '#06b6d4', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
              )}

              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '11px',
                }}
                formatter={(value: any, name: string) => {
                  if (name === 'Attendance') return [`${value} days`, name];
                  return [formatMoney(Number(value), 2), name];
                }}
              />
              <Legend 
                verticalAlign="top"
                align="left"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '11px', paddingBottom: '15px' }}
              />

              {/* VIEW CONFIGURATIONS */}
              {view === 'mix' && (
                <>
                  <Bar yAxisId="sales" dataKey="Stand" name="Stand" stackId="sales" fill="rgba(37, 99, 235, 0.8)" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="sales" dataKey="Magnet" name="Magnet" stackId="sales" fill="rgba(124, 58, 237, 0.8)" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="sales" dataKey="Frame" name="Frame" stackId="sales" fill="rgba(6, 182, 212, 0.8)" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="pay" type="monotone" dataKey="Incentive" name="Incentive" stroke="#22c55e" strokeWidth={2.5} dot={false} />
                  <Bar yAxisId="pay" dataKey="Targets" name="Targets" fill="rgba(245, 158, 11, 0.8)" radius={[4, 4, 0, 0]} />
                </>
              )}

              {view === 'sales' && (
                <>
                  <Bar yAxisId="sales" dataKey="Stand" name="Stand" fill="rgba(37, 99, 235, 0.85)" radius={[6, 6, 0, 0]} />
                  <Bar yAxisId="sales" dataKey="Magnet" name="Magnet" fill="rgba(124, 58, 237, 0.85)" radius={[6, 6, 0, 0]} />
                  <Bar yAxisId="sales" dataKey="Frame" name="Frame" fill="rgba(6, 182, 212, 0.85)" radius={[6, 6, 0, 0]} />
                </>
              )}

              {view === 'pay' && (
                <>
                  <Line yAxisId="pay" type="monotone" dataKey="Incentive" name="Incentive" stroke="#22c55e" strokeWidth={3} dot={{ r: 2 }} />
                  <Bar yAxisId="pay" dataKey="Targets" name="Targets" fill="rgba(245, 158, 11, 0.85)" radius={[6, 6, 0, 0]} />
                  <Line yAxisId="attendance" type="step" dataKey="Attendance" name="Attendance (Days)" stroke="#06b6d4" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
