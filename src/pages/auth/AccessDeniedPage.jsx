import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft, RefreshCw, LayoutDashboard, ShoppingBag } from 'lucide-react';

export const AccessDeniedPage = () => {
  const { role, demoLogin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const requiredRoles = location.state?.requiredRoles || ['admin'];

  const handleSwitchToAdmin = () => {
    demoLogin('admin');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6">
      <Card className="max-w-lg w-full p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto border border-red-200 dark:border-red-800">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Access Restricted
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Your current demo role (<strong className="capitalize text-emerald-600">{role || 'Anonymous'}</strong>)
            does not have permission to access this internal module.
          </p>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-500 font-mono mt-3">
            Authorized Roles: {requiredRoles.join(', ')}
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button variant="primary" icon={RefreshCw} onClick={handleSwitchToAdmin}>
            Switch to Admin Demo
          </Button>
          {role === 'customer' ? (
            <Link to="/shop">
              <Button variant="outline" icon={ShoppingBag}>
                Return to Storefront
              </Button>
            </Link>
          ) : (
            <Link to="/dashboard">
              <Button variant="outline" icon={LayoutDashboard}>
                Back to Dashboard
              </Button>
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
};
