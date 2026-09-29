import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Search, 
  Filter, 
  Building, 
  Calendar, 
  Users, 
  Package, 
  CreditCard, 
  CheckCircle2, 
  Sparkles,
  FileSpreadsheet,
  Database
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { performCalculations, formatMoney } from '../../utils/calculations';
import { exportAndDownloadPDF } from '../../utils/exportPdf';
import { StaffAccount } from '../AuthLoginModal';
import { BranchItem, ProductStockItem } from '../../types';
import { exportCompleteJsonBackup } from '../../utils/jsonBackup';

interface EnterpriseReportsManagerProps {
  records: any[];
  staffAccounts: StaffAccount[];
  branches: BranchItem[];
  stockItems: ProductStockItem[];
  triggerToast: (title: string, msg?: string, isError?: boolean) => void;
}

type ReportType = 
  | 'employee' 
  | 'branch' 
  | 'sales' 
  | 'stock' 
  | 'attendance' 
  | 'salary' 
  | 'incentive' 
  | 'inventory' 
  | 'cash_settlement';

export default function EnterpriseReportsManager({
  records,
  staffAccounts,
  branches,
  stockItems,
  triggerToast
}: EnterpriseReportsManagerProps) {
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('sales');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('ALL');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState('ALL');

  // List of available months in records
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      const monthVal = r.data?.meta?.monthVal;
      if (monthVal) set.add(monthVal);
    });
    return Array.from(set).sort().reverse();
  }, [records]);

  // Aggregate Data based on Report Type
  const reportData = useMemo(() => {
    const rows: any[] = [];

    records.forEach(rec => {
      const data = rec.data || {};
      const meta = data.meta || {};
      const empName = meta.empName || 'Staff';
      const locVal = meta.locVal || 'Main Counter';
      const monthVal = meta.monthVal || '2026-07';
      const baseSalary = meta.baseSalary || 17000;

      // Search & Branch & Month Filters
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || empName.toLowerCase().includes(q) || locVal.toLowerCase().includes(q) || rec.id.toLowerCase().includes(q);
      const matchesBranch = selectedBranchFilter === 'ALL' || locVal === selectedBranchFilter;
      const matchesMonth = selectedMonthFilter === 'ALL' || monthVal === selectedMonthFilter;

      if (!matchesSearch || !matchesBranch || !matchesMonth) return;

      const entries = data.entries || [];
      const targets = data.targets || [];
      const payments = data.payments || [];

      const calc = performCalculations(entries, targets, payments, baseSalary, monthVal);

      let standUnits = 0;
      let magnetUnits = 0;
      let frameRev = 0;
      let presentCount = 0;

      entries.forEach((e: any) => {
        standUnits += Number(e.stand || 0);
        magnetUnits += Number(e.magnet || 0);
        frameRev += Number(e.frame || 0);
        if (e.status === 'Present') presentCount += 1;
      });

      if (selectedReportType === 'employee' || selectedReportType === 'sales') {
        rows.push({
          'Employee Name': empName,
          'Branch': locVal,
          'Month': monthVal,
          'Days Logged': entries.length,
          'Present Days': presentCount,
          'Stand Units (₹200)': standUnits,
          'Magnet Units (₹250)': magnetUnits,
          'Frame Revenue (₹)': frameRev,
          'Gross Revenue (₹)': calc.grossSales,
          'Incentive Earned (₹)': calc.totalIncentive,
          'Net Salary Payable (₹)': calc.finalPayable
        });
      } else if (selectedReportType === 'salary' || selectedReportType === 'incentive') {
        rows.push({
          'Employee Name': empName,
          'Branch Location': locVal,
          'Month': monthVal,
          'Base Monthly Salary (₹)': baseSalary,
          'Earned Base Salary (₹)': calc.netEarnedSalary,
          'Sales Incentive (₹)': calc.totalIncentive,
          'Target Bonuses (₹)': calc.totalTargets,
          'Total Earnings (₹)': calc.netEarnedSalary + calc.totalIncentive + calc.totalTargets,
          'Advance Money Deducted (₹)': calc.totalAdvance,
          'Net Salary Payable (₹)': calc.finalPayable
        });
      } else if (selectedReportType === 'cash_settlement') {
        rows.push({
          'Employee Name': empName,
          'Branch Location': locVal,
          'Month': monthVal,
          'Gross Revenue Collected (₹)': calc.grossSales,
          'Cash Transferred to Sir (₹)': calc.totalPaid,
          'Advance Money Received (₹)': calc.totalAdvance,
          'Net Store Cash Remaining (₹)': calc.grossSales - calc.totalPaid
        });
      } else if (selectedReportType === 'attendance') {
        rows.push({
          'Employee Name': empName,
          'Branch': locVal,
          'Month': monthVal,
          'Total Days Logged': entries.length,
          'Present Days': presentCount,
          'Absent Days': entries.length - presentCount,
          'Attendance %': entries.length > 0 ? `${Math.round((presentCount / entries.length) * 100)}%` : '0%'
        });
      }
    });

    // Handle Stock / Inventory Report
    if (selectedReportType === 'stock' || selectedReportType === 'inventory' || selectedReportType === 'branch') {
      stockItems.forEach(st => {
        const matchesBranch = selectedBranchFilter === 'ALL' || st.branchName === selectedBranchFilter;
        if (matchesBranch) {
          rows.push({
            'Branch Location': st.branchName,
            'Product Line': st.productName,
            'Opening Stock': st.openingStock,
            'Received Stock': st.receivedStock,
            'Sold Stock': st.soldStock,
            'Damaged Stock': st.damagedStock,
            'Returned Stock': st.returnedStock,
            'Current Available Stock': st.currentStock,
            'Low Stock Alert': st.currentStock <= st.minThreshold ? 'ALERT' : 'Normal'
          });
        }
      });
    }

    return rows;
  }, [records, stockItems, selectedReportType, searchQuery, selectedBranchFilter, selectedMonthFilter]);

  // Download Excel (.xlsx)
  const handleExportExcel = () => {
    if (reportData.length === 0) {
      triggerToast('No Data', 'No data matches the selected filters for export', true);
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, selectedReportType.toUpperCase());
    XLSX.writeFile(workbook, `Keopic_Enterprise_Report_${selectedReportType}_${Date.now()}.xlsx`);
    triggerToast('Excel Report Generated', `Downloaded ${selectedReportType} report`);
  };

  // Download CSV
  const handleExportCSV = () => {
    if (reportData.length === 0) {
      triggerToast('No Data', 'No data matches the selected filters for export', true);
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Keopic_${selectedReportType}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('CSV Report Downloaded', `Generated CSV report`);
  };

  // Download Full JSON Backup
  const handleExportJsonBackup = async () => {
    const res = await exportCompleteJsonBackup(records);
    if (res.success) {
      triggerToast('JSON Backup Downloaded', `Saved ${res.filename} with full database records`);
    } else {
      triggerToast('Export Failed', res.error || 'Could not export JSON backup', true);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0a1038] p-4 rounded-3xl border border-indigo-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 p-0.5 shadow-md">
            <div className="w-full h-full bg-[#0a1038] rounded-[14px] flex items-center justify-center text-cyan-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="text-base font-black text-white">Enterprise Reporting & Data Exports</h2>
            <p className="text-xs text-slate-400">Generate, preview & download reports in Excel, PDF, CSV & JSON Backup formats</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportJsonBackup}
            className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-extrabold text-xs border border-purple-400/30 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Database className="w-4 h-4 text-purple-400" />
            <span>Full JSON Backup</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-extrabold text-xs border border-emerald-400/30 transition cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-extrabold text-xs border border-cyan-400/30 transition cursor-pointer flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* REPORT TYPE SELECTOR PILLS */}
      <div className="bg-[#0a1038] p-3 rounded-3xl border border-indigo-500/20 flex flex-wrap gap-2">
        {[
          { id: 'sales', label: '📊 Sales Report' },
          { id: 'employee', label: '👥 Employee Report' },
          { id: 'branch', label: '🏢 Branch Report' },
          { id: 'stock', label: '📦 Stock Report' },
          { id: 'salary', label: '💰 Salary Report' },
          { id: 'incentive', label: '✨ Incentive Report' },
          { id: 'attendance', label: '🗓️ Attendance Report' },
          { id: 'inventory', label: '🏷️ Inventory Report' },
          { id: 'cash_settlement', label: '💵 Cash Settlement' }
        ].map(rpt => (
          <button
            key={rpt.id}
            type="button"
            onClick={() => setSelectedReportType(rpt.id as ReportType)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition cursor-pointer ${
              selectedReportType === rpt.id
                ? 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white shadow-lg'
                : 'bg-[#101742] text-slate-400 hover:text-white'
            }`}
          >
            {rpt.label}
          </button>
        ))}
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="bg-[#0a1038] p-4 rounded-3xl border border-indigo-500/20 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search report data by Name, Branch or Keyword..."
            className="w-full pl-10 pr-4 py-2 bg-[#101742] border border-indigo-500/30 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#101742] border border-indigo-500/30 rounded-xl px-3 py-1.5 text-xs">
            <Building className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <select
              value={selectedBranchFilter}
              onChange={e => setSelectedBranchFilter(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-[#0b1238]">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.name} className="bg-[#0b1238]">{b.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-[#101742] border border-indigo-500/30 rounded-xl px-3 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <select
              value={selectedMonthFilter}
              onChange={e => setSelectedMonthFilter(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-[#0b1238]">All Months</option>
              {availableMonths.map(m => (
                <option key={m} value={m} className="bg-[#0b1238]">{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* REPORT PREVIEW TABLE */}
      <div className="bg-[#0a1038] rounded-3xl border border-indigo-500/20 shadow-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
          {reportData.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs italic">
              No matching report records found for the selected criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#101742] text-slate-400 uppercase text-[10px] font-extrabold border-b border-indigo-500/20 sticky top-0 z-10">
                  {Object.keys(reportData[0] || {}).map(col => (
                    <th key={col} className="py-3 px-4">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-500/10">
                {reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-indigo-950/40 transition">
                    {Object.values(row).map((val: any, cIdx) => (
                      <td key={cIdx} className="py-3 px-4 text-slate-200 font-mono">
                        {typeof val === 'number' ? formatMoney(val) : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
