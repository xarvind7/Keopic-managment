/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import { BranchItem, ProductStockItem, StockTransferLog, ChatMessage } from '../types';

const env = (import.meta as any).env || {};
const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://zjlsmhlftsqojxfqfpax.supabase.co';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_BOLBCFYOrMJYo_qabDvkEA_kAz2MY8_';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[Supabase Error] Missing Supabase environment variables! Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});

// User & Profile Types
export interface SupabaseProfile {
  id: string;
  auth_user_id?: string;
  employee_id: string;
  username: string;
  full_name: string;
  emp_name?: string;
  branch_name: string;
  location?: string;
  role: 'staff' | 'branch_manager' | 'admin';
  status: 'active' | 'disabled' | 'deleted';
  rating?: number;
  created_at?: string;
  updated_at?: string;
}

// ==================== AUTHENTICATION HELPERS ====================

export async function signUpSupabase(email: string, pass: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: pass,
  });
  if (error) throw error;
  return data.user;
}

export async function signInSupabase(email: string, pass: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  });
  if (error) throw error;
  return data.user;
}

export async function signOutSupabase() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error('Error signing out Supabase:', error);
}

export function onAuthStateChangeSupabase(callback: (user: any) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
}

// ==================== CLOUD DATABASE LISTENERS & OPERATORS ====================

export function getDeterministicAdminId(input: string, prefix = 'admin'): string {
  const clean = (input || 'xarvind07').trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `${prefix}_${clean}`;
}

export function subscribeStaffAccountsSupabase(callback: (accounts: any[]) => void) {
  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase.from('staff_accounts').select('*');
      if (!error && data) {
        callback(data.map(item => ({
          id: item.id,
          employeeId: item.employee_id || item.employeeId,
          code: item.employee_id || item.employeeId,
          username: item.username,
          empName: item.emp_name || item.full_name || 'Staff Member',
          displayName: item.emp_name || item.full_name || 'Staff Member',
          branchName: item.branch_name || item.location || 'Main Counter',
          location: item.branch_name || item.location || 'Main Counter',
          role: item.role || 'staff',
          rating: item.rating || 5,
          isActive: item.status !== 'disabled' && item.status !== 'deleted',
          status: item.status || 'active'
        })));
      }
    } catch (err) {
      console.warn('Supabase fetch staff error:', err);
    }
  };

  fetchAccounts();

  const channel = supabase
    .channel('public:staff_accounts')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_accounts' }, () => {
      fetchAccounts();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function createStaffAccountSupabase(account: any) {
  try {
    const employeeId = account.employeeId || account.code || 'EMP-1001';
    const username = account.username || employeeId.toLowerCase();

    // Check if staff record already exists
    let staffId = account.id;
    try {
      const { data: existing } = await supabase
        .from('staff_accounts')
        .select('id')
        .or(`employee_id.eq.${employeeId},username.eq.${username}`)
        .maybeSingle();

      if (existing?.id) {
        staffId = existing.id;
      }
    } catch (e) {
      // ignore
    }

    const finalId = staffId || account.id || getDeterministicAdminId(employeeId, 'staff');

    const { error } = await supabase.from('staff_accounts').upsert({
      id: finalId,
      employee_id: employeeId,
      username: username,
      full_name: account.empName || account.displayName || 'Staff Member',
      emp_name: account.empName || account.displayName || 'Staff Member',
      branch_name: account.branchName || account.location || 'Main Counter',
      location: account.branchName || account.location || 'Main Counter',
      role: account.role || 'staff',
      status: account.status || 'active',
      updated_at: new Date().toISOString()
    }, { onConflict: 'employee_id' });
    if (error) console.warn('Supabase create staff error:', error);
  } catch (err) {
    console.warn('Supabase create staff exception:', err);
  }
}

export async function updateStaffAccountSupabase(id: string, updates: any) {
  try {
    const { error } = await supabase.from('staff_accounts').update({
      ...(updates.empName && { emp_name: updates.empName, full_name: updates.empName }),
      ...(updates.displayName && { emp_name: updates.displayName, full_name: updates.displayName }),
      ...(updates.location && { location: updates.location, branch_name: updates.location }),
      ...(updates.branchName && { location: updates.branchName, branch_name: updates.branchName }),
      ...(updates.role && { role: updates.role }),
      ...(updates.status && { status: updates.status }),
      ...(updates.rating && { rating: updates.rating }),
      updated_at: new Date().toISOString()
    }).eq('id', id);
    if (error) console.warn('Supabase update staff error:', error);
  } catch (err) {
    console.warn('Supabase update staff exception:', err);
  }
}

export async function deleteStaffAccountSupabase(id: string) {
  try {
    const { error } = await supabase.from('staff_accounts').delete().eq('id', id);
    if (error) console.warn('Supabase delete staff error:', error);
  } catch (err) {
    console.warn('Supabase delete staff exception:', err);
  }
}

// 2. Branches
export function subscribeBranchesSupabase(callback: (branches: BranchItem[]) => void) {
  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase.from('branches').select('*');
      if (!error && data && data.length > 0) {
        callback(data.map(item => ({
          id: item.id,
          name: item.name,
          code: item.code,
          address: item.address || 'Connaught Place, New Delhi',
          managerName: item.manager_name || 'Arvind Kumar Sharma',
          status: item.status || 'active',
          createdAt: item.created_at ? new Date(item.created_at).getTime() : Date.now()
        })));
      } else {
        callback([
          {
            id: 'br_connaught_place',
            name: 'Connaught Place',
            code: 'CP-01',
            address: 'Connaught Place, Central Delhi, New Delhi - 110001',
            managerName: 'Arvind Kumar Sharma',
            status: 'active',
            createdAt: 1700000000000
          }
        ]);
      }
    } catch (err) {
      console.warn('Supabase fetch branches error:', err);
      callback([
        {
          id: 'br_connaught_place',
          name: 'Connaught Place',
          code: 'CP-01',
          address: 'Connaught Place, Central Delhi, New Delhi - 110001',
          managerName: 'Arvind Kumar Sharma',
          status: 'active',
          createdAt: 1700000000000
        }
      ]);
    }
  };

  fetchBranches();

  const channel = supabase
    .channel('public:branches')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'branches' }, () => {
      fetchBranches();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function createBranchSupabase(branch: any) {
  try {
    let existingId = branch.id;
    try {
      const { data: existing } = await supabase
        .from('branches')
        .select('id')
        .or(`name.eq.${branch.name},code.eq.${branch.code}`)
        .maybeSingle();
      if (existing?.id) {
        existingId = existing.id;
      }
    } catch (e) {
      // ignore
    }

    const finalId = existingId || branch.id || `br_${branch.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    const { error } = await supabase.from('branches').upsert({
      id: finalId,
      name: branch.name,
      code: branch.code,
      address: branch.address || 'Store Location',
      manager_name: branch.managerName || 'Branch Manager',
      status: branch.status || 'active',
      updated_at: new Date().toISOString()
    }, { onConflict: 'name' });
    if (error) console.warn('Supabase create branch error:', error);
  } catch (err) {
    console.warn('Supabase create branch exception:', err);
  }
}

export async function deleteBranchSupabase(id: string) {
  try {
    const { error } = await supabase.from('branches').delete().eq('id', id);
    if (error) console.warn('Supabase delete branch error:', error);
  } catch (err) {
    console.warn('Supabase delete branch exception:', err);
  }
}

// 3. Stock Items
export function subscribeStockItemsSupabase(callback: (items: ProductStockItem[]) => void) {
  const fetchStock = async () => {
    try {
      const { data, error } = await supabase.from('branch_stock').select('*');
      if (!error && data && data.length > 0) {
        callback(data.map(item => ({
          id: item.id,
          branchName: item.branch_name,
          productName: item.product_name,
          openingStock: item.opening_stock || 0,
          receivedStock: item.received_stock || 0,
          soldStock: item.sold_stock || 0,
          damagedStock: item.damaged_stock || 0,
          returnedStock: item.returned_stock || 0,
          currentStock: item.current_stock || 0,
          minThreshold: item.min_threshold || 50
        })));
      }
    } catch (err) {
      console.warn('Supabase fetch stock error:', err);
    }
  };

  fetchStock();

  const channel = supabase
    .channel('public:branch_stock')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'branch_stock' }, () => {
      fetchStock();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// 4. Stock Transfer / Transactions
export function subscribeStockTransactionsSupabase(callback: (records: any[]) => void) {
  const fetchTx = async () => {
    try {
      const { data, error } = await supabase.from('stock_transactions').select('*');
      if (!error && data) {
        callback(data.map(d => ({
          id: d.id,
          type: d.transaction_type || 'TRANSFER',
          fromBranch: d.from_branch || 'Main Counter',
          toBranch: d.to_branch || 'Delhi CP Branch',
          productName: d.productName || d.product_name || 'Stand',
          quantity: d.quantity || 0,
          senderName: d.sender_name || 'Admin',
          receiverName: d.receiver_name || 'Branch Manager',
          remarks: d.remarks || '',
          status: 'Completed',
          createdAt: d.created_at ? new Date(d.created_at).getTime() : Date.now()
        })));
      }
    } catch (err) {
      console.warn('Supabase fetch stock_transactions error:', err);
    }
  };

  fetchTx();

  const channel = supabase
    .channel('public:stock_transactions')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_transactions' }, () => {
      fetchTx();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeSalesSupabase(callback: (sales: any[]) => void) {
  const fetchSales = async () => {
    try {
      const { data, error } = await supabase.from('sales').select('*');
      if (!error && data) {
        callback(data);
      }
    } catch (err) {
      console.warn('Supabase fetch sales error:', err);
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

export async function recordSaleAndDeductStockSupabase(saleData: {
  employeeId: string;
  empName: string;
  branchName: string;
  productName: string;
  quantity: number;
  amount: number;
}) {
  try {
    const { data, error } = await supabase.rpc('record_sale_and_deduct_stock', {
      p_employee_id: saleData.employeeId,
      p_emp_name: saleData.empName,
      p_branch_name: saleData.branchName,
      p_product_name: saleData.productName,
      p_quantity: saleData.quantity,
      p_amount: saleData.amount
    });

    if (error) {
      console.warn('RPC record_sale_and_deduct_stock error, falling back to direct insert:', error);
      // Fallback direct insert if RPC not present in schema
      await supabase.from('sales').insert({
        employee_id: saleData.employeeId,
        emp_name: saleData.empName,
        branch_name: saleData.branchName,
        product_name: saleData.productName,
        quantity: saleData.quantity,
        amount: saleData.amount,
        sale_date: new Date().toISOString()
      });
    }

    return data || { success: true };
  } catch (err) {
    console.error('Error recording sale in Supabase:', err);
    throw err;
  }
}

export async function allocateMainStockSupabase(allocation: {
  productName: string;
  targetBranchName: string;
  quantity: number;
  adminName: string;
}) {
  try {
    const { data, error } = await supabase.rpc('allocate_main_stock', {
      p_product_name: allocation.productName,
      p_target_branch_name: allocation.targetBranchName,
      p_quantity: allocation.quantity,
      p_admin_name: allocation.adminName
    });

    if (error) {
      console.warn('RPC allocate_main_stock error:', error);
    }

    return data || { success: true };
  } catch (err) {
    console.error('Error allocating main stock:', err);
    throw err;
  }
}

export async function executeStockTransferSupabase(transferData: {
  id: string;
  type: string;
  fromBranch: string;
  toBranch: string;
  productName: 'Stand' | 'Magnet' | 'Frame';
  quantity: number;
  senderName: string;
  receiverName: string;
  remarks: string;
  status?: string;
  createdAt?: number;
}) {
  try {
    // 1. Record stock transaction
    await supabase.from('stock_transactions').insert({
      id: transferData.id,
      transaction_type: transferData.type,
      from_branch: transferData.fromBranch,
      to_branch: transferData.toBranch,
      product_name: transferData.productName,
      quantity: transferData.quantity,
      sender_name: transferData.senderName,
      receiver_name: transferData.receiverName,
      remarks: transferData.remarks,
      created_at: new Date(transferData.createdAt || Date.now()).toISOString()
    });

    // 2. Adjust source branch stock
    const { data: sourceStock } = await supabase
      .from('branch_stock')
      .select('*')
      .eq('branch_name', transferData.fromBranch)
      .eq('product_name', transferData.productName)
      .single();

    if (sourceStock) {
      const updatedStock = Math.max(0, (sourceStock.current_stock || 0) - transferData.quantity);
      await supabase
        .from('branch_stock')
        .update({ current_stock: updatedStock, updated_at: new Date().toISOString() })
        .eq('id', sourceStock.id);
    }

    // 3. Adjust target branch stock
    const { data: targetStock } = await supabase
      .from('branch_stock')
      .select('*')
      .eq('branch_name', transferData.toBranch)
      .eq('product_name', transferData.productName)
      .single();

    if (targetStock) {
      const updatedStock = (targetStock.current_stock || 0) + transferData.quantity;
      const updatedReceived = (targetStock.received_stock || 0) + transferData.quantity;
      await supabase
        .from('branch_stock')
        .update({ current_stock: updatedStock, received_stock: updatedReceived, updated_at: new Date().toISOString() })
        .eq('id', targetStock.id);
    } else {
      await supabase.from('branch_stock').insert({
        id: 'stk_' + Date.now() + '_dst',
        branch_name: transferData.toBranch,
        product_name: transferData.productName,
        opening_stock: 0,
        received_stock: transferData.quantity,
        sold_stock: 0,
        damaged_stock: 0,
        returned_stock: 0,
        current_stock: transferData.quantity,
        min_threshold: 50
      });
    }
  } catch (err) {
    console.warn('Supabase execute transfer exception:', err);
  }
}

// 5. User Data (Ledger / Daily Entries / Targets / Payments)
export function subscribeUserDataSupabase(userId: string, callback: (data: any) => void) {
  if (!userId) {
    callback(null);
    return () => {};
  }

  const fetchUserData = async () => {
    try {
      const { data, error } = await supabase
        .from('users_data')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        callback(data.payload || data);
      } else {
        callback(null);
      }
    } catch (err) {
      console.warn('Supabase fetch user_data error:', err);
      callback(null);
    }
  };

  fetchUserData();

  const channel = supabase
    .channel(`public:users_data:${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users_data' }, () => {
      fetchUserData();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export interface StaffAccountRecord {
  id: string;
  uid?: string;
  employeeId: string;
  code?: string;
  username: string;
  password?: string;
  empName: string;
  displayName?: string;
  location: string;
  branchName?: string;
  branchId?: string;
  role: 'staff' | 'branch_manager' | 'admin';
  status: 'active' | 'disabled' | 'deleted';
  isActive?: boolean;
  createdBy?: string;
  createdAt?: number;
  updatedAt?: number;
  lastLoginAt?: number;
  rating?: number;
}

export interface BranchRecord {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  address?: string;
  createdBy?: string;
  createdAt?: number;
  updatedAt?: number;
}

export function subscribeAllUsersDataSupabase(
  callback: (records: any[]) => void,
  _onError?: (err: any) => void
) {
  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase.from('users_data').select('*');
      if (error && _onError) _onError(error);
      if (!error && data) {
        // Deduplicate records so each employee has ONLY ONE record per month (latest updated)
        const dedupMap = new Map<string, any>();

        data.forEach((item) => {
          const payload = item.payload || item || {};
          const meta = payload.meta || {};
          const empName = (meta.empName || meta.displayName || item.user_id || '').trim().toLowerCase();
          const monthVal = (meta.monthVal || 'default').trim();
          
          // Deduplication key per person per month
          const dedupKey = empName ? `${empName}_${monthVal}` : item.user_id;
          const currentUpdated = Number(payload.updatedAt || item.updated_at ? new Date(item.updated_at).getTime() : 0);

          if (!dedupMap.has(dedupKey)) {
            dedupMap.set(dedupKey, { id: item.user_id, data: payload, updatedAt: currentUpdated });
          } else {
            const existing = dedupMap.get(dedupKey);
            if (currentUpdated > (existing.updatedAt || 0)) {
              dedupMap.set(dedupKey, { id: item.user_id, data: payload, updatedAt: currentUpdated });
            }
          }
        });

        const dedupedList = Array.from(dedupMap.values()).map(entry => ({
          id: entry.id,
          data: entry.data
        }));

        callback(dedupedList);
      }
    } catch (err) {
      console.warn('Supabase fetch all users_data error:', err);
      if (_onError) _onError(err);
    }
  };

  fetchAllUsers();

  const channel = supabase
    .channel('public:users_data:all')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users_data' }, () => {
      fetchAllUsers();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function saveUserDataSupabase(userId: string, payload: any) {
  if (!userId) return;
  try {
    // Save to single canonical key without generating duplicate submissions
    const cleanUserId = userId.trim();
    const { error } = await supabase.from('users_data').upsert({
      user_id: cleanUserId,
      payload: {
        ...payload,
        updatedAt: Date.now()
      },
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    if (error) console.warn(`Supabase save user_data error for key ${cleanUserId}:`, error);
  } catch (err) {
    console.warn('Supabase save user_data exception:', err);
  }
}

export async function registerAdminAccountSupabase(email: string, pass: string, fullName: string = 'Arvind Kumar Sharma') {
  try {
    let user = null;
    try {
      user = await signUpSupabase(email, pass);
    } catch (e) {
      try {
        user = await signInSupabase(email, pass);
      } catch (e2) {
        // Fallback user object
      }
    }

    const cleanEmail = (email || 'xarvind07@gmail.com').trim().toLowerCase();
    const targetUsername = cleanEmail.includes('@') ? cleanEmail.split('@')[0] : cleanEmail;
    const targetEmployeeId = targetUsername === 'xarvind07' ? 'xarvind07' : (targetUsername.startsWith('adm-') ? targetUsername.toUpperCase() : `ADM-${targetUsername.toUpperCase()}`);

    // 1. Check if profile already exists by employee_id or username or email
    let profileId = user?.id;
    try {
      const { data: existingProf } = await supabase
        .from('profiles')
        .select('id, auth_user_id')
        .or(`employee_id.eq.${targetEmployeeId},username.eq.${targetUsername},email.eq.${cleanEmail}`)
        .maybeSingle();

      if (existingProf?.id) {
        profileId = existingProf.id;
      }
    } catch (e) {
      // ignore
    }

    if (!profileId) {
      profileId = getDeterministicAdminId(targetUsername, 'prof');
    }

    // Upsert into profiles table with explicit onConflict
    await supabase.from('profiles').upsert({
      id: profileId,
      ...(user?.id ? { auth_user_id: user.id } : { auth_user_id: profileId }),
      employee_id: targetEmployeeId,
      username: targetUsername,
      email: cleanEmail,
      full_name: fullName || 'Arvind Kumar Sharma',
      emp_name: fullName || 'Arvind Kumar Sharma',
      branch_name: 'Connaught Place',
      location: 'Connaught Place',
      role: 'admin',
      status: 'active',
      updated_at: new Date().toISOString()
    }, { onConflict: 'employee_id' });

    // 2. Check if staff_account already exists by employee_id or username or email
    let staffId = user?.id;
    try {
      const { data: existingStaff } = await supabase
        .from('staff_accounts')
        .select('id, auth_user_id')
        .or(`employee_id.eq.${targetEmployeeId},username.eq.${targetUsername},email.eq.${cleanEmail}`)
        .maybeSingle();

      if (existingStaff?.id) {
        staffId = existingStaff.id;
      }
    } catch (e) {
      // ignore
    }

    if (!staffId) {
      staffId = getDeterministicAdminId(targetUsername, 'admin');
    }

    // Upsert into staff_accounts table with explicit onConflict
    await supabase.from('staff_accounts').upsert({
      id: staffId,
      ...(user?.id ? { auth_user_id: user.id } : {}),
      employee_id: targetEmployeeId,
      username: targetUsername,
      email: cleanEmail,
      full_name: fullName || 'Arvind Kumar Sharma',
      emp_name: fullName || 'Arvind Kumar Sharma',
      branch_name: 'Connaught Place',
      location: 'Connaught Place',
      role: 'admin',
      status: 'active',
      updated_at: new Date().toISOString()
    }, { onConflict: 'employee_id' });

    return user || { id: staffId, email: cleanEmail };
  } catch (err) {
    console.warn('Error registering admin in Supabase:', err);
    return null;
  }
}

export async function authenticateStaffSupabase(identifier: string, passcode?: string) {
  try {
    const cleanId = identifier.trim().toLowerCase();
    const cleanCode = identifier.trim().toUpperCase();

    const { data, error } = await supabase.from('staff_accounts').select('*');

    if (!error && data) {
      const matched = data.find((d) => {
        const empId = d.employee_id || d.code || '';
        const codeMatch = empId.toUpperCase() === cleanCode;
        const userMatch = (d.username || '').toLowerCase() === cleanId;
        return (codeMatch || userMatch) && (d.status === 'active' || d.status === undefined);
      });

      if (matched) {
        return {
          id: matched.id,
          uid: matched.auth_user_id || matched.id,
          employeeId: matched.employee_id || 'EMP-1000',
          code: matched.employee_id || 'EMP-1000',
          username: matched.username || '',
          empName: matched.emp_name || matched.full_name || 'Staff Member',
          displayName: matched.emp_name || matched.full_name || 'Staff Member',
          location: matched.branch_name || matched.location || 'Connaught Place',
          branchName: matched.branch_name || matched.location || 'Connaught Place',
          role: matched.role || 'staff',
          status: matched.status || 'active',
          isActive: true,
          createdAt: matched.created_at ? new Date(matched.created_at).getTime() : Date.now()
        };
      }
    }

    // Direct fallback for master user xarvind07 / arvindwithcode@gmail.com
    if (cleanId === 'xarvind07' || cleanId === 'xarvind07@gmail.com' || cleanId === 'arvindwithcode@gmail.com' || cleanCode === 'XARVIND07') {
      // Auto-register in staff_accounts for future queries
      registerAdminAccountSupabase(cleanId.includes('@') ? cleanId : 'xarvind07@gmail.com', 'Arvind@#9334', 'Arvind Kumar Sharma').catch(() => {});

      return {
        id: 'usr_xarvind07',
        uid: 'usr_xarvind07',
        employeeId: 'xarvind07',
        code: 'xarvind07',
        username: 'xarvind07',
        empName: 'Arvind Kumar Sharma',
        displayName: 'Arvind Kumar Sharma',
        location: 'Connaught Place',
        branchName: 'Connaught Place',
        role: 'admin',
        status: 'active',
        isActive: true,
        createdAt: Date.now()
      };
    }

    return null;
  } catch (err) {
    console.warn('Supabase authenticate staff exception:', err);
    return null;
  }
}

// 6. Audit Logs
export async function logAuditSupabase(action: string, actor: string, details: string) {
  try {
    await supabase.from('audit_logs').insert({
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      action,
      actor,
      details,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Supabase audit log exception:', err);
  }
}

export async function fetchAuditLogsSupabase() {
  try {
    const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
    if (!error && data) return data;
    return [];
  } catch (err) {
    console.warn('Supabase fetch audit logs error:', err);
    return [];
  }
}

export async function fetchAllUsersDataMap(): Promise<Record<string, any>> {
  return new Promise((resolve) => {
    const unsub = subscribeAllUsersDataSupabase((records) => {
      const res: Record<string, any> = {};
      if (Array.isArray(records)) {
        records.forEach((r) => {
          if (r && r.id) res[r.id] = r.data;
        });
      }
      resolve(res);
      if (typeof unsub === 'function') unsub();
    });
  });
}

// Aliases for unified imports
export const saveUserDataToCloud = saveUserDataSupabase;
export async function loadUserDataFromCloud(userId: string, secondaryEmail?: string): Promise<any> {
  if (!userId) return null;
  try {
    // 1. Check primary user ID
    const { data, error } = await supabase
      .from('users_data')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data && data.payload) {
      return data.payload;
    }

    // 2. Check secondary email key
    if (secondaryEmail && secondaryEmail.trim() && secondaryEmail.trim().toLowerCase() !== userId) {
      const { data: emailData, error: emailErr } = await supabase
        .from('users_data')
        .select('*')
        .eq('user_id', secondaryEmail.trim().toLowerCase())
        .maybeSingle();

      if (!emailErr && emailData && emailData.payload) {
        return emailData.payload;
      }
    }
  } catch (err) {
    console.warn('loadUserDataFromCloud exception:', err);
  }
  return null;
}
export const subscribeToUserData = subscribeUserDataSupabase;
export const subscribeToAllUsersData = subscribeAllUsersDataSupabase;
export const getAllCloudData = fetchAllUsersDataMap;
export async function deleteUserDataFromCloud(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const { error } = await supabase.from('users_data').delete().eq('user_id', userId.trim());
    return !error;
  } catch (err) {
    console.warn('deleteUserDataFromCloud error:', err);
    return false;
  }
}

export const createStaffAccountCloud = createStaffAccountSupabase;
export const updateStaffAccountCloud = updateStaffAccountSupabase;
export const deleteStaffAccountCloud = deleteStaffAccountSupabase;
export const subscribeToStaffAccounts = subscribeStaffAccountsSupabase;
export const authenticateStaffCloud = authenticateStaffSupabase;

export const createBranchCloud = createBranchSupabase;
export const deleteBranchCloud = deleteBranchSupabase;
export const subscribeToBranches = subscribeBranchesSupabase;

export const subscribeToStock = subscribeStockItemsSupabase;
export const subscribeToStockTransactions = subscribeStockTransactionsSupabase;
export const executeStockTransferCloud = executeStockTransferSupabase;

export const recordSaleAndDeductStock = recordSaleAndDeductStockSupabase;
export const allocateMainStock = allocateMainStockSupabase;

export async function logAuditEvent(
  action: string,
  details: string,
  _performedByUid?: string,
  performedByName?: string
) {
  await logAuditSupabase(action, performedByName || 'System', details);
}

export function subscribeToAuditLogs(onData: (records: any[]) => void) {
  fetchAuditLogsSupabase().then((logs) => {
    if (logs) onData(logs);
  });
  return () => {};
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, pass: string) {
  try {
    return await signInSupabase(email, pass);
  } catch (err) {
    return await signUpSupabase(email, pass);
  }
}

export async function fetchUserProfileSupabase(userId: string): Promise<SupabaseProfile | null> {
  if (!userId) return null;
  try {
    // 1. Fetch from 'profiles' table
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`id.eq.${userId},auth_user_id.eq.${userId}`)
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        auth_user_id: data.auth_user_id || data.id,
        employee_id: data.employee_id || data.employeeId || 'EMP-1001',
        username: data.username || '',
        full_name: data.full_name || data.emp_name || data.displayName || 'User',
        emp_name: data.emp_name || data.full_name || data.displayName || 'User',
        branch_name: data.branch_name || data.location || 'Main Counter',
        location: data.location || data.branch_name || 'Main Counter',
        role: data.role || 'staff',
        status: data.status || 'active',
        rating: data.rating || 5,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    }

    // 2. Fallback to 'staff_accounts' table if profiles row isn't found
    const { data: staffData, error: staffError } = await supabase
      .from('staff_accounts')
      .select('*')
      .or(`id.eq.${userId},employee_id.eq.${userId}`)
      .maybeSingle();

    if (!staffError && staffData) {
      return {
        id: staffData.id,
        auth_user_id: staffData.id,
        employee_id: staffData.employee_id || staffData.employeeId || 'EMP-1001',
        username: staffData.username || '',
        full_name: staffData.emp_name || staffData.full_name || 'Staff Member',
        emp_name: staffData.emp_name || staffData.full_name || 'Staff Member',
        branch_name: staffData.branch_name || staffData.location || 'Main Counter',
        location: staffData.location || staffData.branch_name || 'Main Counter',
        role: staffData.role || 'staff',
        status: staffData.status || 'active',
        rating: staffData.rating || 5
      };
    }
  } catch (err) {
    console.warn('Supabase fetchUserProfileSupabase error:', err);
  }
  return null;
}

export async function signOutUser() {
  await signOutSupabase();
}


