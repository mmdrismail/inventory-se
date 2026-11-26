import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Logo } from '../common/Logo';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Truck,
  Users2,
  ShoppingCart,
  Receipt,
  Boxes,
  ClipboardList,
  BarChart3,
  UserCog,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShoppingBag,
  FileSpreadsheet,
  ScanLine,
  Cpu,
  Kanban,
  ExternalLink,
} from 'lucide-react';

export const Sidebar = ({ isMobileOpen, onCloseMobile }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { currentUser, role, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Navigation Items with permitted roles
  const navigationItems = [
    { label: t('nav_overview', 'Overview'), to: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'staff'] },
    { label: t('nav_products', 'Products'), to: '/products', icon: Package, roles: ['admin', 'manager', 'staff'] },
    { label: t('nav_price_list', 'মেশিন ও প্রাইস লিস্ট'), to: '/price-list', icon: Cpu, roles: ['admin', 'manager', 'staff'] },
    { label: t('nav_categories', 'Categories'), to: '/categories', icon: FolderTree, roles: ['admin', 'manager'] },
    { label: t('nav_suppliers', 'Suppliers'), to: '/suppliers', icon: Truck, roles: ['admin', 'manager'] },
    { label: t('nav_customers', 'Customers'), to: '/customers', icon: Users2, roles: ['admin', 'manager', 'staff'] },
    { label: t('nav_purchases', 'Purchases'), to: '/purchases', icon: ShoppingCart, roles: ['admin', 'manager'] },
    { label: t('nav_sales', 'Sales & POS'), to: '/sales', icon: Receipt, roles: ['admin', 'manager', 'staff'] },
    { label: t('nav_quotations', 'Quotations / দরপত্র'), to: '/quotations', icon: FileSpreadsheet, roles: ['admin', 'manager', 'staff'] },
    { label: t('nav_offline_entries', 'খাতা ও অফলাইন (OCR)'), to: '/offline-entries', icon: ScanLine, roles: ['admin', 'manager', 'staff'] },
    { label: t('nav_inventory', 'Inventory'), to: '/inventory', icon: Boxes, roles: ['admin', 'manager', 'staff'] },
    { label: t('nav_orders', 'Customer Orders'), to: '/orders', icon: ClipboardList, roles: ['admin', 'manager', 'staff'] },
    { label: t('nav_reports', 'Reports & Analytics'), to: '/reports', icon: BarChart3, roles: ['admin', 'manager'] },
    { label: t('nav_users', 'User Management'), to: '/users', icon: UserCog, roles: ['admin'] },
    { label: t('nav_settings', 'Settings'), to: '/settings', icon: Settings, roles: ['admin'] },
  ];

  // Filter based on user's active demo role
  const visibleItems = navigationItems.filter((item) => item.roles.includes(role || 'staff'));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800">
        {!isCollapsed ? (
          <Logo size="sm" showTagline={false} />
        ) : (
          <div className="mx-auto">
            <Boxes className="h-6 w-6 text-emerald-500" />
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav Menu Items */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {!isCollapsed ? t('nav_section_operations', 'Operations') : '•••'}
        </div>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                } ${isCollapsed ? 'justify-center px-2' : ''}`
              }
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}

        {/* Public Storefront Link for easy testing */}
        <div className="pt-4 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {!isCollapsed ? t('nav_section_storefront', 'Storefront') : '•••'}
        </div>
        <NavLink
          to="/shop"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              isActive
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
            } ${isCollapsed ? 'justify-center px-2' : ''}`
          }
          title={isCollapsed ? t('nav_customer_shop', 'Customer Shop') : undefined}
        >
          <ShoppingBag className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>{t('nav_customer_shop', 'Customer Shop')}</span>}
        </NavLink>

        {/* Project Workspace & Agile Tracking */}
        <div className="pt-4 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {!isCollapsed ? 'Project Workspace' : '•••'}
        </div>
        <a
          href="https://trello.com/b/B7EZLSFY/my-trello-board"
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 ${
            isCollapsed ? 'justify-center px-2' : ''
          }`}
          title={isCollapsed ? 'Trello Agile Board' : undefined}
        >
          <Kanban className="h-5 w-5 shrink-0" />
          {!isCollapsed && (
            <span className="flex items-center justify-between flex-1">
              <span>Trello Board</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-60" />
            </span>
          )}
        </a>
      </div>

      {/* User Footer Card */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800">
        <div
          className={`flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 ${
            isCollapsed ? 'justify-center p-1.5' : ''
          }`}
        >
          <img
            src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt="Avatar"
            className="h-8 w-8 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
          />
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div
                className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate"
                title={currentUser?.name || 'Demo User'}
              >
                {currentUser?.name || 'Demo User'}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                  {role}
                </span>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:block h-screen sticky top-0 z-30 shrink-0 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCloseMobile} />
          <div className="relative w-72 max-w-xs h-full z-10">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};
