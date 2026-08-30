import type { Lead, LeadProspectingResult } from '../../types';

const DB_NAME = 'universa_email_db';
const DB_VERSION = 1;
const STORES = {
  LEADS: 'leads_store',
  RESULTS: 'results_store',
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORES.LEADS)) {
        db.createObjectStore(STORES.LEADS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.RESULTS)) {
        db.createObjectStore(STORES.RESULTS, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result);
    };

    request.onerror = (event: any) => {
      reject(event.target.error);
    };
  });
}

export async function saveLeadsToIndexedDb(leads: Lead[]): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORES.LEADS, 'readwrite');
    const store = tx.objectStore(STORES.LEADS);

    for (const lead of leads) {
      store.put(lead);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[IndexedDB Save Leads Error]', e);
  }
}

export async function getLeadsFromIndexedDb(): Promise<Lead[]> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORES.LEADS, 'readonly');
    const store = tx.objectStore(STORES.LEADS);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (e) {
    console.warn('[IndexedDB Get Leads Error]', e);
    return [];
  }
}

export async function saveProspectingResultsToIndexedDb(results: LeadProspectingResult[]): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORES.RESULTS, 'readwrite');
    const store = tx.objectStore(STORES.RESULTS);

    for (const res of results) {
      store.put(res);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[IndexedDB Save Results Error]', e);
  }
}

export async function getProspectingResultsFromIndexedDb(): Promise<LeadProspectingResult[]> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORES.RESULTS, 'readonly');
    const store = tx.objectStore(STORES.RESULTS);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (e) {
    console.warn('[IndexedDB Get Results Error]', e);
    return [];
  }
}

export async function clearAllIndexedDb(): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction([STORES.LEADS, STORES.RESULTS], 'readwrite');
    tx.objectStore(STORES.LEADS).clear();
    tx.objectStore(STORES.RESULTS).clear();

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[IndexedDB Clear Error]', e);
  }
}
