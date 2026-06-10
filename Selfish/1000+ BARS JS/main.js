// main.js
import { Settings } from './settings.js';
import { APP_CONFIG, DOM, state } from './config.js';
import { initAudioContext } from './audioCore.js';
import { UI } from './ui.js';
import { Playlists } from './playlists.js';
import { Player } from './player.js';
import { Render } from './render.js';
import { Visualizer } from './visualizer.js';
import { ColorPicker } from './colorPicker.js';
import { DND } from './dragAndDrop.js';

document.addEventListener('DOMContentLoaded', () => {
    
    Settings.init();

    const savedBlur = localStorage.getItem('auraGlassBlurPercent') || '33';
    UI.applyBlur(savedBlur);
    UI.applyTheme(state.savedColor);

    // --- ФІКС 7: Запуск ресайзерів ---
    UI.initResizers();

    if (DOM.playBtn) {
        DOM.playBtn.addEventListener('click', () => {
            if (!DOM.audio.src) return;
            initAudioContext(); 
            if (DOM.audio.paused) {
                DOM.audio.play(); DOM.playIcon.innerText = "pause"; DOM.vinylCover.classList.add('playing');
            } else {
                DOM.audio.pause(); DOM.playIcon.innerText = "play_arrow"; DOM.vinylCover.classList.remove('playing');
            }
        });
    }

    if (DOM.progressBar) {
        DOM.progressBar.addEventListener('input', (e) => {
            if (DOM.audio.duration) {
                const newTime = (DOM.audio.duration / 100) * e.target.value;
                DOM.audio.currentTime = newTime; DOM.timeCurrent.innerText = UI.formatTime(newTime); UI.updateSliderProgress(DOM.progressBar, e.target.value);
            }
        });
    }

    DOM.audio.addEventListener('timeupdate', () => {
        if (DOM.audio.duration) {
            DOM.timeCurrent.innerText = UI.formatTime(DOM.audio.currentTime);
            DOM.timeTotal.innerText = UI.formatTime(DOM.audio.duration);
            const percent = (DOM.audio.currentTime / DOM.audio.duration) * 100;
            DOM.progressBar.value = percent; UI.updateSliderProgress(DOM.progressBar, percent);
        }
    });

    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active')); link.classList.add('active');
            UI.switchSection(link.getAttribute('href').substring(1));
        });
    });

    const nextBtn = document.getElementById('next-btn'); const prevBtn = document.getElementById('prev-btn');
    const shuffleBtn = document.getElementById('shuffle-btn'); const repeatBtn = document.getElementById('repeat-btn');

    if (nextBtn) nextBtn.addEventListener('click', () => Player.playNextTrack());
    if (prevBtn) prevBtn.addEventListener('click', () => Player.playPrevTrack());
    if (shuffleBtn) shuffleBtn.addEventListener('click', function() { Player.isShuffle = !Player.isShuffle; this.classList.toggle('active-mode', Player.isShuffle); });
    if (repeatBtn) repeatBtn.addEventListener('click', function() { Player.isRepeat = !Player.isRepeat; this.classList.toggle('active-mode', Player.isRepeat); });

    DOM.audio.addEventListener('ended', () => {
        if (Player.isRepeat && DOM.audio.src) { DOM.audio.currentTime = 0; DOM.audio.play(); } else Player.playNextTrack();
    });

    let searchTimeout;
    if (DOM.searchInput) {
        DOM.searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout); const query = e.target.value.trim();
            const searchResults = document.getElementById('search-results');
            if (query.length === 0) { if (searchResults) searchResults.innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1;">Почніть вводити текст...</p>'; return; }
            searchTimeout = setTimeout(() => Render.performSearch(query), 1000);
        });
    }

    const mainContentArea = document.querySelector('.main-content');
    if (mainContentArea) {
        mainContentArea.addEventListener('scroll', () => {
            if (mainContentArea.scrollTop + mainContentArea.clientHeight >= mainContentArea.scrollHeight - 400) {
                if (document.getElementById('home-section').classList.contains('active-section')) Render.renderNextChunk('category');
                else if (document.getElementById('search-section').classList.contains('active-section') && Render.searchState.query) Render.renderNextChunk('search');
            }
        });
    }

    Visualizer.init(); ColorPicker.init();
    window.addEventListener('resize', () => { DND.initDraggableCards(); DND.initDroppablePlaylists(); });
    Render.loadCategory('top-100');
});