import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ShieldAlert, ArrowLeft, RefreshCw, LayoutDashboard, ShoppingBag } from 'lucide-react';

export const AccessDeniedPage = () => {
  const { role, demoLogin } = useAuth();
  const { language, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const l = (texts) => {
    if (language === 'en') return texts.en;
    if (language === 'obro') return texts.obro || `${texts.bn} (${texts.en})`;
    return texts.bn;
  };

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
            {l({ bn: 'প্রবেশাধিকার সংরক্ষিত', en: 'Access Restricted', obro: 'Access Restricted' })}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {l({
              bn: 'আপনার বর্তমান ভূমিকা (',
              en: 'Your current role (',
              obro: 'Apnar current role (',
            })}
            <strong className="capitalize text-emerald-600">{role || 'Anonymous'}</strong>
            {l({
              bn: ') এই মডিউলটিতে প্রবেশের অনুমতি রাখে না।',
              en: ') does not have permission to access this internal module.',
              obro: ') ekhane access korte parbe na.',
            })}
          </p>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-500 font-mono mt-3">
            {l({ bn: 'অনুমোদিত রোল: ', en: 'Authorized Roles: ', obro: 'Authorized Roles: ' })}{requiredRoles.join(', ')}
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button variant="primary" icon={RefreshCw} onClick={handleSwitchToAdmin}>
            {l({ bn: 'অ্যাডমিন ভূমিকায় স্যুইচ করুন', en: 'Switch to Admin Demo', obro: 'Switch to Admin Demo' })}
          </Button>
          {role === 'customer' ? (
            <Link to="/shop">
              <Button variant="outline" icon={ShoppingBag}>
                {l({ bn: 'অনলাইন শপে ফিরে যান', en: 'Return to Storefront', obro: 'Storefront-e Jan' })}
              </Button>
            </Link>
          ) : (
            <Link to="/dashboard">
              <Button variant="outline" icon={LayoutDashboard}>
                {l({ bn: 'ড্যাশবোর্ডে ফিরে যান', en: 'Return to Dashboard', obro: 'Dashboard-e Jan' })}
              </Button>
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
};
