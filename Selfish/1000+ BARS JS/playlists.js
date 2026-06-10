// playlists.js
import { state } from './config.js';
import { UI } from './ui.js';
import { DND } from './dragAndDrop.js'; 

export const Playlists = {
    saveNew(name) {
        if (!name) return { success: false, msg: "Введіть назву плейлиста." };
        if (state.customPlaylists.includes(name)) return { success: false, msg: "Плейлист вже існує!" };

        state.customPlaylists.push(name);
        state.playlistsData[name] = [];
        this._syncStorage();
        this.renderPlaylists(); 
        return { success: true, msg: `Плейлист "${name}" створено!` };
    },

    delete(index) {
        const plName = state.customPlaylists[index];
        if (plName) {
            state.customPlaylists.splice(index, 1);
            delete state.playlistsData[plName];
            this._syncStorage();
            this.renderPlaylists(); 
            return true;
        }
        return false;
    },

    toggleLike(trackData) {
        const index = state.likedTracks.findIndex(t => t.id === trackData.id);
        const isLiked = index === -1;
        
        // --- ФІКС: Нові треки додаються на початок списку (unshift) ---
        if (isLiked) state.likedTracks.unshift(trackData);
        else state.likedTracks.splice(index, 1);
        
        localStorage.setItem('likedTracksData', JSON.stringify(state.likedTracks));
        return isLiked;
    },

    addToSpecific(plName, trackData) {
        if (!state.playlistsData[plName].some(t => t.id === trackData.id)) {
            state.playlistsData[plName].push(trackData);
            this._syncStorage();
            return true;
        }
        return false;
    },

    _syncStorage() {
        localStorage.setItem('myPlaylists', JSON.stringify(state.customPlaylists));
        localStorage.setItem('playlistsData', JSON.stringify(state.playlistsData));
    },

    renderPlaylists() {
        const playlistsContainer = document.getElementById('user-playlists-list');
        if (!playlistsContainer) return;
        
        playlistsContainer.innerHTML = `<li><a href="#liked-section" id="nav-liked"><span class="material-symbols-rounded">favorite</span> Вподобані</a></li>`;
        
        state.customPlaylists.forEach((name, index) => {
            playlistsContainer.innerHTML += `
                <li style="display: flex; justify-content: space-between; align-items: center;">
                    <a href="#liked-section" class="custom-pl-link" data-name="${name}" style="flex-grow: 1;">
                        <span class="material-symbols-rounded">queue_music</span> ${name}
                    </a>
                    <span class="material-symbols-rounded delete-pl-btn" data-index="${index}" style="cursor:pointer; color: var(--text-muted); font-size: 18px;">delete</span>
                </li>`;
        });

        document.getElementById('nav-liked').onclick = (e) => { 
            e.preventDefault(); 
            this.openPlaylistSection('Вподобані треки', state.likedTracks); 
        };
        
        document.querySelectorAll('.custom-pl-link').forEach(link => { 
            link.onclick = (e) => { 
                e.preventDefault(); 
                this.openPlaylistSection(link.dataset.name, state.playlistsData[link.dataset.name] || []); 
            }; 
        });

        document.querySelectorAll('.delete-pl-btn').forEach(btn => {
            btn.onclick = (e) => {
                const idx = e.target.dataset.index;
                const plName = state.customPlaylists[idx];
                if (confirm(`Видалити плейлист "${plName}"?`)) this.delete(idx);
            };
        });

        DND.initDroppablePlaylists();
    },

    openPlaylistSection(title, tracksArray) {
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active-section'));
        document.getElementById('liked-section').classList.add('active-section'); 
        document.querySelector('#liked-section h1').innerText = title;
        
        const container = document.getElementById('liked-tracks-container');
        if (tracksArray.length === 0) { 
            container.innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1;">Тут поки порожньо.</p>'; 
            return; 
        }
        
        container.innerHTML = '';
        tracksArray.forEach(track => {
            const safeTitle = track.title.replace(/"/g, '&quot;'); 
            const safeArtist = track.artist.replace(/"/g, '&quot;');
            container.innerHTML += `
                <div class="track-card glass" data-id="${track.id}" data-url="${track.url}" data-title="${safeTitle}" data-artist="${safeArtist}" data-cover="${track.cover}" onclick="window.playTrack('${track.url}', '${track.title.replace(/'/g, "\\'")}', '${track.artist.replace(/'/g, "\\'")}', '${track.cover}', '${track.id}')">
                    <div class="track-card-img-container"><img src="${track.cover}"></div>
                    <h3>${track.title}</h3><p>${track.artist}</p>
                </div>`;
        });
        
        DND.initDraggableCards();
    }
};