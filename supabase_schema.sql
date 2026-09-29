-- ==========================================================
-- KEOPIC ENTERPRISE SUPABASE DATABASE MASTER SCHEMA & SECURITY
-- Multi-counter Photobooth Management, Attendance, Sales & Payroll
-- ==========================================================

-- Enable Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  phone TEXT,
  full_name TEXT NOT NULL,
  emp_name TEXT,
  branch_id UUID,
  branch_name TEXT,
  role TEXT DEFAULT 'staff' CHECK (role IN ('staff', 'branch_manager', 'admin')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'deleted')),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Staff Accounts / Employees Table
CREATE TABLE IF NOT EXISTS public.staff_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_id TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  emp_name TEXT,
  phone TEXT,
  email TEXT,
  branch_id UUID,
  branch_name TEXT NOT NULL,
  role TEXT DEFAULT 'staff' CHECK (role IN ('staff', 'branch_manager', 'admin')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'deleted')),
  base_salary NUMERIC DEFAULT 17000 CHECK (base_salary >= 0),
  per_day_salary NUMERIC DEFAULT 566.67,
  joining_date DATE DEFAULT CURRENT_DATE,
  rating NUMERIC DEFAULT 5,
  permissions JSONB DEFAULT '{"sales": true, "stock": true, "reports": true, "chat": true}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- 3. Branches Table
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  address TEXT DEFAULT 'Store Location',
  manager_name TEXT DEFAULT 'Branch Manager',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'disabled')),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Default Branches
INSERT INTO public.branches (name, code, address, manager_name, status) VALUES
  ('Main Counter', 'MAIN-01', 'Central Store Gate 1', 'Arvind Sharma', 'active'),
  ('Delhi CP Branch', 'DEL-CP', 'Connaught Place Block A', 'Rahul Sharma', 'active'),
  ('Mall Counter', 'MALL-02', 'Pacific Mall Photobooth', 'Priya Verma', 'active')
ON CONFLICT (name) DO NOTHING;

-- 4. Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  unit_price NUMERIC DEFAULT 200,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Products
INSERT INTO public.products (name, sku, unit_price, description) VALUES
  ('Stand', 'PRD-STAND', 200, 'Keopic Acrylic Stand Display'),
  ('Magnet', 'PRD-MAGNET', 250, 'Keopic Photo Magnet'),
  ('Frame', 'PRD-FRAME', 0, 'Keopic Premium Frame (Custom Pricing)')
ON CONFLICT (name) DO NOTHING;

-- 5. Main Stock Table
CREATE TABLE IF NOT EXISTS public.main_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT UNIQUE NOT NULL,
  quantity NUMERIC DEFAULT 1000 CHECK (quantity >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Branch Stock Table
CREATE TABLE IF NOT EXISTS public.branch_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  branch_name TEXT NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  opening_stock NUMERIC DEFAULT 0 CHECK (opening_stock >= 0),
  received_stock NUMERIC DEFAULT 0 CHECK (received_stock >= 0),
  sold_stock NUMERIC DEFAULT 0 CHECK (sold_stock >= 0),
  damaged_stock NUMERIC DEFAULT 0 CHECK (damaged_stock >= 0),
  returned_stock NUMERIC DEFAULT 0 CHECK (returned_stock >= 0),
  current_stock NUMERIC DEFAULT 0 CHECK (current_stock >= 0),
  min_threshold NUMERIC DEFAULT 50 CHECK (min_threshold >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_name, product_name)
);

-- 7. Attendance Table (with 4 Allowed Week-Offs & Auto-Absent support)
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL,
  emp_name TEXT,
  branch_name TEXT,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'week_off', 'leave', 'auto_absent', 'Present', 'Absent', 'Week Off', 'Auto Absent', 'Leave')),
  check_in TEXT,
  check_out TEXT,
  work_hours NUMERIC DEFAULT 0,
  overtime_hours NUMERIC DEFAULT 0,
  week_off BOOLEAN DEFAULT FALSE,
  auto_absent BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

-- 8. Sales / Transactions Table
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_id TEXT NOT NULL,
  emp_name TEXT NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  branch_name TEXT NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  amount NUMERIC DEFAULT 0 CHECK (amount >= 0),
  stand_amt NUMERIC DEFAULT 0,
  magnet_amt NUMERIC DEFAULT 0,
  frame_amt NUMERIC DEFAULT 0,
  incentive_earned NUMERIC DEFAULT 0,
  sale_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Stock Transactions / Transfers Table
CREATE TABLE IF NOT EXISTS public.stock_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('SALE', 'ALLOCATION', 'TRANSFER', 'ADJUSTMENT', 'RETURN')),
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  from_branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  from_branch TEXT,
  to_branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  to_branch TEXT,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name TEXT,
  receiver_name TEXT,
  remarks TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Targets Table
CREATE TABLE IF NOT EXISTS public.targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  branch_name TEXT NOT NULL,
  month_filter TEXT NOT NULL, -- Format: YYYY-MM
  target_amount NUMERIC NOT NULL DEFAULT 0,
  achieved_amount NUMERIC DEFAULT 0,
  incentive_amount NUMERIC DEFAULT 0,
  target_stand NUMERIC DEFAULT 0,
  target_magnet NUMERIC DEFAULT 0,
  target_frame NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_id TEXT NOT NULL,
  emp_name TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  payment_type TEXT DEFAULT 'sent_to_sir' CHECK (payment_type IN ('sent_to_sir', 'advance_received')),
  payment_mode TEXT NOT NULL DEFAULT 'Cash',
  reference TEXT,
  remarks TEXT,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Payroll Records Table
CREATE TABLE IF NOT EXISTS public.payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  month TEXT NOT NULL, -- Format: YYYY-MM
  base_salary NUMERIC NOT NULL DEFAULT 17000,
  per_day_salary NUMERIC NOT NULL DEFAULT 566.67,
  total_present_days NUMERIC NOT NULL DEFAULT 0,
  total_absent_days NUMERIC NOT NULL DEFAULT 0,
  allowed_week_offs NUMERIC NOT NULL DEFAULT 4,
  extra_week_offs NUMERIC NOT NULL DEFAULT 0,
  salary_deduction NUMERIC NOT NULL DEFAULT 0,
  incentive NUMERIC NOT NULL DEFAULT 0,
  targets_bonus NUMERIC NOT NULL DEFAULT 0,
  overtime_amount NUMERIC NOT NULL DEFAULT 0,
  gross_sales NUMERIC NOT NULL DEFAULT 0,
  net_salary NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'disbursed')),
  utr TEXT,
  payment_date DATE,
  payment_mode TEXT DEFAULT 'Bank Transfer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, month)
);

-- 13. Messages / Chat Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  receiver_id TEXT,
  sender_role TEXT DEFAULT 'staff',
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id TEXT,
  target_role TEXT DEFAULT 'all',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'system',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Activity Logs Table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Active Sessions Table (Single Session Enforcement per Staff Account)
CREATE TABLE IF NOT EXISTS public.active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  session_id TEXT UNIQUE NOT NULL,
  device_id TEXT,
  browser TEXT,
  ip_address TEXT,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Users Data Payload Table (Centralized Ledger Sync)
CREATE TABLE IF NOT EXISTS public.users_data (
  user_id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERIES
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_sales_emp ON public.sales(employee_id);
CREATE INDEX IF NOT EXISTS idx_sales_branch ON public.sales(branch_name);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON public.attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_payroll_emp_month ON public.payroll(employee_id, month);
CREATE INDEX IF NOT EXISTS idx_branch_stock_lookup ON public.branch_stock(branch_name, product_name);
CREATE INDEX IF NOT EXISTS idx_stock_tx_product ON public.stock_transactions(product_name);
CREATE INDEX IF NOT EXISTS idx_staff_acc_user ON public.staff_accounts(username);
CREATE INDEX IF NOT EXISTS idx_staff_acc_code ON public.staff_accounts(employee_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON public.active_sessions(user_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(receiver_id, read);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at DESC);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.main_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_data ENABLE ROW LEVEL SECURITY;

-- Helper Function: Is Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE auth_user_id = auth.uid() AND role = 'admin' AND status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM public.staff_accounts 
    WHERE auth_user_id = auth.uid() AND role = 'admin' AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Universal Read/Write policies for App Architecture
CREATE POLICY "Public Read All" ON public.branches FOR SELECT USING (true);
CREATE POLICY "Public Read Products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public Read Branch Stock" ON public.branch_stock FOR SELECT USING (true);
CREATE POLICY "Public Read/Write staff_accounts" ON public.staff_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write attendance" ON public.attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write stock_transactions" ON public.stock_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write targets" ON public.targets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write payroll" ON public.payroll FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write active_sessions" ON public.active_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write users_data" ON public.users_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write main_stock" ON public.main_stock FOR ALL USING (true) WITH CHECK (true);

-- ==========================================================
-- REALTIME PUBLICATION SETUP
-- ==========================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE 
      public.sales,
      public.attendance,
      public.branch_stock,
      public.stock_transactions,
      public.payroll,
      public.payments,
      public.targets,
      public.messages,
      public.notifications,
      public.activity_logs,
      public.active_sessions,
      public.users_data,
      public.staff_accounts,
      public.branches;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- ==========================================================
-- RPC FUNCTIONS
-- ==========================================================

-- 1. Atomic Sale & Stock Deduction
CREATE OR REPLACE FUNCTION public.record_sale_and_deduct_stock(
  p_employee_id TEXT,
  p_emp_name TEXT,
  p_branch_name TEXT,
  p_product_name TEXT,
  p_quantity NUMERIC,
  p_amount NUMERIC
)
RETURNS JSONB AS $$
DECLARE
  v_current_stock NUMERIC;
  v_sale_id UUID;
  v_stock_id UUID;
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Sale quantity must be greater than 0';
  END IF;

  SELECT id, current_stock INTO v_stock_id, v_current_stock
  FROM public.branch_stock
  WHERE branch_name = p_branch_name AND product_name = p_product_name
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Branch stock record not found for branch % and product %', p_branch_name, p_product_name;
  END IF;

  IF v_current_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock! Available: %, Requested: %', v_current_stock, p_quantity;
  END IF;

  UPDATE public.branch_stock
  SET current_stock = current_stock - p_quantity,
      sold_stock = sold_stock + p_quantity,
      updated_at = NOW()
  WHERE id = v_stock_id;

  INSERT INTO public.sales (
    staff_auth_user_id,
    employee_id,
    emp_name,
    branch_name,
    product_name,
    quantity,
    amount
  ) VALUES (
    auth.uid(),
    p_employee_id,
    p_emp_name,
    p_branch_name,
    p_product_name,
    p_quantity,
    p_amount
  ) RETURNING id INTO v_sale_id;

  INSERT INTO public.stock_transactions (
    transaction_type,
    product_name,
    quantity,
    from_branch,
    performed_by,
    sender_name,
    remarks,
    reference_id
  ) VALUES (
    'SALE',
    p_product_name,
    -p_quantity,
    p_branch_name,
    auth.uid(),
    p_emp_name,
    'Sale ID ' || v_sale_id::text,
    v_sale_id::text
  );

  RETURN jsonb_build_object(
    'success', true,
    'sale_id', v_sale_id,
    'remaining_stock', v_current_stock - p_quantity
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Single Session Registration & Invalidation RPC
CREATE OR REPLACE FUNCTION public.register_active_session(
  p_user_id TEXT,
  p_session_id TEXT,
  p_device_id TEXT DEFAULT NULL,
  p_browser TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
  -- Revoke any existing active session for this user ID
  UPDATE public.active_sessions
  SET revoked_at = NOW()
  WHERE user_id = p_user_id AND revoked_at IS NULL AND session_id != p_session_id;

  -- Upsert current active session
  INSERT INTO public.active_sessions (
    user_id,
    session_id,
    device_id,
    browser,
    last_seen_at,
    created_at
  ) VALUES (
    p_user_id,
    p_session_id,
    p_device_id,
    p_browser,
    NOW(),
    NOW()
  )
  ON CONFLICT (session_id)
  DO UPDATE SET last_seen_at = NOW(), revoked_at = NULL;

  RETURN jsonb_build_object('success', true, 'session_id', p_session_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
