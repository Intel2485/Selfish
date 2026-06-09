// config.js
export const APP_CONFIG = {
    appName: "SelfishMusicRGR",
    dbName: "SelfishMusicDB",
    storeName: "backgrounds",
    renderChunkSize: 20
};

// Глобальний стан додатку (щоб не плодити let по всіх файлах)
export const state = {
    currentTrackData: null,
    isEqEnabled: false,
    colorMode: localStorage.getItem('auraColorMode') || 'fixed',
    savedColor: localStorage.getItem('auraThemeColor') || '#b026ff',
    currentSource: localStorage.getItem('auraMusicSource') || 'audius',
    likedTracks: JSON.parse(localStorage.getItem('likedTracksData')) || [],
    recentlyPlayed: JSON.parse(localStorage.getItem('recentlyPlayed')) || [],
    customPlaylists: JSON.parse(localStorage.getItem('myPlaylists')) || [],
    playlistsData: JSON.parse(localStorage.getItem('playlistsData')) || {}
};

// Елементи DOM, які використовуються найчастіше
export const DOM = {
    audio: new Audio(),
    playBtn: document.getElementById('play-btn'),
    playIcon: document.getElementById('play-icon'),
    progressBar: document.getElementById('progress-bar'),
    timeCurrent: document.getElementById('time-current'),
    timeTotal: document.getElementById('time-total'),
    vinylCover: document.getElementById('vinyl-cover'),
    searchInput: document.getElementById('search-input')
};

DOM.audio.crossOrigin = "anonymous";