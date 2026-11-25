import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Logo } from '../../components/common/Logo';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/forms/FormControls';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { useLanguage } from '../../context/LanguageContext';
import { Eye, EyeOff, Shield, Sparkles, ArrowRight, Lock, Mail } from 'lucide-react';

export const LoginPage = () => {
  const { language } = useLanguage();
  const [email, setEmail] = useState('admin@stockline.io');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, demoLogin } = useAuth();
  const { addToast } = useAppData();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const demoAccounts = [
    { role: 'admin', label: 'Admin', email: 'admin@stockline.io', desc: 'Full system, user management & settings access', color: 'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' },
    { role: 'manager', label: 'Manager', email: 'manager@stockline.io', desc: 'Inventory, purchases, sales, and reports access', color: 'border-blue-500/50 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' },
    { role: 'staff', label: 'Staff', email: 'staff@stockline.io', desc: 'Day-to-day sales and order fulfillment operations', color: 'border-purple-500/50 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300' },
    { role: 'customer', label: 'Customer', email: 'customer@stockline.io', desc: 'Online catalog shopping, cart, and my orders', color: 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' },
  ];

  const handleQuickDemoLogin = (role) => {
    setIsLoading(true);
    setError('');
    setTimeout(() => {
      const res = demoLogin(role);
      setIsLoading(false);
      if (res.success) {
        addToast({ title: 'Welcome back!', message: `Logged in as ${res.user.name} (${res.user.role.toUpperCase()}).` });
        if (role === 'customer') {
          navigate('/shop');
        } else {
          navigate(from === '/login' || from === '/register' ? '/dashboard' : from);
        }
      } else {
        setError(res.message);
      }
    }, 250);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    setIsLoading(true);
    setError('');

    setTimeout(() => {
      const res = login(email.trim(), password);
      setIsLoading(false);
      if (res.success) {
        addToast({ title: 'Login Successful', message: `Welcome ${res.user.name}` });
        if (res.user.role === 'customer') {
          navigate('/shop');
        } else {
          navigate(from === '/login' ? '/dashboard' : from);
        }
      } else {
        setError(res.message);
      }
    }, 300);
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="flex justify-center mb-2">
          <Logo size="lg" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Sign in to your account
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Enter your demo credentials or select a quick-login profile below
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md space-y-6">
        {/* ONE-CLICK DEMO ROLES SELECTOR */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              1-Click Demo Roles
            </span>
            <span className="text-[10px] text-slate-400">Click to switch</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => handleQuickDemoLogin(acc.role)}
                className={`p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] flex flex-col justify-between ${acc.color}`}
              >
                <div className="font-bold text-xs capitalize flex items-center justify-between">
                  <span>{acc.label}</span>
                  <ArrowRight className="h-3 w-3 opacity-60" />
                </div>
                <div className="text-[10px] opacity-80 truncate mt-1">{acc.email}</div>
              </button>
            ))}
          </div>
        </div>

        {/* STANDARD CREDENTIAL LOGIN CARD */}
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 font-medium">
                {error}
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              id="login-email"
              icon={Mail}
              placeholder="e.g. admin@stockline.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 pl-10 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500" data-no-translate="true">
            {language === 'en'
              ? "Don't have an account yet? "
              : language === 'obro'
              ? 'Ekhono account kholen ni? '
              : 'এখনো অ্যাকাউন্ট তৈরি করেননি? '}
            <Link
              to="/register"
              className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              {language === 'en'
                ? 'Register demo account'
                : language === 'obro'
                ? 'Notun demo account khulun'
                : 'নতুন ডেমো অ্যাকাউন্ট খুলুন'}
            </Link>
          </div>
        </div>

        {/* SECURITY NOTE */}
        <div className="text-center text-[11px] text-slate-400 leading-relaxed max-w-sm mx-auto">
          Notice: This is a frontend simulation. Demo credentials and session state are managed in browser
          LocalStorage. Real backend API authentication will be connected in future MERN development.
        </div>
      </div>
    </div>
  );
};
