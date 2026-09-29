import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Zap, 
  Table, 
  Wallet, 
  User, 
  ShieldCheck, 
  Sparkles,
  Plus
} from 'lucide-react';

interface MobileBottomNavProps {
  userRole: 'admin' | 'staff' | null;
  profilePic?: string;
  onOpenAuth: () => void;
  onOpenAdmin: () => void;
  onOpenAi: () => void;
  onAddEntry: () => void;
  triggerToast?: (title: string, msg: string, isError?: boolean) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  userRole,
  profilePic,
  onOpenAuth,
  onOpenAdmin,
  onOpenAi,
  onAddEntry,
  triggerToast
}) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Track active section based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 250;
      
      const entryEl = document.getElementById('sec-entry');
      const tableEl = document.getElementById('sec-daily-table');
      const balanceEl = document.getElementById('sec-balance');

      if (balanceEl && scrollPosition >= balanceEl.offsetTop) {
        setActiveTab('balance');
      } else if (tableEl && scrollPosition >= tableEl.offsetTop) {
        setActiveTab('logs');
      } else if (entryEl && scrollPosition >= entryEl.offsetTop) {
        setActiveTab('entry');
      } else {
        setActiveTab('dashboard');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string, tabName: string) => {
    setActiveTab(tabName);
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -70;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: LayoutDashboard,
      onClick: () => scrollToSection('top', 'dashboard'),
    },
    {
      id: 'entry',
      label: 'Quick',
      icon: Zap,
      onClick: () => scrollToSection('sec-entry', 'entry'),
    },
    {
      id: 'logs',
      label: 'Logs',
      icon: Table,
      onClick: () => scrollToSection('sec-daily-table', 'logs'),
    },
    {
      id: 'add',
      label: '+ Row',
      icon: Plus,
      isHighlight: true,
      onClick: () => {
        onAddEntry();
        if (triggerToast) triggerToast('Row Added', 'New daily entry row added');
        scrollToSection('sec-daily-table', 'logs');
      },
    },
    {
      id: 'balance',
      label: 'Balance',
      icon: Wallet,
      onClick: () => scrollToSection('sec-balance', 'balance'),
    },
    {
      id: 'account',
      label: userRole === 'admin' ? 'Admin' : 'Account',
      icon: userRole === 'admin' ? ShieldCheck : User,
      onClick: () => {
        setActiveTab('account');
        if (userRole === 'admin') {
          onOpenAdmin();
        } else {
          onOpenAuth();
        }
      },
    },
  ];

  if (!userRole) {
    return null;
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 w-full z-50 no-print safe-area-bottom bg-slate-950/80 dark:bg-[#070d2b]/80 backdrop-blur-3xl border-t border-white/20 dark:border-white/10 shadow-[0_-12px_40px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.25)] hardware-accelerated">
      {/* Specular highlight on top edge */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
      <nav 
        className="w-full py-1.5 px-1.5 flex items-center justify-between relative z-10"
        style={{ willChange: 'transform, opacity' }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (item.isHighlight) {
            return (
              <motion.button
                key={item.id}
                type="button"
                whileTap={{ scale: 0.85, y: 1 }}
                onClick={item.onClick}
                className="flex flex-col items-center justify-center flex-1 py-1 px-0.5 cursor-pointer focus:outline-none"
                title="Add New Row"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/40 border border-emerald-300/40 transition">
                  <Plus className="w-5 h-5 stroke-[3]" />
                </div>
                <span className="text-[9px] font-black text-emerald-300 tracking-tight mt-0.5">
                  {item.label}
                </span>
              </motion.button>
            );
          }

          return (
            <motion.button
              key={item.id}
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={item.onClick}
              className={`relative flex flex-col items-center justify-center flex-1 py-1 px-0.5 rounded-xl transition-all duration-200 focus:outline-none cursor-pointer ${
                isActive 
                  ? 'text-cyan-300 font-extrabold' 
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeBarBg"
                  className="absolute inset-0 bg-indigo-600/30 rounded-xl border border-indigo-400/40 shadow-inner"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              <div className="relative z-10 flex flex-col items-center gap-0.5">
                {item.id === 'account' && profilePic ? (
                  <img 
                    src={profilePic} 
                    alt="Profile" 
                    className={`w-4.5 h-4.5 rounded-full object-cover border ${isActive ? 'border-cyan-300' : 'border-slate-500'}`} 
                  />
                ) : (
                  <Icon className={`w-4.5 h-4.5 transition-transform duration-200 ${isActive ? 'scale-110 text-cyan-300' : ''}`} />
                )}

                <span className={`text-[9px] tracking-tight whitespace-nowrap transition-colors ${
                  isActive ? 'text-white font-black' : 'text-slate-400 font-semibold'
                }`}>
                  {item.label}
                </span>
              </div>
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
};
