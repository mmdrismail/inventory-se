import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../../components/common/Logo';
import { Button } from '../../components/common/Button';
import { Input, Select } from '../../components/forms/FormControls';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { useLanguage } from '../../context/LanguageContext';
import { User, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react';

export const RegisterPage = () => {
  const { language } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('customer');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const { addToast } = useAppData();
  const navigate = useNavigate();

  const handleRegister = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please provide an email address.');
      return;
    }
    if (!password || password.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    setIsLoading(true);
    setError('');

    setTimeout(() => {
      const res = register({ name: name.trim(), email: email.trim(), role, phone: phone.trim() });
      setIsLoading(false);
      if (res.success) {
        addToast({ title: 'Account Created', message: `Welcome ${res.user.name}! Your demo account is ready.` });
        if (role === 'customer') {
          navigate('/shop');
        } else {
          navigate('/dashboard');
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
          Create demo account
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Register a local simulated profile in your browser storage
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <form onSubmit={handleRegister} data-enter-submit-last="true" className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 font-medium">
                {error}
              </div>
            )}

            <Input
              label="Full Name"
              type="text"
              icon={User}
              placeholder="e.g. Arif Hossain"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="Email Address"
              type="email"
              icon={Mail}
              placeholder="e.g. arif@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Phone Number (Optional)"
              type="tel"
              icon={Phone}
              placeholder="+880 1711-..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <Select
              label="Initial Demo Role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              options={[
                { value: 'customer', label: 'Storefront Customer' },
                { value: 'staff', label: 'Warehouse & Sales Staff' },
                { value: 'manager', label: 'Operations Manager' },
                { value: 'admin', label: 'System Administrator' },
              ]}
              helperText="Determines accessible routes and dashboard views"
            />

            <div className="space-y-1.5">
              <label
                htmlFor="register-password"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Password
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 pl-10 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="Create demo password"
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
              Register & Sign In
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500" data-no-translate="true">
            {language === 'en'
              ? 'Already registered? '
              : language === 'obro'
              ? 'Itimoddhe nibondhito? '
              : 'ইতিমধ্যে অ্যাকাউন্ট আছে? '}
            <Link
              to="/login"
              className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              {language === 'en' ? 'Sign in here' : language === 'obro' ? 'Ekhane login korun' : 'এখানে লগইন করুন'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
