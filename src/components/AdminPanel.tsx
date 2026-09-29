import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Users, 
  DollarSign, 
  BarChart3, 
  Search, 
  UserPlus, 
  Key, 
  Lock, 
  User as UserIcon, 
  Check, 
  Trash2, 
  Eye, 
  EyeOff, 
  Copy, 
  CheckCircle2, 
  X, 
  Building, 
  Download, 
  RefreshCw, 
  FileText, 
  TrendingUp, 
  Calendar, 
  MapPin, 
  UserCheck, 
  ChevronRight, 
  ShieldAlert, 
  Sparkles, 
  Sliders, 
  Filter, 
  CircleDollarSign,
  Layers,
  ArrowUpRight,
  Printer,
  Activity,
  Globe,
  Award,
  Zap,
  Clock,
  ArrowRight,
  UserX,
  CreditCard,
  ArrowLeft,
  MessageSquare,
  Sparkle,
  LayoutDashboard,
  CheckCircle,
  MoreVertical,
  MoreHorizontal,
  Package,
  FileSpreadsheet,
  Shield,
  Database,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid
} from 'recharts';
import { 
  getAllCloudData, 
  loadUserDataFromCloud, 
  saveUserDataToCloud, 
  deleteUserDataFromCloud, 
  subscribeToAllUsersData, 
  subscribeToUserData, 
  subscribeToBranches, 
  subscribeToStock, 
  subscribeToStockTransactions,
  createStaffAccountCloud,
  updateStaffAccountCloud,
  deleteStaffAccountCloud,
  subscribeToStaffAccounts
} from '../lib/supabase';
import { StaffAccount, getStoredStaffAccounts, saveStoredStaffAccounts } from './AuthLoginModal';
import { DailyEntry, TargetEntry, PaymentEntry } from '../types';
import { performCalculations, formatMoney } from '../utils/calculations';
import KeopicLogo from './KeopicLogo';
import { exportAndDownloadPDF } from '../utils/exportPdf';
import PayrollManager from './admin/PayrollManager';
import BranchComparison from './admin/BranchComparison';
import AdminChatTab from './admin/AdminChatTab';
import EmployeeManager from './admin/EmployeeManager';
import BranchManager from './admin/BranchManager';
import StockInventoryManager from './admin/StockInventoryManager';
import SalesAnalyticsDashboard from './admin/SalesAnalyticsDashboard';
import EmployeePerformanceView from './admin/EmployeePerformanceView';
import EnterpriseReportsManager from './admin/EnterpriseReportsManager';
import JsonBackupManager from './admin/JsonBackupManager';
import AttendanceManager from './admin/AttendanceManager';
import ActivityLogsTab from './admin/ActivityLogsTab';
import { BranchItem, ProductStockItem, StockTransferLog } from '../types';
import { calculateHoursWorked, getTotalHoursForEntries } from './WorkHoursCard';

const DEFAULT_BRANCHES: BranchItem[] = [
  { 
    id: 'br_cp_01', 
    name: 'Connaught Place', 
    code: 'CP-01', 
    address: 'Connaught Place, Central Delhi, New Delhi - 110001', 
    managerName: 'Arvind Kumar Sharma', 
    status: 'active',
    createdAt: 1700000000000 
  },
];

const DEFAULT_STOCK_ITEMS: ProductStockItem[] = [
  { id: 'stk1', branchName: 'Connaught Place', productName: 'Stand', openingStock: 1000, receivedStock: 500, soldStock: 320, damagedStock: 10, returnedStock: 5, currentStock: 1175, minThreshold: 100 },
  { id: 'stk2', branchName: 'Connaught Place', productName: 'Magnet', openingStock: 800, receivedStock: 400, soldStock: 250, damagedStock: 5, returnedStock: 2, currentStock: 947, minThreshold: 100 },
];

function getStoredBranches(): BranchItem[] {
  return DEFAULT_BRANCHES;
}

function getStoredStockItems(): ProductStockItem[] {
  return DEFAULT_STOCK_ITEMS;
}

function getStoredTransferLogs(): StockTransferLog[] {
  return [];
}

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout?: () => void;
  triggerToast: (title: string, msg?: string, isError?: boolean) => void;
}

interface CloudRecordItem {
  id: string;
  data: {
    entries?: DailyEntry[];
    targets?: TargetEntry[];
    payments?: PaymentEntry[];
    chatMessages?: any[];
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

export default function AdminPanel({ isOpen, onClose, onLogout, triggerToast }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<
    | 'analytics' 
    | 'attendance'
    | 'activity_logs'
    | 'chat' 
    | 'records' 
    | 'staff_accounts' 
    | 'payroll' 
    | 'counters' 
    | 'employees_erp' 
    | 'branches_erp' 
    | 'stock_erp' 
    | 'sales_erp' 
    | 'ratings_erp' 
    | 'reports_erp'
    | 'backup_erp'
  >('analytics');

  // ERP State
  const [branches, setBranches] = useState<BranchItem[]>(getStoredBranches);
  const [stockItems, setStockItems] = useState<ProductStockItem[]>(getStoredStockItems);
  const [transferLogs, setTransferLogs] = useState<StockTransferLog[]>(getStoredTransferLogs);

  // Cloud Records state
  const [records, setRecords] = useState<CloudRecordItem[]>([]);

  // Total unread staff messages across all accounts
  const totalUnreadChatMessages = useMemo(() => {
    let count = 0;
    records.forEach(r => {
      if (r.id === 'admin_staff_codes') return;
      const msgs = r.data?.chatMessages || [];
      msgs.forEach((m: any) => {
        if (m.sender === 'staff' && !m.read) {
          count++;
        }
      });
    });
    return count;
  }, [records]);

  // Map staff names to their latest profile picture from cloud submissions
  const staffPicMap = useMemo(() => {
    const map: Record<string, string> = {};
    records.forEach(r => {
      const name = r.data.meta?.empName;
      const pic = r.data.meta?.profilePic;
      if (name && pic) {
        map[name.trim().toLowerCase()] = pic;
      }
    });
    return map;
  }, [records]);

  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('ALL');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('ALL');

  // Selected detail modal record
  const [selectedRecord, setSelectedRecord] = useState<CloudRecordItem | null>(null);

  // Staff Account Creator state
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffLocation, setNewStaffLocation] = useState('Main Counter');
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffCode, setNewStaffCode] = useState('');

  // Visible passwords toggles
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Delete staff confirmation state
  const [staffToDelete, setStaffToDelete] = useState<{ id: string; name: string } | null>(null);

  // Delete ledger submission record confirmation state
  const [recordToDelete, setRecordToDelete] = useState<CloudRecordItem | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const confirmDeleteSubmission = async () => {
    if (!recordToDelete) return;
    const { id, data } = recordToDelete;
    const empName = data.meta?.empName || 'Staff Member';
    const monthVal = data.meta?.monthVal || 'Record';

    try {
      await deleteUserDataFromCloud(id);
      setRecords(prev => prev.filter(r => r.id !== id));
      triggerToast('Submission Record Deleted', `Deleted ledger record for ${empName} (${monthVal})`);
    } catch (err) {
      triggerToast('Delete Error', 'Failed to delete record from cloud', true);
    } finally {
      setRecordToDelete(null);
    }
  };

  // Delete staff account handler
  const confirmDeleteStaffAccount = async () => {
    if (!staffToDelete) return;
    const { id, name } = staffToDelete;
    const updated = staffAccounts.filter(a => a.id !== id);
    setStaffAccounts(updated);
    saveStoredStaffAccounts(updated);
    try {
      await deleteStaffAccountCloud(id);
    } catch (e) {
      console.warn('Error deleting staff from cloud:', e);
    }
    triggerToast('Staff Account Deleted', `Account for ${name} removed successfully`);
    setStaffToDelete(null);
  };

  const handleDeleteStaffAccount = (id: string, name: string) => {
    setStaffToDelete({ id, name });
  };

  const fetchCloudRecords = async () => {
    setIsLoading(true);
    try {
      const allDocs = await getAllCloudData();
      const items: CloudRecordItem[] = Object.keys(allDocs)
        .filter(docId => docId !== 'admin_staff_codes')
        .map(docId => ({
          id: docId,
          data: allDocs[docId] || {}
        }));

      // Sort by latest updated
      items.sort((a, b) => (b.data.updatedAt || 0) - (a.data.updatedAt || 0));
      setRecords(items);
    } catch (e) {
      console.error('Error fetching cloud data for admin:', e);
      triggerToast('Cloud Sync Error', 'Failed to fetch sales records from Firestore', true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    const accounts = getStoredStaffAccounts();
    setStaffAccounts(accounts);

    // Live subscription to all user data in Firestore
    const unsubscribeAll = subscribeToAllUsersData((allRecords) => {
      const items = allRecords
        .filter(r => r.id !== 'admin_staff_codes')
        .sort((a, b) => (b.data.updatedAt || 0) - (a.data.updatedAt || 0));

      setRecords(items);
      setIsLoading(false);
    }, (err) => {
      console.warn('Admin real-time listener unavailable, falling back to fetch:', err);
      fetchCloudRecords();
    });

    // Live subscription to staff accounts list
    const unsubscribeStaffCodes = subscribeToUserData('admin_staff_codes', (codeData: any) => {
      if (codeData && (codeData.staffAccounts || codeData.staffCodes)) {
        const list = codeData.staffAccounts || codeData.staffCodes;
        if (Array.isArray(list) && list.length > 0) {
          setStaffAccounts(list);
        }
      }
    });

    // Live subscription to database staff accounts
    const unsubscribeDbStaff = subscribeToStaffAccounts((dbList) => {
      if (Array.isArray(dbList)) {
        setStaffAccounts(dbList);
      }
    });

    // Live subscription to branches
    const unsubscribeBranches = subscribeToBranches((bList) => {
      if (Array.isArray(bList)) {
        setBranches(bList);
      }
    });

    // Live subscription to stock items
    const unsubscribeStock = subscribeToStock((sList) => {
      if (Array.isArray(sList)) {
        setStockItems(sList as any);
      }
    });

    // Live subscription to stock transactions
    const unsubscribeTx = subscribeToStockTransactions((txList) => {
      if (txList) {
        setTransferLogs(txList as any);
      }
    });

    return () => {
      if (typeof unsubscribeAll === 'function') unsubscribeAll();
      if (typeof unsubscribeStaffCodes === 'function') unsubscribeStaffCodes();
      if (typeof unsubscribeDbStaff === 'function') unsubscribeDbStaff();
      if (typeof unsubscribeBranches === 'function') unsubscribeBranches();
      if (typeof unsubscribeStock === 'function') unsubscribeStock();
      if (typeof unsubscribeTx === 'function') unsubscribeTx();
    };
  }, [isOpen]);

  // Unique lists for dropdowns
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.data.meta?.monthVal) set.add(r.data.meta.monthVal);
    });
    return Array.from(set).sort().reverse();
  }, [records]);

  const availableLocations = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.data.meta?.locVal) set.add(r.data.meta.locVal);
    });
    return Array.from(set);
  }, [records]);

  // Auto-generate code for staff creation
  const handleGenerateCode = () => {
    const randDigits = Math.floor(1000 + Math.random() * 9000);
    const code = `STF-${randDigits}`;
    setNewStaffCode(code);
  };

  // Create Staff Account Handler
  const handleCreateStaffAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = newStaffName.trim();
    const cleanLoc = newStaffLocation.trim() || 'Main Counter';
    const cleanUser = newStaffUsername.trim().toLowerCase();
    const cleanPass = newStaffPassword.trim();
    const cleanCode = (newStaffCode.trim() || `STF-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase();

    if (!cleanName || !cleanUser || !cleanPass) {
      triggerToast('Missing Fields', 'Please enter staff name, username, and password', true);
      return;
    }

    // Check existing username duplicate
    const exists = staffAccounts.some(acc => acc.username.toLowerCase() === cleanUser);
    if (exists) {
      triggerToast('Duplicate Username', `Username '${cleanUser}' is already taken. Choose another.`, true);
      return;
    }

    const newObj: StaffAccount = {
      id: 'sa_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      username: cleanUser,
      password: cleanPass,
      empName: cleanName,
      location: cleanLoc,
      code: cleanCode,
      createdAt: Date.now(),
      isActive: true,
    };

    const updated = [newObj, ...staffAccounts];
    setStaffAccounts(updated);
    saveStoredStaffAccounts(updated);

    try {
      await createStaffAccountCloud({
        id: newObj.id,
        employeeId: cleanCode,
        username: cleanUser,
        password: cleanPass,
        displayName: cleanName,
        empName: cleanName,
        branchName: cleanLoc,
        location: cleanLoc,
        role: 'staff',
        status: 'active'
      });
    } catch (e) {
      console.warn('Error syncing created staff to cloud:', e);
    }

    triggerToast('Staff Account Created', `Username: ${cleanUser} | Password: ${cleanPass}`);

    setNewStaffName('');
    setNewStaffLocation('Main Counter');
    setNewStaffUsername('');
    setNewStaffPassword('');
    setNewStaffCode('');
  };

  // Toggle staff active status
  const handleToggleStaffActive = async (id: string) => {
    let nextActive = false;
    const updated = staffAccounts.map(acc => {
      if (acc.id === id) {
        nextActive = !acc.isActive;
        return { ...acc, isActive: nextActive };
      }
      return acc;
    });
    setStaffAccounts(updated);
    saveStoredStaffAccounts(updated);

    try {
      await updateStaffAccountCloud(id, {
        status: nextActive ? 'active' : 'disabled',
        isActive: nextActive
      });
    } catch (e) {
      console.warn('Error updating staff active state in cloud:', e);
    }

    triggerToast('Account Status Updated', 'Staff login permission updated');
  };

  // Copy staff login credentials
  const handleCopyCredentials = (acc: StaffAccount) => {
    const credText = `Staff Login Credentials:\nName: ${acc.empName}\nLocation: ${acc.location}\nUsername: ${acc.username}\nPassword: ${acc.password}\nUnique Access Code: ${acc.code}`;
    navigator.clipboard.writeText(credText);
    triggerToast('Credentials Copied', `Login details for ${acc.empName} copied to clipboard`);
  };

  // Toggle password visibility for card
  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Aggregate Calculations across all user documents
  const overallStats = useMemo(() => {
    let grandGrossSales = 0;
    let grandCommissions = 0;
    let grandFinalPayable = 0;
    let activeStaffCount = new Set<string>();
    let totalEntriesCount = 0;

    records.forEach(rec => {
      const data = rec.data;
      const empName = data.meta?.empName;
      if (empName) activeStaffCount.add(empName);

      const baseSalary = data.meta?.baseSalary || 17000;
      const monthVal = data.meta?.monthVal || 'N/A';
      const entries = data.entries || [];
      const targets = data.targets || [];
      const payments = data.payments || [];

      totalEntriesCount += entries.length;

      const calc = performCalculations(entries, targets, payments, baseSalary, monthVal);
      grandGrossSales += calc.grossSales;
      grandCommissions += calc.totalIncentive;
      grandFinalPayable += calc.finalPayable;
    });

    return {
      grandGrossSales,
      grandCommissions,
      grandFinalPayable,
      uniqueStaffCount: activeStaffCount.size,
      totalEntriesCount,
      totalDocs: records.length
    };
  }, [records]);

  // Breakdown by Counter/Location
  const locationBreakdown = useMemo(() => {
    const map: Record<string, { totalSales: number; staffNames: Set<string>; count: number }> = {};
    records.forEach(rec => {
      const loc = rec.data.meta?.locVal || 'Unassigned Counter';
      const emp = rec.data.meta?.empName || 'Staff';
      const entries = rec.data.entries || [];
      const targets = rec.data.targets || [];
      const payments = rec.data.payments || [];
      const baseSalary = rec.data.meta?.baseSalary || 17000;
      const monthVal = rec.data.meta?.monthVal || 'N/A';

      const calc = performCalculations(entries, targets, payments, baseSalary, monthVal);

      if (!map[loc]) {
        map[loc] = { totalSales: 0, staffNames: new Set(), count: 0 };
      }
      map[loc].totalSales += calc.grossSales;
      map[loc].staffNames.add(emp);
      map[loc].count += 1;
    });

    return Object.entries(map).map(([loc, data]) => ({
      location: loc,
      totalSales: data.totalSales,
      staffCount: data.staffNames.size,
      recordCount: data.count
    })).sort((a, b) => b.totalSales - a.totalSales);
  }, [records]);

  // Filtered records list
  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      const data = rec.data;
      const empName = (data.meta?.empName || '').toLowerCase();
      const locVal = (data.meta?.locVal || '').toLowerCase();
      const monthVal = data.meta?.monthVal || '';

      const matchesSearch = 
        !searchQuery || 
        empName.includes(searchQuery.toLowerCase()) || 
        locVal.includes(searchQuery.toLowerCase()) || 
        rec.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMonth = selectedMonthFilter === 'ALL' || monthVal === selectedMonthFilter;
      const matchesLoc = selectedLocationFilter === 'ALL' || data.meta?.locVal === selectedLocationFilter;

      return matchesSearch && matchesMonth && matchesLoc;
    });
  }, [records, searchQuery, selectedMonthFilter, selectedLocationFilter]);

  // 1. Stats for currently selected month / active filters
  const selectedMonthStats = useMemo(() => {
    let grandGrossSales = 0;
    let grandCommissions = 0;
    let grandFinalPayable = 0;
    let totalStandUnits = 0;
    let totalMagnetUnits = 0;
    let totalFrameRevenue = 0;
    let activeStaffSet = new Set<string>();
    let totalDaysLogged = 0;

    filteredRecords.forEach(rec => {
      const data = rec.data;
      const empName = data.meta?.empName || 'Staff';
      activeStaffSet.add(empName);

      const baseSalary = data.meta?.baseSalary || 17000;
      const monthVal = data.meta?.monthVal || 'N/A';
      const entries = data.entries || [];
      const targets = data.targets || [];
      const payments = data.payments || [];

      const calc = performCalculations(entries, targets, payments, baseSalary, monthVal);
      grandGrossSales += calc.grossSales;
      grandCommissions += calc.totalIncentive;
      grandFinalPayable += calc.finalPayable;
      totalStandUnits += calc.standUnits;
      totalMagnetUnits += calc.magnetUnits;
      totalFrameRevenue += calc.totalFrame;
      totalDaysLogged += entries.length;
    });

    return {
      grandGrossSales,
      grandCommissions,
      grandFinalPayable,
      totalStandUnits,
      totalMagnetUnits,
      totalFrameRevenue,
      staffCount: activeStaffSet.size,
      submissionCount: filteredRecords.length,
      totalDaysLogged
    };
  }, [filteredRecords]);

  // 2. Monthly Trend Data across all months (for Recharts Area/Bar Chart)
  const monthlyTrendData = useMemo(() => {
    const monthMap: Record<string, { month: string; grossSales: number; incentives: number; standUnits: number; magnetUnits: number; frameRevenue: number; staffCount: number }> = {};

    records.forEach(rec => {
      const data = rec.data;
      const monthVal = data.meta?.monthVal || 'Unknown';
      const baseSalary = data.meta?.baseSalary || 17000;
      const entries = data.entries || [];
      const targets = data.targets || [];
      const payments = data.payments || [];

      const calc = performCalculations(entries, targets, payments, baseSalary, monthVal);

      if (!monthMap[monthVal]) {
        monthMap[monthVal] = {
          month: monthVal,
          grossSales: 0,
          incentives: 0,
          standUnits: 0,
          magnetUnits: 0,
          frameRevenue: 0,
          staffCount: 0
        };
      }

      monthMap[monthVal].grossSales += calc.grossSales;
      monthMap[monthVal].incentives += calc.totalIncentive;
      monthMap[monthVal].standUnits += calc.standUnits;
      monthMap[monthVal].magnetUnits += calc.magnetUnits;
      monthMap[monthVal].frameRevenue += calc.totalFrame;
      monthMap[monthVal].staffCount += 1;
    });

    return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
  }, [records]);

  // 3. Leaderboard / Staff Performance for Selected Month
  const staffLeaderboard = useMemo(() => {
    return filteredRecords.map(rec => {
      const data = rec.data;
      const empName = data.meta?.empName || 'Staff Member';
      const locVal = data.meta?.locVal || 'Main Counter';
      const monthVal = data.meta?.monthVal || 'N/A';
      const baseSalary = data.meta?.baseSalary || 17000;
      const profilePic = data.meta?.profilePic;
      const entries = data.entries || [];
      const targets = data.targets || [];
      const payments = data.payments || [];

      const calc = performCalculations(entries, targets, payments, baseSalary, monthVal);
      const workHours = getTotalHoursForEntries(entries);

      return {
        id: rec.id,
        empName,
        locVal,
        monthVal,
        profilePic,
        grossSales: calc.grossSales,
        totalIncentive: calc.totalIncentive,
        finalPayable: calc.finalPayable,
        standUnits: calc.standUnits,
        magnetUnits: calc.magnetUnits,
        totalUnits: calc.standUnits + calc.magnetUnits,
        daysLogged: entries.length,
        presentDays: calc.presentDays,
        totalWorkHoursFormatted: workHours.formatted
      };
    }).sort((a, b) => b.grossSales - a.grossSales);
  }, [filteredRecords]);

  // 4. Product Sales Mix (Pie Chart Data)
  const productMixData = useMemo(() => {
    return [
      { name: 'Stand Sales (₹200)', value: selectedMonthStats.totalStandUnits * 200, units: selectedMonthStats.totalStandUnits, fill: '#06b6d4' },
      { name: 'Magnet Sales (₹250)', value: selectedMonthStats.totalMagnetUnits * 250, units: selectedMonthStats.totalMagnetUnits, fill: '#8b5cf6' },
      { name: 'Frame Sales', value: selectedMonthStats.totalFrameRevenue, units: null, fill: '#ec4899' },
    ].filter(p => p.value > 0 || (p.units && p.units > 0));
  }, [selectedMonthStats]);

  // Export Month Report to Excel
  const handleExportMonthExcel = () => {
    const monthName = selectedMonthFilter === 'ALL' ? 'All_Months' : selectedMonthFilter;
    
    const rows = staffLeaderboard.map((s, idx) => ({
      'S.No': idx + 1,
      'Employee Name': s.empName,
      'Branch Location': s.locVal,
      'Month': s.monthVal,
      'Days Logged': s.daysLogged,
      'Present Days': s.presentDays,
      'Stand Units (₹200)': s.standUnits,
      'Magnet Units (₹250)': s.magnetUnits,
      'Total Units': s.totalUnits,
      'Gross Revenue (₹)': s.grossSales,
      'Incentive Earned (₹)': s.totalIncentive,
      'Net Payable (₹)': s.finalPayable
    }));

    if (rows.length === 0) {
      triggerToast('No Data', 'No records available to export for selected filter', true);
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Month_${monthName.replace(/[^a-zA-Z0-9]/g, '_')}`);
    XLSX.writeFile(workbook, `Keopic_Staff_Report_${monthName}.xlsx`);
    triggerToast('Excel Export Generated', `Downloaded staff report for ${monthName}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#04081c] text-slate-100 flex flex-col md:flex-row font-sans select-none">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-[700px] h-[700px] bg-cyan-500/10 rounded-full blur-[160px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-0 right-1/4 w-[750px] h-[750px] bg-purple-600/12 rounded-full blur-[180px] pointer-events-none"></div>
      <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none"></div>

      {/* MOBILE TOP COMPACT NAV (only on < md screens) */}
      <header className="md:hidden admin-glass-panel border-b border-white/10 shrink-0 z-30 relative overflow-hidden">
        <div className="specular-sheen-top" />
        <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 relative z-10">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 p-0.5 shrink-0 shadow-md">
              <div className="w-full h-full bg-[#070d2b] rounded-[10px] flex items-center justify-center p-0.5">
                <KeopicLogo className="w-full h-full" />
              </div>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400">KEOPIC ADMIN</span>
              <h2 className="text-xs font-black text-white leading-tight">Control Center</h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 font-bold text-xs border border-slate-700/50 transition cursor-pointer flex items-center gap-1"
              title="Minimize Admin Panel to Ledger"
            >
              <span>Minimize</span>
              <X className="w-3.5 h-3.5" />
            </button>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-bold text-xs border border-rose-400/25 transition cursor-pointer flex items-center gap-1"
                title="Log Out Administrator"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {/* Horizontal Scrollable Tabs Bar for Mobile */}
        <div className="px-2 pb-2.5 overflow-x-auto no-scrollbar flex items-center gap-1.5 border-t border-indigo-500/10 pt-2">
          {[
            { id: 'analytics', label: 'Analytics', icon: BarChart3, color: 'text-indigo-400' },
            { id: 'attendance', label: 'Attendance', icon: Calendar, color: 'text-cyan-400' },
            { id: 'activity_logs', label: 'Live Logs', icon: Activity, color: 'text-emerald-400' },
            { id: 'employees_erp', label: 'Employee IDs', icon: Users, color: 'text-cyan-400', count: staffAccounts.length },
            { id: 'branches_erp', label: 'Branches', icon: Building, color: 'text-rose-400', count: branches.length },
            { id: 'stock_erp', label: 'Stock', icon: Package, color: 'text-amber-400' },
            { id: 'sales_erp', label: 'Sales', icon: TrendingUp, color: 'text-emerald-400' },
            { id: 'ratings_erp', label: 'Scorecard', icon: Award, color: 'text-amber-300' },
            { id: 'reports_erp', label: 'Reports', icon: FileSpreadsheet, color: 'text-cyan-300' },
            { id: 'backup_erp', label: 'JSON Backup', icon: Database, color: 'text-purple-400' },
            { id: 'chat', label: 'Staff Chat', icon: MessageSquare, color: 'text-cyan-400', badge: totalUnreadChatMessages },
            { id: 'records', label: 'Submissions', icon: Calendar, color: 'text-indigo-400', count: records.length },
            { id: 'staff_accounts', label: 'Staff Pins', icon: Shield, color: 'text-emerald-400' },
            { id: 'payroll', label: 'Payroll', icon: DollarSign, color: 'text-emerald-400' },
            { id: 'counters', label: 'Compare', icon: Layers, color: 'text-purple-400' },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/30 border border-cyan-400/30'
                    : 'bg-[#0f1742]/80 text-slate-300 hover:text-white border border-indigo-500/20'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : tab.color}`} />
                <span>{tab.label}</span>
                {tab.badge && tab.badge > 0 ? (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                ) : null}
                {tab.count !== undefined ? (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-indigo-900/60 text-cyan-300'}`}>
                    {tab.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </header>

      {/* LEFT SIDEBAR NAVIGATION (Desktop Only) */}
      <aside className="hidden md:flex md:w-64 lg:w-72 admin-glass-panel border-r border-white/10 flex-col shrink-0 z-30 shadow-2xl relative overflow-hidden">
        <div className="specular-sheen-top" />
        
        {/* Brand Console Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20 shrink-0">
              <div className="w-full h-full bg-[#070d2b] rounded-[14px] flex items-center justify-center p-1">
                <KeopicLogo className="w-full h-full" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-500/15 px-2 py-0.5 rounded-full border border-cyan-400/25">
                  KEOPIC PRO
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              </div>
              <h2 className="text-sm font-extrabold text-white tracking-tight mt-0.5">Admin Console</h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/50 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="Minimize Admin Console"
            >
              <span className="hidden lg:inline">Minimize</span>
              <X className="w-4 h-4" />
            </button>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-400/25 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                title="Sign Out Administrator"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Sidebar Navigation Items */}
        <div className="p-3.5 space-y-1.5 flex-1 overflow-y-auto custom-scrollbar">
          
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`w-full px-4 py-3 rounded-2xl text-xs font-black transition flex items-center justify-between cursor-pointer group ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-indigo-950/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <BarChart3 className={`w-4 h-4 ${activeTab === 'analytics' ? 'text-white' : 'text-cyan-400'}`} />
              <span>Executive Analytics</span>
            </div>
            <ChevronRight className={`w-4 h-4 transition ${activeTab === 'analytics' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`} />
          </button>

          {/* ERP MANAGEMENT SECTION HEADER */}
          <div className="pt-2 pb-1 px-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400/80">ERP System</span>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('employees_erp')}
            className={`w-full px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center justify-between cursor-pointer group ${
              activeTab === 'employees_erp'
                ? 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-indigo-950/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className={`w-4 h-4 ${activeTab === 'employees_erp' ? 'text-white' : 'text-cyan-400'}`} />
              <span>Employee IDs</span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold">
              {staffAccounts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`w-full px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center justify-between cursor-pointer group ${
              activeTab === 'attendance'
                ? 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-indigo-950/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <Calendar className={`w-4 h-4 ${activeTab === 'attendance' ? 'text-white' : 'text-cyan-400'}`} />
              <span>Attendance Tracker</span>
            </div>
            <ChevronRight className={`w-4 h-4 transition ${activeTab === 'attendance' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`} />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('activity_logs')}
            className={`w-full px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center justify-between cursor-pointer group ${
              activeTab === 'activity_logs'
                ? 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-indigo-950/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <Activity className={`w-4 h-4 ${activeTab === 'activity_logs' ? 'text-white' : 'text-emerald-400'}`} />
              <span>Audit & Live Logs</span>
            </div>
            <ChevronRight className={`w-4 h-4 transition ${activeTab === 'activity_logs' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`} />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('branches_erp')}
            className={`w-full px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center justify-between cursor-pointer group ${
              activeTab === 'branches_erp'
                ? 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-indigo-950/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <Building className={`w-4 h-4 ${activeTab === 'branches_erp' ? 'text-white' : 'text-rose-400'}`} />
              <span>Branch Management</span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold">
              {branches.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stock_erp')}
            className={`w-full px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center justify-between cursor-pointer group ${
              activeTab === 'stock_erp'
                ? 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-indigo-950/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <Package className={`w-4 h-4 ${activeTab === 'stock_erp' ? 'text-white' : 'text-amber-400'}`} />
              <span>Stock & Inventory</span>
            </div>
            <ChevronRight className={`w-4 h-4 transition ${activeTab === 'stock_erp' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`} />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sales_erp')}
            className={`w-full px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center justify-between cursor-pointer group ${
              activeTab === 'sales_erp'
                ? 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-indigo-950/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <TrendingUp className={`w-4 h-4 ${activeTab === 'sales_erp' ? 'text-white' : 'text-emerald-400'}`} />
              <span>Sales Growth</span>
            </div>
            <ChevronRight className={`w-4 h-4 transition ${activeTab === 'sales_erp' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`} />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ratings_erp')}
            className={`w-full px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center justify-between cursor-pointer group ${
              activeTab === 'ratings_erp'
                ? 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-indigo-950/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <Award className={`w-4 h-4 ${activeTab === 'ratings_erp' ? 'text-white' : 'text-amber-300'}`} />
              <span>Employee Scorecard</span>
            </div>
            <ChevronRight className={`w-4 h-4 transition ${activeTab === 'ratings_erp' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`} />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports_erp')}
            className={`w-full px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center justify-between cursor-pointer group ${
              activeTab === 'reports_erp'
                ? 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-indigo-950/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileSpreadsheet className={`w-4 h-4 ${activeTab === 'reports_erp' ? 'text-white' : 'text-cyan-300'}`} />
              <span>Enterprise Reports</span>
            </div>
            <ChevronRight className={`w-4 h-4 transition ${activeTab === 'reports_erp' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`} />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup_erp')}
            className={`w-full px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center justify-between cursor-pointer group ${
              activeTab === 'backup_erp'
                ? 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-indigo-950/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <Database className={`w-4 h-4 ${activeTab === 'backup_erp' ? 'text-white' : 'text-purple-400'}`} />
              <span>JSON Backup & Restore</span>
            </div>
            <ChevronRight className={`w-4 h-4 transition ${activeTab === 'backup_erp' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`} />
          </button>

          <div className="pt-2 pb-1 px-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400/80">Operations</span>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`w-full px-4 py-3 rounded-2xl text-xs font-black transition flex items-center justify-between cursor-pointer group ${
              activeTab === 'chat'
                ? 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-indigo-950/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <MessageSquare className={`w-4 h-4 ${activeTab === 'chat' ? 'text-white' : 'text-cyan-400'}`} />
              <span>Live Staff Chat</span>
            </div>
            {totalUnreadChatMessages > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-mono font-extrabold shadow-md animate-pulse">
                {totalUnreadChatMessages} New
              </span>
            ) : (
              <ChevronRight className={`w-4 h-4 transition ${activeTab === 'chat' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`} />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('records')}
            className={`w-full px-4 py-3 rounded-2xl text-xs font-black transition flex items-center justify-between cursor-pointer group ${
              activeTab === 'records'
                ? 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-indigo-950/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText className={`w-4 h-4 ${activeTab === 'records' ? 'text-white' : 'text-purple-400'}`} />
              <span>Cloud Submissions</span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold">
              {records.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('staff_accounts')}
            className={`w-full px-4 py-3 rounded-2xl text-xs font-black transition flex items-center justify-between cursor-pointer group ${
              activeTab === 'staff_accounts'
                ? 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-indigo-950/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className={`w-4 h-4 ${activeTab === 'staff_accounts' ? 'text-white' : 'text-emerald-400'}`} />
              <span>Staff & Counters</span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
              {staffAccounts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payroll')}
            className={`w-full px-4 py-3 rounded-2xl text-xs font-black transition flex items-center justify-between cursor-pointer group ${
              activeTab === 'payroll'
                ? 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-indigo-950/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <DollarSign className={`w-4 h-4 ${activeTab === 'payroll' ? 'text-white' : 'text-amber-400'}`} />
              <span>Payroll & Payslips</span>
            </div>
            <ChevronRight className={`w-4 h-4 transition ${activeTab === 'payroll' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`} />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('counters')}
            className={`w-full px-4 py-3 rounded-2xl text-xs font-black transition flex items-center justify-between cursor-pointer group ${
              activeTab === 'counters'
                ? 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-indigo-950/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <Building className={`w-4 h-4 ${activeTab === 'counters' ? 'text-white' : 'text-rose-400'}`} />
              <span>Branch Comparison</span>
            </div>
            <ChevronRight className={`w-4 h-4 transition ${activeTab === 'counters' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`} />
          </button>

        </div>

        {/* Sidebar Bottom Executive Profile Card */}
        <div className="p-4 m-3 admin-glass-tile rounded-2xl space-y-2.5 shadow-lg relative overflow-hidden">
          <div className="specular-sheen-top" />
          <div className="flex items-center gap-2.5 relative z-10">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-indigo-600 p-0.5 shrink-0 shadow-md">
              <div className="w-full h-full bg-[#080e2f] rounded-[10px] flex items-center justify-center text-cyan-300 font-black text-xs">
                AS
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black text-white truncate">Arvind Kumar Sharma</div>
              <div className="text-[10px] text-cyan-300 font-mono flex items-center gap-1">
                <span>📍 Connaught Place</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 space-y-1.5 text-[11px] text-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Total Store Sales:</span>
              <span className="font-mono font-bold text-amber-300">₹{formatMoney(overallStats.grandGrossSales)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Standard Shift:</span>
              <span className="font-mono font-bold text-emerald-400">9h / Day</span>
            </div>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="w-full mt-2 py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-400/25 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out Admin</span>
            </button>
          )}
        </div>

      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

        {/* Scrollable Tab Views Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.995 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="space-y-6"
            >
              {/* TAB 1: EXECUTIVE ANALYTICS */}
              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  {/* Section Top Control Header */}
              <div className="admin-glass-panel p-4 rounded-3xl flex flex-wrap items-center justify-between gap-3 shadow-xl relative overflow-hidden">
                <div className="specular-sheen-top" />
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-indigo-600 p-0.5 shrink-0 shadow-md">
                    <div className="w-full h-full bg-[#080d2c] rounded-[10px] flex items-center justify-center text-cyan-300">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-white tracking-tight">Executive Analytics</h2>
                    <p className="text-[11px] text-slate-400 font-medium">Business revenue, incentive slabs & performance metrics</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 admin-glass-tile rounded-xl px-2.5 py-1.5 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
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

                  <div className="flex items-center gap-1.5 admin-glass-tile rounded-xl px-2.5 py-1.5 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <select
                      value={selectedLocationFilter}
                      onChange={e => setSelectedLocationFilter(e.target.value)}
                      className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-xs"
                    >
                      <option value="ALL" className="bg-[#0b1238]">All Branches</option>
                      {availableLocations.map(loc => (
                        <option key={loc} value={loc} className="bg-[#0b1238]">{loc}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={fetchCloudRecords}
                    disabled={isLoading}
                    className="p-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-400/25 transition cursor-pointer"
                    title="Refresh Data"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={handleExportMonthExcel}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-extrabold text-xs border border-emerald-400/25 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Export</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-extrabold text-xs border border-rose-400/25 transition cursor-pointer flex items-center gap-1"
                    title="Close Admin Panel"
                  >
                    <span className="hidden sm:inline">Close</span>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Metric Hero Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Card 1: Gross Sales */}
                <div className="admin-glass-tile p-5 rounded-3xl relative overflow-hidden group shadow-xl hover:border-cyan-400/50 transition duration-300">
                  <div className="specular-sheen-top" />
                  <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-500/15 rounded-full blur-2xl group-hover:bg-cyan-500/25 transition"></div>
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-[11px] font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                      <CircleDollarSign className="w-4 h-4 text-cyan-400" />
                      Gross Revenue
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold border border-cyan-400/25">
                      {selectedMonthFilter === 'ALL' ? 'Total All Time' : selectedMonthFilter}
                    </span>
                  </div>
                  <div className="mt-3 text-2xl font-black text-white font-mono tracking-tight relative z-10">
                    ₹{formatMoney(selectedMonthStats.grandGrossSales)}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 relative z-10">
                    <span>Stands: <strong className="text-cyan-300">{selectedMonthStats.totalStandUnits}</strong></span>
                    <span>•</span>
                    <span>Magnets: <strong className="text-purple-300">{selectedMonthStats.totalMagnetUnits}</strong></span>
                  </p>
                </div>

                {/* Card 2: Staff Commissions / Incentives */}
                <div className="admin-glass-tile p-5 rounded-3xl relative overflow-hidden group shadow-xl hover:border-purple-400/50 transition duration-300">
                  <div className="specular-sheen-top" />
                  <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/15 rounded-full blur-2xl group-hover:bg-purple-500/25 transition"></div>
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-[11px] font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      Incentives Earned
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold border border-purple-400/25">
                      Staff Incentive
                    </span>
                  </div>
                  <div className="mt-3 text-2xl font-black text-purple-200 font-mono tracking-tight relative z-10">
                    ₹{formatMoney(selectedMonthStats.grandCommissions, 2)}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 relative z-10">
                    Commission payout based on unit slab rates
                  </p>
                </div>

                {/* Card 3: Net Payable Salary */}
                <div className="admin-glass-tile p-5 rounded-3xl relative overflow-hidden group shadow-xl hover:border-amber-400/50 transition duration-300">
                  <div className="specular-sheen-top" />
                  <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/15 rounded-full blur-2xl group-hover:bg-amber-500/25 transition"></div>
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-amber-400" />
                      Net Salary Payable
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-400/25">
                      Net Payout
                    </span>
                  </div>
                  <div className="mt-3 text-2xl font-black text-amber-300 font-mono tracking-tight relative z-10">
                    ₹{formatMoney(selectedMonthStats.grandFinalPayable, 2)}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 relative z-10">
                    Includes basic salary + incentive + bonuses
                  </p>
                </div>

                {/* Card 4: Active Staff & Logged Submissions */}
                <div className="admin-glass-tile p-5 rounded-3xl relative overflow-hidden group shadow-xl hover:border-emerald-400/50 transition duration-300">
                  <div className="specular-sheen-top" />
                  <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/15 rounded-full blur-2xl group-hover:bg-emerald-500/25 transition"></div>
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-emerald-400" />
                      Active Submissions
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-400/25">
                      {selectedMonthStats.staffCount} Staff
                    </span>
                  </div>
                  <div className="mt-3 text-2xl font-black text-emerald-300 font-mono tracking-tight relative z-10">
                    {selectedMonthStats.submissionCount} Records
                  </div>
                  <p className="text-xs text-slate-400 mt-1 relative z-10">
                    Total <strong className="text-emerald-400">{selectedMonthStats.totalDaysLogged}</strong> daily shift logs recorded
                  </p>
                </div>

              </div>

              {/* Interactive Recharts Analytics Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Chart 1: Monthly Sales & Incentive Trend Area Chart */}
                <div className="lg:col-span-2 admin-glass-panel rounded-3xl p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden">
                  <div className="specular-sheen-top" />
                  <div className="flex items-center justify-between relative z-10">
                    <div>
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-cyan-400" />
                        <span>Monthly Growth Trend</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">Historical gross sales and staff commission growth across months</p>
                    </div>
                    <span className="px-3 py-1 rounded-xl admin-glass-tile text-indigo-300 text-xs font-mono font-bold border border-indigo-400/25">
                      {monthlyTrendData.length} Month(s) Recorded
                    </span>
                  </div>

                  <div className="h-72 w-full mt-4 relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorIncentive" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e295d" opacity={0.5} />
                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                        <Tooltip content={({ active, payload, label }: any) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="admin-glass-tile p-3 rounded-xl border border-white/20 shadow-2xl text-white text-xs">
                                <p className="font-extrabold text-cyan-400 mb-1 uppercase tracking-wider">{label}</p>
                                <div className="space-y-1">
                                  {payload.map((entry: any, index: number) => (
                                    <div key={index} className="flex items-center justify-between gap-4 font-mono font-bold">
                                      <span style={{ color: entry.color }}>{entry.name}:</span>
                                      <span>₹{formatMoney(entry.value)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Area type="monotone" dataKey="grossSales" name="Gross Sales (₹)" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                        <Area type="monotone" dataKey="incentives" name="Incentive Earned (₹)" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorIncentive)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: Product Mix Donut Chart */}
                <div className="admin-glass-panel rounded-3xl p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden">
                  <div className="specular-sheen-top" />
                  <div className="relative z-10">
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                      <span>Product Revenue Mix</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Distribution between Stands, Magnets, & Frames</p>
                  </div>

                  <div className="h-56 w-full relative my-2 z-10">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={productMixData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {productMixData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} stroke="#080d2c" strokeWidth={3} />
                          ))}
                        </Pie>
                        <Tooltip content={({ active, payload }: any) => {
                          if (active && payload && payload.length) {
                            const item = payload[0];
                            return (
                              <div className="admin-glass-tile p-3 rounded-xl border border-white/20 shadow-2xl text-white text-xs">
                                <p className="font-bold text-cyan-400">{item.name}</p>
                                <p className="font-mono font-black text-white mt-0.5">₹{formatMoney(item.value)}</p>
                              </div>
                            );
                          }
                          return null;
                        }} />
                      </PieChart>
                    </ResponsiveContainer>
                    
                    {/* Center Stat */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400">Total Units</span>
                      <span className="text-lg font-black text-white font-mono">
                        {selectedMonthStats.totalStandUnits + selectedMonthStats.totalMagnetUnits}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/10 relative z-10">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                        <span className="text-slate-300 font-semibold">Stands (₹200)</span>
                      </div>
                      <span className="font-mono font-bold text-cyan-300">{selectedMonthStats.totalStandUnits} units</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
                        <span className="text-slate-300 font-semibold">Magnets (₹250)</span>
                      </div>
                      <span className="font-mono font-bold text-purple-300">{selectedMonthStats.totalMagnetUnits} units</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-pink-400"></span>
                        <span className="text-slate-300 font-semibold">Frames</span>
                      </div>
                      <span className="font-mono font-bold text-pink-300">₹{formatMoney(selectedMonthStats.totalFrameRevenue)}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Staff Performance Leaderboard Table */}
              <div className="admin-glass-panel rounded-3xl p-6 shadow-2xl space-y-4 relative overflow-hidden">
                <div className="specular-sheen-top" />
                <div className="flex items-center justify-between flex-wrap gap-2 relative z-10">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-400" />
                      <span>Staff Sales Leaderboard</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Top performing employees ranked by gross revenue</p>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-amber-500/15 text-amber-300 text-xs font-mono font-bold border border-amber-400/20">
                    {staffLeaderboard.length} Staff Accounts
                  </span>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs min-w-[720px]">
                    <thead>
                      <tr className="border-b border-indigo-500/20 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider">
                        <th className="py-3 px-3">Rank & Staff</th>
                        <th className="py-3 px-3">Counter Branch</th>
                        <th className="py-3 px-3 text-center">Work Shift Hours</th>
                        <th className="py-3 px-3 text-center">Units Sold</th>
                        <th className="py-3 px-3 text-right">Gross Sales</th>
                        <th className="py-3 px-3 text-right">Incentive</th>
                        <th className="py-3 px-3 text-right">Net Payable</th>
                        <th className="py-3 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-500/10">
                      {staffLeaderboard.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-500 text-xs italic">
                            No staff submissions found for the selected filter.
                          </td>
                        </tr>
                      ) : (
                        staffLeaderboard.map((s, idx) => {
                          const isTop3 = idx < 3;
                          return (
                            <tr key={s.id} className="hover:bg-indigo-950/40 transition">
                              <td className="py-3.5 px-3">
                                <div className="flex items-center gap-3">
                                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-black text-[11px] ${
                                    idx === 0 ? 'bg-amber-400 text-slate-950' : idx === 1 ? 'bg-slate-300 text-slate-950' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                                  }`}>
                                    {idx + 1}
                                  </span>

                                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 shrink-0">
                                    {s.profilePic ? (
                                      <img src={s.profilePic} alt="Profile" className="w-full h-full object-cover rounded-[10px]" />
                                    ) : (
                                      <div className="w-full h-full bg-[#080d2c] rounded-[10px] flex items-center justify-center font-bold text-xs text-cyan-300 uppercase">
                                        {s.empName.slice(0, 2)}
                                      </div>
                                    )}
                                  </div>

                                  <div>
                                    <span className="font-bold text-white block">{s.empName}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">{s.monthVal}</span>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-3">
                                <span className="px-2.5 py-1 rounded-xl bg-indigo-500/15 text-indigo-300 text-[11px] font-bold border border-indigo-400/20">
                                  📍 {s.locVal}
                                </span>
                              </td>

                              <td className="py-3.5 px-3 text-center">
                                <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-mono text-[11px] font-bold border border-cyan-400/30">
                                  ⏱️ {s.totalWorkHoursFormatted}
                                </span>
                              </td>

                              <td className="py-3.5 px-3 text-center">
                                <div className="font-mono font-bold text-slate-200">
                                  {s.totalUnits} <span className="text-[10px] text-slate-400">({s.standUnits}S + {s.magnetUnits}M)</span>
                                </div>
                              </td>

                              <td className="py-3.5 px-3 text-right font-mono font-black text-cyan-300">
                                ₹{formatMoney(s.grossSales)}
                              </td>

                              <td className="py-3.5 px-3 text-right font-mono font-bold text-purple-300">
                                ₹{formatMoney(s.totalIncentive, 2)}
                              </td>

                              <td className="py-3.5 px-3 text-right font-mono font-black text-emerald-400">
                                ₹{formatMoney(s.finalPayable, 2)}
                              </td>

                              <td className="py-3.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const rec = records.find(r => r.id === s.id);
                                    if (rec) setSelectedRecord(rec);
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[11px] font-bold border border-cyan-400/30 transition cursor-pointer"
                                >
                                  Inspect
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ERP TAB 1: EMPLOYEE MANAGEMENT */}
          {activeTab === 'employees_erp' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <EmployeeManager
                staffAccounts={staffAccounts}
                setStaffAccounts={setStaffAccounts}
                branches={branches}
                triggerToast={triggerToast}
              />
            </motion.div>
          )}

          {/* ERP TAB 2: BRANCH MANAGEMENT */}
          {activeTab === 'branches_erp' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <BranchManager
                branches={branches}
                setBranches={setBranches}
                staffAccounts={staffAccounts}
                setStaffAccounts={setStaffAccounts}
                stockItems={stockItems}
                triggerToast={triggerToast}
              />
            </motion.div>
          )}

          {/* ERP TAB 3: STOCK & INVENTORY */}
          {activeTab === 'stock_erp' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <StockInventoryManager
                stockItems={stockItems}
                setStockItems={setStockItems}
                transferLogs={transferLogs}
                setTransferLogs={setTransferLogs}
                branches={branches}
                triggerToast={triggerToast}
              />
            </motion.div>
          )}

          {/* ERP TAB 4: SALES GROWTH ANALYTICS */}
          {activeTab === 'sales_erp' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <SalesAnalyticsDashboard
                records={records}
                branches={branches}
                selectedMonthFilter={selectedMonthFilter}
                setSelectedMonthFilter={setSelectedMonthFilter}
              />
            </motion.div>
          )}

          {/* ERP TAB 5: EMPLOYEE PERFORMANCE SCORECARD */}
          {activeTab === 'ratings_erp' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <EmployeePerformanceView
                records={records}
                staffAccounts={staffAccounts}
                setStaffAccounts={setStaffAccounts}
                selectedMonthFilter={selectedMonthFilter}
                triggerToast={triggerToast}
              />
            </motion.div>
          )}

          {/* ERP TAB 6: ENTERPRISE REPORTS & EXPORTS */}
          {activeTab === 'reports_erp' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <EnterpriseReportsManager
                records={records}
                staffAccounts={staffAccounts}
                branches={branches}
                stockItems={stockItems}
                triggerToast={triggerToast}
              />
            </motion.div>
          )}

          {/* ERP TAB 7: JSON BACKUP & RESTORE */}
          {activeTab === 'backup_erp' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <JsonBackupManager
                records={records}
                staffAccounts={staffAccounts}
                branches={branches}
                stockItems={stockItems}
                triggerToast={triggerToast}
              />
            </motion.div>
          )}

          {/* ERP TAB: ATTENDANCE TRACKER */}
          {activeTab === 'attendance' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <AttendanceManager
                records={records}
                branches={branches}
                selectedMonthFilter={selectedMonthFilter}
                setSelectedMonthFilter={setSelectedMonthFilter}
                triggerToast={triggerToast}
              />
            </motion.div>
          )}

          {/* ERP TAB: AUDIT & ACTIVITY LOGS */}
          {activeTab === 'activity_logs' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ActivityLogsTab />
            </motion.div>
          )}

          {/* TAB 2: LIVE STAFF CHAT */}
          {activeTab === 'chat' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="bg-[#080d2c] p-4 rounded-3xl border border-indigo-500/20 flex items-center justify-between gap-3 shadow-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-indigo-600 p-0.5 shrink-0 shadow-md">
                    <div className="w-full h-full bg-[#080d2c] rounded-[10px] flex items-center justify-center text-cyan-300">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-2">
                      <span>Live Staff Chat Channels</span>
                      {totalUnreadChatMessages > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-mono font-black animate-pulse">
                          {totalUnreadChatMessages} New
                        </span>
                      )}
                    </h2>
                    <p className="text-[11px] text-slate-400 font-medium">Real-time messaging with counter staff</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchCloudRecords}
                    disabled={isLoading}
                    className="p-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-400/25 transition cursor-pointer"
                    title="Refresh Chat Data"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-extrabold text-xs border border-rose-400/25 transition cursor-pointer flex items-center gap-1"
                    title="Close Admin Panel"
                  >
                    <span className="hidden sm:inline">Close</span>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <AdminChatTab
                records={records}
                onSelectStaffForDetail={(rec) => {
                  setSelectedRecord(rec);
                  setActiveTab('records');
                }}
              />
            </motion.div>
          )}

          {/* TAB 3: CLOUD SUBMISSIONS LEDGER */}
          {activeTab === 'records' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Top Control Header Bar */}
              <div className="bg-[#080d2c] p-4 rounded-3xl border border-indigo-500/20 flex flex-wrap items-center justify-between gap-3 shadow-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-400 to-indigo-600 p-0.5 shrink-0 shadow-md">
                    <div className="w-full h-full bg-[#080d2c] rounded-[10px] flex items-center justify-center text-purple-300">
                      <FileText className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-white tracking-tight">Cloud Submissions Ledger</h2>
                    <p className="text-[11px] text-slate-400 font-medium">All daily sales & attendance entries submitted by staff</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-[#0e1747] border border-indigo-500/20 rounded-xl px-2.5 py-1.5 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
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

                  <div className="flex items-center gap-1.5 bg-[#0e1747] border border-indigo-500/20 rounded-xl px-2.5 py-1.5 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <select
                      value={selectedLocationFilter}
                      onChange={e => setSelectedLocationFilter(e.target.value)}
                      className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-xs"
                    >
                      <option value="ALL" className="bg-[#0b1238]">All Branches</option>
                      {availableLocations.map(loc => (
                        <option key={loc} value={loc} className="bg-[#0b1238]">{loc}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={fetchCloudRecords}
                    disabled={isLoading}
                    className="p-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-400/25 transition cursor-pointer"
                    title="Refresh Data"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-extrabold text-xs border border-rose-400/25 transition cursor-pointer flex items-center gap-1"
                    title="Close Admin Panel"
                  >
                    <span className="hidden sm:inline">Close</span>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="bg-[#080d2c] p-4 rounded-3xl border border-indigo-500/20 flex flex-wrap items-center justify-between gap-3 shadow-xl">
                <div className="flex-1 min-w-[240px] relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by staff name, location, or record ID..."
                    className="w-full bg-[#10173d] border border-indigo-500/30 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedMonthFilter('ALL');
                      setSelectedLocationFilter('ALL');
                    }}
                    className="px-3.5 py-2.5 rounded-2xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 text-xs font-bold border border-indigo-400/20 transition cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>

              {/* Submissions Table */}
              <div className="bg-[#080d2c] rounded-3xl border border-indigo-500/20 overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-indigo-500/20 flex items-center justify-between">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span>Cloud Submissions Records ({filteredRecords.length})</span>
                  </h3>

                  <button
                    type="button"
                    onClick={handleExportMonthExcel}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-400/30 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Excel</span>
                  </button>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs min-w-[780px]">
                    <thead>
                      <tr className="bg-[#0b1238] border-b border-indigo-500/20 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider">
                        <th className="py-3 px-4">Staff Member</th>
                        <th className="py-3 px-4">Branch</th>
                        <th className="py-3 px-4">Month</th>
                        <th className="py-3 px-4 text-center">Logged Days</th>
                        <th className="py-3 px-4 text-right">Gross Sales</th>
                        <th className="py-3 px-4 text-right">Incentive</th>
                        <th className="py-3 px-4 text-right">Net Salary</th>
                        <th className="py-3 px-4 text-center">Last Updated</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-500/10">
                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-500 text-xs italic">
                            No cloud ledger submissions found matching active filters.
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.map(rec => {
                          const data = rec.data;
                          const empName = data.meta?.empName || 'Staff Member';
                          const monthVal = data.meta?.monthVal || '-';
                          const locVal = data.meta?.locVal || 'Main Counter';
                          const baseSalary = data.meta?.baseSalary || 17000;
                          const entries = data.entries || [];
                          const targets = data.targets || [];
                          const payments = data.payments || [];

                          const calc = performCalculations(entries, targets, payments, baseSalary, monthVal);
                          const pic = data.meta?.profilePic;

                          return (
                            <tr key={rec.id} className="hover:bg-indigo-950/40 transition">
                              <td className="py-3.5 px-4 font-bold text-white">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 shrink-0">
                                    {pic ? (
                                      <img src={pic} alt="Profile" className="w-full h-full object-cover rounded-[10px]" />
                                    ) : (
                                      <div className="w-full h-full bg-[#080d2c] rounded-[10px] flex items-center justify-center font-bold text-xs text-cyan-300 uppercase">
                                        {empName.slice(0, 2)}
                                      </div>
                                    )}
                                  </div>
                                  <span>{empName}</span>
                                </div>
                              </td>

                              <td className="py-3.5 px-4 text-slate-300">📍 {locVal}</td>

                              <td className="py-3.5 px-4 font-mono font-bold text-cyan-300">{monthVal}</td>

                              <td className="py-3.5 px-4 text-center font-mono">
                                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200 text-[11px] font-bold">
                                  {entries.length} Days
                                </span>
                              </td>

                              <td className="py-3.5 px-4 text-right font-mono font-black text-white">
                                ₹{formatMoney(calc.grossSales)}
                              </td>

                              <td className="py-3.5 px-4 text-right font-mono font-bold text-purple-300">
                                ₹{formatMoney(calc.totalIncentive, 2)}
                              </td>

                              <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-400">
                                ₹{formatMoney(calc.finalPayable, 2)}
                              </td>

                              <td className="py-3.5 px-4 text-center text-[10px] text-slate-400 font-mono">
                                {data.updatedAt ? new Date(data.updatedAt).toLocaleDateString() : '-'}
                              </td>

                              <td className="py-3.5 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedRecord(rec)}
                                    className="px-3 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[11px] font-bold border border-cyan-400/30 transition cursor-pointer"
                                  >
                                    View Full
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setRecordToDelete(rec)}
                                    className="p-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-400/30 transition cursor-pointer"
                                    title="Delete Submission Record"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </motion.div>
          )}

          {/* TAB 4: STAFF & COUNTER ACCESS CONTROL */}
          {activeTab === 'staff_accounts' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Top Control Header */}
              <div className="bg-[#080d2c] p-4 rounded-3xl border border-indigo-500/20 flex items-center justify-between gap-3 shadow-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-600 p-0.5 shrink-0 shadow-md">
                    <div className="w-full h-full bg-[#080d2c] rounded-[10px] flex items-center justify-center text-emerald-300">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-white tracking-tight">Staff Accounts & Access</h2>
                    <p className="text-[11px] text-slate-400 font-medium">Manage counter passcodes, location permissions & credentials</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchCloudRecords}
                    disabled={isLoading}
                    className="p-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-400/25 transition cursor-pointer"
                    title="Refresh Staff Data"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-extrabold text-xs border border-rose-400/25 transition cursor-pointer flex items-center gap-1"
                    title="Close Admin Panel"
                  >
                    <span className="hidden sm:inline">Close</span>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Staff Account Creator Card */}
              <div className="bg-[#080d2c] rounded-3xl p-6 border border-indigo-500/20 shadow-2xl space-y-4">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-emerald-400" />
                    <span>Create New Staff Credentials</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Issue new staff access with unique passcode and counter assignment</p>
                </div>

                <form onSubmit={handleCreateStaffAccount} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Staff Full Name</label>
                    <input
                      type="text"
                      value={newStaffName}
                      onChange={e => setNewStaffName(e.target.value)}
                      placeholder="e.g., Rahul Sharma"
                      className="w-full bg-[#10173d] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Counter Branch Location</label>
                    <input
                      type="text"
                      value={newStaffLocation}
                      onChange={e => setNewStaffLocation(e.target.value)}
                      placeholder="e.g., Main Counter / Mall Counter"
                      className="w-full bg-[#10173d] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Login Username</label>
                    <input
                      type="text"
                      value={newStaffUsername}
                      onChange={e => setNewStaffUsername(e.target.value)}
                      placeholder="e.g., rahul_counter1"
                      className="w-full bg-[#10173d] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Login Password</label>
                    <input
                      type="text"
                      value={newStaffPassword}
                      onChange={e => setNewStaffPassword(e.target.value)}
                      placeholder="Set strong password"
                      className="w-full bg-[#10173d] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Staff Access Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newStaffCode}
                        onChange={e => setNewStaffCode(e.target.value)}
                        placeholder="e.g., STF-8492"
                        className="flex-1 bg-[#10173d] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                      />
                      <button
                        type="button"
                        onClick={handleGenerateCode}
                        className="px-3 py-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-bold border border-indigo-400/30 transition cursor-pointer"
                      >
                        Auto
                      </button>
                    </div>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/25 hover:brightness-110 transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Create Staff Account</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Staff Accounts Cards Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span>Active Staff Credentials & Access Cards ({staffAccounts.length})</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {staffAccounts.length === 0 ? (
                    <div className="col-span-full p-8 text-center text-slate-500 text-xs italic bg-[#080d2c] rounded-3xl border border-indigo-500/20">
                      No staff accounts generated yet.
                    </div>
                  ) : (
                    staffAccounts.map(acc => {
                      const showPass = !!visiblePasswords[acc.id];
                      return (
                        <div
                          key={acc.id}
                          className="bg-[#080d2c] rounded-3xl p-5 border border-indigo-500/20 shadow-xl space-y-3 relative flex flex-col justify-between"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-extrabold text-white">{acc.empName}</h4>
                              <p className="text-xs text-slate-400 mt-0.5">📍 {acc.location}</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleStaffActive(acc.id)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border transition cursor-pointer ${
                                acc.isActive
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-400/30'
                              }`}
                            >
                              {acc.isActive ? 'Permission: Active' : 'Permission: Revoked'}
                            </button>
                          </div>

                          <div className="bg-[#0f1742] p-3 rounded-2xl border border-indigo-500/20 space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">Username:</span>
                              <span className="font-mono font-bold text-cyan-300">{acc.username}</span>
                            </div>

                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">Password:</span>
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className="font-bold text-purple-300">
                                  {showPass ? acc.password : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(acc.id)}
                                  className="p-1 text-slate-400 hover:text-white transition"
                                >
                                  {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>

                            <div className="flex justify-between items-center pt-1 border-t border-indigo-500/15">
                              <span className="text-slate-400">Access Code:</span>
                              <span className="font-mono font-black text-amber-300">{acc.code}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleCopyCredentials(acc)}
                              className="flex-1 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-bold border border-indigo-400/30 transition cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Credentials</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteStaffAccount(acc.id, acc.empName)}
                              className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-400/30 transition cursor-pointer"
                              title="Delete Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </motion.div>
          )}

          {/* TAB 5: PAYROLL & PAYSLIP MANAGER */}
          {activeTab === 'payroll' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Top Control Header */}
              <div className="bg-[#080d2c] p-4 rounded-3xl border border-indigo-500/20 flex flex-wrap items-center justify-between gap-3 shadow-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-600 p-0.5 shrink-0 shadow-md">
                    <div className="w-full h-full bg-[#080d2c] rounded-[10px] flex items-center justify-center text-amber-300">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-white tracking-tight">Payroll & Salary Payslips</h2>
                    <p className="text-[11px] text-slate-400 font-medium">Net salary breakdown, incentives & printable slips</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-[#0e1747] border border-indigo-500/20 rounded-xl px-2.5 py-1.5 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
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

                  <button
                    type="button"
                    onClick={fetchCloudRecords}
                    disabled={isLoading}
                    className="p-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-400/25 transition cursor-pointer"
                    title="Refresh Data"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-extrabold text-xs border border-rose-400/25 transition cursor-pointer flex items-center gap-1"
                    title="Close Admin Panel"
                  >
                    <span className="hidden sm:inline">Close</span>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-[#080d2c] rounded-3xl p-4 sm:p-6 border border-indigo-500/20 shadow-2xl">
                <PayrollManager
                  records={records}
                  selectedMonthFilter={selectedMonthFilter}
                  triggerToast={triggerToast}
                  onInspectRecord={(rec) => setSelectedRecord(rec)}
                />
              </div>
            </motion.div>
          )}

          {/* TAB 6: BRANCH COMPARISON */}
          {activeTab === 'counters' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Top Control Header */}
              <div className="bg-[#080d2c] p-4 rounded-3xl border border-indigo-500/20 flex flex-wrap items-center justify-between gap-3 shadow-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-400 to-pink-600 p-0.5 shrink-0 shadow-md">
                    <div className="w-full h-full bg-[#080d2c] rounded-[10px] flex items-center justify-center text-rose-300">
                      <Building className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-white tracking-tight">Branch & Counter Performance</h2>
                    <p className="text-[11px] text-slate-400 font-medium">Comparative analytics across store locations</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-[#0e1747] border border-indigo-500/20 rounded-xl px-2.5 py-1.5 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
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

                  <button
                    type="button"
                    onClick={fetchCloudRecords}
                    disabled={isLoading}
                    className="p-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-400/25 transition cursor-pointer"
                    title="Refresh Data"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-extrabold text-xs border border-rose-400/25 transition cursor-pointer flex items-center gap-1"
                    title="Close Admin Panel"
                  >
                    <span className="hidden sm:inline">Close</span>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-[#080d2c] rounded-3xl p-4 sm:p-6 border border-indigo-500/20 shadow-2xl">
                <BranchComparison
                  records={records}
                  selectedMonthFilter={selectedMonthFilter}
                />
              </div>
            </motion.div>
          )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* INSPECT DETAIL DRAWER MODAL */}
      <AnimatePresence>
        {selectedRecord && (
          <div className="fixed inset-0 z-50 glass-scrim flex items-center justify-center p-3 sm:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="liquid-glass-card rounded-3xl p-5 sm:p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl space-y-6 relative text-white border border-white/20"
            >
              <div className="specular-sheen-top" />
              {(() => {
                const data = selectedRecord.data;
                const empName = data.meta?.empName || 'Staff Member';
                const monthVal = data.meta?.monthVal || '-';
                const locVal = data.meta?.locVal || 'Main Counter';
                const baseSalary = data.meta?.baseSalary || 17000;
                const entries = data.entries || [];
                const targets = data.targets || [];
                const payments = data.payments || [];

                const calc = performCalculations(entries, targets, payments, baseSalary, monthVal);

                const handleExportInspectPDF = () => {
                  exportAndDownloadPDF(
                    entries,
                    targets,
                    payments,
                    {
                      empName,
                      monthVal,
                      locVal,
                      baseSalary,
                      profilePic: data.meta?.profilePic || ''
                    }
                  );
                  triggerToast('PDF Generated', `Downloaded ledger report for ${empName}`);
                };

                return (
                  <>
                    {/* Header */}
                    <div className="flex items-start justify-between border-b border-white/10 pb-4 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 shadow-md shrink-0">
                          {data.meta?.profilePic ? (
                            <img src={data.meta.profilePic} alt="Staff" className="w-full h-full object-cover rounded-[14px]" />
                          ) : (
                            <div className="w-full h-full bg-[#080d2c] rounded-[14px] flex items-center justify-center font-black text-sm text-cyan-300 uppercase">
                              {empName.slice(0, 2)}
                            </div>
                          )}
                        </div>

                        <div>
                          <h3 className="text-base font-black text-white">{empName}</h3>
                          <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>📍 {locVal}</span>
                            <span>•</span>
                            <span>🗓️ {monthVal}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleExportInspectPDF}
                          className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-400/30 transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Printer className="w-4 h-4" />
                          <span>PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedRecord(null)}
                          className="p-2 rounded-xl bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Stats Banner */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
                      <div className="p-3 admin-glass-tile rounded-2xl relative overflow-hidden">
                        <div className="specular-sheen-top" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase relative z-10">Gross Sales</span>
                        <p className="text-base font-black text-cyan-300 font-mono mt-0.5 relative z-10">₹{formatMoney(calc.grossSales)}</p>
                      </div>
                      <div className="p-3 admin-glass-tile rounded-2xl relative overflow-hidden">
                        <div className="specular-sheen-top" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase relative z-10">Incentive Earned</span>
                        <p className="text-base font-black text-purple-300 font-mono mt-0.5 relative z-10">₹{formatMoney(calc.totalIncentive, 2)}</p>
                      </div>
                      <div className="p-3 admin-glass-tile rounded-2xl relative overflow-hidden">
                        <div className="specular-sheen-top" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase relative z-10">Total Hours</span>
                        <p className="text-base font-black text-amber-300 font-mono mt-0.5 relative z-10">{getTotalHoursForEntries(entries).formatted}</p>
                      </div>
                      <div className="p-3 admin-glass-tile rounded-2xl relative overflow-hidden">
                        <div className="specular-sheen-top" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase relative z-10">Net Salary</span>
                        <p className="text-base font-black text-emerald-400 font-mono mt-0.5 relative z-10">₹{formatMoney(calc.finalPayable, 2)}</p>
                      </div>
                    </div>

                    {/* Table of Entries */}
                    <div className="space-y-2 relative z-10">
                      <h4 className="text-xs font-extrabold uppercase text-slate-300 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-cyan-400" />
                        <span>Day-by-Day Shift Ledger Entries</span>
                      </h4>

                      <div className="border border-white/10 rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-white/5 text-slate-400 uppercase text-[10px] font-extrabold">
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Day</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-3">Hours</th>
                              <th className="py-2.5 px-3 text-right">Stand (₹200)</th>
                              <th className="py-2.5 px-3 text-right">Magnet (₹250)</th>
                              <th className="py-2.5 px-3 text-right">Frame</th>
                              <th className="py-2.5 px-3 text-right">Incentive</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-indigo-500/10">
                            {entries.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-6 text-center text-slate-500 italic">No shift entries recorded for this month.</td>
                              </tr>
                            ) : (
                              entries.map((entry, idx) => {
                                const stand = Number(entry.stand || 0);
                                const magnet = Number(entry.magnet || 0);
                                const frame = Number(entry.frame || 0);
                                const totalDailySales = stand + magnet + frame;
                                let inc = 0;
                                if (entry.status === 'Present') {
                                  if (totalDailySales >= 500) {
                                    inc += (stand + magnet) * 0.10;
                                  }
                                  inc += frame * 0.07;
                                }
                                const hrs = calculateHoursWorked(entry.inTime, entry.outTime, entry.status);

                                return (
                                  <tr key={idx} className="hover:bg-indigo-950/40 transition">
                                    <td className="py-2 px-3 font-mono font-bold text-slate-200">{entry.date || entry.dateVal}</td>
                                    <td className="py-2 px-3 text-slate-400">{entry.day || '-'}</td>
                                    <td className="py-2 px-3">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                        entry.status === 'Present'
                                          ? 'bg-emerald-500/20 text-emerald-300'
                                          : entry.status === 'Week Off'
                                          ? 'bg-amber-500/20 text-amber-300'
                                          : 'bg-rose-500/20 text-rose-300'
                                      }`}>
                                        {entry.status || 'Present'}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 font-mono text-cyan-300">{hrs.formatted}</td>
                                    <td className="py-2 px-3 text-right font-mono">₹{formatMoney(stand)}</td>
                                    <td className="py-2 px-3 text-right font-mono">₹{formatMoney(magnet)}</td>
                                    <td className="py-2 px-3 text-right font-mono">₹{formatMoney(frame)}</td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">₹{formatMoney(inc, 2)}</td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Salary Breakdown & Settlement Card */}
                    <div className="bg-[#0f1742] p-4 rounded-2xl border border-indigo-500/20 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <h4 className="font-extrabold uppercase text-slate-300 mb-2">Salary Component Breakdown</h4>
                        <div className="space-y-1.5 text-slate-400">
                          <div className="flex justify-between">
                            <span>Base Monthly Salary:</span>
                            <span className="font-mono text-white">₹{formatMoney(calc.netEarnedSalary)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Sales Incentive Earned:</span>
                            <span className="font-mono text-emerald-400">₹{formatMoney(calc.totalIncentive, 2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Special Target Bonuses:</span>
                            <span className="font-mono text-purple-400">₹{formatMoney(calc.totalTargets)}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-indigo-500/20 font-bold text-amber-300">
                            <span>NET TOTAL SALARY PAYABLE:</span>
                            <span className="font-mono text-sm">₹{formatMoney(calc.finalPayable, 2)}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-extrabold uppercase text-slate-300 mb-2">Counter Store Settlement</h4>
                        <div className="space-y-1.5 text-slate-400">
                          <div className="flex justify-between">
                            <span>Gross Store Sales:</span>
                            <span className="font-mono text-white">₹{formatMoney(calc.grossSales)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Cash Transferred to Sir:</span>
                            <span className="font-mono text-rose-400">₹{formatMoney(calc.totalPaid)}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-indigo-500/20 font-bold text-cyan-300">
                            <span>STORE CASH REMAINING:</span>
                            <span className="font-mono text-sm">₹{formatMoney(calc.netBalance)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-slate-400">Inspecting record ID: <code className="text-cyan-300 font-mono">{selectedRecord.id}</code></span>
                      <button
                        type="button"
                        onClick={() => setSelectedRecord(null)}
                        className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE STAFF CONFIRMATION MODAL */}
      <AnimatePresence>
        {staffToDelete && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="bg-[#080d2c] border border-rose-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 relative text-white"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Delete Staff Account?</h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Are you sure you want to permanently delete staff account for <strong className="text-rose-400 font-bold">{staffToDelete.name}</strong>?
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setStaffToDelete(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteStaffAccount}
                  className="px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-black shadow-lg shadow-rose-500/30 transition cursor-pointer flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Confirm Delete Staff</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE SUBMISSION CONFIRMATION MODAL */}
      <AnimatePresence>
        {recordToDelete && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="bg-[#080d2c] border border-rose-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 relative text-white"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Delete Submission Record?</h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Are you sure you want to permanently delete cloud submission for <strong className="text-rose-400 font-bold">{recordToDelete.data.meta?.empName || 'Staff Member'}</strong> ({recordToDelete.data.meta?.monthVal || 'Month'})?
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRecordToDelete(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteSubmission}
                  className="px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-black shadow-lg shadow-rose-500/30 transition cursor-pointer flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Confirm Delete Record</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
