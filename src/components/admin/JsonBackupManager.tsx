import React, { useState, useRef } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  ShieldAlert, 
  FileText, 
  HardDrive, 
  Sparkles, 
  Users, 
  Building, 
  Package, 
  Layers,
  AlertTriangle,
  Clock,
  Info,
  Check,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  exportCompleteJsonBackup, 
  validateBackupJson, 
  restoreCompleteJsonBackup, 
  getBackupFilename,
  BackupPayload 
} from '../../utils/jsonBackup';
import { StaffAccount } from '../AuthLoginModal';
import { BranchItem, ProductStockItem } from '../../types';

interface JsonBackupManagerProps {
  records: any[];
  staffAccounts: StaffAccount[];
  branches: BranchItem[];
  stockItems: ProductStockItem[];
  triggerToast: (title: string, msg?: string, isError?: boolean) => void;
}

export default function JsonBackupManager({
  records,
  staffAccounts,
  branches,
  stockItems,
  triggerToast
}: JsonBackupManagerProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<BackupPayload | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Export Backup
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await exportCompleteJsonBackup(records);
      if (res.success) {
        triggerToast('Export Successful', `Downloaded ${res.filename} (${res.itemCount} database records exported)`, false);
      } else {
        triggerToast('Export Failed', res.error || 'Could not export backup file', true);
      }
    } catch (e: any) {
      triggerToast('Export Failed', e.message || 'Error creating JSON backup', true);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle File Select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      triggerToast('Invalid File', 'Please select a valid .json backup file.', true);
      return;
    }

    setSelectedFile(file);
    setValidationError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const validation = validateBackupJson(content);
      if (validation.isValid && validation.parsed) {
        setParsedBackup(validation.parsed);
        setShowConfirmModal(true);
      } else {
        setValidationError(validation.error || 'Invalid backup schema.');
        triggerToast('Validation Error', validation.error || 'Invalid backup JSON file.', true);
      }
    };
    reader.readAsText(file);
  };

  // Handle Confirmed Restore
  const handleConfirmRestore = async () => {
    if (!parsedBackup) return;
    setIsImporting(true);

    try {
      const res = await restoreCompleteJsonBackup(parsedBackup);
      if (res.success) {
        triggerToast('Backup Restored Successfully.', `Restored ${res.itemCount} database records across all systems.`, false);
        setShowConfirmModal(false);
        setSelectedFile(null);
        setParsedBackup(null);
        
        // Auto-refresh application UI state smoothly
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        triggerToast('Restore Failed', res.error || 'Error restoring JSON database.', true);
      }
    } catch (e: any) {
      triggerToast('Restore Error', e.message || 'Failed to apply backup.', true);
    } finally {
      setIsImporting(false);
    }
  };

  const currentFilenameExample = getBackupFilename();

  return (
    <div className="space-y-6">
      
      {/* HEADER HERO BANNER */}
      <div className="bg-gradient-to-r from-[#0d1647] via-[#101b59] to-[#0d1647] p-6 sm:p-8 rounded-3xl border border-cyan-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-mono font-extrabold uppercase tracking-wider border border-cyan-400/30 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                Portable Offline Database
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-extrabold flex items-center gap-1.5 border border-emerald-400/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Auto-Sync Active
              </span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              JSON Backup & Restore System
            </h2>
            
            <p className="text-slate-300 text-sm max-w-2xl font-medium leading-relaxed">
              Export your entire enterprise data—employees, credentials, branch inventories, attendance, daily sales, targets, and payroll—into a single portable JSON file. Easily move or restore data across any device seamlessly.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 cursor-pointer border border-cyan-400/30 disabled:opacity-50"
            >
              {isExporting ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Download className="w-4 h-4 text-white" />
              )}
              <span>Export Backup</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-3 rounded-2xl bg-[#141f5a] hover:bg-[#1a2975] text-cyan-300 font-extrabold text-xs border border-cyan-500/40 transition hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Import Backup</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* METRICS PREVIEW BAR */}
        <div className="mt-6 pt-6 border-t border-indigo-500/20 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#070d2b]/80 p-3.5 rounded-2xl border border-indigo-500/20">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Employees & IDs</span>
            </div>
            <div className="text-xl font-black text-white font-mono mt-1">{staffAccounts.length}</div>
          </div>

          <div className="bg-[#070d2b]/80 p-3.5 rounded-2xl border border-indigo-500/20">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
              <Building className="w-3.5 h-3.5 text-rose-400" />
              <span>Store Branches</span>
            </div>
            <div className="text-xl font-black text-white font-mono mt-1">{branches.length}</div>
          </div>

          <div className="bg-[#070d2b]/80 p-3.5 rounded-2xl border border-indigo-500/20">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
              <Package className="w-3.5 h-3.5 text-amber-400" />
              <span>Inventory Items</span>
            </div>
            <div className="text-xl font-black text-white font-mono mt-1">{stockItems.length}</div>
          </div>

          <div className="bg-[#070d2b]/80 p-3.5 rounded-2xl border border-indigo-500/20">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Data Submissions</span>
            </div>
            <div className="text-xl font-black text-white font-mono mt-1">{records.length}</div>
          </div>
        </div>
      </div>

      {/* TWO COLUMN CARDS: EXPORT & IMPORT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CARD 1: EXPORT BACKUP */}
        <div className="bg-[#0a1038] p-6 rounded-3xl border border-indigo-500/20 shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Download className="w-6 h-6 text-cyan-400" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">1. Export JSON Database</h3>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                Generates a standardized JSON backup file containing all system data. Perfect for creating offline archives or transferring data to another device.
              </p>
            </div>

            <div className="bg-[#070d2b] p-3.5 rounded-2xl border border-indigo-500/20 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Default Filename Format:</div>
              <div className="text-xs font-mono font-black text-cyan-300 bg-cyan-950/50 px-3 py-1.5 rounded-xl border border-cyan-500/20 truncate">
                {currentFilenameExample}
              </div>
            </div>

            <ul className="space-y-1.5 text-xs text-slate-300 font-medium">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Includes Employees, Credentials, Pins & Roles</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Includes All Daily Sales, Stands, Magnets & Frames</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Includes Branch Inventories & Stock History</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Includes Attendance, Payroll & Advance Moneys</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white font-extrabold text-xs shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating JSON Backup...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download JSON Backup Now</span>
              </>
            )}
          </button>
        </div>

        {/* CARD 2: IMPORT BACKUP */}
        <div className="bg-[#0a1038] p-6 rounded-3xl border border-indigo-500/20 shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <Upload className="w-6 h-6 text-purple-400" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">2. Import & Restore JSON</h3>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                Select a previously saved <code className="text-cyan-300 font-mono">ERP_Backup_*.json</code> file to restore complete system state. Data validation occurs before any changes are made.
              </p>
            </div>

            {/* DRAG AND DROP ZONE */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#070d2b] border-2 border-dashed border-indigo-500/30 hover:border-cyan-400 p-6 rounded-2xl text-center cursor-pointer transition group space-y-2"
            >
              <Upload className="w-8 h-8 text-indigo-400 group-hover:text-cyan-300 mx-auto transition group-hover:scale-110" />
              <div className="text-xs font-black text-slate-200 group-hover:text-cyan-300">
                Click to browse & import JSON backup file
              </div>
              <p className="text-[10px] text-slate-500">
                Supports standard Keopic ERP JSON schema (.json)
              </p>
            </div>

            {validationError && (
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3.5 rounded-2xl bg-[#141f5a] hover:bg-[#1c2c80] text-cyan-300 font-extrabold text-xs border border-cyan-500/40 transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>Select JSON File To Import</span>
          </button>
        </div>
      </div>

      {/* AUTO BACKUP GUARANTEE CARD */}
      <div className="bg-[#070d2b] p-5 rounded-3xl border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-white">Continuous Real-Time Local Auto-Backup</h4>
            <p className="text-[11px] text-slate-400">
              Every addition or modification is instantly synchronized to Local Storage & IndexedDB. No manual save required.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-500/30 shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>REALTIME PROTECTED</span>
        </div>
      </div>

      {/* CONFIRMATION OVERWRITE MODAL */}
      <AnimatePresence>
        {showConfirmModal && parsedBackup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0a1038] border border-cyan-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-6 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

              {/* MODAL HEADER */}
              <div className="flex items-center justify-between border-b border-indigo-500/20 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Confirm JSON Restore</h3>
                    <p className="text-xs text-slate-400">Restore application data from backup file</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmModal(false);
                    setSelectedFile(null);
                    setParsedBackup(null);
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* BACKUP SUMMARY DETAILS */}
              <div className="space-y-3">
                <div className="bg-[#070d2b] p-4 rounded-2xl border border-indigo-500/20 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">File Selected:</div>
                  <div className="text-xs font-mono font-bold text-cyan-300">{selectedFile?.name}</div>
                  {parsedBackup.exportDate && (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      <span>Exported on: {new Date(parsedBackup.exportDate).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* CONTENTS BREAKDOWN */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20">
                    <span className="text-slate-400 block text-[10px]">Employees:</span>
                    <span className="font-mono font-black text-white text-sm">
                      {parsedBackup.systemSummary?.totalStaff ?? (parsedBackup.data?.staffAccounts?.length || 0)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20">
                    <span className="text-slate-400 block text-[10px]">Branches:</span>
                    <span className="font-mono font-black text-white text-sm">
                      {parsedBackup.systemSummary?.totalBranches ?? (parsedBackup.data?.branches?.length || 0)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20">
                    <span className="text-slate-400 block text-[10px]">Inventory Items:</span>
                    <span className="font-mono font-black text-white text-sm">
                      {parsedBackup.systemSummary?.totalStockItems ?? (parsedBackup.data?.stockItems?.length || 0)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20">
                    <span className="text-slate-400 block text-[10px]">Submissions:</span>
                    <span className="font-mono font-black text-white text-sm">
                      {parsedBackup.systemSummary?.totalCloudRecords ?? Object.keys(parsedBackup.data?.cloudUserRecords || {}).length}
                    </span>
                  </div>
                </div>

                {/* SAFETY PROMPT MANDATE */}
                <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 space-y-1">
                  <div className="text-xs font-black text-amber-300 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>This will replace current data. Continue?</span>
                  </div>
                  <p className="text-[11px] text-amber-200/80 leading-relaxed pl-6">
                    Restoring this backup file will overwrite existing local records and restore the complete system state.
                  </p>
                </div>
              </div>

              {/* MODAL ACTIONS */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmModal(false);
                    setSelectedFile(null);
                    setParsedBackup(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-extrabold transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmRestore}
                  disabled={isImporting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white text-xs font-extrabold shadow-lg shadow-rose-500/25 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Restoring Backup...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Yes, Restore Backup</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
