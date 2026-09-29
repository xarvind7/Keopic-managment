import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  User, 
  Lock, 
  Key, 
  CheckCircle2, 
  Sparkles, 
  Eye, 
  EyeOff, 
  LogOut,
  ChevronRight,
  ShieldAlert,
  BadgeCheck,
  Building,
  Star,
  MessageCircle,
  Loader2,
  Zap,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  subscribeToStaffAccounts, 
  authenticateStaffCloud, 
  signInWithEmail,
  signUpSupabase,
  registerAdminAccountSupabase,
  StaffAccountRecord
} from '../lib/supabase';
import KeopicLogo from './KeopicLogo';

export interface StaffAccount {
  id: string;
  username: string;
  password?: string;
  empName: string;
  location: string;
  branchName?: string;
  code: string;
  createdAt: number;
  isActive: boolean;
  role?: string;
  rating?: number;
  isDisabled?: boolean;
  status?: string;
  displayName?: string;
  employeeId?: string;
}

export const DEFAULT_STAFF_ACCOUNTS: StaffAccount[] = [];

export function getStoredStaffAccounts(): StaffAccount[] {
  return [];
}

export function saveStoredStaffAccounts(accounts: StaffAccount[]) {
  // Handled directly via Firestore in Cloud
}

interface AuthLoginModalProps {
  isOpen: boolean;
  currentRole: 'staff' | 'admin' | null;
  onLoginStaff: (name: string, location: string, code?: string) => void;
  onLoginAdmin: () => void;
  onLogout: () => void;
  onClose?: () => void;
  triggerToast: (title: string, msg?: string, isError?: boolean) => void;
}

export default function AuthLoginModal({
  isOpen,
  currentRole,
  onLoginStaff,
  onLoginAdmin,
  onLogout,
  onClose,
  triggerToast
}: AuthLoginModalProps) {
  const [activeRole, setActiveRole] = useState<'staff' | 'admin'>('staff');
  const [staffSubTab, setStaffSubTab] = useState<'credentials' | 'code'>('credentials');

  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [showStaffPassword, setShowStaffPassword] = useState(false);

  const [staffCodeInput, setStaffCodeInput] = useState('');
  const [matchedCodeObj, setMatchedCodeObj] = useState<StaffAccountRecord | null>(null);

  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [staffAccountsList, setStaffAccountsList] = useState<StaffAccountRecord[]>([]);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Security Hardening: Anti-Brute-Force Rate Limiting & Cooldown Timer
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (lockoutTimeLeft <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimeLeft]);

  const recordFailedAttempt = (msg: string) => {
    const nextCount = failedAttempts + 1;
    setFailedAttempts(nextCount);
    if (nextCount >= 5) {
      setLockoutTimeLeft(60);
      setErrorMessage('SECURITY LOCKOUT: Too many failed attempts! System locked for 60 seconds to protect against brute-force attacks.');
    } else {
      setErrorMessage(`${msg} (Attempt ${nextCount}/5 before temporary lockout)`);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    // Real-time Firestore subscription to official Admin-allotted staff accounts
    const unsubscribe = subscribeToStaffAccounts((records) => {
      setStaffAccountsList(records);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStaffCodeChange = (val: string) => {
    const cleaned = val.trim().toUpperCase();
    setStaffCodeInput(cleaned);
    setErrorMessage('');

    if (!cleaned) {
      setMatchedCodeObj(null);
      return;
    }

    const match = staffAccountsList.find(
      (c) => (c.employeeId?.toUpperCase() === cleaned || c.code?.toUpperCase() === cleaned) && c.status === 'active'
    );

    if (match) {
      setMatchedCodeObj(match);
    } else {
      setMatchedCodeObj(null);
    }
  };

  const handleStaffCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTimeLeft > 0 || isAuthenticating) return;
    setErrorMessage('');

    const cleanUsername = staffUsername.trim().toLowerCase();
    const cleanPassword = staffPassword;

    if (!cleanUsername || !cleanPassword) {
      setErrorMessage('Please enter both your staff username and password.');
      return;
    }

    setIsAuthenticating(true);
    try {
      const authenticatedStaff = await authenticateStaffCloud(cleanUsername, cleanPassword);

      if (!authenticatedStaff) {
        recordFailedAttempt('Invalid or Disabled Staff Account! Only Admin-allotted staff accounts can log in.');
        triggerToast('Security Alert', 'Invalid Staff Account or Incorrect Password', true);
        setIsAuthenticating(false);
        return;
      }

      setFailedAttempts(0);
      onLoginStaff(authenticatedStaff.empName, authenticatedStaff.location, authenticatedStaff.employeeId);
      triggerToast('Staff Cloud Login Successful', `Welcome ${authenticatedStaff.empName} (${authenticatedStaff.location})`);
    } catch (err: any) {
      setErrorMessage('Authentication error. Please check your cloud connection.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleStaffCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTimeLeft > 0 || isAuthenticating) return;
    setErrorMessage('');

    const cleanedCode = staffCodeInput.trim().toUpperCase();
    if (!cleanedCode) {
      setErrorMessage('Please enter your unique access code provided by Admin.');
      return;
    }

    setIsAuthenticating(true);
    try {
      const authenticatedStaff = await authenticateStaffCloud(cleanedCode);

      if (!authenticatedStaff) {
        recordFailedAttempt('Invalid or Disabled Staff Access Code! Please enter an active code allotted by Admin.');
        triggerToast('Security Alert', 'Invalid or Inactive Access Code', true);
        setIsAuthenticating(false);
        return;
      }

      setFailedAttempts(0);
      onLoginStaff(authenticatedStaff.empName, authenticatedStaff.location, authenticatedStaff.employeeId);
      triggerToast('Staff Cloud Login Successful', `Welcome ${authenticatedStaff.empName} (${authenticatedStaff.employeeId})`);
    } catch (err: any) {
      setErrorMessage('Authentication error. Please check your cloud connection.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTimeLeft > 0 || isAuthenticating) return;
    setErrorMessage('');

    const cleanEmail = adminEmail.trim().toLowerCase();
    const cleanPassword = adminPassword;

    if (!cleanEmail || !cleanPassword) {
      setErrorMessage('Please enter Admin Email/Username and Password.');
      return;
    }

    setIsAuthenticating(true);
    try {
      // Direct master credential check for xarvind07 / xarvind07@gmail.com
      if ((cleanEmail === 'xarvind07@gmail.com' || cleanEmail === 'xarvind07') && cleanPassword === 'Arvind@#9334') {
        await registerAdminAccountSupabase('xarvind07@gmail.com', 'Arvind@#9334', 'Arvind').catch(() => {});
        setFailedAttempts(0);
        onLoginAdmin();
        triggerToast('Admin Control Center Activated', 'Welcome Master Administrator Arvind!');
        setAdminEmail('');
        setAdminPassword('');
        setIsAuthenticating(false);
        return;
      }

      // 1. Authenticate via Supabase Auth
      const user = await signInWithEmail(cleanEmail, cleanPassword);
      if (user) {
        await registerAdminAccountSupabase(cleanEmail, cleanPassword, 'Arvind').catch(() => {});
        setFailedAttempts(0);
        onLoginAdmin();
        triggerToast('Admin Login Successful', 'Keopic Admin Control Center Activated');
        setAdminEmail('');
        setAdminPassword('');
        setIsAuthenticating(false);
        return;
      }

      // 2. Check staff accounts table for admin role
      const adminStaffMatch = await authenticateStaffCloud(cleanEmail, cleanPassword);
      if (adminStaffMatch && adminStaffMatch.role === 'admin') {
        setFailedAttempts(0);
        onLoginAdmin();
        triggerToast('Admin Control Center Activated', `Welcome ${adminStaffMatch.empName}`);
        setAdminEmail('');
        setAdminPassword('');
        setIsAuthenticating(false);
        return;
      }

      recordFailedAttempt('Invalid Admin Credentials! Please verify your Admin Email/ID and Password.');
      triggerToast('Security Alert', 'Incorrect Admin Email or Password', true);
    } catch (err: any) {
      recordFailedAttempt('Admin authentication failed. Please verify credentials.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-br from-pink-200/90 via-rose-100/90 to-fuchsia-200/90 dark:from-slate-950 dark:via-pink-950/80 dark:to-slate-950 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 select-none">
      
      {/* 3D Decorative Ambient Spheres (Smooth steady floating without blinking) */}
      <motion.div 
        animate={{ 
          x: [0, 25, 0],
          y: [0, -20, 0]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-8 left-8 w-72 h-72 bg-gradient-to-tr from-pink-500/25 to-fuchsia-400/25 rounded-full blur-3xl pointer-events-none opacity-60"
      />
      
      <motion.div 
        animate={{ 
          x: [0, -30, 0],
          y: [0, 25, 0]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-8 right-8 w-80 h-80 bg-gradient-to-tr from-rose-400/25 via-pink-500/20 to-indigo-500/20 rounded-full blur-3xl pointer-events-none opacity-60"
      />

      <motion.div 
        animate={{ 
          x: [0, 15, 0],
          y: [0, -15, 0]
        }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute top-1/3 right-1/4 w-48 h-48 bg-gradient-to-br from-teal-400/15 to-emerald-400/15 rounded-full blur-2xl pointer-events-none opacity-50"
      />

      {/* Floating 3D Pastel Badges in background with smooth floating motion */}
      <motion.div 
        animate={{ 
          y: [0, -12, 0],
          rotate: [0, 4, -4, 0]
        }} 
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        className="hidden lg:flex absolute top-16 left-[12%] p-3.5 bg-white/85 dark:bg-slate-800/85 rounded-2xl shadow-lg shadow-pink-500/15 border border-pink-200/80 dark:border-pink-900/60 items-center justify-center text-pink-600 dark:text-pink-300 pointer-events-none"
      >
        <MessageCircle className="w-6 h-6 fill-pink-100 dark:fill-pink-900/40" />
      </motion.div>

      <motion.div 
        animate={{ 
          y: [0, 14, 0],
          rotate: [0, -5, 5, 0]
        }} 
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="hidden lg:flex absolute top-24 right-[12%] p-3.5 bg-white/85 dark:bg-slate-800/85 rounded-2xl shadow-lg shadow-fuchsia-500/15 border border-fuchsia-200/80 dark:border-fuchsia-900/60 items-center justify-center text-fuchsia-500 dark:text-fuchsia-300 pointer-events-none"
      >
        <Lock className="w-6 h-6 fill-fuchsia-100 dark:fill-fuchsia-900/40" />
      </motion.div>

      <motion.div 
        animate={{ 
          y: [0, -10, 0],
          rotate: [0, 6, -6, 0]
        }} 
        transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="hidden lg:flex absolute bottom-20 left-[14%] p-3.5 bg-white/85 dark:bg-slate-800/85 rounded-full shadow-lg shadow-pink-500/15 border border-rose-200/80 dark:border-rose-900/60 items-center justify-center text-rose-500 pointer-events-none"
      >
        <CheckCircle2 className="w-6 h-6 fill-rose-100 dark:fill-rose-900/40" />
      </motion.div>

      <motion.div 
        animate={{ 
          y: [0, 12, 0],
          rotate: [0, -4, 4, 0]
        }} 
        transition={{ duration: 6.2, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="hidden lg:flex absolute bottom-24 right-[15%] p-3.5 bg-white/85 dark:bg-slate-800/85 rounded-2xl shadow-lg shadow-emerald-500/15 border border-emerald-200/80 dark:border-emerald-900/60 items-center justify-center text-emerald-500 pointer-events-none"
      >
        <Zap className="w-6 h-6 fill-emerald-100 dark:fill-emerald-900/40" />
      </motion.div>

      {/* Main Portal Container with Entrance Motion & Animated Border Lighting */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 25 }}
        transition={{ type: "spring", damping: 24, stiffness: 280 }}
        className="w-full max-w-md my-auto relative z-10"
      >
        {/* Soft Ambient Steady Backlight Halo */}
        <div className="absolute -inset-4 rounded-[3.2rem] bg-gradient-to-tr from-pink-500/25 via-fuchsia-500/20 to-rose-400/25 blur-2xl pointer-events-none -z-10" />

        {/* Animated Top Character / Logo Avatar Container */}
        <div className="flex justify-center -mb-9 relative z-20">
          <motion.div 
            initial={{ y: 25, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 220 }}
            className="relative cursor-default"
          >
            {/* Animated Rotating Gradient Border Glow Ring */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-rose-400 opacity-80 blur-[2px]"
            />

            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-pink-500 via-fuchsia-500 to-rose-400 p-1 shadow-2xl shadow-pink-500/40 flex items-center justify-center relative z-10">
              <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 overflow-hidden flex items-center justify-center relative p-1.5 shadow-inner">
                <KeopicLogo className="w-full h-full transform hover:scale-105 transition-transform duration-300" />
                <div className="absolute -top-1 -right-1 p-1.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full shadow-lg">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Static Subtle Accents around top avatar */}
            <div className="absolute -top-1 -left-2 text-pink-400">
              <Star className="w-4 h-4 fill-pink-400" />
            </div>
            <div className="absolute bottom-1 -right-2 text-fuchsia-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </motion.div>
        </div>

        {/* Dynamic Border Lighting Wrapper */}
        <div className="relative p-[2px] rounded-[2.6rem] overflow-hidden shadow-2xl shadow-pink-500/25">
          {/* Continuous Traveling Border Lighting Beam Animation */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-[150%] origin-center bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,transparent_160deg,#ec4899_220deg,#f43f5e_270deg,#d946ef_320deg,#ec4899_360deg)] pointer-events-none"
          />

          {/* Inner Card Background Overlay */}
          <div className="absolute inset-[1px] rounded-[2.55rem] bg-gradient-to-b from-pink-100/40 via-white/20 to-rose-100/30 dark:from-pink-950/30 dark:via-slate-900/30 dark:to-fuchsia-950/20 pointer-events-none" />

          {/* Claymorphic Soft Rounded Card Body */}
          <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-3xl rounded-[2.5rem] p-6 sm:p-8 pt-14 relative z-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
          
          {/* Subtle Ambient Light Shimmer Bar across Top Card */}
          <motion.div 
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
            className="absolute top-0 left-0 h-[2px] w-1/2 bg-gradient-to-r from-transparent via-pink-400 to-transparent pointer-events-none"
          />

          {/* Active Role Indicator Badge if logged in */}
          {currentRole && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 text-center"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border border-pink-300 dark:border-pink-800 text-xs font-bold shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-pink-500" />
                <span>Signed In: {currentRole === 'admin' ? 'Administrator' : 'Staff Member'}</span>
                <button
                  type="button"
                  onClick={onLogout}
                  className="ml-2 underline hover:text-rose-600 flex items-center gap-1 text-[11px] font-extrabold cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  Logout
                </button>
              </div>
            </motion.div>
          )}

          {/* Heading */}
          <div className="text-center mb-6">
            <motion.h1 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white tracking-tight flex items-center justify-center gap-2"
            >
              <span>Keopic Photobooth Portal</span>
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="w-6 h-6 text-pink-500" />
              </motion.div>
            </motion.h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Main Access Page • Log in to enter Staff or Admin Workspace
            </p>
          </div>

          {/* Segmented Tab Switcher with Fluid Sliding Layout Animation */}
          <div className="bg-pink-50/80 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-pink-200/80 dark:border-pink-900/40 grid grid-cols-2 gap-1.5 mb-6 relative">
            <button
              type="button"
              onClick={() => {
                setActiveRole('staff');
                setErrorMessage('');
              }}
              className={`relative py-2.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer flex items-center justify-center gap-2 z-10 ${
                activeRole === 'staff'
                  ? 'text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {activeRole === 'staff' && (
                <motion.div
                  layoutId="activeRoleTab"
                  className="absolute inset-0 bg-gradient-to-r from-pink-500 via-fuchsia-600 to-rose-500 rounded-xl shadow-lg shadow-pink-500/30"
                  transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
                />
              )}
              <User className="w-4 h-4 relative z-10" />
              <span className="relative z-10">Staff Page Access</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveRole('admin');
                setErrorMessage('');
              }}
              className={`relative py-2.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer flex items-center justify-center gap-2 z-10 ${
                activeRole === 'admin'
                  ? 'text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {activeRole === 'admin' && (
                <motion.div
                  layoutId="activeRoleTab"
                  className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 via-pink-600 to-rose-600 rounded-xl shadow-lg shadow-fuchsia-500/30"
                  transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
                />
              )}
              <ShieldCheck className="w-4 h-4 relative z-10" />
              <span className="relative z-10">Admin Control</span>
            </button>
          </div>

          {/* Security Protection Status Shield & Lockout Banner */}
          {lockoutTimeLeft > 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center gap-3"
            >
              <ShieldAlert className="w-5 h-5 shrink-0 text-rose-500" />
              <div>
                <p className="font-extrabold text-xs">Security Lockout Active</p>
                <p className="text-[11px] font-mono mt-0.5">
                  Too many invalid attempts. Unlocking in <strong>{lockoutTimeLeft}s</strong>...
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-4 p-2.5 rounded-2xl bg-pink-500/10 dark:bg-pink-950/40 border border-pink-300/60 dark:border-pink-800/60 text-pink-700 dark:text-pink-300 text-[11px] font-semibold flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-pink-500 shrink-0" />
                <span>Encrypted Session • Admin Shield Active</span>
              </div>
              <span className="font-mono text-[10px] bg-pink-200 dark:bg-pink-900/60 px-2 py-0.5 rounded-full text-pink-800 dark:text-pink-200 font-bold">
                256-Bit SSL
              </span>
            </motion.div>
          )}

          {/* Forms Section with Animated Transitions */}
          <AnimatePresence mode="wait">
            {activeRole === 'staff' ? (
              <motion.div
                key="staff-form"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {/* Staff Sub-tabs with Smooth Sliding Indicator */}
                <div className="bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 px-2 pt-1 flex items-center justify-between">
                    <span>Select Staff Login Option:</span>
                    <span className="text-[10px] text-pink-600 dark:text-pink-400 font-bold">2 Login Methods</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 relative">
                    <button
                      type="button"
                      onClick={() => {
                        setStaffSubTab('credentials');
                        setErrorMessage('');
                      }}
                      className={`relative py-2 px-3 rounded-lg font-extrabold transition-colors cursor-pointer text-xs flex items-center justify-center gap-1.5 z-10 ${
                        staffSubTab === 'credentials'
                          ? 'text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {staffSubTab === 'credentials' && (
                        <motion.div
                          layoutId="staffSubTabPill"
                          className="absolute inset-0 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg shadow-md"
                          transition={{ type: "spring", bounce: 0.18, duration: 0.4 }}
                        />
                      )}
                      <User className="w-3.5 h-3.5 relative z-10" />
                      <span className="relative z-10">ID & Password</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStaffSubTab('code');
                        setErrorMessage('');
                      }}
                      className={`relative py-2 px-3 rounded-lg font-extrabold transition-colors cursor-pointer text-xs flex items-center justify-center gap-1.5 z-10 ${
                        staffSubTab === 'code'
                          ? 'text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {staffSubTab === 'code' && (
                        <motion.div
                          layoutId="staffSubTabPill"
                          className="absolute inset-0 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg shadow-md"
                          transition={{ type: "spring", bounce: 0.18, duration: 0.4 }}
                        />
                      )}
                      <Key className="w-3.5 h-3.5 relative z-10" />
                      <span className="relative z-10">Unique Code</span>
                    </button>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {staffSubTab === 'credentials' ? (
                    <motion.form 
                      key="cred-subform"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      onSubmit={handleStaffCredentialsSubmit} 
                      className="space-y-3.5"
                    >
                      {/* Username Input */}
                      <motion.div 
                        whileHover={{ scale: 1.01 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <div className="relative group">
                          <User className="w-5 h-5 text-pink-400 group-focus-within:text-pink-500 transition-colors absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            required
                            value={staffUsername}
                            onChange={(e) => {
                              setStaffUsername(e.target.value);
                              setErrorMessage('');
                            }}
                            placeholder="Username (e.g. rahul, priya, staff)"
                            className="w-full pl-12 pr-4 py-3.5 bg-pink-50/50 dark:bg-slate-800/80 border border-pink-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-400 focus:bg-white dark:focus:bg-slate-800 shadow-sm transition-all"
                          />
                        </div>
                      </motion.div>

                      {/* Password Input */}
                      <motion.div 
                        whileHover={{ scale: 1.01 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <div className="relative group">
                          <Lock className="w-5 h-5 text-pink-400 group-focus-within:text-pink-500 transition-colors absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type={showStaffPassword ? 'text' : 'password'}
                            required
                            value={staffPassword}
                            onChange={(e) => {
                              setStaffPassword(e.target.value);
                              setErrorMessage('');
                            }}
                            placeholder="Password (e.g. 123)"
                            className="w-full pl-12 pr-11 py-3.5 bg-pink-50/50 dark:bg-slate-800/80 border border-pink-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-400 focus:bg-white dark:focus:bg-slate-800 shadow-sm transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowStaffPassword(!showStaffPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer p-1"
                          >
                            {showStaffPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </motion.div>

                      {/* Animated Error Banner with Tactile Shake */}
                      {errorMessage && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, x: 0 }}
                          animate={{ opacity: 1, scale: 1, x: [-8, 8, -6, 6, -3, 3, 0] }}
                          transition={{ duration: 0.4 }}
                          className="p-3 bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2 shadow-sm"
                        >
                          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
                          <span>{errorMessage}</span>
                        </motion.div>
                      )}

                      {/* Animated Submit Button */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={isAuthenticating || lockoutTimeLeft > 0}
                        className="w-full py-3.5 bg-gradient-to-r from-pink-500 via-fuchsia-600 to-rose-500 hover:brightness-110 text-white rounded-2xl text-xs font-extrabold shadow-xl shadow-pink-500/30 hover:shadow-pink-500/45 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
                      >
                        {isAuthenticating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Verifying Credentials...</span>
                          </>
                        ) : (
                          <>
                            <span>Log In to Staff Account</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </motion.button>
                    </motion.form>
                  ) : (
                    <motion.form 
                      key="code-subform"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      onSubmit={handleStaffCodeSubmit} 
                      className="space-y-3.5"
                    >
                      {/* Unique Code Input */}
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <div className="relative group">
                          <Key className="w-5 h-5 text-pink-500 group-focus-within:text-pink-600 transition-colors absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            required
                            value={staffCodeInput}
                            onChange={(e) => handleStaffCodeChange(e.target.value)}
                            placeholder="Unique Access Code (e.g. STF-1001)"
                            className="w-full pl-12 pr-11 py-3.5 bg-pink-50/50 dark:bg-slate-800/80 border border-pink-200 dark:border-slate-700 rounded-2xl text-xs font-mono font-bold tracking-wider uppercase text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-400 focus:bg-white dark:focus:bg-slate-800 shadow-sm transition-all"
                          />
                          {matchedCodeObj && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: [0, 1.25, 1] }}
                              transition={{ duration: 0.3 }}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2"
                            >
                              <BadgeCheck className="w-5 h-5 text-emerald-500" />
                            </motion.div>
                          )}
                        </div>
                        {matchedCodeObj && (
                          <motion.p 
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1 font-bold"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Verified: {matchedCodeObj.empName} ({matchedCodeObj.location})
                          </motion.p>
                        )}
                      </motion.div>

                      {errorMessage && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, x: 0 }}
                          animate={{ opacity: 1, scale: 1, x: [-8, 8, -6, 6, -3, 3, 0] }}
                          transition={{ duration: 0.4 }}
                          className="p-3 bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2 shadow-sm"
                        >
                          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
                          <span>{errorMessage}</span>
                        </motion.div>
                      )}

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={isAuthenticating || lockoutTimeLeft > 0}
                        className="w-full py-3.5 bg-gradient-to-r from-pink-500 via-fuchsia-600 to-rose-500 hover:brightness-110 text-white rounded-2xl text-xs font-extrabold shadow-xl shadow-pink-500/30 hover:shadow-pink-500/45 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
                      >
                        {isAuthenticating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Validating Code...</span>
                          </>
                        ) : (
                          <>
                            <span>Verify Code & Log In</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </motion.button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="admin-form"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {/* Admin Portal Header Banner */}
                <div className="bg-slate-100 dark:bg-slate-800/90 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <motion.div 
                      whileHover={{ rotate: 15 }}
                      className="w-8 h-8 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-pink-600 flex items-center justify-center text-white shadow-md"
                    >
                      <ShieldCheck className="w-4 h-4" />
                    </motion.div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Master Admin Portal</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Strictly Authorized Personnel Only</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-fuchsia-100 dark:bg-fuchsia-950/80 text-fuchsia-700 dark:text-fuchsia-300 font-extrabold border border-fuchsia-200 dark:border-fuchsia-800">
                    Log In Only
                  </span>
                </div>

                <form onSubmit={handleAdminSubmit} className="space-y-3.5">
                  {/* Admin Email Input */}
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-pink-500" />
                      Administrator Email / ID
                    </label>
                    <div className="relative group">
                      <User className="w-5 h-5 text-pink-500 group-focus-within:text-pink-600 transition-colors absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={adminEmail}
                        onChange={(e) => {
                          setAdminEmail(e.target.value);
                          setErrorMessage('');
                        }}
                        placeholder="Enter Admin Email or ID"
                        className="w-full pl-12 pr-4 py-3.5 bg-pink-50/50 dark:bg-slate-800/80 border border-pink-200 dark:border-slate-700 rounded-2xl text-xs font-mono font-bold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-400 focus:bg-white dark:focus:bg-slate-800 shadow-sm transition-all"
                      />
                    </div>
                  </motion.div>

                  {/* Admin Password Input */}
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-pink-500" />
                      Administrator Password
                    </label>
                    <div className="relative group">
                      <Lock className="w-5 h-5 text-pink-500 group-focus-within:text-pink-600 transition-colors absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showAdminPassword ? 'text' : 'password'}
                        required
                        value={adminPassword}
                        onChange={(e) => {
                          setAdminPassword(e.target.value);
                          setErrorMessage('');
                        }}
                        placeholder="••••••••••••"
                        className="w-full pl-12 pr-11 py-3.5 bg-pink-50/50 dark:bg-slate-800/80 border border-pink-200 dark:border-slate-700 rounded-2xl text-xs font-mono font-bold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-400 focus:bg-white dark:focus:bg-slate-800 shadow-sm transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer p-1"
                      >
                        {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </motion.div>

                  {errorMessage && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, x: 0 }}
                      animate={{ opacity: 1, scale: 1, x: [-8, 8, -6, 6, -3, 3, 0] }}
                      transition={{ duration: 0.4 }}
                      className="p-3 bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2 shadow-sm"
                    >
                      <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>{errorMessage}</span>
                    </motion.div>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isAuthenticating || lockoutTimeLeft > 0}
                    className="w-full py-3.5 bg-gradient-to-r from-fuchsia-600 via-pink-600 to-rose-600 hover:brightness-110 text-white rounded-2xl text-xs font-extrabold shadow-xl shadow-fuchsia-500/30 hover:shadow-fuchsia-500/45 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
                  >
                    {isAuthenticating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Admin Access...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-pink-200" />
                        <span>Open Admin Control Center</span>
                      </>
                    )}
                  </motion.button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Close / Return to Workspace link */}
          {currentRole && onClose && (
            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-purple-600 underline font-semibold cursor-pointer transition-colors"
              >
                Return to Active Ledger Workspace
              </button>
            </div>
          )}
          </div>
        </div>

        {/* Footer Credit Tag */}
        <p className="text-center text-[11px] text-slate-500 dark:text-slate-400 mt-4 font-semibold flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
          <span>Sales & Ledger System • Secure Firestore Cloud Sync</span>
        </p>
      </motion.div>
    </div>
  );
}

