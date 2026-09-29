import React, { useRef } from 'react';
import { 
  Download, 
  UploadCloud, 
  FileSpreadsheet, 
  Database, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw, 
  Layers, 
  FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveUserDataToCloud } from '../../lib/supabase';
import { StaffAccount, getStoredStaffAccounts, saveStoredStaffAccounts } from '../AuthLoginModal';

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

interface BackupToolsProps {
  records: CloudRecordItem[];
  staffAccounts: StaffAccount[];
  triggerToast: (title: string, msg?: string, isError?: boolean) => void;
  onRefreshData: () => void;
}

export default function BackupTools({
  records,
  staffAccounts,
  triggerToast,
  onRefreshData
}: BackupToolsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download complete JSON Backup
  const handleDownloadJsonBackup = () => {
    const backupData = {
      app: 'Keopic Photobooth Sales & Ledger System',
      backupVersion: '2.0',
      exportedAt: new Date().toISOString(),
      staffAccounts,
      records
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Keopic_Full_Cloud_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    triggerToast('Backup Downloaded', `Exported ${records.length} cloud records and ${staffAccounts.length} staff accounts`);
  };

  // Upload JSON Backup
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.staffAccounts && Array.isArray(json.staffAccounts)) {
          saveStoredStaffAccounts(json.staffAccounts);
        }

        if (json.records && Array.isArray(json.records)) {
          for (const rec of json.records) {
            if (rec.id && rec.data) {
              await saveUserDataToCloud(rec.id, rec.data);
            }
          }
        }

        triggerToast('JSON Restore Complete', 'Cloud database and staff accounts updated from backup file');
        onRefreshData();
      } catch (err) {
        triggerToast('Restore Error', 'Failed to parse JSON backup file', true);
      }
    };
    reader.readAsText(file);
  };

  // Export Complete Master Workbook
  const handleExportMasterExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Staff Directory
    const s1 = [
      ["STAFF DIRECTORY REGISTER"],
      ["Generated: " + new Date().toLocaleString()],
      [],
      ["ID", "Name", "Counter Location", "Username", "Access Code", "Active Status"]
    ];
    staffAccounts.forEach(acc => {
      s1.push([acc.id, acc.empName, acc.location, acc.username, acc.code, acc.isActive ? 'Active' : 'Disabled']);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s1), "Staff Accounts");

    // Sheet 2: Cloud Sales Submissions
    const s2 = [
      ["ALL CLOUD SALES SUBMISSIONS"],
      [],
      ["Document ID", "Employee Name", "Month", "Location", "Daily Entries Logged", "Payments Recorded"]
    ];
    records.forEach(rec => {
      const data = rec.data;
      s2.push([
        rec.id,
        data.meta?.empName || 'Staff',
        data.meta?.monthVal || 'N/A',
        data.meta?.locVal || 'Main Counter',
        String(data.entries?.length || 0),
        String(data.payments?.length || 0)
      ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s2), "Cloud Sales Ledger");

    XLSX.writeFile(wb, `Keopic_Master_Database_${new Date().toISOString().split('T')[0]}.xlsx`);
    triggerToast('Master Workbook Downloaded', 'Full Excel workbook generated successfully');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Card */}
      <div className="bg-[#0f1535]/80 backdrop-blur-2xl rounded-3xl p-6 border border-[#262d63] shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-cyan-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-cyan-500/20">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">Cloud Database Backup & Restore Center</h3>
            <p className="text-xs text-slate-400 mt-0.5">Export full JSON backups, restore historical data, or download complete Excel workbooks</p>
          </div>
        </div>
      </div>

      {/* 3 Utility Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: One-Click JSON Backup */}
        <div className="bg-[#0f1535]/80 backdrop-blur-2xl rounded-3xl p-6 border border-[#262d63] shadow-2xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3">
              <Download className="w-5 h-5" />
            </div>
            <h4 className="text-base font-black text-white">Download JSON Cloud Backup</h4>
            <p className="text-xs text-slate-400 mt-1">
              Exports all {records.length} sales ledger submissions and {staffAccounts.length} staff login accounts into a portable JSON backup file.
            </p>
          </div>

          <button
            onClick={handleDownloadJsonBackup}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON Backup</span>
          </button>
        </div>

        {/* Card 2: Restore JSON Backup */}
        <div className="bg-[#0f1535]/80 backdrop-blur-2xl rounded-3xl p-6 border border-[#262d63] shadow-2xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3">
              <UploadCloud className="w-5 h-5" />
            </div>
            <h4 className="text-base font-black text-white">Restore Data from Backup</h4>
            <p className="text-xs text-slate-400 mt-1">
              Upload a previously exported JSON backup file to sync records & staff account access codes to Firestore cloud.
            </p>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xs shadow-lg shadow-purple-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Select JSON File to Restore</span>
          </button>
        </div>

        {/* Card 3: Master Excel Export */}
        <div className="bg-[#0f1535]/80 backdrop-blur-2xl rounded-3xl p-6 border border-[#262d63] shadow-2xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h4 className="text-base font-black text-white">Master Excel Database</h4>
            <p className="text-xs text-slate-400 mt-1">
              Downloads a full multi-tab Excel spreadsheet containing complete staff directory and submission logs for accounting.
            </p>
          </div>

          <button
            onClick={handleExportMasterExcel}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Master Excel</span>
          </button>
        </div>

      </div>

    </div>
  );
}
