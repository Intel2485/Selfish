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
    UI.initResizers();

    const fsPlayIcon = document.getElementById('fs-play-icon');
    DOM.audio.addEventListener('play', () => {
        if (DOM.playIcon) DOM.playIcon.innerText = "pause";
        if (fsPlayIcon) fsPlayIcon.innerText = "pause";
        if (DOM.vinylCover) DOM.vinylCover.classList.add('playing');
    });
    DOM.audio.addEventListener('pause', () => {
        if (DOM.playIcon) DOM.playIcon.innerText = "play_arrow";
        if (fsPlayIcon) fsPlayIcon.innerText = "play_arrow";
        if (DOM.vinylCover) DOM.vinylCover.classList.remove('playing');
    });

    if (DOM.playBtn) {
        DOM.playBtn.addEventListener('click', () => {
            if (!DOM.audio.src) return;
            initAudioContext(); 
            if (DOM.audio.paused) DOM.audio.play().catch(e => console.log(e));
            else DOM.audio.pause();
        });
    }

    let isDragging = false;
    const fsProgressBar = document.getElementById('fs-progress-bar');
    const fsTimeCurrent = document.getElementById('fs-time-current');
    const fsTimeTotal = document.getElementById('fs-time-total');

    const setupProgressBar = (bar, timeLabel) => {
        if (!bar) return;
        bar.addEventListener('input', (e) => {
            isDragging = true;
            if (DOM.audio.duration) {
                const newTime = (DOM.audio.duration / 100) * e.target.value;
                if (timeLabel) timeLabel.innerText = UI.formatTime(newTime);
                UI.updateSliderProgress(bar, e.target.value);
            }
        });
        bar.addEventListener('change', (e) => {
            if (DOM.audio.duration) {
                DOM.audio.currentTime = (DOM.audio.duration / 100) * e.target.value;
                // Одразу перезаписуємо нову позицію при ручному перемотуванні
                localStorage.setItem('auraLastPosition', DOM.audio.currentTime);
            }
            isDragging = false;
        });
    };

    setupProgressBar(DOM.progressBar, DOM.timeCurrent);
    setupProgressBar(fsProgressBar, fsTimeCurrent);

    DOM.audio.addEventListener('timeupdate', () => {
        if (DOM.audio.duration && !isDragging) {
            const currentTimeStr = UI.formatTime(DOM.audio.currentTime);
            const totalTimeStr = UI.formatTime(DOM.audio.duration);
            const percent = (DOM.audio.currentTime / DOM.audio.duration) * 100;

            if (DOM.timeCurrent) DOM.timeCurrent.innerText = currentTimeStr;
            if (DOM.timeTotal) DOM.timeTotal.innerText = totalTimeStr;
            if (DOM.progressBar) { DOM.progressBar.value = percent; UI.updateSliderProgress(DOM.progressBar, percent); }

            if (fsTimeCurrent) fsTimeCurrent.innerText = currentTimeStr;
            if (fsTimeTotal) fsTimeTotal.innerText = totalTimeStr;
            if (fsProgressBar) { fsProgressBar.value = percent; UI.updateSliderProgress(fsProgressBar, percent); }

            // --- ФІКС: Безперервно запам'ятовуємо прогрес треку у секундах ---
            localStorage.setItem('auraLastPosition', DOM.audio.currentTime);
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
    
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', function() { 
            Player.isShuffle = !Player.isShuffle; 
            this.classList.toggle('active-mode', Player.isShuffle); 
            const currentCard = document.querySelector('.track-card.playing-now');
            if (currentCard) Player.updateQueue(currentCard);
        });
    }

    if (repeatBtn) {
        repeatBtn.addEventListener('click', function() { 
            Player.isRepeat = !Player.isRepeat; 
            this.classList.toggle('active-mode', Player.isRepeat); 
        });
    }

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

    // --- ВІДНОВЛЕНО: 60 FPS Плавний прогрес-бар з оригінального коду ---
    let animationFrameId;
    function smoothProgressBar() {
        if (!DOM.audio.paused && DOM.audio.duration && !isDragging) {
            const percent = (DOM.audio.currentTime / DOM.audio.duration) * 100;
            const currentTimeStr = UI.formatTime(DOM.audio.currentTime);
            
            if (DOM.timeCurrent) DOM.timeCurrent.innerText = currentTimeStr;
            if (DOM.progressBar) { DOM.progressBar.value = percent; UI.updateSliderProgress(DOM.progressBar, percent); }
            
            if (fsTimeCurrent) fsTimeCurrent.innerText = currentTimeStr;
            if (fsProgressBar) { fsProgressBar.value = percent; UI.updateSliderProgress(fsProgressBar, percent); }
            
            localStorage.setItem('auraLastPosition', DOM.audio.currentTime);
        }
        animationFrameId = requestAnimationFrame(smoothProgressBar);
    }

    DOM.audio.addEventListener('play', () => { 
        cancelAnimationFrame(animationFrameId); 
        animationFrameId = requestAnimationFrame(smoothProgressBar); 
    });
    DOM.audio.addEventListener('pause', () => cancelAnimationFrame(animationFrameId));
    
    // timeupdate залишаємо тільки для оновлення загальної тривалості
    DOM.audio.addEventListener('timeupdate', () => {
        if (DOM.audio.duration && DOM.timeTotal) DOM.timeTotal.innerText = UI.formatTime(DOM.audio.duration);
        if (DOM.audio.duration && fsTimeTotal) fsTimeTotal.innerText = UI.formatTime(DOM.audio.duration);
    });
    
    Visualizer.init(); ColorPicker.init();
    window.addEventListener('resize', () => { DND.initDraggableCards(); DND.initDroppablePlaylists(); });
    
    // Завантажуємо базову категорію
    Render.loadCategory('top-100');
    Render.renderSearchHistoryUI(); 

    // --- ФІКС: Відновлюємо останній прослуханий трек та позицію часу після завантаження категорій ---
    setTimeout(() => {
        Player.restoreLastSession();
    }, 300);
});