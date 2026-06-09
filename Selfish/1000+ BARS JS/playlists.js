// playlists.js
import { state } from './config.js';
import { UI } from './ui.js';

export const Playlists = {
    // Створення нового плейлиста
    saveNew(name) {
        if (!name) return { success: false, msg: "Введіть назву плейлиста." };
        if (state.customPlaylists.includes(name)) return { success: false, msg: "Плейлист вже існує!" };

        state.customPlaylists.push(name);
        state.playlistsData[name] = [];
        this._syncStorage();
        return { success: true, msg: `Плейлист "${name}" створено!` };
    },

    // Видалення плейлиста
    delete(index) {
        const plName = state.customPlaylists[index];
        if (plName) {
            state.customPlaylists.splice(index, 1);
            delete state.playlistsData[plName];
            this._syncStorage();
            return true;
        }
        return false;
    },

    // Додавання/видалення треку з улюблених
    toggleLike(trackData) {
        const index = state.likedTracks.findIndex(t => t.id === trackData.id);
        const isLiked = index === -1;

        if (isLiked) {
            state.likedTracks.push(trackData);
        } else {
            state.likedTracks.splice(index, 1);
        }
        
        localStorage.setItem('likedTracksData', JSON.stringify(state.likedTracks));
        return isLiked;
    },

    // Додавання треку до конкретного плейлиста
    addToSpecific(plName, trackData) {
        if (!state.playlistsData[plName].some(t => t.id === trackData.id)) {
            state.playlistsData[plName].push(trackData);
            this._syncStorage();
            return true;
        }
        return false;
    },

    // Оновлення LocalStorage
    _syncStorage() {
        localStorage.setItem('myPlaylists', JSON.stringify(state.customPlaylists));
        localStorage.setItem('playlistsData', JSON.stringify(state.playlistsData));
    }
};