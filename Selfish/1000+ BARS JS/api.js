// api.js
import { APP_CONFIG } from './config.js';

let currentAudiusHost = '';

// Отримання випадкового сервера Audius для уникнення блокувань
export async function getAudiusHost() {
    if (currentAudiusHost) return currentAudiusHost;
    try {
        const res = await fetch('https://api.audius.co');
        const data = await res.json();
        currentAudiusHost = data.data[Math.floor(Math.random() * data.data.length)];
        return currentAudiusHost;
    } catch (error) {
        console.error("Помилка отримання хоста Audius:", error);
        return null;
    }
}

// Універсальна функція завантаження треків (замінює твою fetchMassiveData)
export async function fetchTracks(source, queryType, queryValue) {
    let rawData = [];
    try {
        if (source === 'audius') {
            const host = await getAudiusHost();
            if (!host) throw new Error("Audius сервер недоступний");
            
            let url = '';
            if (queryType === 'category') {
                if (queryValue === 'top-100') url = `${host}/v1/tracks/trending?app_name=${APP_CONFIG.appName}&limit=100`;
                else url = `${host}/v1/tracks/search?query=${queryValue}&app_name=${APP_CONFIG.appName}&limit=100`;
            } else {
                url = `${host}/v1/tracks/search?query=${encodeURIComponent(queryValue)}&app_name=${APP_CONFIG.appName}&limit=100`;
            }
            
            const res = await fetch(url);
            const json = await res.json();
            rawData = json.data || [];
        } else {
            // Логіка для iTunes
            const searchTerm = (queryType === 'category' && queryValue === 'top-100') ? 'top hits' : queryValue;
            const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&limit=200&entity=song`);
            const data = await res.json();
            rawData = data.results || [];
        }

        // Жорстка фільтрація дублікатів
        const uniqueIds = new Set();
        const filteredData = [];
        
        rawData.forEach(track => {
            const trackId = track.id || track.trackId;
            if (trackId && !uniqueIds.has(trackId)) {
                uniqueIds.add(trackId);
                filteredData.push(track);
            }
        });
        
        return filteredData;
    } catch (e) {
        console.error("Помилка завантаження бази даних:", e);
        return [];
    }
}