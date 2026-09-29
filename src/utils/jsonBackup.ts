import { 
  getAllCloudData, 
  saveUserDataToCloud, 
  createStaffAccountCloud, 
  createBranchCloud 
} from '../lib/supabase';
import { StaffAccount } from '../components/AuthLoginModal';
import { BranchItem, ProductStockItem, StockTransferLog } from '../types';

export interface BackupPayload {
  appName: string;
  version: string;
  exportDate: string;
  timestamp: number;
  systemSummary: {
    totalStaff: number;
    totalBranches: number;
    totalStockItems: number;
    totalStockTransfers: number;
    totalCloudRecords: number;
  };
  data: {
    staffAccounts: StaffAccount[];
    branches: BranchItem[];
    stockItems: ProductStockItem[];
    stockTransfers: StockTransferLog[];
    payrollStatuses: Record<string, any>;
    cloudUserRecords: Record<string, any>;
    localState: {
      allMonthsData?: any;
      rows?: any[];
      targets?: any[];
      payments?: any[];
      dailyGoal?: number;
      meta?: any;
      theme?: string;
      accentColor?: string;
      guestDeviceId?: string;
    };
  };
}

/**
 * Safely parses string from localStorage or returns fallback
 */
function safeGetStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    return fallback;
  }
}

/**
 * Generates formatted YYYY-MM-DD_HH-MM date string for filenames
 */
export function getBackupFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  return `ERP_Backup_${year}-${month}-${day}_${hours}-${mins}.json`;
}

/**
 * Exports complete application database into one JSON file and downloads it
 */
export async function exportCompleteJsonBackup(recordsFallback: any[] = []): Promise<{ success: boolean; filename: string; itemCount: number; error?: string }> {
  try {
    // 1. Gather LocalStorage Datasets
    const staffAccounts = safeGetStorage<StaffAccount[]>('sic_staff_accounts', []);
    const branches = safeGetStorage<BranchItem[]>('sic_branches', []);
    const stockItems = safeGetStorage<ProductStockItem[]>('sic_stock_items', []);
    const stockTransfers = safeGetStorage<StockTransferLog[]>('sic_stock_transfers', []);
    const payrollStatuses = safeGetStorage<Record<string, any>>('sic_payroll_status_v1', {});
    
    const allMonthsData = safeGetStorage<any>('sic_all_months_data', null);
    const rows = safeGetStorage<any[]>('sic_rows', []);
    const targets = safeGetStorage<any[]>('sic_targets', []);
    const payments = safeGetStorage<any[]>('sic_payments', []);
    const dailyGoal = safeGetStorage<number>('sic_daily_goal', 5000);
    const meta = safeGetStorage<any>('sic_meta', null);
    const theme = localStorage.getItem('sic_theme') || 'dark';
    const accentColor = localStorage.getItem('sic_accent_color') || 'indigo';
    const guestDeviceId = localStorage.getItem('sic_guest_device_id') || '';

    // 2. Fetch Cloud Firestore Records
    let cloudUserRecords: Record<string, any> = {};
    try {
      cloudUserRecords = await getAllCloudData();
    } catch (e) {
      console.warn('Could not fetch cloud data directly for backup, using fallback records:', e);
    }

    // Fallback if cloud fetching returned empty but in-memory records are provided
    if (Object.keys(cloudUserRecords).length === 0 && Array.isArray(recordsFallback) && recordsFallback.length > 0) {
      recordsFallback.forEach((rec: any) => {
        if (rec && rec.id && rec.data) {
          cloudUserRecords[rec.id] = rec.data;
        }
      });
    }

    // 3. Assemble JSON Payload
    const backupObj: BackupPayload = {
      appName: 'Keopic ERP',
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      timestamp: Date.now(),
      systemSummary: {
        totalStaff: staffAccounts.length,
        totalBranches: branches.length,
        totalStockItems: stockItems.length,
        totalStockTransfers: stockTransfers.length,
        totalCloudRecords: Object.keys(cloudUserRecords).length
      },
      data: {
        staffAccounts,
        branches,
        stockItems,
        stockTransfers,
        payrollStatuses,
        cloudUserRecords,
        localState: {
          allMonthsData,
          rows,
          targets,
          payments,
          dailyGoal,
          meta,
          theme,
          accentColor,
          guestDeviceId
        }
      }
    };

    // 4. Download JSON File
    const filename = getBackupFilename();
    const jsonStr = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const totalItemCount = staffAccounts.length + branches.length + stockItems.length + Object.keys(cloudUserRecords).length;

    return {
      success: true,
      filename,
      itemCount: totalItemCount
    };
  } catch (error: any) {
    console.error('Export Backup Error:', error);
    return {
      success: false,
      filename: '',
      itemCount: 0,
      error: error?.message || 'Failed to export backup file.'
    };
  }
}

/**
 * Validates imported JSON payload structure
 */
export function validateBackupJson(jsonStr: string): { isValid: boolean; parsed?: BackupPayload; error?: string } {
  try {
    if (!jsonStr || typeof jsonStr !== 'string') {
      return { isValid: false, error: 'Empty or invalid file content.' };
    }

    const parsed = JSON.parse(jsonStr);

    if (!parsed || typeof parsed !== 'object') {
      return { isValid: false, error: 'JSON root must be an object.' };
    }

    // Support both direct root data format or wrapped BackupPayload format
    const dataRoot = parsed.data || parsed;

    const hasStaff = Array.isArray(dataRoot.staffAccounts) || Array.isArray(parsed.staffAccounts);
    const hasBranches = Array.isArray(dataRoot.branches) || Array.isArray(parsed.branches);
    const hasStock = Array.isArray(dataRoot.stockItems) || Array.isArray(parsed.stockItems);
    const hasRecords = Boolean(dataRoot.cloudUserRecords) || Boolean(parsed.cloudUserRecords) || Boolean(dataRoot.localState);

    if (!hasStaff && !hasBranches && !hasStock && !hasRecords) {
      return { 
        isValid: false, 
        error: 'Invalid backup file schema: Missing standard ERP datasets (Employees, Branches, Stock, or Records).' 
      };
    }

    return { isValid: true, parsed };
  } catch (e: any) {
    return { isValid: false, error: `Invalid JSON format: ${e.message}` };
  }
}

/**
 * Restores entire JSON database into Supabase Cloud
 */
export async function restoreCompleteJsonBackup(parsedObj: any): Promise<{ success: boolean; itemCount: number; error?: string }> {
  try {
    const dataRoot = parsedObj.data || parsedObj;
    let itemsRestored = 0;

    // 1. Restore Staff Accounts to Supabase
    if (Array.isArray(dataRoot.staffAccounts)) {
      for (const sa of dataRoot.staffAccounts) {
        await createStaffAccountCloud(sa);
      }
      itemsRestored += dataRoot.staffAccounts.length;
    }

    // 2. Restore Branches to Supabase
    if (Array.isArray(dataRoot.branches)) {
      for (const br of dataRoot.branches) {
        await createBranchCloud(br);
      }
      itemsRestored += dataRoot.branches.length;
    }

    // 3. Restore Payroll Statuses to Supabase
    if (dataRoot.payrollStatuses && typeof dataRoot.payrollStatuses === 'object') {
      await saveUserDataToCloud('admin_payroll_statuses', { statuses: dataRoot.payrollStatuses, updatedAt: Date.now() });
    }

    // 4. Restore UI preferences if provided
    const localState = dataRoot.localState || parsedObj.localState || {};
    if (localState.theme) {
      localStorage.setItem('sic_theme', localState.theme);
    }
    if (localState.accentColor) {
      localStorage.setItem('sic_accent_color', localState.accentColor);
    }

    // 5. Restore Cloud User Records to Supabase
    const cloudRecords = dataRoot.cloudUserRecords || parsedObj.cloudUserRecords || {};
    const recordKeys = Object.keys(cloudRecords);
    
    if (recordKeys.length > 0) {
      // Save each to Firestore in parallel
      const savePromises = recordKeys.map(async (uid) => {
        try {
          await saveUserDataToCloud(uid, cloudRecords[uid]);
        } catch (err) {
          console.warn(`Could not restore cloud record for ${uid}:`, err);
        }
      });
      await Promise.all(savePromises);
      itemsRestored += recordKeys.length;
    }

    return {
      success: true,
      itemCount: itemsRestored
    };
  } catch (error: any) {
    console.error('Restore Backup Error:', error);
    return {
      success: false,
      itemCount: 0,
      error: error?.message || 'Failed to restore backup data.'
    };
  }
}
