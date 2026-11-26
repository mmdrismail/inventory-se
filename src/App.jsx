import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppDataProvider } from './context/AppDataContext';
import { LanguageProvider } from './context/LanguageContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { ScrollToTop } from './components/common/ScrollToTop';

// Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { DashboardLayout } from './layouts/DashboardLayout';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { FeaturesPage } from './pages/public/FeaturesPage';
import { PrivacyPolicyPage } from './pages/public/PrivacyPolicyPage';
import { TermsOfServicePage } from './pages/public/TermsOfServicePage';

// Storefront & Cart Pages
import { ShopPage } from './pages/shop/ShopPage';
import { StorefrontProductDetailPage } from './pages/shop/ProductDetailPage';
import { CartPage } from './pages/shop/CartPage';
import { CheckoutPage } from './pages/shop/CheckoutPage';
import { MyOrdersPage } from './pages/shop/MyOrdersPage';
import { OrderDetailPage } from './pages/shop/OrderDetailPage';

// Auth & Access Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { DemoAccessPage } from './pages/auth/DemoAccessPage';
import { AccessDeniedPage } from './pages/auth/AccessDeniedPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Dashboard Overview
import { DashboardOverviewPage } from './pages/dashboard/DashboardOverviewPage';

// Product Management
import { ProductListPage } from './pages/products/ProductListPage';
import { ProductFormPage } from './pages/products/ProductFormPage';
import { ProductDetailPage } from './pages/products/ProductDetailPage';

// Category Management
import { CategoryListPage } from './pages/categories/CategoryListPage';

// Supplier Management
import { SupplierListPage } from './pages/suppliers/SupplierListPage';
import { SupplierDetailPage } from './pages/suppliers/SupplierDetailPage';

// Customer Management
import { CustomerListPage } from './pages/customers/CustomerListPage';
import { CustomerDetailPage } from './pages/customers/CustomerDetailPage';

// Purchases
import { PurchaseListPage } from './pages/purchases/PurchaseListPage';
import { PurchaseFormPage } from './pages/purchases/PurchaseFormPage';
import { PurchaseDetailPage } from './pages/purchases/PurchaseDetailPage';

// Sales
import { SalesListPage } from './pages/sales/SalesListPage';
import { SalesFormPage } from './pages/sales/SalesFormPage';
import { SaleDetailPage } from './pages/sales/SaleDetailPage';

// Quotations (দরপত্র ও কোটেশন)
import { QuotationListPage } from './pages/quotations/QuotationListPage';
import { QuotationFormPage } from './pages/quotations/QuotationFormPage';
import { QuotationDetailPage } from './pages/quotations/QuotationDetailPage';

// Legacy Khata & Offline Entries (OCR Scanner + Batch Register + Money Receipts)
import { OfflineRecordsPage } from './pages/offline/OfflineRecordsPage';
import { PartPriceListPage } from './pages/products/PartPriceListPage';

// Inventory Control
import { InventoryPage } from './pages/inventory/InventoryPage';

// Order Management (Admin)
import { OrderListPage } from './pages/orders/OrderListPage';
import { AdminOrderDetailPage } from './pages/orders/AdminOrderDetailPage';

// Reports
import { ReportsPage } from './pages/reports/ReportsPage';

// User Management
import { UserManagementPage } from './pages/users/UserManagementPage';

// Settings & Profile
import { SettingsPage } from './pages/settings/SettingsPage';
import { ProfilePage } from './pages/settings/ProfilePage';

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <LanguageProvider>
          <AppDataProvider>
          <Routes>
            {/* PUBLIC & STOREFRONT ROUTES */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsOfServicePage />} />
              
              {/* Storefront */}
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/shop/products/:id" element={<StorefrontProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/my-orders" element={<MyOrdersPage />} />
              <Route path="/my-orders/:id" element={<OrderDetailPage />} />

              {/* Authentication */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/demo-access" element={<DemoAccessPage />} />
              <Route path="/access-denied" element={<AccessDeniedPage />} />
            </Route>

            {/* DASHBOARD AUTHENTICATED ROUTES */}
            <Route
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'staff']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardOverviewPage />} />

              {/* Products */}
              <Route path="/products" element={<ProductListPage />} />
              <Route path="/products/new" element={<ProductFormPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/products/:id/edit" element={<ProductFormPage />} />

              {/* Categories */}
              <Route
                path="/categories"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']}>
                    <CategoryListPage />
                  </ProtectedRoute>
                }
              />

              {/* Suppliers */}
              <Route
                path="/suppliers"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']}>
                    <SupplierListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/suppliers/:id"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']}>
                    <SupplierDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Customers */}
              <Route path="/customers" element={<CustomerListPage />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />

              {/* Purchases */}
              <Route
                path="/purchases"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']}>
                    <PurchaseListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/purchases/new"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']}>
                    <PurchaseFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/purchases/:id"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']}>
                    <PurchaseDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Sales */}
              <Route path="/sales" element={<SalesListPage />} />
              <Route path="/sales/new" element={<SalesFormPage />} />
              <Route path="/sales/:id" element={<SaleDetailPage />} />
              <Route path="/sales/:id/edit" element={<SalesFormPage />} />

              {/* Quotations (দরপত্র) */}
              <Route path="/quotations" element={<QuotationListPage />} />
              <Route path="/quotations/new" element={<QuotationFormPage />} />
              <Route path="/quotations/:id" element={<QuotationDetailPage />} />
              <Route path="/quotations/:id/edit" element={<QuotationFormPage />} />

              {/* Legacy Khata & Offline Entries & Machine Price Catalog */}
              <Route path="/offline-entries" element={<OfflineRecordsPage />} />
              <Route path="/price-list" element={<PartPriceListPage />} />

              {/* Inventory */}
              <Route path="/inventory" element={<InventoryPage />} />

              {/* Storefront Orders Management */}
              <Route path="/orders" element={<OrderListPage />} />
              <Route path="/orders/:id" element={<AdminOrderDetailPage />} />

              {/* Reports */}
              <Route
                path="/reports"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']}>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />

              {/* User Management */}
              <Route
                path="/users"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <UserManagementPage />
                  </ProtectedRoute>
                }
              />

              {/* System Settings */}
              <Route
                path="/settings"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />

              {/* User Profile */}
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* 404 Catch-All */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AppDataProvider>
      </LanguageProvider>
    </AuthProvider>
    </BrowserRouter>
  );
}
