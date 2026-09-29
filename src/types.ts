export interface BranchItem {
  id: string;
  name: string;
  code: string;
  address: string;
  managerName?: string;
  status?: 'active' | 'inactive' | 'disabled';
  createdAt: number;
}

export interface EnterpriseEmployee {
  id: string;
  empId: string; // Employee ID e.g. EMP-1001
  empName: string;
  username: string;
  password?: string;
  branchName: string;
  branchId?: string;
  email?: string;
  phone?: string;
  role: 'staff' | 'branch_manager' | 'admin';
  isActive: boolean;
  status?: 'active' | 'disabled' | 'deleted';
  baseSalary?: number;
  perDaySalary?: number;
  joiningDate?: string;
  createdAt: number;
  lastLogin?: number;
  lastReportDate?: string;
  rating?: number; // 1 to 5
}

export interface ProductStockItem {
  id: string;
  branchName: string;
  productName: 'Stand' | 'Magnet' | 'Frame';
  openingStock: number;
  receivedStock: number;
  soldStock: number;
  damagedStock: number;
  returnedStock: number;
  currentStock: number;
  minThreshold: number;
}

export interface StockTransferLog {
  id: string;
  transferDate: string;
  productName: 'Stand' | 'Magnet' | 'Frame';
  quantity: number;
  fromBranch: string;
  toBranch: string;
  senderName: string;
  receiverName: string;
  remarks: string;
  status: 'Completed' | 'Pending' | 'Cancelled';
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  sender: 'staff' | 'admin';
  senderId?: string;
  receiverId?: string;
  senderName: string;
  text: string;
  timestamp: number;
  read?: boolean;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Week Off' | 'Auto Absent' | 'Leave';

export interface DailyEntry {
  id: string;
  date: string;
  day: string;
  status: AttendanceStatus;
  inTime: string;
  outTime: string;
  stand: number | '';
  magnet: number | '';
  frame: number | '';
  cashVal?: number;
  onlineVal?: number;
  attendance?: string;
  dateVal?: string;
  incentive?: number;
  locVal?: string;
  autoAbsent?: boolean;
  workHours?: string;
  photoUrl?: string;
  conveyance?: number | '';
  conveyanceNote?: string;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name?: string;
  branch_name?: string;
  date: string;
  status: 'present' | 'absent' | 'week_off' | 'leave' | 'auto_absent';
  check_in?: string;
  check_out?: string;
  work_hours?: number;
  overtime_hours?: number;
  week_off?: boolean;
  auto_absent?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentEntry {
  id: string;
  date: string;
  note: string;
  amt: number | '';
  type?: 'sent_to_sir' | 'advance_received';
  paymentMode?: string;
  reference?: string;
  receiptUrl?: string;
}

export interface TargetEntry {
  id: string;
  date: string;
  note: string;
  amt: number | '';
  status?: 'Pending' | 'Paid';
}

export interface ConveyanceEntry {
  id: string;
  date: string; // Kis date ko conveyance provide hua / travel hua
  note: string; // Kis purpose se conveyance hua (e.g. Travel, Petrol, Stock delivery)
  amt: number | ''; // Kitna rupi lena ha sir se
  status?: 'Pending' | 'Approved' | 'Claimed';
}

export interface MetaConfig {
  empName: string;
  monthVal: string;
  locVal: string;
  baseSalary: number;
  profilePic?: string;
  email?: string;
  phone?: string;
  role?: 'staff' | 'admin';
}

export interface MonthData {
  entries: DailyEntry[];
  targets: TargetEntry[];
  payments: PaymentEntry[];
  conveyances?: ConveyanceEntry[];
  dailyGoal: number;
  baseSalary?: number;
  workingDays?: number;
}

export interface ActiveSession {
  id: string;
  user_id: string;
  session_id: string;
  device_id?: string;
  browser?: string;
  last_seen_at: string;
  created_at: string;
  revoked_at?: string | null;
}

export interface ActivityLog {
  id: string;
  user_id?: string;
  actor: string;
  action: string;
  entity: string;
  entity_id?: string;
  details?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'sale' | 'attendance' | 'stock' | 'payroll' | 'employee' | 'system';
  targetRole?: 'all' | 'admin' | 'staff';
  targetUserId?: string;
  read?: boolean;
  created_at: string;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  branchName: string;
  month: string;
  baseSalary: number;
  perDaySalary: number;
  presentDays: number;
  absentDays: number;
  allowedWeekOffs: number;
  extraWeekOffs: number;
  salaryDeduction: number;
  incentive: number;
  targetsBonus: number;
  overtimeAmount: number;
  grossSales: number;
  netSalary: number;
  paymentStatus: 'pending' | 'approved' | 'disbursed';
  utr?: string;
  paymentDate?: string;
  paymentMode?: string;
  updatedAt?: number;
}
