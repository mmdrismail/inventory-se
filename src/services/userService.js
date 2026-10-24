import { storageService, STORAGE_KEYS } from './storageService';
import { INITIAL_USERS } from '../data/seedData';

class UserService {
  getAll() {
    return storageService.getItem(STORAGE_KEYS.USERS, []);
  }

  getById(id) {
    const users = this.getAll();
    return users.find((u) => u.id === id) || null;
  }

  create(userData) {
    const users = this.getAll();
    const emailExists = users.some((u) => u.email.toLowerCase() === userData.email.trim().toLowerCase());
    if (emailExists) {
      return { success: false, message: `A user with email "${userData.email}" already exists.` };
    }

    const newUser = {
      ...userData,
      id: `user-${Date.now()}`,
      name: userData.name.trim(),
      email: userData.email.trim().toLowerCase(),
      role: userData.role || 'staff',
      status: userData.status || 'active',
      department: userData.department?.trim() || 'Operations',
      avatar: userData.avatar?.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    storageService.setItem(STORAGE_KEYS.USERS, users);
    return { success: true, user: newUser };
  }

  update(id, updates, currentUserId) {
    const users = this.getAll();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) {
      return { success: false, message: 'User not found.' };
    }

    // Safety: prevent currently logged in user from demoting their own admin role or deactivating their own account
    if (id === currentUserId) {
      if (updates.role && updates.role !== 'admin' && users[index].role === 'admin') {
        return { success: false, message: 'You cannot revoke your own administrator role.' };
      }
      if (updates.status && updates.status === 'inactive') {
        return { success: false, message: 'You cannot deactivate your own active administrative account.' };
      }
    }

    // Check unique email if modified
    if (updates.email && updates.email.toLowerCase() !== users[index].email.toLowerCase()) {
      const emailExists = users.some((u) => u.id !== id && u.email.toLowerCase() === updates.email.trim().toLowerCase());
      if (emailExists) {
        return { success: false, message: `The email "${updates.email}" is already used by another account.` };
      }
    }

    users[index] = {
      ...users[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    storageService.setItem(STORAGE_KEYS.USERS, users);
    return { success: true, user: users[index] };
  }

  toggleStatus(id, currentUserId) {
    const user = this.getById(id);
    if (!user) return { success: false, message: 'User not found.' };

    if (id === currentUserId) {
      return { success: false, message: 'You cannot deactivate your own account.' };
    }

    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    return this.update(id, { status: newStatus }, currentUserId);
  }

  remove(id, currentUserId) {
    const users = this.getAll();
    if (id === currentUserId) {
      return { success: false, message: 'You cannot delete your own account.' };
    }

    const filtered = users.filter((u) => u.id !== id);
    storageService.setItem(STORAGE_KEYS.USERS, filtered);
    return { success: true, message: 'User removed from demo accounts.' };
  }

  resetUsers() {
    storageService.setItem(STORAGE_KEYS.USERS, INITIAL_USERS);
    return { success: true, users: INITIAL_USERS };
  }
}

export const userService = new UserService();
