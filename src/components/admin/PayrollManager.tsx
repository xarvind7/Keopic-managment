import React, { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Printer, 
  Search, 
  Send, 
  ShieldCheck, 
  Sparkles, 
  Building, 
  Calendar, 
  User, 
  X,
  FileText,
  Download,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { performCalculations, formatMoney } from '../../utils/calculations';
import { exportAndDownloadPDF } from '../../utils/exportPdf';
import { getTotalHoursForEntries } from '../WorkHoursCard';

import { saveUserDataToCloud, subscribeToUserData } from '../../lib/supabase';

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

interface PayrollManagerProps {
  records: CloudRecordItem[];
  selectedMonthFilter: string;
  triggerToast: (title: string, msg?: string, isError?: boolean) => void;
  onInspectRecord: (record: CloudRecordItem) => void;
}

interface PayrollStatusItem {
  status: 'pending' | 'approved' | 'disbursed';
  utr?: string;
  paymentDate?: string;
  paymentMode?: string;
  notes?: string;
}

interface PayrollStatusMap {
  [recordId: string]: PayrollStatusItem;
}

const STORAGE_KEY = 'keopic_admin_payroll_statuses_v1';

export default function PayrollManager({
  records,
  selectedMonthFilter,
  triggerToast,
  onInspectRecord
}: PayrollManagerProps) {
  const [payrollStatuses, setPayrollStatuses] = useState<PayrollStatusMap>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'pending' | 'approved' | 'disbursed'>('ALL');
  const [selectedVoucherRecord, setSelectedVoucherRecord] = useState<CloudRecordItem | null>(null);

  // Subscribe to Supabase for live payroll statuses
  useEffect(() => {
    const unsub = subscribeToUserData('admin_payroll_statuses', (data: any) => {
      if (data && data.statuses) {
        setPayrollStatuses(data.statuses);
      }
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Helper to update and save status to Supabase
  const updatePayrollStatus = (recId: string, updates: Partial<PayrollStatusItem>) => {
    setPayrollStatuses(prev => {
      const updated = {
        ...prev,
        [recId]: {
          ...prev[recId],
          ...updates
        }
      };
      saveUserDataToCloud('admin_payroll_statuses', { statuses: updated, updatedAt: Date.now() });
      return updated;
    });
  };

  // Calculations for each record
  const payrollItems = useMemo(() => {
    return records.map(rec => {
      const data = rec.data;
      const empName = data.meta?.empName || 'Staff Member';
      const locVal = data.meta?.locVal || 'Connaught Place';
      const monthVal = data.meta?.monthVal || 'N/A';
      const baseSalary = data.meta?.baseSalary || 17000;
      const profilePic = data.meta?.profilePic;
      const entries = data.entries || [];
      const targets = data.targets || [];
      const payments = data.payments || [];

      const calc = performCalculations(entries, targets, payments, baseSalary, monthVal);
      const workHours = getTotalHoursForEntries(entries);

      const savedStatus = payrollStatuses[rec.id] || { status: 'pending', utr: '', paymentMode: 'Bank Transfer' };

      return {
        record: rec,
        empName,
        locVal,
        monthVal,
        profilePic,
        grossSales: calc.grossSales,
        baseSalary: calc.netEarnedSalary,
        totalIncentive: calc.totalIncentive,
        totalTargets: calc.totalTargets,
        overtimePay: calc.overtimePay,
        formattedTotalExtra: calc.formattedTotalExtra,
        formattedPayableExtra: calc.formattedPayableExtra,
        perHourSalary: calc.perHourSalary,
        finalPayable: calc.finalPayable,
        totalPaidToSir: calc.totalPaid,
        netStoreBalance: calc.netBalance,
        totalWorkHoursFormatted: workHours.formatted,
        presentDaysCount: calc.presentDays,
        status: savedStatus.status,
        utr: savedStatus.utr || '',
        paymentDate: savedStatus.paymentDate || new Date().toISOString().split('T')[0],
        paymentMode: savedStatus.paymentMode || 'Bank Transfer'
      };
    });
  }, [records, payrollStatuses]);

  // Filtered payroll items
  const filteredItems = useMemo(() => {
    return payrollItems.filter(item => {
      const matchesSearch = 
        !searchQuery || 
        item.empName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.locVal.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.utr && item.utr.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesMonth = selectedMonthFilter === 'ALL' || item.monthVal === selectedMonthFilter;
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;

      return matchesSearch && matchesMonth && matchesStatus;
    });
  }, [payrollItems, searchQuery, selectedMonthFilter, statusFilter]);

  // Metrics
  const metrics = useMemo(() => {
    let totalBudget = 0;
    let totalDisbursed = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    let disbursedCount = 0;

    filteredItems.forEach(item => {
      totalBudget += item.finalPayable;
      if (item.status === 'disbursed') {
        totalDisbursed += item.finalPayable;
        disbursedCount++;
      } else if (item.status === 'approved') {
        approvedCount++;
      } else {
        pendingCount++;
      }
    });

    return {
      totalBudget,
      totalDisbursed,
      pendingCount,
      approvedCount,
      disbursedCount,
      totalCount: filteredItems.length
    };
  }, [filteredItems]);

  // Toggle status cycle: pending -> approved -> disbursed -> pending
  const handleToggleStatus = (recordId: string, currentStatus: 'pending' | 'approved' | 'disbursed') => {
    const nextMap: Record<'pending' | 'approved' | 'disbursed', 'pending' | 'approved' | 'disbursed'> = {
      pending: 'approved',
      approved: 'disbursed',
      disbursed: 'pending'
    };
    const nextStatus = nextMap[currentStatus];

    setPayrollStatuses(prev => ({
      ...prev,
      [recordId]: {
        ...(prev[recordId] || { paymentMode: 'Bank Transfer' }),
        status: nextStatus,
        paymentDate: nextStatus === 'disbursed' ? new Date().toISOString().split('T')[0] : prev[recordId]?.paymentDate
      }
    }));

    if (nextStatus === 'disbursed') {
      const targetRecord = records.find(r => r.id === recordId);
      if (targetRecord) {
        const data = targetRecord.data;
        try {
          exportAndDownloadPDF(data.entries || [], data.targets || [], data.payments || [], {
            empName: data.meta?.empName || 'Staff Member',
            monthVal: data.meta?.monthVal || 'N/A',
            locVal: data.meta?.locVal || 'Main Counter',
            baseSalary: data.meta?.baseSalary || 17000
          });
        } catch (e) {
          console.error('Failed to download PDF salary slip:', e);
        }
      }
    }

    triggerToast(
      'Payout Status Updated',
      `Updated payout status to '${nextStatus.toUpperCase()}'${nextStatus === 'disbursed' ? ' & downloaded Salary Slip PDF' : ''}`
    );
  };

  // Direct Mark as Paid & Clear Payment handler
  const handleMarkPaidAndClear = (recordId: string, empName: string, amount: number, recordItem?: CloudRecordItem) => {
    const today = new Date().toISOString().split('T')[0];
    const existingUtr = payrollStatuses[recordId]?.utr;
    const defaultUtr = existingUtr && existingUtr.trim() !== '' ? existingUtr : `CLR-${Date.now().toString().slice(-6)}`;

    setPayrollStatuses(prev => ({
      ...prev,
      [recordId]: {
        ...(prev[recordId] || { paymentMode: 'Bank Transfer' }),
        status: 'disbursed',
        utr: defaultUtr,
        paymentDate: today
      }
    }));

    // Download salary slip PDF automatically
    const targetRecord = recordItem || records.find(r => r.id === recordId);
    if (targetRecord) {
      const data = targetRecord.data;
      try {
        exportAndDownloadPDF(data.entries || [], data.targets || [], data.payments || [], {
          empName: data.meta?.empName || empName || 'Staff Member',
          monthVal: data.meta?.monthVal || 'N/A',
          locVal: data.meta?.locVal || 'Main Counter',
          baseSalary: data.meta?.baseSalary || 17000
        });
      } catch (err) {
        console.error('Error auto-exporting salary slip PDF:', err);
      }
    }

    triggerToast(
      'Payment Cleared & Salary Slip Downloaded!',
      `Payout of ₹${formatMoney(amount)} for ${empName} has been cleared, marked as PAID, and PDF Salary Slip downloaded.`
    );
  };

  // Update UTR
  const handleUtrChange = (recordId: string, utrValue: string) => {
    setPayrollStatuses(prev => ({
      ...prev,
      [recordId]: {
        ...(prev[recordId] || { status: 'pending', paymentMode: 'Bank Transfer' }),
        utr: utrValue
      }
    }));
  };

  // Bulk mark all shown items approved
  const handleBulkApprove = () => {
    if (filteredItems.length === 0) return;
    const updated = { ...payrollStatuses };
    filteredItems.forEach(item => {
      if (item.status === 'pending') {
        updated[item.record.id] = {
          ...(updated[item.record.id] || { paymentMode: 'Bank Transfer' }),
          status: 'approved'
        };
      }
    });
    setPayrollStatuses(updated);
    triggerToast('Bulk Approval Completed', `Approved payouts for ${filteredItems.length} staff records`);
  };

  // Bulk mark all pending / approved items as Paid & Cleared
  const handleBulkClearPending = () => {
    const pendingItems = filteredItems.filter(item => item.status !== 'disbursed');
    if (pendingItems.length === 0) {
      triggerToast('No Pending Items', 'All displayed payroll items are already paid & cleared!');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const updated = { ...payrollStatuses };

    pendingItems.forEach(item => {
      const existingUtr = updated[item.record.id]?.utr;
      const defaultUtr = existingUtr && existingUtr.trim() !== '' ? existingUtr : `CLR-${Math.floor(100000 + Math.random() * 900000)}`;
      updated[item.record.id] = {
        ...(updated[item.record.id] || { paymentMode: 'Bank Transfer' }),
        status: 'disbursed',
        utr: defaultUtr,
        paymentDate: today
      };

      // Auto-export PDF for each cleared record
      try {
        const data = item.record.data;
        exportAndDownloadPDF(data.entries || [], data.targets || [], data.payments || [], {
          empName: item.empName,
          monthVal: item.monthVal,
          locVal: item.locVal,
          baseSalary: item.baseSalary
        });
      } catch (err) {
        console.error('Failed to export salary slip in bulk clear:', err);
      }
    });

    setPayrollStatuses(updated);
    triggerToast(
      'All Pending Payments Cleared!',
      `Cleared and marked ${pendingItems.length} pending payout(s) as PAID, and downloaded Salary Slips.`
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Payroll Budget */}
        <div className="admin-glass-tile rounded-3xl p-5 border border-white/10 shadow-xl relative overflow-hidden">
          <div className="specular-sheen-top" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Net Payable</p>
              <h3 className="text-xl font-black text-amber-300 font-mono mt-1">₹{formatMoney(metrics.totalBudget)}</h3>
              <p className="text-[11px] text-slate-400 mt-1 font-semibold">{metrics.totalCount} Staff Payroll Submissions</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Disbursed Amount */}
        <div className="admin-glass-tile rounded-3xl p-5 border border-white/10 shadow-xl relative overflow-hidden">
          <div className="specular-sheen-top" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Disbursed / Paid</p>
              <h3 className="text-xl font-black text-emerald-400 font-mono mt-1">₹{formatMoney(metrics.totalDisbursed)}</h3>
              <p className="text-[11px] text-emerald-400/80 mt-1 font-semibold">{metrics.disbursedCount} Disbursed Account(s)</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="admin-glass-tile rounded-3xl p-5 border border-white/10 shadow-xl relative overflow-hidden">
          <div className="specular-sheen-top" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Pending Review</p>
              <h3 className="text-xl font-black text-amber-400 font-mono mt-1">{metrics.pendingCount} Payouts</h3>
              <p className="text-[11px] text-amber-400/80 mt-1 font-semibold">Awaiting Admin Approval</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Approved Ready for Disbursal */}
        <div className="admin-glass-tile rounded-3xl p-5 border border-white/10 shadow-xl relative overflow-hidden">
          <div className="specular-sheen-top" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Approved for Payment</p>
              <h3 className="text-xl font-black text-cyan-300 font-mono mt-1">{metrics.approvedCount} Payouts</h3>
              <p className="text-[11px] text-cyan-300/80 mt-1 font-semibold">Ready for Bank Transfer / UPI</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

      </div>

      {/* Search & Filter Header Bar */}
      <div className="admin-glass-panel rounded-3xl p-4 sm:p-5 border border-white/10 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="specular-sheen-top" />
        
        {/* Search Input */}
        <div className="relative flex-1 z-10">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee, counter location, or UTR number..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/15 rounded-2xl text-xs font-semibold text-white placeholder-slate-400 focus:outline-hidden focus:border-cyan-400 transition"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 z-10">
          <div className="admin-glass-tile p-1 rounded-2xl border border-white/10 flex items-center gap-1 overflow-x-auto custom-scrollbar max-w-full">
            {(['ALL', 'pending', 'approved', 'disbursed'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer capitalize shrink-0 ${
                  statusFilter === st
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st === 'ALL' ? 'All Statuses' : st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto mt-1 sm:mt-0">
            <button
              onClick={handleBulkApprove}
              className="flex-1 sm:flex-none px-3 sm:px-3.5 py-2 rounded-2xl bg-cyan-500/15 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              title="Approve all pending payouts in list"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Approve All Pending</span>
            </button>

            <button
              onClick={handleBulkClearPending}
              className="flex-1 sm:flex-none px-3 sm:px-3.5 py-2 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/40 text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
              title="Mark all pending payouts as Paid & Cleared"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark All Paid & Cleared</span>
            </button>
          </div>
        </div>

      </div>

      {/* Main Payroll Table */}
      <div className="admin-glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl relative">
        <div className="specular-sheen-top" />
        <div className="p-5 border-b border-white/10 flex items-center justify-between relative z-10">
          <div>
            <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-400" />
              <span>Staff Salary & Incentive Payout Disbursal Register</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Click status badge to cycle status or enter UTR payment reference code</p>
          </div>
          <span className="px-3 py-1 rounded-full admin-glass-tile text-cyan-300 font-mono text-xs font-bold border border-white/15">
            {filteredItems.length} Payroll Items
          </span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs relative z-10">
            No payroll entries match your active filters.
          </div>
        ) : (
          <div className="overflow-x-auto relative z-10">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-white/5 text-[11px] font-extrabold uppercase tracking-wider text-slate-300 border-b border-white/10">
                  <th className="py-4 px-6">Employee / Branch</th>
                  <th className="py-4 px-4 text-center">Work Hours (घंटे)</th>
                  <th className="py-4 px-4 text-right">Base Salary</th>
                  <th className="py-4 px-4 text-right">Commission</th>
                  <th className="py-4 px-4 text-right">Overtime Pay (9h Rate)</th>
                  <th className="py-4 px-4 text-right">Bonus</th>
                  <th className="py-4 px-4 text-right">Net Payable</th>
                  <th className="py-4 px-6 text-center">Payout Status</th>
                  <th className="py-4 px-6">Payment Ref / UTR</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredItems.map((item) => {
                  const isPending = item.status === 'pending';
                  const isApproved = item.status === 'approved';
                  const isDisbursed = item.status === 'disbursed';

                  return (
                    <tr key={item.record.id} className="hover:bg-white/5 transition group">
                      {/* Employee Info */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          {item.profilePic ? (
                            <img 
                              src={item.profilePic} 
                              alt={item.empName} 
                              className="w-9 h-9 rounded-xl object-cover border border-cyan-500/40 shadow-md shrink-0" 
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 p-0.5 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md">
                              <div className="w-full h-full bg-[#080d2a] rounded-[10px] flex items-center justify-center">
                                {item.empName.charAt(0).toUpperCase()}
                              </div>
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-white text-sm group-hover:text-cyan-300 transition">{item.empName}</div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {item.locVal} • <span className="text-indigo-300">{item.monthVal}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Work Hours */}
                      <td className="py-4 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-xl admin-glass-tile text-cyan-300 border border-white/15 text-xs font-mono font-black inline-block shadow-sm">
                          ⏱️ {item.totalWorkHoursFormatted}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                          ({item.presentDaysCount} days present)
                        </span>
                      </td>

                      {/* Base Salary */}
                      <td className="py-4 px-4 text-right font-mono font-bold text-slate-200">
                        ₹{formatMoney(item.baseSalary)}
                      </td>

                      {/* Incentive */}
                      <td className="py-4 px-4 text-right font-mono font-bold text-emerald-400">
                        +₹{formatMoney(item.totalIncentive, 2)}
                      </td>

                      {/* Overtime Pay */}
                      <td className="py-4 px-4 text-right font-mono">
                        <div className="font-bold text-amber-300">+₹{formatMoney(item.overtimePay, 2)}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.formattedPayableExtra || '0h 0m'} paid ({item.formattedTotalExtra} logged) @ ₹{item.perHourSalary.toFixed(1)}/h
                        </div>
                      </td>

                      {/* Target Bonus */}
                      <td className="py-4 px-4 text-right font-mono font-bold text-purple-400">
                        +₹{formatMoney(item.totalTargets)}
                      </td>

                      {/* Net Payable */}
                      <td className="py-4 px-4 text-right font-mono font-black text-amber-300 text-sm">
                        ₹{formatMoney(item.finalPayable, 2)}
                      </td>

                      {/* Payout Status Badge Button */}
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => handleToggleStatus(item.record.id, item.status)}
                          className={`px-3 py-1.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition cursor-pointer border flex items-center justify-center gap-1.5 mx-auto ${
                            isDisbursed
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 shadow-lg shadow-emerald-500/10'
                              : isApproved
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30 shadow-lg shadow-cyan-500/10'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 shadow-lg shadow-amber-500/10'
                          }`}
                          title="Click to cycle status: Pending -> Approved -> Disbursed"
                        >
                          <span className={`w-2 h-2 rounded-full ${
                            isDisbursed ? 'bg-emerald-400 animate-pulse' : isApproved ? 'bg-cyan-400' : 'bg-amber-400'
                          }`}></span>
                          <span>{item.status}</span>
                        </button>
                      </td>

                      {/* UTR Input */}
                      <td className="py-4 px-6">
                        <input
                          type="text"
                          value={item.utr}
                          onChange={(e) => handleUtrChange(item.record.id, e.target.value)}
                          placeholder="Enter UTR / Ref #"
                          className="w-full px-3 py-1.5 bg-white/5 border border-white/15 rounded-xl text-xs font-mono text-cyan-300 placeholder-slate-500 focus:outline-hidden focus:border-cyan-400 transition"
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {!isDisbursed ? (
                            <button
                              onClick={() => handleMarkPaidAndClear(item.record.id, item.empName, item.finalPayable)}
                              className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-[11px] transition cursor-pointer shadow-md shadow-emerald-500/20 flex items-center gap-1 shrink-0"
                              title="Clear pending payment & mark as paid"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Clear Payment</span>
                            </button>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Cleared</span>
                            </span>
                          )}

                          <button
                            onClick={() => setSelectedVoucherRecord(item.record)}
                            className="p-2 rounded-xl admin-glass-tile hover:border-purple-400 text-purple-300 hover:text-white border border-white/15 text-xs font-bold transition cursor-pointer shadow-md"
                            title="Generate Printable Salary Slip Voucher"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onInspectRecord(item.record)}
                            className="p-2 rounded-xl admin-glass-tile hover:border-cyan-400 text-cyan-300 hover:text-white border border-white/15 text-xs font-bold transition cursor-pointer shadow-md"
                            title="Inspect Detailed Ledger"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Salary Slip / Payment Voucher Modal */}
      <AnimatePresence>
        {selectedVoucherRecord && (
          <div className="fixed inset-0 z-50 glass-scrim flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="admin-glass-panel border border-white/15 rounded-3xl p-6 sm:p-8 max-w-2xl w-full text-slate-100 shadow-2xl relative overflow-hidden"
            >
              <div className="specular-sheen-top" />
              {(() => {
                const data = selectedVoucherRecord.data;
                const empName = data.meta?.empName || 'Staff Member';
                const locVal = data.meta?.locVal || 'Main Counter';
                const monthVal = data.meta?.monthVal || 'N/A';
                const baseSalary = data.meta?.baseSalary || 17000;
                const entries = data.entries || [];
                const targets = data.targets || [];
                const payments = data.payments || [];

                const calc = performCalculations(entries, targets, payments, baseSalary, monthVal);
                const statusObj = payrollStatuses[selectedVoucherRecord.id] || { status: 'pending', utr: 'N/A' };

                const handlePrintVoucher = () => {
                  window.print();
                };

                const handleDownloadPDFVoucher = () => {
                  exportAndDownloadPDF(entries, targets, payments, {
                    empName,
                    monthVal,
                    locVal,
                    baseSalary
                  });
                  triggerToast('Salary Voucher Downloaded', `PDF Salary Slip saved for ${empName}`);
                };

                return (
                  <div className="space-y-6 relative z-10">
                    {/* Voucher Header */}
                    <div className="flex items-start justify-between border-b border-white/10 pb-4">
                      <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-extrabold uppercase border border-amber-500/20 mb-2">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Official Keopic Photobooth Salary Voucher</span>
                        </div>
                        <h2 className="text-xl font-black text-white">{empName}</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Counter: {locVal} • Month: {monthVal}</p>
                      </div>
                      <button
                        onClick={() => setSelectedVoucherRecord(null)}
                        className="p-2 rounded-xl admin-glass-tile hover:bg-white/10 text-slate-300 transition cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Voucher Details Card */}
                    <div className="admin-glass-tile p-5 rounded-2xl border border-white/10 space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-slate-400 font-medium block">Payout Status:</span>
                          <span className={`font-black uppercase tracking-wider ${
                            statusObj.status === 'disbursed' ? 'text-emerald-400' : statusObj.status === 'approved' ? 'text-cyan-300' : 'text-amber-400'
                          }`}>
                            {statusObj.status}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block">Transaction Ref / UTR:</span>
                          <span className="font-mono font-bold text-cyan-300">{statusObj.utr || 'Pending Ref'}</span>
                        </div>
                      </div>

                      <div className="border-t border-white/10 pt-4 space-y-2.5 text-xs">
                        <div className="flex justify-between text-slate-300">
                          <span>Basic Fixed Salary:</span>
                          <span className="font-mono font-bold">₹{formatMoney(calc.netEarnedSalary)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-400 font-semibold">
                          <span>Sales Incentive Commissions:</span>
                          <span className="font-mono font-bold">+₹{formatMoney(calc.totalIncentive, 2)}</span>
                        </div>
                        <div className="flex justify-between text-amber-300 font-semibold">
                          <span>Extra Hours Overtime ({calc.formattedPayableExtra || '0h 0m'} paid @ ₹{calc.perHourSalary.toFixed(1)}/h | {calc.formattedTotalExtra} logged):</span>
                          <span className="font-mono font-bold">+₹{formatMoney(calc.overtimePay, 2)}</span>
                        </div>
                        <div className="flex justify-between text-purple-400 font-semibold">
                          <span>Target Milestone Bonuses:</span>
                          <span className="font-mono font-bold">+₹{formatMoney(calc.totalTargets)}</span>
                        </div>
                        <div className="flex justify-between text-amber-300 text-sm font-black pt-2 border-t border-white/10">
                          <span>NET PAYABLE DISBURSAL:</span>
                          <span className="font-mono">₹{formatMoney(calc.finalPayable, 2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                      {statusObj.status !== 'disbursed' && (
                        <button
                          onClick={() => {
                            handleMarkPaidAndClear(selectedVoucherRecord.id, empName, calc.finalPayable);
                          }}
                          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/30"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Mark as Paid & Clear Payment (₹{formatMoney(calc.finalPayable)})</span>
                        </button>
                      )}

                      <button
                        onClick={handleDownloadPDFVoucher}
                        className="px-4 py-2.5 rounded-2xl admin-glass-tile hover:border-cyan-400 border border-white/15 text-cyan-300 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Full PDF Voucher</span>
                      </button>
                    </div>

                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
