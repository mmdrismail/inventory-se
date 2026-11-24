import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Breadcrumbs } from './Breadcrumbs';
import { NotificationDropdown } from './NotificationDropdown';
import { GlobalSearchModal } from './GlobalSearchModal';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { ShortcutsHelpModal } from '../common/ShortcutsHelpModal';
import { isSoundEnabled, setSoundEnabled } from '../../utils/soundEffects';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import {
  Menu,
  Search,
  Sun,
  Moon,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
  Layers,
  Sparkles,
  Volume2,
  VolumeX,
  Keyboard,
  HelpCircle,
  Database,
  RefreshCw,
} from 'lucide-react';

export const TopNav = ({ onOpenMobileSidebar }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const profileRef = useRef(null);
  const { currentUser, role, logout, demoLogin } = useAuth();
  const { settings, toggleTheme, syncState, syncNow, addToast } = useAppData();
  const navigate = useNavigate();

  // Global Keyboard Shortcuts (Ctrl+K for search, ? for help, Ctrl+Shift+D for dark mode)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Don't intercept if user is typing inside an input/textarea/select
      const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        toggleTheme();
      } else if (e.key === '?' && !inInput && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsHelpOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsHelpOpen(false);
        setIsProfileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [toggleTheme]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  const handleRoleSwitch = (newRole) => {
    demoLogin(newRole);
    setIsProfileMenuOpen(false);
    if (newRole === 'customer') {
      navigate('/shop');
    } else {
      navigate('/dashboard');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-20 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* Left: Hamburger & Breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onOpenMobileSidebar}
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Breadcrumbs />
          </div>

          {/* Right: Search, Sound, Shortcuts, Notifications, Theme, User Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Global Search trigger */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition-all text-xs"
              title="ক্যাটালগ ও ডাটাবেজ সার্চ (Ctrl+K)"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Quick Search...</span>
              <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                Ctrl K
              </kbd>
            </button>

            {/* Live MongoDB Sync Status Indicator */}
            <button
              type="button"
              onClick={async () => {
                await syncNow?.();
                if (syncState?.isOnline === false) {
                  addToast?.({
                    title: 'MongoDB সংযোগ বিচ্ছিন্ন (Offline Mode)',
                    message: 'আপনার লোকাল ব্যাকএন্ড সার্ভার (port 5000) চালু নেই। পরিবর্তনগুলো ব্রাউজারে সেভ থাকছে এবং সার্ভার সংযোগ পেলেই অটো সিঙ্ক হবে।',
                    type: 'warning',
                    duration: 5000,
                  });
                } else {
                  addToast?.({
                    title: 'MongoDB Atlas সিঙ্ক সম্পন্ন',
                    message: 'সকল ডেটা ক্লাউডের সাথে সফলভাবে সিঙ্ক হয়েছে।',
                    type: 'success',
                  });
                }
              }}
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                syncState?.status === 'syncing'
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                  : syncState?.isOnline === false || syncState?.status === 'queued'
                  ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              }`}
              title={
                syncState?.lastError
                  ? syncState.lastError
                  : syncState?.isOnline === false
                  ? 'Backend disconnected — Click to retry MongoDB sync'
                  : 'Connected to live MongoDB Atlas — Click to force sync'
              }
            >
              {syncState?.status === 'syncing' ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <span
                  className={`h-2 w-2 rounded-full ${
                    syncState?.isOnline === false || syncState?.status === 'queued'
                      ? 'bg-red-500 animate-pulse'
                      : 'bg-emerald-500'
                  }`}
                />
              )}
              <Database className="h-3 w-3" />
              <span className="hidden lg:inline">
                {syncState?.status === 'syncing'
                  ? 'Syncing...'
                  : syncState?.pendingCount > 0
                  ? `Pending (${syncState.pendingCount})`
                  : syncState?.isOnline === false
                  ? 'Local Only'
                  : 'MongoDB Live'}
              </span>
            </button>

            {/* Audio Feedback Toggle */}
            <button
              type="button"
              onClick={handleToggleSound}
              className={`p-2 rounded-xl transition-colors ${
                soundOn
                  ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                  : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={soundOn ? 'বারকোড স্ক্যানার সাউন্ড সক্রিয় (Sound On)' : 'সাউন্ড বন্ধ (Muted)'}
            >
              {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>

            {/* Keyboard Shortcuts Help */}
            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="কীবোর্ড শর্টকাট সহায়তা (?)"
            >
              <Keyboard className="h-4 w-4" />
            </button>

            {/* Notification bell */}
            <NotificationDropdown />

            {/* Global Multi-Language Switcher */}
            <LanguageSwitcher />

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={settings.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {settings.theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* User Profile Menu */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2.5 p-1 sm:px-2 sm:py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none"
              >
                <img
                  src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
                />
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                    {currentUser?.name || 'Demo User'}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                    {role}
                  </span>
                </div>
                <ChevronDown className="hidden md:block h-3.5 w-3.5 text-slate-400" />
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-100">
                  {/* User info banner */}
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {currentUser?.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {currentUser?.email}
                    </p>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold uppercase tracking-wider">
                      <Shield className="h-3 w-3" />
                      Role: {role}
                    </div>
                  </div>

                  {/* Quick Role Switcher (Simulation / Test Mode) */}
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      <Sparkles className="h-3 w-3 text-emerald-500" />
                      অ্যাক্টিভ প্রোফাইল রোল (Simulation)
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {['admin', 'manager', 'staff', 'customer'].map((r) => (
                        <button
                          key={r}
                          onClick={() => handleRoleSwitch(r)}
                          className={`px-2 py-1 rounded-lg text-left capitalize text-xs transition-colors ${
                            role === r
                              ? 'bg-emerald-600 text-white font-semibold'
                              : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <User className="h-4 w-4 text-slate-400" />
                      Profile Settings
                    </Link>
                    {role === 'admin' && (
                      <Link
                        to="/settings"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <Settings className="h-4 w-4 text-slate-400" />
                        System Settings
                      </Link>
                    )}
                  </div>

                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Keyboard Shortcuts Help Modal */}
      <ShortcutsHelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  );
};
