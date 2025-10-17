// LocalStorage manager with error handling and compression

import { STORAGE_KEYS, MAX_STORAGE_SIZE } from '../constants/storage';

export class StorageManager {
  static getItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        return JSON.parse(item) as T;
      }
    } catch (error) {
      console.error(`Failed to get item ${key} from localStorage:`, error);
    }
    return defaultValue;
  }

  static setItem<T>(key: string, value: T): boolean {
    try {
      const serialized = JSON.stringify(value);
      
      // Check storage size
      const currentSize = this.getStorageSize();
      const itemSize = new Blob([serialized]).size;
      
      if (currentSize + itemSize > MAX_STORAGE_SIZE) {
        console.warn('Storage limit approaching. Consider clearing old data.');
      }
      
      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      console.error(`Failed to set item ${key} in localStorage:`, error);
      return false;
    }
  }

  static removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove item ${key} from localStorage:`, error);
    }
  }

  static getStorageSize(): number {
    let total = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  }

  static clearAll(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }

  static exportData(): string {
    const data: Record<string, any> = {};
    for (const key in STORAGE_KEYS) {
      const storageKey = STORAGE_KEYS[key as keyof typeof STORAGE_KEYS];
      const value = localStorage.getItem(storageKey);
      if (value) {
        data[storageKey] = JSON.parse(value);
      }
    }
    return JSON.stringify(data, null, 2);
  }

  static importData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      for (const key in data) {
        localStorage.setItem(key, JSON.stringify(data[key]));
      }
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }
}
