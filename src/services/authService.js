import { storageService, STORAGE_KEYS } from './storageService';

export const ROLE_PERMISSIONS = {
  admin: {
    canViewDashboard: true,
    canManageProducts: true,
    canManageCategories: true,
    canManageSuppliers: true,
    canManageCustomers: true,
    canManagePurchases: true,
    canManageSales: true,
    canManageInventory: true,
    canManageOrders: true,
    canViewReports: true,
    canManageUsers: true,
    canManageSettings: true,
    canShop: true,
  },
  manager: {
    canViewDashboard: true,
    canManageProducts: true,
    canManageCategories: true,
    canManageSuppliers: true,
    canManageCustomers: true,
    canManagePurchases: true,
    canManageSales: true,
    canManageInventory: true,
    canManageOrders: true,
    canViewReports: true,
    canManageUsers: false,
    canManageSettings: false,
    canShop: true,
  },
  staff: {
    canViewDashboard: true,
    canManageProducts: false, // view only or limited
    canViewProducts: true,
    canManageCategories: false,
    canManageSuppliers: false,
    canManageCustomers: true,
    canManagePurchases: false,
    canManageSales: true,
    canManageInventory: false,
    canViewInventory: true,
    canManageOrders: true,
    canViewReports: false,
    canManageUsers: false,
    canManageSettings: false,
    canShop: true,
  },
  customer: {
    canViewDashboard: false,
    canManageProducts: false,
    canManageCategories: false,
    canManageSuppliers: false,
    canManageCustomers: false,
    canManagePurchases: false,
    canManageSales: false,
    canManageInventory: false,
    canManageOrders: false,
    canViewReports: false,
    canManageUsers: false,
    canManageSettings: false,
    canShop: true,
    canViewMyOrders: true,
  },
};

class AuthService {
  getCurrentUser() {
    return storageService.getItem(STORAGE_KEYS.SESSION, null);
  }

  setCurrentUser(user) {
    if (!user) {
      storageService.removeItem(STORAGE_KEYS.SESSION);
    } else {
      storageService.setItem(STORAGE_KEYS.SESSION, user);
    }
  }

  login(email, password) {
    const users = storageService.getItem(STORAGE_KEYS.USERS, []);
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      return { success: false, message: 'Invalid email address. User not found in demo records.' };
    }

    if (user.status === 'inactive') {
      return { success: false, message: 'This demo account is currently deactivated. Contact an administrator.' };
    }

    // Demo password check: accept any non-empty password or standard password 'password123'
    if (!password || password.length < 4) {
      return { success: false, message: 'Password must be at least 4 characters.' };
    }

    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      department: user.department,
      token: `demo-jwt-${user.id}-${Date.now()}`,
    };

    this.setCurrentUser(sessionUser);
    return { success: true, user: sessionUser };
  }

  demoLogin(role) {
    const users = storageService.getItem(STORAGE_KEYS.USERS, []);
    const user = users.find((u) => u.role === role && u.status === 'active') || users.find((u) => u.role === role);

    if (!user) {
      return { success: false, message: `No active demo account found for role "${role}".` };
    }

    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      department: user.department,
      token: `demo-jwt-${user.id}-${Date.now()}`,
    };

    this.setCurrentUser(sessionUser);
    return { success: true, user: sessionUser };
  }

  register({ name, email, role = 'customer', phone }) {
    const users = storageService.getItem(STORAGE_KEYS.USERS, []);
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (existing) {
      return { success: false, message: 'An account with this email already exists.' };
    }

    const newUser = {
      id: `user-${Date.now()}`,
      name,
      email,
      phone: phone || '',
      role: role || 'customer',
      status: 'active',
      department: role === 'customer' ? 'Customer' : 'Staff',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    storageService.setItem(STORAGE_KEYS.USERS, users);

    // If registered as customer, also add to customer list
    if (role === 'customer') {
      const customers = storageService.getItem(STORAGE_KEYS.CUSTOMERS, []);
      customers.push({
        id: `cust-${Date.now()}`,
        name,
        email,
        phone: phone || '',
        address: 'Dhaka, Bangladesh',
        customerType: 'Retail',
        notes: 'Self-registered customer account.',
        createdAt: new Date().toISOString(),
      });
      storageService.setItem(STORAGE_KEYS.CUSTOMERS, customers);
    }

    const sessionUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      avatar: newUser.avatar,
      department: newUser.department,
      token: `demo-jwt-${newUser.id}-${Date.now()}`,
    };

    this.setCurrentUser(sessionUser);
    return { success: true, user: sessionUser };
  }

  forgotPassword(email) {
    const users = storageService.getItem(STORAGE_KEYS.USERS, []);
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      return { success: false, message: 'No registered demo user found with that email.' };
    }

    return {
      success: true,
      message: `A simulated password reset link has been dispatched to ${email}. In this frontend demo, your temporary access PIN is 849201.`,
    };
  }

  logout() {
    this.setCurrentUser(null);
    return true;
  }

  hasPermission(role, permissionKey) {
    if (!role) return false;
    const perms = ROLE_PERMISSIONS[role] || {};
    return Boolean(perms[permissionKey]);
  }
}

export const authService = new AuthService();
