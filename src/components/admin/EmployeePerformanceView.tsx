import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Star, 
  Building, 
  Award, 
  Calendar, 
  Clock, 
  CircleDollarSign, 
  Sparkles, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  CreditCard,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { performCalculations, formatMoney } from '../../utils/calculations';
import { StaffAccount, saveStoredStaffAccounts } from '../AuthLoginModal';

interface EmployeePerformanceViewProps {
  records: any[];
  staffAccounts: StaffAccount[];
  setStaffAccounts: React.Dispatch<React.SetStateAction<StaffAccount[]>>;
  selectedMonthFilter: string;
  triggerToast: (title: string, msg?: string, isError?: boolean) => void;
}

export default function EmployeePerformanceView({
  records,
  staffAccounts,
  setStaffAccounts,
  selectedMonthFilter,
  triggerToast
}: EmployeePerformanceViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('ALL');

  // Compute performance metrics for every employee
  const employeePerformanceList = useMemo(() => {
    return staffAccounts.map(acc => {
      // Find all records belonging to this staff member
      const userRecords = records.filter(r => {
        const empName = (r.data?.meta?.empName || '').trim().toLowerCase();
        return empName === acc.empName.trim().toLowerCase() || r.id === acc.code || r.id === acc.username;
      });

      let totalGrossSales = 0;
      let totalIncentive = 0;
      let totalSalary = 0;
      let totalCashSubmitted = 0;
      let totalStandUnits = 0;
      let totalMagnetUnits = 0;
      let totalFrameRev = 0;
      let presentDays = 0;
      let absentDays = 0;
      let weekOffDays = 0;
      let totalDaysLogged = 0;
      let lastReportDate = 'N/A';

      userRecords.forEach(rec => {
        const data = rec.data || {};
        const meta = data.meta || {};
        const monthVal = meta.monthVal || '';

        if (selectedMonthFilter !== 'ALL' && monthVal !== selectedMonthFilter) return;

        const baseSalary = meta.baseSalary || 17000;
        const entries = data.entries || [];
        const targets = data.targets || [];
        const payments = data.payments || [];

        totalDaysLogged += entries.length;

        entries.forEach((e: any) => {
          if (e.date) lastReportDate = e.date;
          if (e.status === 'Present') presentDays += 1;
          else if (e.status === 'Absent') absentDays += 1;
          else if (e.status === 'Week Off') weekOffDays += 1;

          totalStandUnits += Number(e.stand || 0);
          totalMagnetUnits += Number(e.magnet || 0);
          totalFrameRev += Number(e.frame || 0);
        });

        const calc = performCalculations(entries, targets, payments, baseSalary, monthVal);
        totalGrossSales += calc.grossSales;
        totalIncentive += calc.totalIncentive;
        totalSalary += calc.finalPayable;
        totalCashSubmitted += calc.totalPaid;
      });

      const pendingCash = Math.max(0, totalGrossSales - totalCashSubmitted);
      const avgDailySales = totalDaysLogged > 0 ? Math.round(totalGrossSales / totalDaysLogged) : 0;

      // Best selling product for this employee
      const standRev = totalStandUnits * 200;
      const magnetRev = totalMagnetUnits * 250;
      let bestProduct = 'Stand (₹200)';
      if (magnetRev > standRev && magnetRev > totalFrameRev) bestProduct = 'Magnet (₹250)';
      else if (totalFrameRev > standRev && totalFrameRev > magnetRev) bestProduct = 'Frame';

      return {
        ...acc,
        totalGrossSales,
        totalIncentive,
        totalSalary,
        totalCashSubmitted,
        pendingCash,
        totalStandUnits,
        totalMagnetUnits,
        totalFrameRev,
        presentDays,
        absentDays,
        weekOffDays,
        totalDaysLogged,
        avgDailySales,
        bestProduct,
        lastReportDate
      };
    }).sort((a, b) => b.totalGrossSales - a.totalGrossSales);
  }, [staffAccounts, records, selectedMonthFilter]);

  // Handle Star Rating Update
  const handleUpdateRating = (empId: string, rating: number) => {
    const updated = staffAccounts.map(s => {
      if (s.id === empId) {
        return { ...s, rating };
      }
      return s;
    });

    setStaffAccounts(updated);
    saveStoredStaffAccounts(updated);
    triggerToast('Rating Saved', `Performance rating updated to ${rating} stars`);
  };

  // Filtered List
  const filteredList = useMemo(() => {
    return employeePerformanceList.filter(emp => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || emp.empName.toLowerCase().includes(q) || emp.code.toLowerCase().includes(q) || emp.location.toLowerCase().includes(q);
      const matchesBranch = selectedBranchFilter === 'ALL' || emp.location === selectedBranchFilter;
      return matchesSearch && matchesBranch;
    });
  }, [employeePerformanceList, searchQuery, selectedBranchFilter]);

  return (
    <div className="space-y-6">
      
      {/* HEADER & FILTERS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0a1038] p-4 rounded-3xl border border-indigo-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-rose-600 p-0.5 shadow-md">
            <div className="w-full h-full bg-[#0a1038] rounded-[14px] flex items-center justify-center text-amber-300">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="text-base font-black text-white">Employee Performance Ratings & Scorecards</h2>
            <p className="text-xs text-slate-400">Attendance, product sales, commission, cash pending & rating stars</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search employee..."
              className="pl-9 pr-3 py-1.5 bg-[#101742] border border-indigo-500/30 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>
      </div>

      {/* PERFORMANCE TABLE */}
      <div className="bg-[#0a1038] rounded-3xl border border-indigo-500/20 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#101742] text-slate-400 uppercase text-[10px] font-extrabold border-b border-indigo-500/20">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4 text-center">Attendance (P/A/W)</th>
                <th className="py-3 px-4 text-right">Stands / Magnets</th>
                <th className="py-3 px-4 text-right">Gross Sales</th>
                <th className="py-3 px-4 text-right">Commission</th>
                <th className="py-3 px-4 text-right">Total Salary</th>
                <th className="py-3 px-4 text-right">Cash Pending</th>
                <th className="py-3 px-4 text-center">Avg Daily Sales</th>
                <th className="py-3 px-4 text-center">Star Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-500/10">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500 italic">No employee scorecards available.</td>
                </tr>
              ) : (
                filteredList.map(emp => (
                  <tr key={emp.id} className="hover:bg-indigo-950/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-indigo-600 p-0.5 shrink-0">
                          <div className="w-full h-full bg-[#0a1038] rounded-[10px] flex items-center justify-center font-black text-cyan-300 text-xs uppercase">
                            {emp.empName.slice(0, 2)}
                          </div>
                        </div>
                        <div>
                          <div className="font-extrabold text-white flex items-center gap-1.5">
                            <span>{emp.empName}</span>
                            <span className="font-mono text-[10px] text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                              {emp.code}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Last Log: {emp.lastReportDate}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-300">{emp.location}</td>

                    <td className="py-3.5 px-4 text-center font-mono">
                      <span className="text-emerald-400 font-bold">{emp.presentDays}P</span> / <span className="text-rose-400">{emp.absentDays}A</span> / <span className="text-amber-300">{emp.weekOffDays}W</span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono">
                      <span className="text-cyan-300 font-bold">{emp.totalStandUnits} Stand</span>
                      <span className="text-slate-500"> | </span>
                      <span className="text-purple-300 font-bold">{emp.totalMagnetUnits} Mag</span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-black text-white text-sm">
                      ₹{formatMoney(emp.totalGrossSales)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                      ₹{formatMoney(emp.totalIncentive, 2)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-300">
                      ₹{formatMoney(emp.totalSalary, 2)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold">
                      <span className={emp.pendingCash > 0 ? 'text-rose-400' : 'text-slate-400'}>
                        ₹{formatMoney(emp.pendingCash)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono text-cyan-300 font-bold">
                      ₹{formatMoney(emp.avgDailySales)}/day
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-0.5 text-amber-400">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleUpdateRating(emp.id, star)}
                            className="p-0.5 hover:scale-125 transition cursor-pointer"
                            title={`Set ${star} stars`}
                          >
                            <Star className={`w-3.5 h-3.5 ${star <= (emp.rating || 5) ? 'fill-amber-400' : 'text-slate-600'}`} />
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
