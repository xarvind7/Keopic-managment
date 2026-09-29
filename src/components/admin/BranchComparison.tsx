import React, { useMemo } from 'react';
import { 
  Building, 
  MapPin, 
  TrendingUp, 
  Users, 
  Award, 
  Sparkles, 
  BarChart3, 
  CircleDollarSign,
  PieChart as PieIcon,
  Layers
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell
} from 'recharts';
import { performCalculations, formatMoney } from '../../utils/calculations';

interface CloudRecordItem {
  id: string;
  data: {
    entries?: any[];
    targets?: any[];
    payments?: any[];
    meta?: {
      empName?: string;
      monthVal?: string;
      locVal?: string;
      baseSalary?: number;
      profilePic?: string;
    };
    updatedAt?: number;
  };
}

interface BranchComparisonProps {
  records: CloudRecordItem[];
  selectedMonthFilter: string;
}

const COLORS = ['#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];

export default function BranchComparison({ records, selectedMonthFilter }: BranchComparisonProps) {
  
  // Filter records by month if selected
  const activeRecords = useMemo(() => {
    if (selectedMonthFilter === 'ALL') return records;
    return records.filter(r => r.data.meta?.monthVal === selectedMonthFilter);
  }, [records, selectedMonthFilter]);

  // Total Gross across active records
  const grandTotalSales = useMemo(() => {
    return activeRecords.reduce((acc, r) => {
      const calc = performCalculations(r.data.entries || [], r.data.targets || [], r.data.payments || [], r.data.meta?.baseSalary || 17000, r.data.meta?.monthVal || 'N/A');
      return acc + calc.grossSales;
    }, 0);
  }, [activeRecords]);

  // Aggregate location data
  const branchData = useMemo(() => {
    const map: Record<string, {
      location: string;
      totalSales: number;
      totalIncentives: number;
      standUnits: number;
      magnetUnits: number;
      totalUnits: number;
      staffSet: Set<string>;
      submissionsCount: number;
    }> = {};

    activeRecords.forEach(rec => {
      const loc = rec.data.meta?.locVal || 'Main Counter';
      const emp = rec.data.meta?.empName || 'Staff Member';
      const baseSalary = rec.data.meta?.baseSalary || 17000;
      const monthVal = rec.data.meta?.monthVal || 'N/A';
      const entries = rec.data.entries || [];
      const targets = rec.data.targets || [];
      const payments = rec.data.payments || [];

      const calc = performCalculations(entries, targets, payments, baseSalary, monthVal);

      if (!map[loc]) {
        map[loc] = {
          location: loc,
          totalSales: 0,
          totalIncentives: 0,
          standUnits: 0,
          magnetUnits: 0,
          totalUnits: 0,
          staffSet: new Set(),
          submissionsCount: 0
        };
      }

      map[loc].totalSales += calc.grossSales;
      map[loc].totalIncentives += calc.totalIncentive;
      map[loc].standUnits += calc.standUnits;
      map[loc].magnetUnits += calc.magnetUnits;
      map[loc].totalUnits += calc.standUnits + calc.magnetUnits;
      map[loc].staffSet.add(emp);
      map[loc].submissionsCount += 1;
    });

    return Object.values(map)
      .map(b => ({
        ...b,
        staffCount: b.staffSet.size,
        revenueShare: grandTotalSales > 0 ? (b.totalSales / grandTotalSales) * 100 : 0
      }))
      .sort((a, b) => b.totalSales - a.totalSales);
  }, [activeRecords, grandTotalSales]);

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="bg-[#0f1535]/80 backdrop-blur-2xl rounded-3xl p-6 border border-[#262d63] shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-cyan-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-cyan-500/20">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">Counter & Branch Performance Benchmarking</h3>
            <p className="text-xs text-slate-400 mt-0.5">Compare total revenue, item sales volume, & incentive distribution by counter location</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-full bg-cyan-500/15 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/30">
            {branchData.length} Active Counter Branches
          </span>
        </div>
      </div>

      {/* Recharts Bar Chart: Counter Comparison */}
      <div className="bg-[#0f1535]/80 backdrop-blur-2xl rounded-3xl p-6 border border-[#262d63] shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              <span>Gross Sales Comparison Across Counters</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">Visual revenue comparison for {selectedMonthFilter === 'ALL' ? 'All Months' : selectedMonthFilter}</p>
          </div>
        </div>

        <div className="h-72 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={branchData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e295d" opacity={0.5} />
              <XAxis dataKey="location" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
              <Tooltip content={({ active, payload, label }: any) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-[#090e2e]/95 backdrop-blur-md p-3 rounded-xl border border-[#202a5c] shadow-2xl text-white text-xs">
                      <p className="font-extrabold text-cyan-400 mb-1">{label}</p>
                      <p className="font-mono font-bold">Gross Sales: <span className="text-emerald-400">₹{formatMoney(data.totalSales)}</span></p>
                      <p className="font-mono text-slate-300">Total Units: {data.totalUnits} items</p>
                      <p className="font-mono text-slate-300">Staff Assigned: {data.staffCount}</p>
                      <p className="font-mono text-cyan-300 mt-1">Revenue Share: {data.revenueShare.toFixed(1)}%</p>
                    </div>
                  );
                }
                return null;
              }} />
              <Bar dataKey="totalSales" radius={[12, 12, 0, 0]}>
                {branchData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Branch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branchData.map((branch, index) => {
          const isTop = index === 0;

          return (
            <motion.div
              key={branch.location}
              whileHover={{ y: -4 }}
              className={`bg-[#0f1535]/80 backdrop-blur-2xl rounded-3xl p-6 border ${
                isTop ? 'border-amber-500/50 shadow-amber-500/10' : 'border-[#262d63]'
              } shadow-2xl relative overflow-hidden flex flex-col justify-between`}
            >
              {isTop && (
                <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-md">
                  <Award className="w-3.5 h-3.5" />
                  <span>Top Counter #1</span>
                </div>
              )}

              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 text-white font-bold text-sm flex items-center justify-center shadow-md shrink-0">
                    <div className="w-full h-full bg-[#080d2a] rounded-[14px] flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-cyan-400" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white">{branch.location}</h4>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Users className="w-3 h-3 text-purple-400" />
                      <span>{branch.staffCount} Staff Members Active</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-3 bg-[#090e2e] p-4 rounded-2xl border border-[#1e2858] text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Total Gross Sales:</span>
                    <span className="font-mono font-black text-white text-sm">₹{formatMoney(branch.totalSales)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Commissions Paid:</span>
                    <span className="font-mono font-bold text-purple-400">+₹{formatMoney(branch.totalIncentives, 2)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Units Sold (Stand / Mag):</span>
                    <span className="font-mono font-bold text-cyan-300">{branch.standUnits} / {branch.magnetUnits}</span>
                  </div>

                  {/* Revenue Share Progress Bar */}
                  <div className="pt-2 border-t border-[#182352]">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Branch Share of Store Revenue:</span>
                      <span className="font-mono font-bold text-cyan-400">{branch.revenueShare.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full rounded-full"
                        style={{ width: `${Math.min(100, branch.revenueShare)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

            </motion.div>
          );
        })}
      </div>

    </div>
  );
}
