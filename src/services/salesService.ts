import { supabase } from '../lib/supabase';
import { logActivity } from './activityService';
import { createNotification } from './notificationService';

export interface RecordSaleParams {
  employeeId: string;
  empName: string;
  branchName: string;
  productName: string;
  quantity: number;
  amount: number;
}

export async function recordSale(params: RecordSaleParams) {
  try {
    // Try RPC first for atomic deduction
    const { data, error } = await supabase.rpc('record_sale_and_deduct_stock', {
      p_employee_id: params.employeeId,
      p_emp_name: params.empName,
      p_branch_name: params.branchName,
      p_product_name: params.productName,
      p_quantity: params.quantity,
      p_amount: params.amount
    });

    if (error) {
      console.warn('[salesService] RPC error, inserting directly into sales table:', error);
      await supabase.from('sales').insert({
        employee_id: params.employeeId,
        emp_name: params.empName,
        branch_name: params.branchName,
        product_name: params.productName,
        quantity: params.quantity,
        amount: params.amount,
        sale_date: new Date().toISOString()
      });
    }

    logActivity(
      'SALE_CREATED',
      'Sales',
      `${params.empName} sold ${params.quantity} x ${params.productName} (₹${params.amount}) at ${params.branchName}`,
      params.empName,
      params.employeeId,
      undefined,
      { amount: params.amount, product: params.productName, quantity: params.quantity }
    );

    createNotification(
      'New Sale Recorded',
      `${params.empName} recorded ₹${params.amount} sale for ${params.productName} at ${params.branchName}`,
      'sale',
      'admin'
    );

    return data || { success: true };
  } catch (err) {
    console.error('[salesService] Error recording sale:', err);
    throw err;
  }
}

export function subscribeToSales(callback: (sales: any[]) => void) {
  const fetchSales = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('sale_date', { ascending: false });

      if (!error && data) {
        callback(data);
      }
    } catch (err) {
      console.warn('[salesService] Error fetching sales:', err);
    }
  };

  fetchSales();

  const channel = supabase
    .channel('public:sales')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
      fetchSales();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
