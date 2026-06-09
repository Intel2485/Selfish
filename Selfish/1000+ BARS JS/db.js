// db.js
import { APP_CONFIG } from './config.js';

export function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(APP_CONFIG.dbName, 1);
        request.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(APP_CONFIG.storeName)) {
                db.createObjectStore(APP_CONFIG.storeName, { keyPath: "id" });
            }
        };
        request.onsuccess = e => resolve(e.target.result);
        request.onerror = e => reject(e.target.error);
    });
}

export async function saveBgToDB(id, dataUrl) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(APP_CONFIG.storeName, "readwrite");
        transaction.objectStore(APP_CONFIG.storeName).put({ id, dataUrl });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

export async function getBgFromDB(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(APP_CONFIG.storeName, "readonly");
        const request = transaction.objectStore(APP_CONFIG.storeName).get(id);
        request.onsuccess = () => resolve(request.result ? request.result.dataUrl : null);
        request.onerror = () => reject(request.error);
    });
}

export async function deleteBgFromDB(id) {
    const db = await openDB();
    const transaction = db.transaction(APP_CONFIG.storeName, "readwrite");
    transaction.objectStore(APP_CONFIG.storeName).delete(id);
}