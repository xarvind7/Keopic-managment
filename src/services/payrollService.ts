import { supabase } from '../lib/supabase';
import { PayrollRecord } from '../types';
import { logActivity } from './activityService';
import { createNotification } from './notificationService';

export async function savePayrollRecord(record: PayrollRecord) {
  try {
    await supabase.from('payroll').upsert({
      id: record.id,
      employee_id: record.employeeId,
      employee_name: record.employeeName,
      branch_name: record.branchName,
      month: record.month,
      base_salary: record.baseSalary,
      per_day_salary: record.perDaySalary,
      total_present_days: record.presentDays,
      total_absent_days: record.absentDays,
      allowed_week_offs: record.allowedWeekOffs,
      extra_week_offs: record.extraWeekOffs,
      salary_deduction: record.salaryDeduction,
      incentive: record.incentive,
      targets_bonus: record.targetsBonus,
      overtime_amount: record.overtimeAmount,
      gross_sales: record.grossSales,
      net_salary: record.netSalary,
      payment_status: record.paymentStatus,
      utr: record.utr || null,
      payment_date: record.paymentDate || null,
      payment_mode: record.paymentMode || 'Bank Transfer',
      updated_at: new Date().toISOString()
    }, { onConflict: 'employee_id,month' });

    logActivity(
      'PAYROLL_UPDATED',
      'Payroll',
      `Payroll for ${record.employeeName} (${record.month}) set to ${record.paymentStatus.toUpperCase()}`,
      'Admin',
      record.employeeId
    );
  } catch (err) {
    console.warn('[payrollService] Error saving payroll record:', err);
  }
}

export function subscribeToPayroll(callback: (records: PayrollRecord[]) => void) {
  const fetchPayroll = async () => {
    try {
      const { data, error } = await supabase
        .from('payroll')
        .select('*')
        .order('month', { ascending: false });

      if (!error && data) {
        callback(data.map(d => ({
          id: d.id,
          employeeId: d.employee_id,
          employeeName: d.employee_name,
          branchName: d.branch_name,
          month: d.month,
          baseSalary: Number(d.base_salary) || 17000,
          perDaySalary: Number(d.per_day_salary) || 566.67,
          presentDays: Number(d.total_present_days) || 0,
          absentDays: Number(d.total_absent_days) || 0,
          allowedWeekOffs: Number(d.allowed_week_offs) || 4,
          extraWeekOffs: Number(d.extra_week_offs) || 0,
          salaryDeduction: Number(d.salary_deduction) || 0,
          incentive: Number(d.incentive) || 0,
          targetsBonus: Number(d.targets_bonus) || 0,
          overtimeAmount: Number(d.overtime_amount) || 0,
          grossSales: Number(d.gross_sales) || 0,
          netSalary: Number(d.net_salary) || 0,
          paymentStatus: d.payment_status || 'pending',
          utr: d.utr || '',
          paymentDate: d.payment_date || '',
          paymentMode: d.payment_mode || 'Bank Transfer',
          updatedAt: d.updated_at ? new Date(d.updated_at).getTime() : Date.now()
        })));
      }
    } catch (err) {
      console.warn('[payrollService] Error fetching payroll:', err);
    }
  };

  fetchPayroll();

  const channel = supabase
    .channel('public:payroll')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'payroll' }, () => {
      fetchPayroll();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function updatePayrollPaymentStatus(
  employeeId: string,
  month: string,
  status: 'pending' | 'approved' | 'disbursed',
  utr?: string,
  paymentMode: string = 'Bank Transfer'
) {
  try {
    await supabase.from('payroll').update({
      payment_status: status,
      utr: utr || null,
      payment_mode: paymentMode,
      payment_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    }).eq('employee_id', employeeId).eq('month', month);

    createNotification(
      'Payroll Disbursed',
      `Payroll for employee ID ${employeeId} (${month}) has been marked as ${status.toUpperCase()}`,
      'payroll',
      'all',
      employeeId
    );
  } catch (err) {
    console.warn('[payrollService] Failed to update payment status:', err);
  }
}
