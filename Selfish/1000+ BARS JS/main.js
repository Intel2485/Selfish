// main.js
import { APP_CONFIG, DOM, state } from './config.js';
import { initAudioContext } from './audioCore.js';
import { UI } from './ui.js';
import { Playlists } from './playlists.js';

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

    // TODO: Далі переносимо логіку генерації HTML-карток для треків та Drag & Drop
});