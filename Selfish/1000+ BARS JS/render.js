// render.js
import { APP_CONFIG, state } from './config.js';
import { fetchTracks } from './api.js';
import { UI } from './ui.js';
import { DND } from './dragAndDrop.js';

export const Render = {
    catState: { query: 'top-100', cache: [], renderOffset: 0, isLoading: false },
    searchState: { query: '', cache: [], renderOffset: 0, isLoading: false },

    async loadCategory(genre, btnEl = null) {
        this.catState = { query: genre, cache: [], renderOffset: 0, isLoading: false };
        if (btnEl) { document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active')); btnEl.classList.add('active'); }
        const container = document.getElementById('spotify-tracks');
        container.innerHTML = `<p style="color: var(--text-muted);">Завантажуємо базу ${genre}...</p>`;
        this.catState.cache = await fetchTracks(state.currentSource, 'category', genre);
        container.innerHTML = ''; await this.renderNextChunk('category'); 
    },

    async performSearch(query) {
        if (!query) return;
        this.searchState = { query: query, cache: [], renderOffset: 0, isLoading: false };
        const container = document.getElementById('search-results');
        container.innerHTML = `<p style="color: var(--text-muted); grid-column: 1 / -1;">Завантажуємо базу...</p>`;

        // --- ФІКС: Збереження історії пошуку ---
        if (!state.searchHistory.includes(query)) {
            state.searchHistory.unshift(query);
            if (state.searchHistory.length > 10) state.searchHistory.pop();
            localStorage.setItem('searchHistory', JSON.stringify(state.searchHistory));
            this.renderSearchHistoryUI();
        }

        this.searchState.cache = await fetchTracks(state.currentSource, 'search', query);
        if (this.searchState.cache.length === 0) container.innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1;">Нічого не знайдено.</p>';
        else { container.innerHTML = ''; await this.renderNextChunk('search'); }
    },

    // --- ФІКС: Відмальовування кнопок останніх пошуків ---
    renderSearchHistoryUI() {
        let container = document.getElementById('search-history-container');
        if (!container) {
            const searchWrap = document.querySelector('.search-wrapper') || document.getElementById('search-section');
            if (!searchWrap) return;
            container = document.createElement('div');
            container.id = 'search-history-container';
            container.style = 'display:flex; gap:10px; flex-wrap:wrap; margin: 15px 0; align-items: center;';
            if (document.querySelector('.search-wrapper')) document.querySelector('.search-wrapper').insertAdjacentElement('afterend', container);
            else searchWrap.prepend(container);
        }
        
        if (state.searchHistory.length === 0) { container.innerHTML = ''; return; }

        let html = '<span style="color:var(--text-muted); font-size: 12px; margin-right: 5px;">Недавні запити:</span>';
        state.searchHistory.forEach(q => {
            html += `<span style="background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); padding: 5px 12px; border-radius: 15px; font-size: 12px; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='var(--accent)'; this.style.color='white'" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.color='var(--text-main)'" onclick="document.getElementById('search-input').value='${q}'; window.performSearch('${q}')">${q}</span>`;
        });
        container.innerHTML = html;
    },

    async renderNextChunk(type) {
        const activeState = type === 'category' ? this.catState : this.searchState;
        const containerId = type === 'category' ? 'spotify-tracks' : 'search-results';

        if (activeState.isLoading || activeState.renderOffset >= activeState.cache.length) return;
        activeState.isLoading = true;

        const chunk = activeState.cache.slice(activeState.renderOffset, activeState.renderOffset + APP_CONFIG.renderChunkSize);
        if (chunk.length === 0) { activeState.isLoading = false; return; }

        const grid = document.getElementById(containerId); let htmlContent = '';

        chunk.forEach(track => {
            let id, url, title, artist, cover, duration, badgeColor, sourceName;
            if (state.currentSource === 'audius') {
                id = track.id; url = `https://discoveryprovider.audius.co/v1/tracks/${id}/stream?app_name=${APP_CONFIG.appName}`;
                title = track.title.replace(/'/g, "\\'"); artist = track.user.name.replace(/'/g, "\\'"); cover = track.artwork ? track.artwork['480x480'] : '../IMG/default.jpg';
                duration = UI.formatTime(track.duration || 0); badgeColor = 'rgba(176,38,255,0.7)'; sourceName = 'Audius';
            } else {
                if (!track.previewUrl) return;
                id = track.trackId; url = track.previewUrl; title = track.trackName.replace(/'/g, "\\'"); artist = track.artistName.replace(/'/g, "\\'");
                cover = track.artworkUrl100.replace('100x100', '300x300'); duration = UI.formatTime((track.trackTimeMillis || 0) / 1000);
                badgeColor = 'rgba(255,38,38,0.7)'; sourceName = 'iTunes';
            }
            htmlContent += `
                <div class="track-card glass" data-id="${id}" data-url="${url}" data-title="${title.replace(/"/g, '&quot;')}" data-artist="${artist.replace(/"/g, '&quot;')}" data-cover="${cover}" onclick="playTrack('${url}', '${title}', '${artist}', '${cover}', '${id}')">
                    <div class="track-card-img-container">
                        <img src="${cover}"><span class="track-badge-source" style="background: ${badgeColor};">${sourceName}</span><span class="track-badge-time">${duration}</span>
                    </div>
                    <h3>${track.title || track.trackName}</h3><p>${track.user?.name || track.artistName}</p>
                </div>`;
        });
        if (activeState.renderOffset > 0) grid.insertAdjacentHTML('beforeend', htmlContent); else grid.innerHTML = htmlContent;
        activeState.renderOffset += chunk.length; activeState.isLoading = false;
        DND.initDraggableCards();
    }
};

window.loadCategory = (genre, btnEl) => Render.loadCategory(genre, btnEl);
window.performSearch = (q) => Render.performSearch(q); // ДОДАНО: Для кнопок історії