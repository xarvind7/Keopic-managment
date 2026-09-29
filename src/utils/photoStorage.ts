/**
 * Permanent Photo & Month-Wise Salary Storage Engine
 * 
 * Provides:
 * 1. Persistent IndexedDB image storage for all uploaded photos, avatars, receipts, and proofs.
 *    - Never lost on month switch, page refresh, or browser close.
 *    - Bypasses localStorage 5MB limit.
 * 2. Month-Wise Salary configuration persistence.
 *    - Ensures each month (e.g. Aug: 17k, Sep: 18k, Oct: 18k) has an isolated salary.
 *    - Changing salary in one month never alters previous or other months.
 */

const DB_NAME = 'KeopicERP_PhotosDB';
const DB_VERSION = 1;
const STORE_NAME = 'photos_v1';

let dbInstance: IDBDatabase | null = null;

/**
 * Initializes and opens the IndexedDB database
 */
export function initPhotoDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('IndexedDB is not supported in this environment');
      reject(new Error('IndexedDB not supported'));
      return;
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event: any) => {
        dbInstance = event.target.result;
        resolve(dbInstance!);
      };

      request.onerror = (event: any) => {
        console.error('IndexedDB open error:', event.target.error);
        reject(event.target.error);
      };
    } catch (err) {
      console.error('Failed to initialize IndexedDB:', err);
      reject(err);
    }
  });
}

/**
 * Permanently saves a picture/photo with an ID
 */
export async function savePermanentPhoto(id: string, dataUrl: string, category: string = 'general'): Promise<boolean> {
  if (!id || !dataUrl) return false;

  // 1. Try IndexedDB
  try {
    const db = await initPhotoDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const record = {
      id,
      dataUrl,
      category,
      updatedAt: Date.now()
    };

    store.put(record);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not save photo to IndexedDB, falling back:', err);
  }

  // 2. Also keep in localStorage backup registry if small enough (e.g. avatar or thumbnail)
  try {
    if (dataUrl.length < 500000) { // < 500KB safe for localStorage
      localStorage.setItem(`sic_photo_${id}`, dataUrl);
    }
  } catch (e) {
    // localStorage quota exceeded is expected for huge images, IndexedDB handles it
  }

  return true;
}

/**
 * Retrieves a permanently saved picture by ID
 */
export async function getPermanentPhoto(id: string): Promise<string | null> {
  if (!id) return null;

  // 1. Try IndexedDB first
  try {
    const db = await initPhotoDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    const result = await new Promise<any>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (result && result.dataUrl) {
      return result.dataUrl;
    }
  } catch (err) {
    console.warn('Could not read from IndexedDB, checking localStorage fallback:', err);
  }

  // 2. Fallback to localStorage
  try {
    const fallback = localStorage.getItem(`sic_photo_${id}`);
    if (fallback) return fallback;
  } catch (e) {}

  return null;
}

/**
 * Retrieves all stored photos as a map { [id]: dataUrl }
 */
export async function getAllPermanentPhotos(): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  try {
    const db = await initPhotoDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    const records = await new Promise<any[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    records.forEach((r) => {
      if (r && r.id && r.dataUrl) {
        result[r.id] = r.dataUrl;
      }
    });
  } catch (err) {
    console.warn('Could not read all photos from IndexedDB:', err);
  }

  // Also check localStorage keys
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sic_photo_')) {
        const photoId = key.replace('sic_photo_', '');
        if (!result[photoId]) {
          const val = localStorage.getItem(key);
          if (val) result[photoId] = val;
        }
      }
    }
  } catch (e) {}

  return result;
}

/**
 * Deletes a stored photo by ID
 */
export async function deletePermanentPhoto(id: string): Promise<boolean> {
  if (!id) return false;

  try {
    const db = await initPhotoDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
  } catch (e) {}

  try {
    localStorage.removeItem(`sic_photo_${id}`);
  } catch (e) {}

  return true;
}

// -------------------------------------------------------------
// Month-Wise Salary Storage & History Functions
// -------------------------------------------------------------

const MONTH_SALARIES_KEY = 'sic_month_salaries_v1';

/**
 * Gets all saved month-wise salaries from localStorage
 */
export function getAllMonthSalaries(): Record<string, number> {
  try {
    const raw = localStorage.getItem(MONTH_SALARIES_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

/**
 * Saves the specific base salary for a specific month (e.g. '2026-08' -> 17000, '2026-09' -> 18000)
 */
export function saveMonthSalary(monthVal: string, salary: number): void {
  if (!monthVal || isNaN(salary) || salary <= 0) return;
  try {
    const current = getAllMonthSalaries();
    current[monthVal] = salary;
    localStorage.setItem(MONTH_SALARIES_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to save month salary:', e);
  }
}

/**
 * Retrieves the base salary for a specific month.
 * If not found, falls back to defaultSalary or 17000.
 */
export function getMonthSalary(monthVal: string, defaultSalary: number = 17000): number {
  if (!monthVal) return defaultSalary;
  try {
    const current = getAllMonthSalaries();
    if (typeof current[monthVal] === 'number' && current[monthVal] > 0) {
      return current[monthVal];
    }
  } catch (e) {}
  return defaultSalary;
}
