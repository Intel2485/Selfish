// ui.js
import { DOM } from './config.js';

export const UI = {
    // Форматування секунд у хвилини (наприклад, 125 -> 2:05)
    formatTime(sec) {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    },

    // Оновлення заповнення повзунків (гучність, прогрес треку)
    updateSliderProgress(slider, percent) {
        if (slider) slider.style.setProperty('--progress', `${percent}%`);
    },

    // Зміна акцентного кольору додатку
    applyTheme(color) {
        const hexToRgba = (hex, alpha) => {
            let r = parseInt(hex.slice(1, 3), 16), 
                g = parseInt(hex.slice(3, 5), 16), 
                b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };
        const glow = hexToRgba(color, 0.6);
        
        document.documentElement.style.setProperty('--accent', color);
        document.documentElement.style.setProperty('--accent-glow', `0 0 15px ${glow}`);
        localStorage.setItem('auraThemeColor', color);
    },

    // Зміна розмиття (blur) скляних панелей
    applyBlur(percent) {
        const px = (percent / 100) * 60;
        document.documentElement.style.setProperty('--glass-blur', `${px}px`);
        
        const blurText = document.getElementById('blur-val-text');
        const blurSlider = document.getElementById('blur-slider');
        
        if (blurText) blurText.innerText = `${percent}%`;
        if (blurSlider) blurSlider.value = percent;
        
        localStorage.setItem('auraGlassBlurPercent', percent);
    },

    // Відображення спливаючих повідомлень
    showToast(message) {
        const toast = $(`<div class="glass" style="position:fixed; top: 30px; left: 50%; transform: translateX(-50%); padding: 12px 25px; border-radius: 30px; background: rgba(0,0,0,0.8); border: 1px solid var(--accent); color: white; z-index: 5000; font-weight: bold; box-shadow: var(--accent-glow);">${message}</div>`);
        $('body').append(toast); 
        toast.hide().slideDown(200).delay(2000).slideUp(200, function () { $(this).remove(); });
    },

    // Перемикання секцій (Головна, Пошук, Налаштування)
    switchSection(sectionId) {
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active-section'));
        const target = document.getElementById(sectionId);
        if (target) target.classList.add('active-section');
    }
};