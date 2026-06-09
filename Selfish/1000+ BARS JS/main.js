// main.js
import { APP_CONFIG, DOM, state } from './config.js';
import { initAudioContext } from './audioCore.js';
import { UI } from './ui.js';
import { Playlists } from './playlists.js';
import { Player } from './player.js';
import { Render } from './render.js';

// Ініціалізація додатку після завантаження DOM
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Налаштування UI (Blur, Колір)
    const savedBlur = localStorage.getItem('auraGlassBlurPercent') || '33';
    UI.applyBlur(savedBlur);
    UI.applyTheme(state.savedColor);

    // 2. Глобальні обробники подій для плеєра
    if (DOM.playBtn) {
        DOM.playBtn.addEventListener('click', () => {
            if (!DOM.audio.src) return;
            
            // Ініціалізуємо аудіо-контекст тільки після взаємодії користувача
            initAudioContext(); 
            
            if (DOM.audio.paused) {
                DOM.audio.play();
                DOM.playIcon.innerText = "pause";
                DOM.vinylCover.classList.add('playing');
            } else {
                DOM.audio.pause();
                DOM.playIcon.innerText = "play_arrow";
                DOM.vinylCover.classList.remove('playing');
            }
        });
    }

    // 3. Обробник прогрес-бару
    if (DOM.progressBar) {
        DOM.progressBar.addEventListener('input', (e) => {
            if (DOM.audio.duration) {
                const newTime = (DOM.audio.duration / 100) * e.target.value;
                DOM.audio.currentTime = newTime;
                DOM.timeCurrent.innerText = UI.formatTime(newTime);
                UI.updateSliderProgress(DOM.progressBar, e.target.value);
            }
        });
    }

    // 4. Оновлення часу під час відтворення
    DOM.audio.addEventListener('timeupdate', () => {
        if (DOM.audio.duration) {
            DOM.timeCurrent.innerText = UI.formatTime(DOM.audio.currentTime);
            DOM.timeTotal.innerText = UI.formatTime(DOM.audio.duration);
            const percent = (DOM.audio.currentTime / DOM.audio.duration) * 100;
            DOM.progressBar.value = percent;
            UI.updateSliderProgress(DOM.progressBar, percent);
        }
    });

    // 5. Навігація по меню
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            const sectionId = link.getAttribute('href').substring(1);
            UI.switchSection(sectionId);
        });
    });

    // 6. Кнопки керування плеєром (Next, Prev, Shuffle, Repeat)
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const repeatBtn = document.getElementById('repeat-btn');

    if (nextBtn) {
        nextBtn.addEventListener('click', () => Player.playNextTrack());
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => Player.playPrevTrack());
    }

    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', function() {
            Player.isShuffle = !Player.isShuffle;
            this.classList.toggle('active-mode', Player.isShuffle);
        });
    }

    if (repeatBtn) {
        repeatBtn.addEventListener('click', function() {
            Player.isRepeat = !Player.isRepeat;
            this.classList.toggle('active-mode', Player.isRepeat);
        });
    }

    // 7. Автоматичне перемикання треку, коли він закінчився
    DOM.audio.addEventListener('ended', () => {
        if (Player.isRepeat && DOM.audio.src) {
            DOM.audio.currentTime = 0;
            DOM.audio.play();
        } else {
            Player.playNextTrack();
        }
    });

    // 8. Обробник пошуку (з затримкою, щоб не спамити API на кожну літеру)
    let searchTimeout;
    if (DOM.searchInput) {
        DOM.searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout); 
            const query = e.target.value.trim();
            const searchResults = document.getElementById('search-results');
            
            if (query.length === 0) { 
                if (searchResults) searchResults.innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1;">Почніть вводити текст...</p>'; 
                return; 
            }
            
            // Чекаємо 1 секунду після того, як користувач перестав друкувати
            searchTimeout = setTimeout(() => {
                Render.performSearch(query);
            }, 1000);
        });
    }

    // 9. Скрол вниз (Нескінченне завантаження карток)
    const mainContentArea = document.querySelector('.main-content');
    if (mainContentArea) {
        mainContentArea.addEventListener('scroll', () => {
            // Якщо до кінця екрана лишилося менше 400px
            if (mainContentArea.scrollTop + mainContentArea.clientHeight >= mainContentArea.scrollHeight - 400) {
                if (document.getElementById('home-section').classList.contains('active-section')) {
                    Render.renderNextChunk('category');
                } else if (document.getElementById('search-section').classList.contains('active-section') && Render.searchState.query) {
                    Render.renderNextChunk('search');
                }
            }
        });
    }

    // Завантажуємо базову категорію при старті
    Render.loadCategory('top-100');
    // TODO: Далі переносимо логіку генерації HTML-карток для треків та Drag & Drop
});