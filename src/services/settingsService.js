import { storageService, STORAGE_KEYS } from './storageService';
import { INITIAL_SETTINGS } from '../data/seedData';

class SettingsService {
  getSettings() {
    return storageService.getItem(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  }

  updateSettings(updates) {
    const current = this.getSettings();
    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    storageService.setItem(STORAGE_KEYS.SETTINGS, updated);

    // If theme updated, apply class to html document
    if (updates.theme) {
      if (updates.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    return { success: true, settings: updated };
  }

  resetSettings() {
    storageService.setItem(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    return { success: true, settings: INITIAL_SETTINGS };
  }
}

export const settingsService = new SettingsService();
