import { useState, useEffect, useMemo, useRef, useCallback, MouseEvent, ChangeEvent } from 'react';
import { 
  TrendingUp, 
  Sun, 
  Moon, 
  MoreVertical, 
  Download, 
  Upload, 
  Printer, 
  FileDown, 
  BookOpen, 
  HelpCircle,
  TrendingDown,
  User as UserIcon,
  Calendar,
  MapPin,
  CircleDollarSign,
  Plus,
  Cloud,
  Mail,
  LogOut,
  CloudOff,
  Undo,
  Redo,
  FileUp,
  ShieldCheck,
  Sparkles,
  Bot,
  Camera,
  LayoutDashboard,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveUserDataToCloud, loadUserDataFromCloud, subscribeToUserData, signOutUser, signInWithGoogle } from './lib/supabase';
import { supabase, onAuthStateChangeSupabase } from './lib/supabase';
import { useProfile } from './hooks/useProfile';

import { DailyEntry, TargetEntry, PaymentEntry, MetaConfig, MonthData, ChatMessage, ConveyanceEntry } from './types';
import { 
  performCalculations, 
  calculateDayName, 
  getDaysInMonth, 
  formatMoney 
} from './utils/calculations';
import { exportAndDownloadPDF } from './utils/exportPdf';
import { 
  registerStaffSession, 
  subscribeToSessionRevocation, 
  sendSessionHeartbeat 
} from './services/sessionService';
import { logActivity } from './services/activityService';
import StaffChatWidget from './components/StaffChatWidget';

// Sub-components
import QuickStats from './components/QuickStats';
import MonthSalaryHistoryCard from './components/MonthSalaryHistoryCard';
import FreeWeekOffsCard from './components/FreeWeekOffsCard';
import PerformanceChart from './components/PerformanceChart';
import DailyEntriesTable from './components/DailyEntriesTable';
import TargetsLogCard from './components/TargetsLogCard';
import ConveyanceLogCard from './components/ConveyanceLogCard';
import PaymentsCard from './components/PaymentsCard';
import BalanceSummary from './components/BalanceSummary';
import ClearAllModal from './components/ClearAllModal';
import ShortcutsModal from './components/ShortcutsModal';
import Toast from './components/Toast';
import AdminPanel from './components/AdminPanel';
import AuthLoginModal from './components/AuthLoginModal';
import AiAssistantModal from './components/AiAssistantModal';
import ProfilePicModal from './components/ProfilePicModal';
import QuickDataEntryWidget from './components/QuickDataEntryWidget';
import KeopicLogo from './components/KeopicLogo';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AmbientBackground } from './components/AmbientBackground';
import { 
  getPermanentPhoto, 
  savePermanentPhoto, 
  getMonthSalary, 
  saveMonthSalary, 
  getAllMonthSalaries 
} from './utils/photoStorage';
import { 
  exportAllMonthsExcel, 
  exportAllMonthsPDF, 
  exportAllMonthsJSON 
} from './utils/exportAllMonths';

// Safe unique ID generator for sandboxed iframe compatibility
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

export default function App() {
  // Supabase Auth & Cloud Sync States
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const isLoadedFromCloud = useRef(false);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('sic_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Dynamic visual accent tint color
  const [accent, setAccent] = useState<'indigo' | 'emerald' | 'purple' | 'rose' | 'amber' | 'cyan'>(() => {
    const saved = localStorage.getItem('sic_accent_color');
    if (saved && ['indigo', 'emerald', 'purple', 'rose', 'amber', 'cyan'].includes(saved)) {
      return saved as any;
    }
    return 'indigo';
  });

  // UI & Auth state (Always prompt login modal on fresh load or page refresh)
  const [userRole, setUserRole] = useState<'staff' | 'admin' | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(true);

  const [isPrintMode, setIsPrintMode] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showProfilePicModal, setShowProfilePicModal] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [showClearModal, setShowClearModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [isAddingMonth, setIsAddingMonth] = useState(false);
  const [newMonthInput, setNewMonthInput] = useState(() => new Date().toISOString().substring(0, 7));
  
  // Auto-save notification status
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  // Current active session state for Single-Session enforcement
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const sessionUnsubRef = useRef<(() => void) | null>(null);

  // Auth Handlers
  const handleLoginStaff = async (name: string, location: string, code?: string) => {
    setUserRole('staff');
    setMeta(prev => ({
      ...prev,
      empName: name,
      locVal: location
    }));
    setShowAuthModal(false);

    // Register active single-session in Supabase
    const staffIdentifier = code || name;
    try {
      const sessId = await registerStaffSession(staffIdentifier);
      setActiveSessionId(sessId);

      // Subscribe to session invalidation in case another device/browser logs in
      if (sessionUnsubRef.current) {
        sessionUnsubRef.current();
      }
      sessionUnsubRef.current = subscribeToSessionRevocation(staffIdentifier, sessId, () => {
        triggerToast(
          'Session Terminated', 
          'You were logged out because your account was logged in from another browser or window.', 
          true
        );
        handleLogoutRole();
      });

      // Audit log
      logActivity(name, 'LOGIN', 'auth', `Staff logged in from counter: ${location}`);
    } catch (err) {
      console.error('Failed to register session:', err);
    }
  };

  const handleLoginAdmin = () => {
    setUserRole('admin');
    setShowAuthModal(false);
    setShowAdminPanel(true);
  };

  const handleLogoutRole = () => {
    if (sessionUnsubRef.current) {
      sessionUnsubRef.current();
      sessionUnsubRef.current = null;
    }
    setActiveSessionId('');
    setUserRole(null);
    signOutUser();
    setShowAdminPanel(false);
    setShowAuthModal(true);
  };

  // Helper to determine the initial month
  const initialMonth = useMemo(() => new Date().toISOString().substring(0, 7), []);

  // Parsed month database with legacy data fallback/migration & month-wise salary initialization
  const parsedAllMonths = useMemo(() => {
    try {
      const saved = localStorage.getItem('sic_all_months_data');
      let parsed: Record<string, MonthData> = {};
      if (saved) {
        parsed = JSON.parse(saved);
      }
      
      const currentMonth = initialMonth;
      if (!parsed[currentMonth]) {
        const legacyRows = localStorage.getItem('sic_rows');
        const legacyTargets = localStorage.getItem('sic_targets');
        const legacyPayments = localStorage.getItem('sic_payments');
        const legacyGoal = localStorage.getItem('sic_daily_goal');
        
        if (legacyRows || legacyTargets || legacyPayments) {
          parsed[currentMonth] = {
            entries: legacyRows ? JSON.parse(legacyRows) : [],
            targets: legacyTargets ? JSON.parse(legacyTargets) : [],
            payments: legacyPayments ? JSON.parse(legacyPayments) : [],
            conveyances: [],
            dailyGoal: legacyGoal ? Number(legacyGoal) : 5000,
            baseSalary: getMonthSalary(currentMonth, currentMonth === '2026-09' ? 18000 : 17000)
          };
        }
      }

      // Ensure August and September exist with isolated defaults if not present
      if (!parsed['2026-08']) {
        parsed['2026-08'] = {
          entries: [],
          targets: [],
          payments: [],
          conveyances: [],
          dailyGoal: 5000,
          baseSalary: getMonthSalary('2026-08', 17000)
        };
      }
      if (!parsed['2026-09']) {
        parsed['2026-09'] = {
          entries: [],
          targets: [],
          payments: [],
          conveyances: [],
          dailyGoal: 5000,
          baseSalary: getMonthSalary('2026-09', 18000)
        };
      }

      // Ensure every month has its isolated baseSalary
      Object.keys(parsed).forEach(m => {
        if (!parsed[m].baseSalary) {
          parsed[m].baseSalary = getMonthSalary(m, m === '2026-09' ? 18000 : 17000);
        }
      });

      return parsed;
    } catch (e) {
      return {};
    }
  }, [initialMonth]);

  // Master database for all months
  const [allMonthsData, setAllMonthsData] = useState<Record<string, MonthData>>(parsedAllMonths);
  const allMonthsDataRef = useRef<Record<string, MonthData>>(parsedAllMonths);

  useEffect(() => {
    allMonthsDataRef.current = allMonthsData;
  }, [allMonthsData]);

  // Core Metadata state
  const [meta, setMeta] = useState<MetaConfig>(() => {
    const savedMeta = localStorage.getItem('sic_meta');
    const initialSalary = getMonthSalary(initialMonth, initialMonth === '2026-09' ? 18000 : 17000);
    if (savedMeta) {
      try {
        const parsed = JSON.parse(savedMeta);
        return {
          ...parsed,
          monthVal: parsed.monthVal || initialMonth,
          baseSalary: getMonthSalary(parsed.monthVal || initialMonth, parsed.baseSalary || initialSalary)
        };
      } catch (e) {}
    }
    return {
      empName: '',
      monthVal: initialMonth,
      locVal: '',
      baseSalary: initialSalary,
      profilePic: '',
    };
  });

  // Permanent Photo Restoration from IndexedDB Engine
  useEffect(() => {
    const restorePermanentPhoto = async () => {
      try {
        const photoKey = meta.empName ? `emp_profile_${meta.empName.trim().replace(/\s+/g, '_')}` : 'emp_profile_active';
        const savedPhoto = await getPermanentPhoto(photoKey) || await getPermanentPhoto('emp_profile_active');
        if (savedPhoto && savedPhoto !== meta.profilePic) {
          setMeta(prev => ({ ...prev, profilePic: savedPhoto }));
        }
      } catch (e) {
        console.warn('Photo restoration check failed:', e);
      }
    };
    restorePermanentPhoto();
  }, [meta.empName]);

  // Periodic session heartbeat
  useEffect(() => {
    if (userRole !== 'staff' || !activeSessionId || !meta.empName) return;
    const interval = setInterval(() => {
      sendSessionHeartbeat(meta.empName, activeSessionId);
    }, 30000);
    return () => clearInterval(interval);
  }, [userRole, activeSessionId, meta.empName]);

  // Fetch user profile from Supabase profiles table on login and keep meta updated
  const { profile: userProfile } = useProfile(currentUser, setMeta, setUserRole);

  // Current Month active states
  const [entries, setEntries] = useState<DailyEntry[]>(() => {
    const monthData = parsedAllMonths[initialMonth];
    if (monthData && monthData.entries && monthData.entries.length > 0) {
      return monthData.entries;
    }
    const defaultDate = `${initialMonth}-01`;
    return [{
      id: generateId(),
      date: defaultDate,
      day: calculateDayName(defaultDate),
      status: 'Present',
      inTime: '10:30',
      outTime: '19:31',
      stand: '',
      magnet: '',
      frame: '',
    }];
  });

  const [targets, setTargets] = useState<TargetEntry[]>(() => {
    return parsedAllMonths[initialMonth]?.targets || [];
  });

  const [payments, setPayments] = useState<PaymentEntry[]>(() => {
    return parsedAllMonths[initialMonth]?.payments || [];
  });

  const [conveyances, setConveyances] = useState<ConveyanceEntry[]>(() => {
    return parsedAllMonths[initialMonth]?.conveyances || [];
  });

  const [dailyGoal, setDailyGoal] = useState<number>(() => {
    return parsedAllMonths[initialMonth]?.dailyGoal || 5000;
  });

  // Toast notifications state
  const [toast, setToast] = useState<{ show: boolean; title: string; msg: string; isError?: boolean }>({
    show: false,
    title: '',
    msg: '',
    isError: false,
  });

  const restoreInputRef = useRef<HTMLInputElement>(null);
  const restorePDFInputRef = useRef<HTMLInputElement>(null);

  // Trigger temporary toast
  const triggerToast = (title: string, msg = '', isError = false) => {
    setToast({ show: true, title, msg, isError });
  };

  const closeToast = () => {
    setToast(prev => ({ ...prev, show: false }));
  };

  // Sync theme with DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sic_theme', theme);
  }, [theme]);

  // Sync accent color with CSS variables & DOM
  useEffect(() => {
    const colors = {
      indigo: { primary: '#6366f1', text: '#4f46e5', hover: '#4338ca', shadow: 'rgba(99, 102, 241, 0.4)', rgb: '99, 102, 241' },
      emerald: { primary: '#10b981', text: '#059669', hover: '#047857', shadow: 'rgba(16, 185, 129, 0.4)', rgb: '16, 185, 129' },
      purple: { primary: '#a855f7', text: '#9333ea', hover: '#7e22ce', shadow: 'rgba(168, 85, 247, 0.4)', rgb: '168, 85, 247' },
      rose: { primary: '#f43f5e', text: '#e11d48', hover: '#be123c', shadow: 'rgba(244, 63, 94, 0.4)', rgb: '244, 63, 94' },
      amber: { primary: '#f59e0b', text: '#d97706', hover: '#b45309', shadow: 'rgba(245, 158, 11, 0.4)', rgb: '245, 158, 11' },
      cyan: { primary: '#06b6d4', text: '#0891b2', hover: '#0369a1', shadow: 'rgba(6, 182, 212, 0.4)', rgb: '6, 182, 212' },
    };
    const chosen = colors[accent] || colors.indigo;
    document.documentElement.style.setProperty('--color-accent-primary', chosen.primary);
    document.documentElement.style.setProperty('--color-accent-text', chosen.text);
    document.documentElement.style.setProperty('--color-accent-hover', chosen.hover);
    document.documentElement.style.setProperty('--color-accent-shadow', chosen.shadow);
    document.documentElement.style.setProperty('--color-accent-rgb', chosen.rgb);
    localStorage.setItem('sic_accent_color', accent);
  }, [accent]);

  // History state for undo/redo
  const [history, setHistory] = useState<{ entries: DailyEntry[]; targets: TargetEntry[]; payments: PaymentEntry[]; conveyances?: ConveyanceEntry[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isPerformingUndoRedo = useRef(false);
  const isFirstLoad = useRef(true);
  const lastCloudTimestampRef = useRef<number>(0);

  // Real-time Chat Messages state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Helper to get consistent account sync key
  const getSyncUserKey = useCallback((user: any, role: string | null, empName: string): string => {
    if (user) {
      return user.id || user.uid || user.email || 'user_session';
    }
    if (role === 'admin') {
      return 'admin_master';
    }
    if (role === 'staff' && empName) {
      return `staff_${empName.trim().replace(/\s+/g, '_')}`;
    }
    let gid = localStorage.getItem('sic_guest_device_id');
    if (!gid) {
      gid = 'guest_' + generateId();
      localStorage.setItem('sic_guest_device_id', gid);
    }
    return gid;
  }, []);

  // Live Real-Time Firestore & Supabase Listener for Staff/User UI
  useEffect(() => {
    const syncUid = getSyncUserKey(currentUser, userRole, meta.empName);
    if (!syncUid) return;

    const unsubscribeUserDoc = subscribeToUserData(syncUid, (cloudData) => {
      if (!cloudData) return;

      const cloudUpdatedAt = cloudData.updatedAt || 0;
      if (cloudUpdatedAt <= lastCloudTimestampRef.current) {
        return;
      }
      lastCloudTimestampRef.current = cloudUpdatedAt;

      if (Array.isArray(cloudData.chatMessages)) {
        setChatMessages(cloudData.chatMessages);
      }

      let loadedAllMonths: Record<string, MonthData> = {};
      if (cloudData.allMonths) {
        loadedAllMonths = cloudData.allMonths;
      } else {
        const cloudMonth = cloudData.meta?.monthVal || meta.monthVal;
        loadedAllMonths = {
          [cloudMonth]: {
            entries: cloudData.entries || [],
            targets: cloudData.targets || [],
            payments: cloudData.payments || [],
            conveyances: cloudData.conveyances || [],
            dailyGoal: cloudData.dailyGoal || 5000
          }
        };
      }

      setAllMonthsData(loadedAllMonths);
      allMonthsDataRef.current = loadedAllMonths;

      if (cloudData.meta) {
        setMeta(prev => ({
          ...prev,
          empName: cloudData.meta?.empName ?? prev.empName,
          monthVal: cloudData.meta?.monthVal ?? prev.monthVal,
          locVal: cloudData.meta?.locVal ?? prev.locVal,
          baseSalary: Number(cloudData.meta?.baseSalary) || prev.baseSalary,
          profilePic: cloudData.meta?.profilePic ?? prev.profilePic
        }));
      }

      const activeMon = cloudData.meta?.monthVal || meta.monthVal;
      const currentMonData = loadedAllMonths[activeMon];
      if (currentMonData) {
        setEntries(currentMonData.entries || []);
        setTargets(currentMonData.targets || []);
        setPayments(currentMonData.payments || []);
        setConveyances(currentMonData.conveyances || []);
        setDailyGoal(currentMonData.dailyGoal || 5000);
      }

      if (cloudData.accent && ['indigo', 'emerald', 'purple', 'rose', 'amber', 'cyan'].includes(cloudData.accent)) {
        setAccent(cloudData.accent as any);
      }

      setCloudSyncStatus('synced');
    });

    return () => {
      if (typeof unsubscribeUserDoc === 'function') unsubscribeUserDoc();
    };
  }, [currentUser]);

  // Supabase Realtime subscriptions for 'sales' and 'branch_stock' tables
  useEffect(() => {
    const activeBranch = meta.locVal || '';
    const isMasterAdmin = userRole === 'admin';

    // 1. Subscribe to 'sales' table with filtering
    const salesFilter = !isMasterAdmin && activeBranch ? `branch_name=eq.${activeBranch}` : undefined;
    const salesChannel = supabase
      .channel(`rt-sales-${isMasterAdmin ? 'all' : (activeBranch || 'guest')}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales',
          ...(salesFilter ? { filter: salesFilter } : {})
        },
        (payload) => {
          console.log('[Supabase Realtime] Sales update received:', payload);
          if (payload.eventType === 'INSERT') {
            const newSale = payload.new;
            triggerToast(
              'Realtime Sale Update',
              `New sale recorded for ${newSale.product_name || 'item'} (₹${newSale.amount || 0}) at ${newSale.branch_name || 'branch'}`
            );
          } else if (payload.eventType === 'UPDATE') {
            triggerToast('Realtime Sale Update', `Sale record updated for ${payload.new.branch_name || 'branch'}`);
          }

          if (currentUser?.uid) {
            loadUserDataFromCloud(currentUser.uid).then((cloudData) => {
              if (cloudData && cloudData.entries) {
                setEntries(cloudData.entries);
              }
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Supabase Realtime] Sales channel subscribed successfully.');
        }
      });

    // 2. Subscribe to 'branch_stock' table with filtering
    const stockFilter = !isMasterAdmin && activeBranch ? `branch_name=eq.${activeBranch}` : undefined;
    const stockChannel = supabase
      .channel(`rt-stock-${isMasterAdmin ? 'all' : (activeBranch || 'guest')}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'branch_stock',
          ...(stockFilter ? { filter: stockFilter } : {})
        },
        (payload) => {
          console.log('[Supabase Realtime] Branch Stock update received:', payload);
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const stockData = payload.new;
            const itemBranch = stockData.branch_name || 'Branch';
            const prodName = stockData.product_name || 'Product';
            const currentStock = stockData.current_stock ?? 0;

            triggerToast(
              'Live Stock Update',
              `${itemBranch}: ${prodName} current stock is now ${currentStock} units`
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Supabase Realtime] Branch Stock channel subscribed successfully.');
        }
      });

    return () => {
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(stockChannel);
    };
  }, [currentUser, userRole, meta.locVal]);

  // Handle Supabase Auth state changes and load all months' data
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sbUser = session?.user ? { ...session.user, uid: session.user.id } : null;
      setCurrentUser(sbUser as any);
      if (sbUser) {
        setCloudSyncStatus('syncing');
        try {
          const userEmail = sbUser.email || (sbUser.user_metadata?.email as string) || '';
          const userKey = sbUser.id || sbUser.uid || userEmail;

          let cloudData = await loadUserDataFromCloud(userKey, userEmail);

          if (cloudData) {
            let loadedAllMonths: Record<string, MonthData> = {};
            if (cloudData.allMonths) {
              loadedAllMonths = cloudData.allMonths;
            } else {
              // Backward compatibility
              const cloudMonth = cloudData.meta?.monthVal || meta.monthVal;
              loadedAllMonths = {
                [cloudMonth]: {
                  entries: cloudData.entries || [],
                  targets: cloudData.targets || [],
                  payments: cloudData.payments || [],
                  conveyances: cloudData.conveyances || [],
                  dailyGoal: cloudData.dailyGoal || 5000
                }
              };
            }

            setAllMonthsData(loadedAllMonths);
            allMonthsDataRef.current = loadedAllMonths;
            try {
              localStorage.setItem('sic_all_months_data', JSON.stringify(loadedAllMonths));
            } catch (e) {}

            if (cloudData.meta) {
              setMeta(prev => {
                const updatedMeta = {
                  empName: cloudData.meta?.empName ?? prev.empName,
                  monthVal: cloudData.meta?.monthVal ?? prev.monthVal,
                  locVal: cloudData.meta?.locVal ?? prev.locVal,
                  baseSalary: Number(cloudData.meta?.baseSalary) || prev.baseSalary,
                  profilePic: cloudData.meta?.profilePic ?? prev.profilePic
                };
                try {
                  localStorage.setItem('sic_meta', JSON.stringify(updatedMeta));
                } catch (e) {}
                return updatedMeta;
              });
            }

            const activeMon = cloudData.meta?.monthVal || meta.monthVal;
            const currentMonData = loadedAllMonths[activeMon];
            if (currentMonData) {
              const loadedEntries = currentMonData.entries || [];
              const loadedTargets = currentMonData.targets || [];
              const loadedPayments = currentMonData.payments || [];
              const loadedConveyances = currentMonData.conveyances || [];
              setEntries(loadedEntries);
              setTargets(loadedTargets);
              setPayments(loadedPayments);
              setConveyances(loadedConveyances);
              setDailyGoal(currentMonData.dailyGoal || 5000);

              // Set up initial history state
              setHistory([{ entries: loadedEntries, targets: loadedTargets, payments: loadedPayments, conveyances: loadedConveyances }]);
              setHistoryIndex(0);
              isPerformingUndoRedo.current = true;
            }

            if (cloudData.accent && ['indigo', 'emerald', 'purple', 'rose', 'amber', 'cyan'].includes(cloudData.accent)) {
              setAccent(cloudData.accent as any);
            }

            setCloudSyncStatus('synced');
            triggerToast('Gmail Cloud Sync Connected', `Loaded all saved records for ${userEmail || 'Account'}`);
          } else {
            // No data in cloud yet. Save current local state to cloud as initialization
            const activeMonth = meta.monthVal;
            const latestAllMonths = {
              ...allMonthsDataRef.current,
              [activeMonth]: {
                entries,
                targets,
                payments,
                conveyances,
                dailyGoal
              }
            };

            const payload = {
              allMonths: latestAllMonths,
              entries,
              targets,
              payments,
              conveyances,
              userEmail,
              meta: {
                empName: meta.empName,
                monthVal: meta.monthVal,
                locVal: meta.locVal,
                baseSalary: meta.baseSalary,
                profilePic: meta.profilePic || ''
              },
              accent,
              dailyGoal,
              updatedAt: Date.now()
            };
            await saveUserDataToCloud(userKey, payload);
            if (userEmail && userEmail !== userKey) {
              await saveUserDataToCloud(userEmail, payload);
            }
            setCloudSyncStatus('synced');
            triggerToast('Gmail Cloud Sync Activated', `Your records are now backed up to ${userEmail || 'Gmail'}`);
          }
        } catch (err) {
          console.error('Initial sync failed:', err);
          setCloudSyncStatus('error');
          triggerToast('Sync Status', 'Loaded local workspace cache', false);
        } finally {
          isLoadedFromCloud.current = true;
        }
      } else {
        isLoadedFromCloud.current = false;
        setCloudSyncStatus('idle');
      }
    });

    return () => authListener?.subscription.unsubscribe();
  }, []);

  // Synchronize state before unload if needed
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Supabase cloud updates are continuously handled live
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Robust Centralized Data Restore Handler
  const performDataRestore = (data: any) => {
    try {
      const restoredEntries = data.rows || [];
      const restoredPayments = data.payments || [];
      const restoredTargets = data.targets || [];
      const restoredConveyances = data.conveyances || [];
      const restoredGoal = Number(data.dailyGoal || data.goal) || 5000;
      
      const restoredMeta = {
        empName: data.meta?.emp || data.meta?.empName || '',
        monthVal: data.meta?.mon || data.meta?.monthVal || meta.monthVal,
        locVal: data.meta?.loc || data.meta?.locVal || '',
        baseSalary: Number(data.meta?.sal || data.meta?.baseSalary) || 17000,
      };

      const targetMonth = restoredMeta.monthVal;

      const updatedAllMonths = {
        ...allMonthsDataRef.current,
        [targetMonth]: {
          entries: restoredEntries,
          targets: restoredTargets,
          payments: restoredPayments,
          conveyances: restoredConveyances,
          dailyGoal: restoredGoal,
        }
      };
      
      setAllMonthsData(updatedAllMonths);
      allMonthsDataRef.current = updatedAllMonths;

      // Set currentMonthRef to targetMonth to bypass month switching side effect saving
      currentMonthRef.current = targetMonth;

      // Update all states synchronously
      setMeta(restoredMeta);
      setEntries(restoredEntries);
      setTargets(restoredTargets);
      setPayments(restoredPayments);
      setConveyances(restoredConveyances);
      setDailyGoal(restoredGoal);

      // Queue cloud save if logged in
      if (currentUser && isLoadedFromCloud.current) {
        setCloudSyncStatus('syncing');
        const syncKey = getSyncUserKey(currentUser, userRole, meta.empName);
        saveUserDataToCloud(syncKey, {
          allMonths: updatedAllMonths,
          entries: restoredEntries,
          targets: restoredTargets,
          payments: restoredPayments,
          meta: {
            empName: restoredMeta.empName,
            monthVal: restoredMeta.monthVal,
            locVal: restoredMeta.locVal,
            baseSalary: restoredMeta.baseSalary
          },
          accent,
          dailyGoal: restoredGoal,
          updatedAt: Date.now()
        }).then(() => {
          setCloudSyncStatus('synced');
        }).catch((err) => {
          console.error('Restore cloud save failed:', err);
          setCloudSyncStatus('error');
        });
      }

      // Reset undo/redo history for the restored state
      setHistory([{ entries: restoredEntries, targets: restoredTargets, payments: restoredPayments }]);
      setHistoryIndex(0);
      isPerformingUndoRedo.current = true;

      triggerToast('Data Restored', `Successfully loaded and saved records for ${targetMonth}`);
    } catch (err) {
      console.error('Error in performDataRestore:', err);
      triggerToast('Restore Failed', 'Failed to properly initialize restored data structures', true);
    }
  };

  // Update month-specific salary with total isolation
  const handleUpdateMonthSalary = (monthKey: string, newSalary: number) => {
    if (!monthKey || isNaN(newSalary) || newSalary <= 0) return;
    saveMonthSalary(monthKey, newSalary);
    
    setAllMonthsData(prev => {
      const existing = prev[monthKey] || { entries: [], targets: [], payments: [], dailyGoal: 5000 };
      const updated = {
        ...prev,
        [monthKey]: {
          ...existing,
          baseSalary: newSalary
        }
      };
      allMonthsDataRef.current = updated;
      return updated;
    });

    if (monthKey === meta.monthVal) {
      setMeta(prev => ({ ...prev, baseSalary: newSalary }));
    }
    triggerToast('Salary Updated', `${monthKey} base salary set to ₹${newSalary.toLocaleString('en-IN')}`);
  };

  // Month switching mechanism with isolated monthly salary loading
  const currentMonthRef = useRef(meta.monthVal);

  useEffect(() => {
    const prevMonth = currentMonthRef.current;
    const newMonth = meta.monthVal;

    if (prevMonth === newMonth) return;

    // Save previous month state and its isolated salary
    const updatedAllMonths = {
      ...allMonthsDataRef.current,
      [prevMonth]: {
        entries,
        targets,
        payments,
        conveyances,
        dailyGoal,
        baseSalary: meta.baseSalary
      }
    };
    saveMonthSalary(prevMonth, meta.baseSalary);
    setAllMonthsData(updatedAllMonths);
    allMonthsDataRef.current = updatedAllMonths;

    // Load new month state and its isolated salary
    const newMonthData = updatedAllMonths[newMonth];
    const newMonthSalary = newMonthData?.baseSalary || getMonthSalary(newMonth, newMonth === '2026-09' ? 18000 : 17000);

    // Update active salary strictly for the target month
    setMeta(prev => ({
      ...prev,
      monthVal: newMonth,
      baseSalary: newMonthSalary
    }));

    if (newMonthData) {
      const switchedEntries = newMonthData.entries || [];
      const switchedTargets = newMonthData.targets || [];
      const switchedPayments = newMonthData.payments || [];
      const switchedConveyances = newMonthData.conveyances || [];

      setEntries(switchedEntries);
      setTargets(switchedTargets);
      setPayments(switchedPayments);
      setConveyances(switchedConveyances);
      setDailyGoal(newMonthData.dailyGoal || 5000);

      // Reset history for the new month
      setHistory([{ entries: switchedEntries, targets: switchedTargets, payments: switchedPayments, conveyances: switchedConveyances }]);
      setHistoryIndex(0);
      isPerformingUndoRedo.current = true;
    } else {
      // Setup initial default row for new month
      const defaultDate = `${newMonth}-01`;
      const switchedEntries = [{
        id: generateId(),
        date: defaultDate,
        day: calculateDayName(defaultDate),
        status: 'Present' as const,
        inTime: '10:30',
        outTime: '19:31',
        stand: '' as const,
        magnet: '' as const,
        frame: '' as const,
      }];
      setEntries(switchedEntries);
      setTargets([]);
      setPayments([]);
      setConveyances([]);
      setDailyGoal(5000);

      // Reset history for the new month
      setHistory([{ entries: switchedEntries, targets: [], payments: [], conveyances: [] }]);
      setHistoryIndex(0);
      isPerformingUndoRedo.current = true;
    }

    currentMonthRef.current = newMonth;
    triggerToast('Month Switched', `Loaded ${newMonth} (Salary: ₹${newMonthSalary.toLocaleString('en-IN')})`);
  }, [meta.monthVal]);

  // Handle outside click to close actions dropdown
  useEffect(() => {
    const handleOutsideClick = () => {
      setShowMenuDropdown(false);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // History tracking for Undo/Redo
  useEffect(() => {
    if (isFirstLoad.current) {
      if (entries.length > 0) {
        isFirstLoad.current = false;
        setHistory([{ entries, targets, payments, conveyances }]);
        setHistoryIndex(0);
      }
      return;
    }

    if (isPerformingUndoRedo.current) {
      isPerformingUndoRedo.current = false;
      return;
    }

    const timer = setTimeout(() => {
      setHistory(prev => {
        const trimmedHistory = prev.slice(0, historyIndex + 1);
        const lastState = trimmedHistory[trimmedHistory.length - 1];
        
        if (lastState && 
            JSON.stringify(lastState.entries) === JSON.stringify(entries) &&
            JSON.stringify(lastState.targets) === JSON.stringify(targets) &&
            JSON.stringify(lastState.payments) === JSON.stringify(payments) &&
            JSON.stringify(lastState.conveyances || []) === JSON.stringify(conveyances)) {
          return prev;
        }

        const nextHistory = [...trimmedHistory, { entries, targets, payments, conveyances }];
        if (nextHistory.length > 50) {
          nextHistory.shift();
          setHistoryIndex(nextHistory.length - 1);
        } else {
          setHistoryIndex(nextHistory.length - 1);
        }
        return nextHistory;
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [entries, targets, payments, conveyances]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const prevState = history[prevIndex];
      isPerformingUndoRedo.current = true;
      setHistoryIndex(prevIndex);
      setEntries(prevState.entries);
      setTargets(prevState.targets);
      setPayments(prevState.payments);
      setConveyances(prevState.conveyances || []);
      triggerToast('Undo Successful', 'Reverted to previous state');
    } else {
      triggerToast('Nothing to Undo', 'You are at the oldest saved state');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextState = history[nextIndex];
      isPerformingUndoRedo.current = true;
      setHistoryIndex(nextIndex);
      setEntries(nextState.entries);
      setTargets(nextState.targets);
      setPayments(nextState.payments);
      setConveyances(nextState.conveyances || []);
      triggerToast('Redo Successful', 'Reapplied reverted changes');
    } else {
      triggerToast('Nothing to Redo', 'You are at the latest state');
    }
  };

  const handleUndoToday = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayEntry = entries.find(e => e.date === todayStr);
    
    if (todayEntry) {
      const updatedEntries = entries.map(e => {
        if (e.date === todayStr) {
          return {
            ...e,
            status: 'Present' as const,
            inTime: '10:30',
            outTime: '19:31',
            stand: '' as const,
            magnet: '' as const,
            frame: '' as const,
          };
        }
        return e;
      });
      setEntries(updatedEntries);
      triggerToast("Today's Data Reset", "Reverted today's attendance and sales to defaults.");
    } else {
      triggerToast("Today's Entry Not Found", "Please make sure today's date exists in this month.", true);
    }
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
            break;
          case 'y':
            e.preventDefault();
            handleRedo();
            break;
          case 'n':
            e.preventDefault();
            handleAddEntry();
            triggerToast('Added row', 'New daily entry slot is active');
            break;
          case 's':
            e.preventDefault();
            setSaveStatus('saving');
            const activeMonth = meta.monthVal;
            const finalAllMonths = {
              ...allMonthsDataRef.current,
              [activeMonth]: {
                entries,
                targets,
                payments,
                conveyances,
                dailyGoal,
                baseSalary: meta.baseSalary
              }
            };
            saveMonthSalary(activeMonth, meta.baseSalary);
            setAllMonthsData(finalAllMonths);
            allMonthsDataRef.current = finalAllMonths;

            try {
              localStorage.setItem('sic_all_months_data', JSON.stringify(finalAllMonths));
              localStorage.setItem('sic_meta', JSON.stringify(meta));
              localStorage.setItem('sic_daily_goal', String(dailyGoal));
            } catch (e) {}

            const syncKey = getSyncUserKey(currentUser, userRole, meta.empName);
            const userMail = currentUser?.email || (currentUser?.user_metadata?.email as string) || '';

            setCloudSyncStatus('syncing');
            saveUserDataToCloud(syncKey, {
              allMonths: finalAllMonths,
              entries,
              targets,
              payments,
              conveyances,
              userEmail: userMail,
              meta: {
                empName: meta.empName,
                monthVal: meta.monthVal,
                locVal: meta.locVal,
                baseSalary: meta.baseSalary,
                profilePic: meta.profilePic || ''
              },
              accent,
              dailyGoal,
              updatedAt: Date.now()
            }).then(() => {
              setCloudSyncStatus('synced');
            }).catch(() => {
              setCloudSyncStatus('error');
            });

            setTimeout(() => setSaveStatus('saved'), 600);
            triggerToast('Calculated & Saved', 'Data synchronized to local cache & cloud');
            break;
          case 'f':
            e.preventDefault();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.focus();
            break;
          case 't':
            e.preventDefault();
            setTheme(prev => prev === 'light' ? 'dark' : 'light');
            break;
          case 'p':
            e.preventDefault();
            handleExportPDF();
            break;
          default:
            break;
        }
      }
      if (e.key === '?') {
        e.preventDefault();
        setShowShortcutsModal(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [entries, targets, payments, conveyances, meta, currentUser, historyIndex, history]);

  // Automatic state auto-saving to local storage & cloud
  useEffect(() => {
    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      const activeMonth = meta.monthVal;
      const finalAllMonths = {
        ...allMonthsDataRef.current,
        [activeMonth]: {
          entries,
          targets,
          payments,
          conveyances,
          dailyGoal,
          baseSalary: meta.baseSalary
        }
      };
      saveMonthSalary(activeMonth, meta.baseSalary);
      setAllMonthsData(finalAllMonths);
      allMonthsDataRef.current = finalAllMonths;

      // Always sync to localStorage as immediate offline cache
      try {
        localStorage.setItem('sic_all_months_data', JSON.stringify(finalAllMonths));
        localStorage.setItem('sic_meta', JSON.stringify(meta));
        localStorage.setItem('sic_daily_goal', String(dailyGoal));
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }

      // Sync to cloud (using consistent user key / Gmail email key)
      const syncUid = getSyncUserKey(currentUser, userRole, meta.empName);
      const userEmail = currentUser?.email || (currentUser?.user_metadata?.email as string) || '';

      setCloudSyncStatus('syncing');
      try {
        const now = Date.now();
        lastCloudTimestampRef.current = now;
        const payload = {
          allMonths: finalAllMonths,
          entries,
          targets,
          payments,
          conveyances,
          chatMessages,
          userEmail,
          meta: {
            empName: meta.empName || 'Staff Member',
            monthVal: meta.monthVal,
            locVal: meta.locVal || 'Main Counter',
            baseSalary: meta.baseSalary,
            profilePic: meta.profilePic || ''
          },
          accent,
          dailyGoal,
          updatedAt: now
        };
        await saveUserDataToCloud(syncUid, payload);
        if (userEmail && userEmail !== syncUid) {
          await saveUserDataToCloud(userEmail, payload);
        }
        setCloudSyncStatus('synced');
      } catch (err) {
        console.error('Auto-save to cloud failed:', err);
        setCloudSyncStatus('error');
      }

      setSaveStatus('saved');
    }, 400);

    return () => clearTimeout(timer);
  }, [entries, targets, payments, conveyances, meta, accent, dailyGoal, chatMessages, currentUser, userRole, getSyncUserKey]);

  // Handle staff sending a chat message to admin
  const handleSendStaffChatMessage = (text: string) => {
    const newMsg: ChatMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      sender: 'staff',
      senderName: meta.empName || 'Staff Member',
      text,
      timestamp: Date.now(),
      read: false
    };

    const updatedMsgs = [...chatMessages, newMsg];
    setChatMessages(updatedMsgs);

    let syncUid = currentUser?.id || currentUser?.uid || (meta.empName ? `staff_${meta.empName.replace(/\s+/g, '_')}` : 'guest_session');

    if (syncUid) {
      const now = Date.now();
      lastCloudTimestampRef.current = now;
      const payload = {
        allMonths: allMonthsDataRef.current,
        entries,
        targets,
        payments,
        chatMessages: updatedMsgs,
        meta: {
          empName: meta.empName || 'Staff Member',
          monthVal: meta.monthVal,
          locVal: meta.locVal || 'Main Counter',
          baseSalary: meta.baseSalary,
          profilePic: meta.profilePic || ''
        },
        accent,
        dailyGoal,
        updatedAt: now
      };
      saveUserDataToCloud(syncUid, payload).catch(err => console.error('Chat send failed:', err));
    }
  };

  // Handle staff marking admin messages as read
  const handleMarkChatAsRead = () => {
    const hasUnreadAdmin = chatMessages.some(m => m.sender === 'admin' && !m.read);
    if (!hasUnreadAdmin) return;

    const updatedMsgs = chatMessages.map(m =>
      m.sender === 'admin' ? { ...m, read: true } : m
    );
    setChatMessages(updatedMsgs);

    let syncUid = currentUser?.id || currentUser?.uid || (meta.empName ? `staff_${meta.empName.replace(/\s+/g, '_')}` : 'guest_session');

    if (syncUid) {
      const now = Date.now();
      lastCloudTimestampRef.current = now;
      const payload = {
        allMonths: allMonthsDataRef.current,
        entries,
        targets,
        payments,
        chatMessages: updatedMsgs,
        meta: {
          empName: meta.empName || 'Staff Member',
          monthVal: meta.monthVal,
          locVal: meta.locVal || 'Main Counter',
          baseSalary: meta.baseSalary,
          profilePic: meta.profilePic || ''
        },
        accent,
        dailyGoal,
        updatedAt: now
      };
      saveUserDataToCloud(syncUid, payload).catch(err => console.error('Mark read failed:', err));
    }
  };

  // Compute stats dynamically using calculations engine
  const stats = useMemo(() => {
    return performCalculations(entries, targets, payments, meta.baseSalary, meta.monthVal, conveyances);
  }, [entries, targets, payments, conveyances, meta.baseSalary, meta.monthVal]);

  const dailyAverage = entries.length > 0 ? stats.grossSales / entries.length : 0;

  // Metadata Updates with isolated Month-Wise Salary saving
  const handleMetaChange = (field: keyof MetaConfig, value: any) => {
    if (field === 'baseSalary') {
      const numSal = Math.max(0, Number(value) || 0);
      saveMonthSalary(meta.monthVal, numSal);
      setAllMonthsData(prev => {
        const existing = prev[meta.monthVal] || { entries, targets, payments, conveyances, dailyGoal };
        const updated = {
          ...prev,
          [meta.monthVal]: {
            ...existing,
            baseSalary: numSal
          }
        };
        allMonthsDataRef.current = updated;
        return updated;
      });
    }
    setMeta(prev => ({ ...prev, [field]: value }));
  };

  // Daily Entries actions
  const handleAddEntry = (customData: Partial<DailyEntry> = {}) => {
    const fallbackDate = new Date().toISOString().split('T')[0];
    const newEntry: DailyEntry = {
      id: generateId(),
      date: customData.date || fallbackDate,
      day: customData.day || calculateDayName(customData.date || fallbackDate),
      status: customData.status || 'Present',
      inTime: customData.inTime || '10:30',
      outTime: customData.outTime || '19:31',
      stand: customData.stand !== undefined ? customData.stand : '',
      magnet: customData.magnet !== undefined ? customData.magnet : '',
      frame: customData.frame !== undefined ? customData.frame : '',
      locVal: customData.locVal || meta.locVal || 'Main Counter',
    };
    setEntries(prev => [...prev, newEntry]);
  };

  const handleUpdateEntry = (id: string, field: keyof DailyEntry, value: any) => {
    setEntries(prev => prev.map(entry => {
      if (entry.id === id) {
        return { ...entry, [field]: value };
      }
      return entry;
    }));
  };

  const handleAddOrUpdateEntry = (entryPartial: Partial<DailyEntry> & { date: string }) => {
    const targetDate = entryPartial.date;
    const dayName = calculateDayName(targetDate);

    setEntries(prev => {
      const existingIndex = prev.findIndex(e => e.date === targetDate);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...entryPartial,
          day: dayName,
          locVal: entryPartial.locVal || updated[existingIndex].locVal || meta.locVal || 'Main Counter',
        };
        return updated.sort((a, b) => a.date.localeCompare(b.date));
      } else {
        const newEntry: DailyEntry = {
          id: generateId(),
          date: targetDate,
          day: dayName,
          status: entryPartial.status || 'Present',
          inTime: entryPartial.inTime || '10:30',
          outTime: entryPartial.outTime || '19:31',
          stand: entryPartial.stand !== undefined ? entryPartial.stand : '',
          magnet: entryPartial.magnet !== undefined ? entryPartial.magnet : '',
          frame: entryPartial.frame !== undefined ? entryPartial.frame : '',
          locVal: entryPartial.locVal || meta.locVal || 'Main Counter',
        };
        return [...prev, newEntry].sort((a, b) => a.date.localeCompare(b.date));
      }
    });
  };

  const handleDeleteEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    triggerToast('Row deleted', 'State recalculated automatically');
  };

  // Fill Month bulk operation
  const handleFillMonth = () => {
    if (!meta.monthVal || !meta.monthVal.includes('-')) {
      triggerToast('Select a month first', 'Needs a valid month indicator', true);
      return;
    }

    const [year, month] = meta.monthVal.split('-').map(Number);
    const totalDays = getDaysInMonth(meta.monthVal);
    const existingDates = new Set(entries.map(e => e.date));

    let addedCount = 0;
    const newRows: DailyEntry[] = [];

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${meta.monthVal}-${String(day).padStart(2, '0')}`;
      if (existingDates.has(dateStr)) continue;

      const dayName = calculateDayName(dateStr);
      newRows.push({
        id: generateId(),
        date: dateStr,
        day: dayName,
        status: dayName === 'Sunday' ? 'Week Off' : 'Present',
        inTime: '10:30',
        outTime: '19:31',
        stand: '',
        magnet: '',
        frame: '',
      });
      addedCount++;
    }

    if (newRows.length > 0) {
      setEntries(prev => [...prev, ...newRows].sort((a, b) => a.date.localeCompare(b.date)));
      triggerToast('Month filled', `Added ${addedCount} missing days to grid`);
    } else {
      triggerToast('No missing dates', 'Your month timeline is fully populated');
    }
  };

  // Targets log actions
  const handleAddTarget = () => {
    const fallbackDate = new Date().toISOString().split('T')[0];
    const newTarget: TargetEntry = {
      id: generateId(),
      date: fallbackDate,
      note: '',
      amt: '',
      status: 'Pending',
    };
    setTargets(prev => [...prev, newTarget]);
  };

  const handleUpdateTarget = (id: string, field: keyof TargetEntry, value: any) => {
    setTargets(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, [field]: value };
      }
      return t;
    }));
  };

  const handleDeleteTarget = (id: string) => {
    setTargets(prev => prev.filter(t => t.id !== id));
    triggerToast('Target cleared');
  };

  // Payments actions
  const handleAddPayment = (type: 'sent_to_sir' | 'advance_received' = 'sent_to_sir') => {
    const fallbackDate = new Date().toISOString().split('T')[0];
    const newPayment: PaymentEntry = {
      id: generateId(),
      date: fallbackDate,
      note: type === 'advance_received' ? 'Advance Money Received' : '',
      amt: '',
      type,
    };
    setPayments(prev => [...prev, newPayment]);
  };

  const handleUpdatePayment = (id: string, field: keyof PaymentEntry, value: any) => {
    setPayments(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const handleDeletePayment = (id: string) => {
    setPayments(prev => prev.filter(p => p.id !== id));
    triggerToast('Payment transaction deleted');
  };

  // Conveyance actions
  const handleAddConveyance = () => {
    const fallbackDate = new Date().toISOString().split('T')[0];
    const newConveyance: ConveyanceEntry = {
      id: generateId(),
      date: fallbackDate,
      note: '',
      amt: '',
      status: 'Pending',
    };
    setConveyances(prev => [...prev, newConveyance]);
    triggerToast('Claim Added', 'New conveyance entry created');
  };

  const handleUpdateConveyance = (id: string, field: keyof ConveyanceEntry, value: any) => {
    setConveyances(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, [field]: value };
      }
      return c;
    }));
  };

  const handleDeleteConveyance = (id: string) => {
    setConveyances(prev => prev.filter(c => c.id !== id));
    triggerToast('Claim Deleted', 'Conveyance entry removed');
  };

  // Global reset
  const handleConfirmClearAll = () => {
    setEntries([{
      id: generateId(),
      date: new Date().toISOString().split('T')[0],
      day: calculateDayName(new Date().toISOString().split('T')[0]),
      status: 'Present',
      inTime: '10:30',
      outTime: '19:31',
      stand: '',
      magnet: '',
      frame: '',
    }]);
    setTargets([]);
    setPayments([]);
    setConveyances([]);
    setMeta({
      empName: '',
      monthVal: new Date().toISOString().substring(0, 7),
      locVal: '',
      baseSalary: 17000,
    });
    setShowClearModal(false);
    triggerToast('System reset completed', 'All states reverted to default values');
  };

  // Backup & JSON restoration
  const handleBackup = () => {
    const data = {
      rows: entries,
      payments,
      targets,
      conveyances,
      meta: {
        emp: meta.empName,
        mon: meta.monthVal,
        loc: meta.locVal,
        sal: meta.baseSalary
      },
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_tracker_backup_${meta.monthVal || new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast('Backup downloaded', 'JSON configuration saved successfully');
  };

  const handleRestoreClick = (e: MouseEvent) => {
    e.stopPropagation(); // prevent dropdown close
    restoreInputRef.current?.click();
  };

  const handleRestoreFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        performDataRestore(data);
      } catch (err) {
        triggerToast('Import Failed', 'Invalid database JSON layout', true);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
    setShowMenuDropdown(false);
  };

  const handleRestorePDFClick = (e: MouseEvent) => {
    e.stopPropagation(); // prevent dropdown close
    restorePDFInputRef.current?.click();
  };

  const handleRestorePDFFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const index = text.indexOf('KEO_BACKUP:');
        if (index === -1) {
          triggerToast('Invalid Backup PDF', 'No embedded Keopic backup metadata found in this PDF', true);
          return;
        }

        const start = index + 'KEO_BACKUP:'.length;
        let base64 = '';
        for (let i = start; i < text.length; i++) {
          const char = text[i];
          if (/[A-Za-z0-9+/=]/.test(char)) {
            base64 += char;
          } else if (/\s/.test(char)) {
            continue;
          } else {
            break;
          }
        }

        if (!base64) {
          triggerToast('Invalid Backup PDF', 'No valid backup payload found inside PDF metadata', true);
          return;
        }

        const decodedStr = decodeURIComponent(escape(atob(base64)));
        const data = JSON.parse(decodedStr);
        performDataRestore(data);
      } catch (err) {
        console.error('PDF restore error:', err);
        triggerToast('Restore Failed', 'Failed to parse embedded backup in PDF', true);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
    setShowMenuDropdown(false);
  };

  // Data exports
  const handleExportCSV = () => {
    if (!entries.length) {
      triggerToast('No records', 'Populate daily entries grid first', true);
      return;
    }
    let csv = "Date,Day,Status,In-Time,Out-Time,Stand (INR),Magnet (INR),Frame (INR),Incentive (INR)\r\n";
    entries.forEach(r => {
      const stand = r.stand || 0;
      const magnet = r.magnet || 0;
      const frame = r.frame || 0;
      let inc = 0;
      if (r.status === 'Present') {
        if (stand + magnet + frame >= 500) inc += (stand + magnet) * 0.1;
        inc += frame * 0.07;
      }
      csv += `${r.date},${r.day},${r.status},${r.inTime},${r.outTime},${stand},${magnet},${frame},${inc.toFixed(2)}\r\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Sales_Incentives_${meta.monthVal || 'Report'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('CSV Spreadsheet Saved', 'Download triggered');
  };

  const handleExportExcel = () => {
    if (!entries.length) {
      triggerToast('No records', 'Populate daily entries grid first', true);
      return;
    }

    const wb = XLSX.utils.book_new();

    // Tab 1: Daily Attendance & Sales Grid
    const sheet1Data = [
      ["DAILY ATTENDANCE & SALES LOG"],
      [`Employee: ${meta.empName || 'N/A'}    |    Period: ${meta.monthVal || 'N/A'}    |    Location: ${meta.locVal || 'N/A'}`],
      [],
      ["Date", "Day", "Status", "In Time", "Out Time", "Stand (INR)", "Magnet (INR)", "Frame (INR)", "Incentive (INR)"]
    ];

    entries.forEach(r => {
      const stand = Number(r.stand) || 0;
      const magnet = Number(r.magnet) || 0;
      const frame = Number(r.frame) || 0;
      let inc = 0;
      if (r.status === 'Present') {
        if (stand + magnet + frame >= 500) inc += (stand + magnet) * 0.1;
        inc += frame * 0.07;
      }
      sheet1Data.push([r.date, r.day, r.status, r.inTime || '-', r.outTime || '-', String(stand), String(magnet), String(frame), inc.toFixed(2)]);
    });

    // Add totals row to Tab 1
    sheet1Data.push([]);
    sheet1Data.push([
      "TOTALS", "", "", "", "",
      stats.totalStand.toFixed(2),
      stats.totalMagnet.toFixed(2),
      stats.totalFrame.toFixed(2),
      stats.totalIncentive.toFixed(2)
    ]);

    const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
    XLSX.utils.book_append_sheet(wb, ws1, "Daily Attendance & Sales");

    // Tab 2: Cash Sent to Sir History
    const sentPayments = payments.filter(p => !p.type || p.type === 'sent_to_sir');
    const sheet2Data = [
      ["CASH SENT TO SIR HISTORY (PAISA SIR KO BHEJA)"],
      [`Employee: ${meta.empName || 'N/A'}    |    Month: ${meta.monthVal || 'N/A'}`],
      [],
      ["Transaction Date", "Transfer Details / Notes", "Amount Sent (INR)"]
    ];

    if (sentPayments.length === 0) {
      sheet2Data.push(["-", "No cash transfers recorded yet for this month", "0.00"]);
    } else {
      sentPayments.forEach(p => {
        sheet2Data.push([p.date, p.note || 'Cash Transfer', String(Number(p.amt || 0).toFixed(2))]);
      });
      sheet2Data.push([]);
      sheet2Data.push(["TOTAL SENT", "Sum of all recorded transfers", stats.totalPaid.toFixed(2)]);
    }

    const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
    XLSX.utils.book_append_sheet(wb, ws2, "Cash Sent to Sir");

    // Tab 3: Advance Money Received from Sir
    const advancePayments = payments.filter(p => p.type === 'advance_received');
    const sheetAdvanceData = [
      ["ADVANCE MONEY RECEIVED FROM SIR HISTORY"],
      [`Employee: ${meta.empName || 'N/A'}    |    Month: ${meta.monthVal || 'N/A'}`],
      [],
      ["Transaction Date", "Advance Note / Details", "Advance Amount Received (INR)"]
    ];

    if (advancePayments.length === 0) {
      sheetAdvanceData.push(["-", "No advance money received from Sir for this month", "0.00"]);
    } else {
      advancePayments.forEach(p => {
        sheetAdvanceData.push([p.date, p.note || 'Advance Money', String(Number(p.amt || 0).toFixed(2))]);
      });
      sheetAdvanceData.push([]);
      sheetAdvanceData.push(["TOTAL ADVANCE RECEIVED", "Sum of all advance money taken from Sir", (stats.totalAdvance || 0).toFixed(2)]);
    }

    const wsAdvance = XLSX.utils.aoa_to_sheet(sheetAdvanceData);
    XLSX.utils.book_append_sheet(wb, wsAdvance, "Advance Received");

    // Tab 4: Special Targets Log
    const sheet3Data = [
      ["SPECIAL TARGETS ACHIEVED LOG"],
      [`Employee: ${meta.empName || 'N/A'}    |    Month: ${meta.monthVal || 'N/A'}`],
      [],
      ["Achievement Date", "Target Description / Details", "Target Reward (INR)", "Settlement Status"]
    ];

    if (targets.length === 0) {
      sheet3Data.push(["-", "No targets logged for this month", "0.00", "-"]);
    } else {
      targets.forEach(t => {
        sheet3Data.push([t.date, t.note || 'Target bonus', String(Number(t.amt || 0).toFixed(2)), t.status || 'Paid']);
      });
      sheet3Data.push([]);
      sheet3Data.push(["TOTAL EXTRA EARNED", "Sum of all extra target milestone bonuses", stats.totalTargets.toFixed(2), ""]);
    }

    const ws3 = XLSX.utils.aoa_to_sheet(sheet3Data);
    XLSX.utils.book_append_sheet(wb, ws3, "Targets Achieved");

    // Tab 5: Interactive KPI Dashboard Summary & Balance
    const sheet4Data = [
      ["FINANCIAL PERFORMANCE SUMMARY DASHBOARD"],
      [`Reporting period: ${meta.monthVal || 'N/A'}`],
      [],
      ["METRIC PROFILE", "AMOUNT / VALUE", "EXPLANATION & CALCULATION SYSTEM"],
      ["Total Days in Month", `${stats.daysInMonth} Days`, "Length of the target calendar month"],
      ["Calculated Daily Base Rate", stats.perDaySalary.toFixed(2), "Base Salary divided by total days in month"],
      ["Present Days Count", `${stats.presentDays} Days`, "Days marked as Present"],
      ["Absent Days Count", `${stats.absentDays} Days`, "Days marked as Absent"],
      ["Week Offs Tracked", `${stats.weekOffs} Days`, "Rest days. Main salary is fixed and untouched."],
      ["Absent Deductions", "0.00", "No deductions. Main salary is untouched."],
      ["Fixed Main Base Salary (1)", stats.netEarnedSalary.toFixed(2), "Base Salary - fixed and untouched"],
      ["Calculated Incentives (2)", stats.totalIncentive.toFixed(2), "10% commission on Stand+Magnet if daily total (Stand+Magnet+Frame) >= 500, + 7% on Frame"],
      ["Extra Hours Overtime Pay (3)", (stats.overtimePay || 0).toFixed(2), `Extra hours worked (${stats.formattedPayableExtra || '0h 0m'} paid @ Rs ${stats.perHourSalary.toFixed(1)}/hr | ${stats.formattedTotalExtra || '0h 0m'} logged)`],
      ["Bonus Targets Achieved (4)", stats.totalTargets.toFixed(2), "Total bonus rewards earned from special milestone targets"],
      ["Unavailed Week-Off Extra Pay (5)", (stats.unavailedWeekOffPay || 0).toFixed(2), `Progressive week-off earnings (${stats.unavailedWeekOffsCount || 0} earned @ Rs ${stats.perDaySalary.toFixed(1)}/day)`],
      ["Conveyance Reimbursement Claim (6)", (stats.totalConveyance || 0).toFixed(2), `Travel and conveyance expenses to be recovered from Sir (${conveyances.length} claims)`],
      ["Advance Money Received from Sir", (stats.totalAdvance || 0).toFixed(2), "Advance money received/taken from Sir (Tracked in Cash Account, not deducted from salary)"],
      ["NET PAYABLE SALARY", stats.finalPayable.toFixed(2), "Base Salary + Incentives + Overtime Pay + Targets + Week Off Pay + Conveyance Claim"],
      ["Store Gross Sales (A)", stats.grossSales.toFixed(2), "Combined store billing (Stand + Magnet + Frame)"],
      ["Advance Money Received from Sir (B)", (stats.totalAdvance || 0).toFixed(2), "Total advance money/float given by Sir"],
      ["Total Cash Accountable (A+B)", (stats.totalAccountableCash || (stats.grossSales + (stats.totalAdvance || 0))).toFixed(2), "Sales Cash + Advance Money counted together"],
      ["Total Cash Sent to Sir (C)", stats.totalPaid.toFixed(2), "Total cash remitted/transferred to Sir"],
      ["Remaining Cash to Send to Sir (A+B - C)", stats.netBalance.toFixed(2), "Total Accountable Cash minus Cash Sent to Sir"]
    ];

    const ws4 = XLSX.utils.aoa_to_sheet(sheet4Data);
    XLSX.utils.book_append_sheet(wb, ws4, "KPI Summary & Audit");

    // Tab 6: Conveyance & Travel Expense Log
    const sheetConveyanceData = [
      ["CONVEYANCE & TRAVEL EXPENSE RECORD (PAISA SIR SE LENA HAI)"],
      [`Employee: ${meta.empName || 'N/A'}    |    Month: ${meta.monthVal || 'N/A'}`],
      [],
      ["Claim Date", "Travel Purpose / Expense Details", "Amount to Recover (INR)", "Status"]
    ];

    if (conveyances.length === 0) {
      sheetConveyanceData.push(["-", "No conveyance expenses logged for this month", "0.00", "-"]);
    } else {
      conveyances.forEach(c => {
        sheetConveyanceData.push([c.date, c.note || 'Conveyance / Travel', String(Number(c.amt || 0).toFixed(2)), c.status || 'Pending']);
      });
      sheetConveyanceData.push([]);
      sheetConveyanceData.push(["TOTAL CONVEYANCE TO RECOVER", "Total amount to be reimbursed by Sir", (stats.totalConveyance || 0).toFixed(2), ""]);
    }

    const wsConveyance = XLSX.utils.aoa_to_sheet(sheetConveyanceData);
    XLSX.utils.book_append_sheet(wb, wsConveyance, "Conveyance Claims");

    // Save Workbook
    XLSX.writeFile(wb, `Advanced_Sales_Report_${meta.monthVal || 'summary'}.xlsx`);
    triggerToast('Advanced Workbook Saved', 'Multi-sheet Excel spreadsheet downloaded successfully');
  };

  const handleExportPDF = () => {
    try {
      exportAndDownloadPDF(entries, targets, payments, meta, conveyances);
      triggerToast('PDF Statement Downloaded', 'Official 3-Page Detailed Payroll & Sales Statement exported');
    } catch (e) {
      console.error('PDF generation error:', e);
      triggerToast('PDF Generation Failed', 'Please inspect console logs', true);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring' as const, stiffness: 100, damping: 15 }
    }
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-indigo-500/30 overflow-x-hidden relative">
      <AmbientBackground accent={accent} />
      
      {/* Active Print Mode Banner */}
      {isPrintMode && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 px-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 no-print sticky top-0 z-50">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
            <p className="text-xs sm:text-sm font-bold">
              <span className="font-extrabold uppercase bg-white/20 px-2 py-0.5 rounded mr-2">Print Mode Active</span>
              UI simplified for printing. Editing controls are hidden.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-white text-emerald-700 font-extrabold text-xs rounded-lg shadow hover:bg-emerald-50 transition cursor-pointer flex items-center gap-1.5 uppercase tracking-wider active:scale-95"
            >
              <Printer className="w-3.5 h-3.5 animate-pulse" />
              <span>Print This Page</span>
            </button>
            <button
              onClick={() => setIsPrintMode(false)}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-lg border border-emerald-500 transition cursor-pointer uppercase tracking-wider active:scale-95"
            >
              Exit Print Mode
            </button>
          </div>
        </div>
      )}
      
      {/* Print Header (Print-only) */}
      <div className="print-only hidden p-8 text-center border-b-2 border-gray-200">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Sales Incentive Report</h1>
        <p className="text-gray-600">Generated for {meta.empName || 'Employee'} for {meta.monthVal || 'Month'} at {new Date().toLocaleDateString()}</p>
      </div>

      {/* Main Glassmorphic Header with Premium Motion animation */}
      <motion.header 
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        className="premium-glass-header text-white relative shadow-2xl no-print"
      >
        <div className="max-w-7xl mx-auto px-4 py-6 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            
            {/* Title Block */}
            <div className="flex items-center gap-3 sm:gap-4">
              <motion.div 
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-xl glow-effect cursor-pointer overflow-hidden p-1 shrink-0"
              >
                <KeopicLogo className="w-full h-full" />
              </motion.div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black tracking-[0.15em] uppercase bg-white/20 px-2.5 py-0.5 rounded-md text-white border border-white/25 shadow-xs flex items-center gap-1.5 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 shrink-0"></span>
                    Keopic Photobooth Pvt Ltd
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight drop-shadow-sm mt-0.5 truncate">Sales Incentive & Daily Register</h1>
                <p className="text-xs text-indigo-100/90 font-medium tracking-wide truncate">
                  {meta.locVal || 'Main Counter'} · {meta.monthVal ? new Date(meta.monthVal + '-02').toLocaleDateString('default', { month: 'long', year: 'numeric' }) : 'Active Session'}
                </p>
              </div>
            </div>
            
            {/* Action Bar */}
            <div className="flex items-center flex-wrap gap-2">

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold">
                <span className={`w-2 h-2 rounded-full transition-all duration-300 ${saveStatus === 'saving' ? 'bg-amber-400 ring-2 ring-amber-400/50 shadow-[0_0_8px_#fbbf24]' : 'bg-emerald-400 shadow-[0_0_8px_#34d399]'}`}></span>
                <span className="mr-1">{saveStatus === 'saving' ? 'Saving...' : 'Auto-saved'}</span>
                
                <span className="w-px h-3 bg-white/20 mx-1"></span>
                
                {currentUser ? (
                  <div className="flex items-center gap-1.5">
                    <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] text-emerald-300 font-bold truncate max-w-[100px]" title={currentUser.email || ''}>
                      {currentUser.email?.split('@')[0]}
                    </span>
                    <button 
                      onClick={async () => {
                        await signOutUser();
                        triggerToast('Signed Out', 'Your data is no longer syncing to Google Cloud.');
                      }}
                      className="ml-1 p-0.5 hover:bg-white/10 rounded text-slate-300 hover:text-white transition cursor-pointer"
                      title="Disconnect Gmail Sync"
                    >
                      <LogOut className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={async () => {
                      try {
                        const res = await signInWithGoogle();
                        if (res) {
                          triggerToast('Cloud Linked', `Signed in with Supabase OAuth`);
                        }
                      } catch (err: any) {
                        console.error(err);
                        triggerToast('Link Failed', err.message || 'Pop-up blocked or window closed', true);
                      }
                    }}
                    className="flex items-center gap-1 hover:text-indigo-200 transition cursor-pointer text-[10px] font-bold uppercase text-indigo-300 tracking-wider"
                    title="Connect Gmail to backup and restore all months' data"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Link Gmail</span>
                  </button>
                )}
              </div>

              {/* Dynamic Theme Accent Picker */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                <span className="text-[10px] uppercase font-black tracking-wider text-white/80 mr-1 hidden sm:inline">Color Tint</span>
                <div className="flex gap-1.5">
                  {[
                    { key: 'indigo', bg: 'bg-indigo-500', label: 'Indigo Aurora' },
                    { key: 'emerald', bg: 'bg-emerald-500', label: 'Mint Emerald' },
                    { key: 'purple', bg: 'bg-purple-500', label: 'Royal Violet' },
                    { key: 'rose', bg: 'bg-rose-500', label: 'Sunset Coral' },
                    { key: 'amber', bg: 'bg-amber-500', label: 'Gold Sunset' },
                    { key: 'cyan', bg: 'bg-cyan-500', label: 'Cyber Teal' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() => {
                        setAccent(item.key as any);
                        triggerToast(`${item.label} Activated`, 'Dashboard colors updated successfully');
                      }}
                      className={`w-3.5 h-3.5 rounded-full ${item.bg} hover:scale-125 transition-all duration-200 cursor-pointer ${
                        accent === item.key ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900 scale-110 shadow-md' : 'opacity-80'
                      }`}
                      title={item.label}
                    />
                  ))}
                </div>
              </div>
              
              {/* Role Login Status Badge & Logout Button */}
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowAuthModal(true)}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                title="Switch Account / Login Portal"
              >
                {meta.profilePic ? (
                  <img src={meta.profilePic} alt={meta.empName || 'Profile'} className="w-4 h-4 rounded-full object-cover border border-white/50" />
                ) : (
                  <UserIcon className="w-3.5 h-3.5 text-indigo-300" />
                )}
                <span className="hidden sm:inline">{userRole === 'admin' ? 'Admin Mode' : userRole === 'staff' ? `Staff: ${meta.empName || 'Logged In'}` : 'Log In'}</span>
                <span className="sm:hidden">{userRole === 'admin' ? 'Admin' : userRole === 'staff' ? 'Staff' : 'Login'}</span>
              </motion.button>

              {/* Dedicated Log Out Button to Return to Main Login Page */}
              {userRole && (
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleLogoutRole}
                  className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-rose-200 hover:text-white font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm select-none"
                  title="Log Out & Exit to Main Login Page"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-300" />
                  <span className="hidden md:inline">Exit to Main Page</span>
                  <span className="md:hidden">Log Out</span>
                </motion.button>
              )}

              {/* Admin Panel Button (Hidden in Staff mode) */}
              {userRole === 'admin' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAdminPanel(true)}
                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-indigo-600 to-indigo-700 hover:from-amber-600 hover:to-indigo-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg border border-white/30 transition cursor-pointer"
                  title="Open Live Real-Time Admin Panel"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-200" />
                  <span className="inline">Admin Panel</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"></span>
                </motion.button>
              )}

              {/* AI Sales Advisor & Copilot Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAiModal(true)}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-700 hover:to-amber-600 text-white font-black text-xs flex items-center gap-1.5 shadow-lg border border-white/30 transition cursor-pointer"
                title="Open AI Sales & Incentive Advisor"
              >
                <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
                <span className="inline">AI Advisor</span>
              </motion.button>

              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsPrintMode(prev => !prev)} 
                className={`p-2.5 rounded-xl border transition duration-200 backdrop-blur-md cursor-pointer flex items-center gap-1.5 font-bold text-xs ${
                  isPrintMode 
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-350 ring-offset-1 ring-offset-slate-900 shadow-lg scale-105' 
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`} 
                title="Toggle Print-Friendly UI Mode"
              >
                <Printer className="w-4 h-4 text-white" />
                <span className="hidden md:inline">{isPrintMode ? 'Print Mode: On' : 'Print Mode'}</span>
              </motion.button>

              <motion.button 
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')} 
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition duration-200 backdrop-blur-md cursor-pointer shadow-sm" 
                title="Toggle Theme (Ctrl+T)"
              >
                {theme === 'light' ? <Moon className="w-5 h-5 text-white" /> : <Sun className="w-5 h-5 text-amber-300 animate-spin" style={{ animationDuration: '10s' }} />}
              </motion.button>

              {/* Undo & Redo Quick Actions */}
              <div className="flex items-center gap-1.5">
                <motion.button 
                  whileHover={{ scale: historyIndex <= 0 ? 1 : 1.08 }}
                  whileTap={{ scale: historyIndex <= 0 ? 1 : 0.92 }}
                  onClick={handleUndo} 
                  disabled={historyIndex <= 0}
                  className={`p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition backdrop-blur-md cursor-pointer ${historyIndex <= 0 ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}`} 
                  title="Undo (Ctrl+Z)"
                >
                  <Undo className="w-4 h-4 text-white" />
                </motion.button>
                <motion.button 
                  whileHover={{ scale: historyIndex >= history.length - 1 ? 1 : 1.08 }}
                  whileTap={{ scale: historyIndex >= history.length - 1 ? 1 : 0.92 }}
                  onClick={handleRedo} 
                  disabled={historyIndex >= history.length - 1}
                  className={`p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition backdrop-blur-md cursor-pointer ${historyIndex >= history.length - 1 ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}`} 
                  title="Redo (Ctrl+Y)"
                >
                  <Redo className="w-4 h-4 text-white" />
                </motion.button>
              </div>
              
              {/* Dropdown Action Menu */}
              <div className="relative">
                <motion.button 
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={(e) => { e.stopPropagation(); setShowMenuDropdown(p => !p); }}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition duration-200 backdrop-blur-md cursor-pointer"
                  title="More actions"
                >
                  <MoreVertical className="w-5 h-5 text-white" />
                </motion.button>
                <AnimatePresence>
                  {showMenuDropdown && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -6 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="absolute right-0 mt-2 w-52 rounded-2xl glass-dropdown p-1.5 shadow-2xl z-50 overflow-hidden text-slate-800 dark:text-slate-100"
                    >
                      <button 
                        onClick={handleBackup} 
                        className="w-full px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold hover:bg-white/40 dark:hover:bg-white/10 transition flex items-center gap-2.5 cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                        Backup Data
                      </button>
                      <button 
                        onClick={handleRestoreClick} 
                        className="w-full px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold hover:bg-white/40 dark:hover:bg-white/10 transition flex items-center gap-2.5 cursor-pointer"
                      >
                        <Upload className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                        Restore Data
                      </button>
                      <input 
                        type="file" 
                        ref={restoreInputRef} 
                        className="hidden" 
                        accept=".json" 
                        onChange={handleRestoreFile} 
                      />
                      <button 
                        onClick={handleRestorePDFClick} 
                        className="w-full px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold hover:bg-emerald-500/15 dark:hover:bg-emerald-500/20 transition flex items-center gap-2.5 cursor-pointer text-emerald-600 dark:text-emerald-400"
                      >
                        <FileUp className="w-4 h-4" />
                        Restore from PDF
                      </button>
                      <input 
                        type="file" 
                        ref={restorePDFInputRef} 
                        className="hidden" 
                        accept=".pdf" 
                        onChange={handleRestorePDFFile} 
                      />
                      <div className="my-1 border-t border-slate-200/60 dark:border-white/10"></div>
                      <button 
                        onClick={handleExportPDF} 
                        className="w-full px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold hover:bg-white/40 dark:hover:bg-white/10 transition flex items-center gap-2.5 cursor-pointer"
                      >
                        <Printer className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                        Print Current Month
                      </button>
                      <div className="my-1 border-t border-slate-200/60 dark:border-white/10"></div>
                      <button 
                        onClick={() => {
                          try {
                            exportAllMonthsExcel(allMonthsData, meta);
                            triggerToast('All Months Excel Saved', 'Multi-sheet consolidated workbook downloaded');
                          } catch (e) {
                            console.error(e);
                            triggerToast('Export Failed', 'Unable to generate Excel file', true);
                          }
                          setShowMenuDropdown(false);
                        }} 
                        className="w-full px-3.5 py-2.5 rounded-xl text-left text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 dark:hover:bg-emerald-500/20 transition flex items-center gap-2.5 cursor-pointer"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        Download All Months (Excel)
                      </button>
                      <button 
                        onClick={() => {
                          try {
                            exportAllMonthsPDF(allMonthsData, meta);
                            triggerToast('All Months PDF Saved', 'Master consolidated report downloaded');
                          } catch (e) {
                            console.error(e);
                            triggerToast('Export Failed', 'Unable to generate PDF file', true);
                          }
                          setShowMenuDropdown(false);
                        }} 
                        className="w-full px-3.5 py-2.5 rounded-xl text-left text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/15 dark:hover:bg-indigo-500/20 transition flex items-center gap-2.5 cursor-pointer"
                      >
                        <FileText className="w-4 h-4" />
                        Download All Months (PDF)
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Configuration Grid */}
          <div className="mt-6 p-2 sm:p-3 rounded-3xl bg-white/10 dark:bg-black/30 backdrop-blur-2xl border border-white/30 dark:border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.3)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* Employee Name & Profile Picture */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: 0.08, ease: 'easeOut' }}
              whileHover={{ y: -3, scale: 1.01 }}
              className="glass-tile p-3.5 flex items-center gap-3"
            >
              <button
                onClick={() => setShowProfilePicModal(true)}
                className="relative group shrink-0 cursor-pointer transition hover:scale-105"
                title="Click to set or change profile photo"
              >
                {meta.profilePic ? (
                  <img
                    src={meta.profilePic}
                    alt={meta.empName || 'Employee'}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-white/50 shadow-md ring-2 ring-indigo-400/30"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center border-2 border-white/40 shadow-lg shadow-indigo-500/30 text-white font-black text-base">
                    {meta.empName ? meta.empName.charAt(0).toUpperCase() : <UserIcon className="w-6 h-6 text-white" />}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-500 border-2 border-white rounded-full flex items-center justify-center shadow-md">
                  <Camera className="w-2.5 h-2.5 text-white" />
                </div>
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-200 block">Employee</span>
                  <button
                    onClick={() => setShowProfilePicModal(true)}
                    className="text-[9px] font-black text-cyan-300 hover:text-white uppercase tracking-wider transition cursor-pointer"
                  >
                    Change
                  </button>
                </div>
                {isPrintMode ? (
                  <div className="text-sm text-white font-black truncate">{meta.empName || 'Not Specified'}</div>
                ) : (
                  <input 
                    type="text" 
                    placeholder="Enter employee name" 
                    value={meta.empName}
                    onChange={(e) => handleMetaChange('empName', e.target.value)}
                    className="w-full bg-black/35 hover:bg-black/45 border border-white/25 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40 rounded-xl px-3 py-1.5 text-xs sm:text-sm text-white font-bold placeholder-white/40 outline-none transition" 
                  />
                )}
              </div>
            </motion.div>
            
            {/* Month indicator */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: 0.16, ease: 'easeOut' }}
              whileHover={{ y: -3, scale: 1.01 }}
              className="glass-tile p-3.5 flex flex-col justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/25 border border-purple-400/40 flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
                  <Calendar className="w-6 h-6 text-purple-200" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-200 block mb-1">Selected Month</span>
                  {isPrintMode ? (
                    <div className="text-sm text-white font-black truncate">
                      {new Date(meta.monthVal + '-02').toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                    </div>
                  ) : (
                    <input 
                      type="month" 
                      value={meta.monthVal}
                      onChange={(e) => handleMetaChange('monthVal', e.target.value)}
                      className="w-full bg-black/35 hover:bg-black/45 border border-white/25 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/40 rounded-xl px-3 py-1.5 text-xs sm:text-sm text-white outline-none transition color-scheme-dark cursor-pointer font-black" 
                    />
                  )}
                </div>
              </div>
              
              {/* Saved Months Quick Select & Creator */}
              {!isPrintMode && (
                <div className="mt-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/60">Switch Month</span>
                    <button 
                      onClick={() => setIsAddingMonth(!isAddingMonth)}
                      className="text-[9px] font-black text-purple-300 hover:text-white transition flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isAddingMonth ? 'Close' : 'Add Month'}</span>
                    </button>
                  </div>

                  {isAddingMonth && (
                    <div className="flex items-center gap-1.5 mb-2 bg-black/50 p-1.5 rounded-xl border border-purple-500/30">
                      <input 
                        type="month" 
                        value={newMonthInput}
                        onChange={(e) => setNewMonthInput(e.target.value)}
                        className="bg-slate-900 border border-white/20 rounded-lg px-2 py-1 text-xs text-white outline-none flex-1 font-bold color-scheme-dark" 
                      />
                      <button 
                        onClick={() => {
                          if (newMonthInput) {
                            handleMetaChange('monthVal', newMonthInput);
                            setIsAddingMonth(false);
                            triggerToast('Month Created', `Switched to ${newMonthInput}`);
                          } else {
                            triggerToast('Invalid input', 'Please select a valid month', true);
                          }
                        }}
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 rounded-lg text-[10px] font-black uppercase tracking-wider text-white cursor-pointer transition shadow-sm"
                      >
                        Add
                      </button>
                    </div>
                  )}

                  {Object.keys(allMonthsData).length > 0 && (
                    <div className="flex flex-wrap gap-1 max-h-[42px] overflow-y-auto custom-scrollbar">
                      {Object.keys(allMonthsData).sort((a, b) => b.localeCompare(a)).map((m) => (
                        <button
                          key={m}
                          onClick={() => handleMetaChange('monthVal', m)}
                          className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold border transition-all cursor-pointer ${
                            meta.monthVal === m
                              ? 'bg-white text-purple-950 border-white shadow-sm ring-1 ring-purple-300'
                              : 'bg-white/10 text-white/90 hover:bg-white/20 border-white/15'
                          }`}
                        >
                          {new Date(m + '-02').toLocaleDateString('default', { month: 'short', year: '2-digit' })}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
            
            {/* Branch Locator */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: 0.24, ease: 'easeOut' }}
              whileHover={{ y: -3, scale: 1.01 }}
              className="glass-tile p-3.5 flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/25 border border-cyan-400/40 flex items-center justify-center shadow-md shadow-cyan-500/20 shrink-0">
                <MapPin className="w-6 h-6 text-cyan-200" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-200 block mb-1">Branch / Location</span>
                {isPrintMode ? (
                  <div className="text-sm text-white font-black truncate">{meta.locVal || 'Not Specified'}</div>
                ) : (
                  <input 
                    type="text" 
                    placeholder="Enter branch or mall" 
                    value={meta.locVal}
                    onChange={(e) => handleMetaChange('locVal', e.target.value)}
                    className="w-full bg-black/35 hover:bg-black/45 border border-white/25 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40 rounded-xl px-3 py-1.5 text-xs sm:text-sm text-white font-bold placeholder-white/40 outline-none transition" 
                  />
                )}
              </div>
            </motion.div>
            
            {/* Base Salary */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: 0.32, ease: 'easeOut' }}
              whileHover={{ y: -3, scale: 1.01 }}
              className="glass-tile p-3.5 flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/25 border border-emerald-400/40 flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                <CircleDollarSign className="w-6 h-6 text-emerald-200" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200 block mb-1">Base Monthly Salary</span>
                {isPrintMode ? (
                  <div className="text-sm text-white font-black truncate">{formatMoney(meta.baseSalary, 2)}</div>
                ) : (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-xs font-bold">₹</span>
                    <input 
                      type="number" 
                      placeholder="17000" 
                      value={meta.baseSalary}
                      onChange={(e) => handleMetaChange('baseSalary', Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-black/35 hover:bg-black/45 border border-white/25 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40 rounded-xl pl-6 pr-3 py-1.5 text-xs sm:text-sm text-white font-black outline-none transition font-mono" 
                    />
                  </div>
                )}
              </div>
            </motion.div>

          </div>
        </div>
      </motion.header>

      {/* Main Dashboard Layout with Premium Staggered entrance animation */}
      <motion.main 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto px-3 sm:px-6 mt-4 sm:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 flex-1 w-full pb-20 md:pb-8"
      >
        
        {/* Left column: Analytics and main logs table */}
        <div className="lg:col-span-2 space-y-6">
          
          <motion.div variants={itemVariants}>
            <QuickStats 
              totalStand={stats.totalStand}
              totalMagnet={stats.totalMagnet}
              totalFrame={stats.totalFrame}
              grossSales={stats.grossSales}
              totalIncentive={stats.totalIncentive}
              finalPayable={stats.finalPayable}
              entries={entries}
              overtimePay={stats.overtimePay}
              formattedTotalExtra={stats.formattedTotalExtra}
              formattedPayableExtra={stats.formattedPayableExtra}
              perHourSalary={stats.perHourSalary}
              unavailedWeekOffPay={stats.unavailedWeekOffPay}
              unavailedWeekOffs={stats.unavailedWeekOffs}
            />
          </motion.div>

          {/* Month-Wise Dynamic Salary & Data Isolation Ledger */}
          <motion.div variants={itemVariants} id="sec-month-salary-ledger">
            <MonthSalaryHistoryCard 
              currentMonth={meta.monthVal}
              allMonthsData={allMonthsData}
              meta={meta}
              onSelectMonth={(m) => handleMetaChange('monthVal', m)}
              onUpdateMonthSalary={handleUpdateMonthSalary}
              onTriggerToast={triggerToast}
              isPrintMode={isPrintMode}
            />
          </motion.div>

          {/* 4 Free Week-Offs & Month-End Duty Encashment Card */}
          <motion.div variants={itemVariants} id="sec-week-offs">
            <FreeWeekOffsCard 
              stats={stats}
              monthVal={meta.monthVal}
              entriesCount={entries.length}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <PerformanceChart 
              entries={entries}
              targets={targets}
              payments={payments}
              grossSales={stats.grossSales}
              totalIncentive={stats.totalIncentive}
              totalPaid={stats.totalPaid}
              maxDailySales={stats.maxDailySales}
              maxDailyDate={stats.maxDailyDate}
              dailyAverage={dailyAverage}
              totalTargets={stats.totalTargets}
            />
          </motion.div>

          <motion.div variants={itemVariants} id="sec-entry">
            <QuickDataEntryWidget 
              entries={entries}
              onAddOrUpdateEntry={handleAddOrUpdateEntry}
              triggerToast={triggerToast}
            />
          </motion.div>

          <motion.div variants={itemVariants} id="sec-daily-table">
            <DailyEntriesTable 
              entries={entries}
              searchFilter={searchFilter}
              setSearchFilter={setSearchFilter}
              onUpdateEntry={handleUpdateEntry}
              onAddRow={handleAddEntry}
              onDeleteRow={handleDeleteEntry}
              onFillMonth={handleFillMonth}
              onUndoToday={handleUndoToday}
              isPrintMode={isPrintMode}
              dailyGoal={dailyGoal}
              locVal={meta.locVal || 'Main Counter'}
            />
          </motion.div>

        </div>

        {/* Right column: Attendance indexes, targets tracking, and payments logs */}
        <div className="space-y-6">
          
          {/* Keopic Photobooth Station & Operational Briefing Widget */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -2 }}
            className="p-5 relative overflow-hidden group shadow-lg border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl no-print"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm">
                  KP
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Keopic Photobooth
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    {meta.locVal || 'Main Counter'} · Station Desk
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                {meta.monthVal}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Days Logged</span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-100 font-mono tabular-nums">
                  {entries.length} / {getDaysInMonth(meta.monthVal)}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Duty Days</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                  {stats.workedDays} days
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs">
              <button
                onClick={() => document.getElementById('sec-entry')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                + Quick Entry
              </button>
              <button
                onClick={() => document.getElementById('sec-daily-table')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                View Full Register →
              </button>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <TargetsLogCard 
              targets={targets}
              onAddTarget={handleAddTarget}
              onUpdateTarget={handleUpdateTarget}
              onDeleteTarget={handleDeleteTarget}
              isPrintMode={isPrintMode}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <ConveyanceLogCard 
              conveyances={conveyances}
              onAddConveyance={handleAddConveyance}
              onUpdateConveyance={handleUpdateConveyance}
              onDeleteConveyance={handleDeleteConveyance}
              isPrintMode={isPrintMode}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <PaymentsCard 
              payments={payments}
              onAddPayment={handleAddPayment}
              onUpdatePayment={handleUpdatePayment}
              onDeletePayment={handleDeletePayment}
              isPrintMode={isPrintMode}
              grossSales={stats.grossSales}
            />
          </motion.div>

          {/* Bulk Export Excel / CSV actions */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 no-print">
            <motion.button 
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExportCSV} 
              className="liquid-glass-card p-3 text-center transition shadow-sm group cursor-pointer text-slate-700 dark:text-slate-200"
            >
              <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition duration-150">
                <FileDown className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold">Export CSV</span>
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExportExcel} 
              className="liquid-glass-card p-3 text-center transition shadow-sm group cursor-pointer text-slate-700 dark:text-slate-200"
            >
              <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition duration-150">
                <FileDown className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold">Export Excel</span>
            </motion.button>
          </motion.div>

        </div>
      </motion.main>

      {/* Net Balance Sheet Summary */}
      <motion.div 
        id="sec-balance"
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <BalanceSummary 
          grossSales={stats.grossSales}
          totalPaid={stats.totalPaid}
          netBalance={stats.netBalance}
          finalPayable={stats.finalPayable}
          totalIncentive={stats.totalIncentive}
          stats={stats}
        />
      </motion.div>

      {/* Floating Action Button (FAB) for Desktop/Tablet Quick Add */}
      <motion.button 
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        onClick={() => { handleAddEntry(); triggerToast('Added row', 'Appended empty row to tracking ledger'); }} 
        className="fab no-print hidden md:flex cursor-pointer" 
        title="Add New Row"
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      {/* Bottom Shortcuts & Main Actions Control Panel */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="max-w-7xl mx-auto px-4 mt-12 mb-6 no-print w-full"
      >
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5 flex flex-col md:flex-row justify-between items-center gap-5 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
            <span className="opacity-80">Press</span> 
            <span className="inline-flex items-center justify-center px-2.5 py-1 text-[10px] font-mono font-black text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 rounded-md shadow-[0_2px_0_0_rgba(0,0,0,0.1)] dark:shadow-[0_2px_0_0_rgba(255,255,255,0.05)] mx-1 select-none">?</span> 
            <span className="opacity-80">to reveal keyboard shortcuts cheat sheet</span>
          </div>
          
          {/* Main Action Buttons with Balanced Proportional Sizing */}
          <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
            <motion.button 
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowClearModal(true)} 
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-rose-500/10 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/30 hover:bg-rose-500/20 font-bold text-xs uppercase tracking-wider transition cursor-pointer select-none"
            >
              <TrendingDown className="w-4 h-4" />
              <span>Clear All Data</span>
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleExportPDF} 
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-purple-700 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition cursor-pointer select-none"
            >
              <Printer className="w-4 h-4" />
              <span>Export PDF Report</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Modals & Dialog blocks */}
      <ClearAllModal 
        show={showClearModal}
        onConfirm={handleConfirmClearAll}
        onCancel={() => setShowClearModal(false)}
      />

      <ShortcutsModal 
        show={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* Staff Real-time Admin Chat Floating Widget */}
      <StaffChatWidget
        chatMessages={chatMessages}
        onSendMessage={handleSendStaffChatMessage}
        onMarkAsRead={handleMarkChatAsRead}
        empName={meta.empName || 'Staff Member'}
        locVal={meta.locVal || 'Main Counter'}
      />

      {/* Admin Panel Live Control Panel */}
      <AdminPanel 
        isOpen={showAdminPanel}
        onClose={() => {
          setShowAdminPanel(false);
          triggerToast('Admin Panel Closed', 'Returned to Main Ledger View');
        }}
        onLogout={() => {
          handleLogoutRole();
          triggerToast('Admin Logged Out', 'Returned to Login Portal');
        }}
        triggerToast={triggerToast}
      />

      {/* AI Sales Advisor & Copilot Modal */}
      <AiAssistantModal 
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        selectedMonth={meta.monthVal}
        meta={meta}
        stats={stats}
      />

      {/* Profile Picture Modal */}
      <ProfilePicModal
        isOpen={showProfilePicModal}
        onClose={() => setShowProfilePicModal(false)}
        currentPic={meta.profilePic}
        empName={meta.empName}
        onSavePic={(newPicUrl) => {
          handleMetaChange('profilePic', newPicUrl);
        }}
        triggerToast={triggerToast}
      />

      {/* Auth Gate Login Modal (Staff & Admin) */}
      <AuthLoginModal 
        isOpen={showAuthModal}
        currentRole={userRole}
        onLoginStaff={handleLoginStaff}
        onLoginAdmin={handleLoginAdmin}
        onLogout={handleLogoutRole}
        onClose={userRole ? () => setShowAuthModal(false) : undefined}
        triggerToast={triggerToast}
      />

      {/* Custom Toast Notification alerts */}
      <Toast 
        show={toast.show}
        title={toast.title}
        msg={toast.msg}
        isError={toast.isError}
        onClose={closeToast}
      />

      {/* Brand Footer */}
      <footer className="max-w-7xl mx-auto px-4 mt-16 text-center border-t border-slate-200 dark:border-slate-800/80 pt-10 pb-16 no-print w-full">
        <div className="max-w-lg mx-auto mb-6 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/60 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              System Engineering & Support
            </span>
          </div>
          <div className="text-sm font-black text-slate-800 dark:text-slate-100 mb-1">
            Developer: <span className="text-indigo-600 dark:text-indigo-400 font-black">xarvind07</span>
            <span className="mx-2 text-slate-300 dark:text-slate-600 font-normal">|</span>
            <span>Created by Arvind Kumar Sharma</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-4">
            Direct Helpline: <span className="font-mono font-bold text-slate-700 dark:text-slate-200">+91 9334208989</span>
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <a 
              href="https://instagram.com/xarvind07" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-700 hover:to-amber-600 text-white text-xs font-bold shadow-md hover:shadow-lg hover:scale-[1.03] transition-all duration-200 border border-white/20 select-none flex items-center gap-1.5"
            >
              <span>@xarvind07</span>
            </a>
            <a 
              href="https://wa.me/919334208989" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md hover:shadow-lg hover:scale-[1.03] transition-all duration-200 border border-emerald-400/30 flex items-center gap-2 select-none"
            >
              <span>WhatsApp: 9334208989</span>
            </a>
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">
          © 2024–2026 Keopic Photobooth Pvt Ltd. Enterprise Payroll & Daily Register Suite.
        </p>
      </footer>

      {/* NATIVE MOBILE BOTTOM NAVIGATION DOCK (< md screens) */}
      {!isPrintMode && userRole && !showAdminPanel && (
        <MobileBottomNav 
          userRole={userRole}
          profilePic={meta.profilePic}
          onOpenAuth={() => setShowAuthModal(true)}
          onOpenAdmin={() => setShowAdminPanel(true)}
          onOpenAi={() => setShowAiModal(true)}
          onAddEntry={() => handleAddEntry()}
          triggerToast={triggerToast}
        />
      )}

    </div>
  );
}
