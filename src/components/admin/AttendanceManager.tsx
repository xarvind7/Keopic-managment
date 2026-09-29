import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  XCircle, 
  Coffee, 
  AlertTriangle, 
  Filter, 
  Search, 
  Download, 
  User, 
  Building, 
  ChevronLeft, 
  ChevronRight, 
  FileSpreadsheet, 
  Clock, 
  Sparkles,
  TrendingUp,
  ShieldAlert,
  Info
} from 'lucide-react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';
import { BranchItem, DailyEntry } from '../../types';
import { performCalculations, getDaysInMonth, MAX_ALLOWED_WEEK_OFFS, formatMoney } from '../../utils/calculations';

interface AttendanceManagerProps {
  records: any[];
  branches: BranchItem[];
  selectedMonthFilter: string;
  setSelectedMonthFilter: (m: string) => void;
  triggerToast: (title: string, msg?: string, isError?: boolean) => void;
}

export default function AttendanceManager({
  records = [],
  branches = [],
  selectedMonthFilter,
  setSelectedMonthFilter,
  triggerToast
}: AttendanceManagerProps) {
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedStaff, setSelectedStaff] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeViewMode, setActiveViewMode] = useState<'calendar' | 'matrix' | 'list'>('calendar');

  // Month navigation
  const currentMonthVal = selectedMonthFilter === 'ALL' ? '2026-08' : selectedMonthFilter;
  const daysCount = getDaysInMonth(currentMonthVal);

  const handlePrevMonth = () => {
    const [year, month] = currentMonthVal.split('-').map(Number);
    const d = new Date(year, month - 2, 1);
    const prev = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonthFilter(prev);
  };

  const handleNextMonth = () => {
    const [year, month] = currentMonthVal.split('-').map(Number);
    const d = new Date(year, month, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonthFilter(next);
  };

  // Process and aggregate attendance data across all staff records
  const staffAttendanceData = useMemo(() => {
    const map: Record<string, {
      empName: string;
      branch: string;
      entriesMap: Record<string, DailyEntry>;
      rawEntries: DailyEntry[];
      calcResult: ReturnType<typeof performCalculations>;
    }> = {};

    records.forEach(rec => {
      const data = rec.data || {};
      const meta = data.meta || {};
      const month = meta.monthVal || currentMonthVal;
      const emp = meta.empName || 'Staff Member';
      const loc = meta.locVal || 'Main Counter';
      const baseSalary = meta.baseSalary || 17000;

      if (month !== currentMonthVal) return;

      const entries: DailyEntry[] = data.entries || [];
      const targets = data.targets || [];
      const payments = data.payments || [];

      const calc = performCalculations(entries, targets, payments, baseSalary, month);

      const entryDateMap: Record<string, DailyEntry> = {};
      calc.processedEntries.forEach(e => {
        if (e.date) {
          entryDateMap[e.date] = e;
        }
      });

      map[emp] = {
        empName: emp,
        branch: loc,
        entriesMap: entryDateMap,
        rawEntries: calc.processedEntries,
        calcResult: calc
      };
    });

    return Object.values(map);
  }, [records, currentMonthVal]);

  // Unique staff list for dropdown filter
  const uniqueStaffList = useMemo(() => {
    return Array.from(new Set(staffAttendanceData.map(s => s.empName)));
  }, [staffAttendanceData]);

  // Filtered staff list
  const filteredStaffList = useMemo(() => {
    return staffAttendanceData.filter(staff => {
      if (selectedBranch !== 'ALL' && staff.branch !== selectedBranch) return false;
      if (selectedStaff !== 'ALL' && staff.empName !== selectedStaff) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return staff.empName.toLowerCase().includes(q) || staff.branch.toLowerCase().includes(q);
      }
      return true;
    });
  }, [staffAttendanceData, selectedBranch, selectedStaff, searchQuery]);

  // Summary KPIs for current month
  const aggregateKPIs = useMemo(() => {
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalAllowedWeekOffs = 0;
    let totalExtraWeekOffs = 0;
    let totalDeductions = 0;

    filteredStaffList.forEach(s => {
      totalPresent += s.calcResult.presentDays;
      totalAbsent += s.calcResult.absentDays;
      totalAllowedWeekOffs += s.calcResult.allowedWeekOffsUsed;
      totalExtraWeekOffs += s.calcResult.extraWeekOffs;
      totalDeductions += s.calcResult.salaryDeduction;
    });

    return {
      totalPresent,
      totalAbsent,
      totalAllowedWeekOffs,
      totalExtraWeekOffs,
      totalDeductions,
      staffCount: filteredStaffList.length
    };
  }, [filteredStaffList]);

  // Export Attendance to Excel
  const handleExportExcel = () => {
    if (filteredStaffList.length === 0) {
      triggerToast('No Data', 'No attendance records available for export', true);
      return;
    }

    const rows: any[] = [];
    filteredStaffList.forEach(s => {
      const row: any = {
        'Employee Name': s.empName,
        'Branch': s.branch,
        'Month': currentMonthVal,
        'Present Days': s.calcResult.presentDays,
        'Raw Absents': s.calcResult.rawAbsentDays,
        'Allowed Week-Offs (Max 4)': s.calcResult.allowedWeekOffsUsed,
        'Extra Week-Offs (Auto Absent)': s.calcResult.extraWeekOffs,
        'Total Deductible Days': s.calcResult.totalAbsentDays,
        'Salary Deduction (₹)': s.calcResult.salaryDeduction,
      };

      // Add individual days
      for (let day = 1; day <= daysCount; day++) {
        const dayStr = `${currentMonthVal}-${String(day).padStart(2, '0')}`;
        const entry = s.entriesMap[dayStr];
        row[`Day ${day}`] = entry ? entry.status : 'N/A';
      }

      rows.push(row);
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Attendance');
    XLSX.writeFile(workbook, `Attendance_${currentMonthVal}.xlsx`);
    triggerToast('Attendance Exported', `Downloaded attendance report for ${currentMonthVal}`);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 admin-glass-panel p-5 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="specular-sheen-top" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 shadow-lg flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-[#080d2a] rounded-[14px] flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              Monthly Attendance Tracker
              <span className="text-xs px-2.5 py-0.5 rounded-full admin-glass-tile text-cyan-300 font-bold border border-cyan-400/30">
                4 Week-Offs Rule Active
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Monitor daily attendance, allowed week-offs (max 4/month), auto-absent triggers & salary deductions.
            </p>
          </div>
        </div>

        {/* Month Selector & Controls */}
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <div className="flex items-center admin-glass-tile border border-white/15 rounded-xl p-1 shadow-inner">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 text-xs font-mono font-black text-cyan-300">
              {new Date(currentMonthVal + '-01').toLocaleString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-600/20 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="admin-glass-tile p-4 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden">
          <div className="specular-sheen-top" />
          <div className="flex items-center justify-between text-slate-400 mb-1 relative z-10">
            <span className="text-xs font-semibold">Total Present Days</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono relative z-10">
            {aggregateKPIs.totalPresent}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 relative z-10">Across {aggregateKPIs.staffCount} active staff</p>
        </div>

        <div className="admin-glass-tile p-4 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden">
          <div className="specular-sheen-top" />
          <div className="flex items-center justify-between text-slate-400 mb-1 relative z-10">
            <span className="text-xs font-semibold">Direct Absents</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono relative z-10">
            {aggregateKPIs.totalAbsent}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 relative z-10">Marked absent directly</p>
        </div>

        <div className="admin-glass-tile p-4 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden">
          <div className="specular-sheen-top" />
          <div className="flex items-center justify-between text-slate-400 mb-1 relative z-10">
            <span className="text-xs font-semibold">Allowed Week-Offs</span>
            <Coffee className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-300 font-mono relative z-10">
            {aggregateKPIs.totalAllowedWeekOffs}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 relative z-10">Within 4 allowed quota</p>
        </div>

        <div className="admin-glass-tile p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 shadow-lg relative overflow-hidden">
          <div className="specular-sheen-top" />
          <div className="flex items-center justify-between text-amber-300 mb-1 relative z-10">
            <span className="text-xs font-semibold">Extra Week-Offs</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono relative z-10">
            {aggregateKPIs.totalExtraWeekOffs}
          </div>
          <p className="text-[10px] text-amber-300/80 mt-1 relative z-10">Auto Absent (Deductible)</p>
        </div>

        <div className="admin-glass-tile p-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 shadow-lg col-span-2 sm:col-span-1 relative overflow-hidden">
          <div className="specular-sheen-top" />
          <div className="flex items-center justify-between text-rose-300 mb-1 relative z-10">
            <span className="text-xs font-semibold">Total Deductions</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono relative z-10">
            ₹{formatMoney(aggregateKPIs.totalDeductions)}
          </div>
          <p className="text-[10px] text-rose-300/80 mt-1 relative z-10">From total absent days</p>
        </div>
      </div>

      {/* Policy Notice Box */}
      <div className="admin-glass-tile p-4 rounded-2xl border border-cyan-400/20 flex items-start gap-3 relative overflow-hidden shadow-lg">
        <div className="specular-sheen-top" />
        <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5 relative z-10" />
        <div className="text-xs text-slate-300 space-y-1 relative z-10">
          <p className="font-bold text-white">4 Allowed Week-Offs Business Policy</p>
          <p>
            Each staff member receives up to <span className="text-cyan-300 font-semibold">4 allowed week-offs per month</span>. 
            Any additional week-off beyond 4 is automatically flagged as <span className="text-amber-400 font-bold">Auto Absent</span>, 
            and calculated as a deductible day from base salary.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 admin-glass-panel p-3.5 rounded-2xl border border-white/10 relative overflow-hidden shadow-xl">
        <div className="specular-sheen-top" />
        <div className="relative flex-1 min-w-[200px] z-10">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee or branch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/15 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-cyan-400 transition"
          />
        </div>

        <div className="flex items-center gap-2 z-10">
          <Building className="w-4 h-4 text-slate-400" />
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-xs text-white focus:outline-hidden focus:border-cyan-400 cursor-pointer"
          >
            <option value="ALL" className="bg-[#0b1238]">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.name} className="bg-[#0b1238]">{b.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 z-10">
          <User className="w-4 h-4 text-slate-400" />
          <select
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-xs text-white focus:outline-hidden focus:border-cyan-400 cursor-pointer"
          >
            <option value="ALL" className="bg-[#0b1238]">All Staff</option>
            {uniqueStaffList.map(s => (
              <option key={s} value={s} className="bg-[#0b1238]">{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Attendance Matrix / Visual Grid */}
      <div className="admin-glass-panel rounded-3xl border border-white/10 shadow-2xl overflow-hidden relative">
        <div className="specular-sheen-top" />
        <div className="p-4 border-b border-white/10 flex items-center justify-between relative z-10">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
            <span>Staff Attendance Matrix ({currentMonthVal})</span>
            <span className="px-2 py-0.5 rounded-full admin-glass-tile text-indigo-300 text-xs font-mono border border-white/15">
              {filteredStaffList.length} staff members
            </span>
          </h3>

          {/* Legend */}
          <div className="hidden sm:flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block shadow-xs" /> Present (P)
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded bg-rose-500 inline-block shadow-xs" /> Absent (A)
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded bg-indigo-500 inline-block shadow-xs" /> Week-Off (WO)
            </span>
            <span className="flex items-center gap-1.5 text-amber-300">
              <span className="w-3 h-3 rounded bg-amber-500 inline-block shadow-xs" /> Auto-Absent (WO&gt;4)
            </span>
          </div>
        </div>

        {filteredStaffList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 relative z-10">
            <CalendarIcon className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p className="font-bold text-slate-300">No attendance records found for this period</p>
            <p className="text-xs mt-1">Staff daily submissions for {currentMonthVal} will appear here live.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar relative z-10">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white/5 text-slate-300 font-bold border-b border-white/10">
                  <th className="p-3 sticky left-0 z-20 bg-[#0a1033] min-w-[180px]">Employee / Branch</th>
                  <th className="p-2 text-center text-emerald-300 bg-emerald-950/20">Pres</th>
                  <th className="p-2 text-center text-rose-300 bg-rose-950/20">Abs</th>
                  <th className="p-2 text-center text-indigo-300 bg-indigo-950/20">WO (≤4)</th>
                  <th className="p-2 text-center text-amber-300 bg-amber-950/20">Auto Abs</th>
                  <th className="p-2 text-center text-rose-400 bg-rose-950/20">Deduction</th>
                  {Array.from({ length: daysCount }, (_, i) => i + 1).map(day => (
                    <th key={day} className="p-2 text-center min-w-[36px] font-mono border-l border-white/5">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredStaffList.map(staff => {
                  const calc = staff.calcResult;
                  return (
                    <tr key={staff.empName} className="hover:bg-white/5 transition">
                      <td className="p-3 sticky left-0 z-10 bg-[#0a1033] border-r border-white/10">
                        <div className="font-bold text-white text-xs">{staff.empName}</div>
                        <div className="text-[10px] text-slate-400">{staff.branch}</div>
                      </td>

                      <td className="p-2 text-center font-mono font-bold text-emerald-400 bg-emerald-950/10">
                        {calc.presentDays}
                      </td>
                      <td className="p-2 text-center font-mono font-bold text-rose-400 bg-rose-950/10">
                        {calc.rawAbsentDays}
                      </td>
                      <td className="p-2 text-center font-mono font-bold text-indigo-300 bg-indigo-950/10">
                        {calc.allowedWeekOffsUsed}
                      </td>
                      <td className="p-2 text-center font-mono font-bold text-amber-400 bg-amber-950/10">
                        {calc.extraWeekOffs > 0 ? (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40">
                            +{calc.extraWeekOffs}
                          </span>
                        ) : '0'}
                      </td>
                      <td className="p-2 text-center font-mono font-bold text-rose-400 bg-rose-950/10">
                        ₹{formatMoney(calc.salaryDeduction)}
                      </td>

                      {Array.from({ length: daysCount }, (_, i) => i + 1).map(day => {
                        const dayStr = `${currentMonthVal}-${String(day).padStart(2, '0')}`;
                        const entry = staff.entriesMap[dayStr];
                        const status = entry?.status;

                        let badgeColor = 'text-slate-600';
                        let label = '·';

                        if (status === 'Present') {
                          badgeColor = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
                          label = 'P';
                        } else if (status === 'Absent') {
                          badgeColor = 'bg-rose-500/20 text-rose-300 border border-rose-500/40';
                          label = 'A';
                        } else if (status === 'Week Off') {
                          badgeColor = 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40';
                          label = 'WO';
                        } else if (status === 'Auto Absent') {
                          badgeColor = 'bg-amber-500/30 text-amber-300 border border-amber-400/60 font-black animate-pulse';
                          label = 'X';
                        }

                        return (
                          <td key={day} className="p-1.5 text-center border-l border-white/5">
                            <span className={`inline-block w-6 h-6 leading-6 text-[10px] font-mono font-bold rounded ${badgeColor}`}>
                              {label}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
