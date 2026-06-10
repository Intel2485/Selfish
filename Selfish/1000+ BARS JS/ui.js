// ui.js
import { DOM, state } from './config.js'; // ДОДАНО: імпорт state для перевірки режиму

export const UI = {
    formatTime(sec) {
        const m = Math.floor(sec / 60); const s = Math.floor(sec % 60); return `${m}:${s < 10 ? '0' : ''}${s}`;
    },

    updateSliderProgress(slider, percent) {
        if (slider) slider.style.setProperty('--progress', `${percent}%`);
    },

    applyTheme(color) {
        const hexToRgba = (hex, alpha) => {
            let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };
        const glow = hexToRgba(color, 0.6);
        document.documentElement.style.setProperty('--accent', color);
        document.documentElement.style.setProperty('--accent-glow', `0 0 15px ${glow}`);
        
        // --- ФІКС: Зберігаємо колір в пам'ять ТІЛЬКИ якщо режим "Постійний" ---
        if (state.colorMode === 'fixed') {
            localStorage.setItem('auraThemeColor', color);
            state.savedColor = color; // Оновлюємо внутрішній стан, щоб він не загубився
        }
    },

    applyBlur(percent) {
        const px = (percent / 100) * 60;
        document.documentElement.style.setProperty('--glass-blur', `${px}px`);
        const blurText = document.getElementById('blur-val-text'); const blurSlider = document.getElementById('blur-slider');
        if (blurText) blurText.innerText = `${percent}%`; if (blurSlider) blurSlider.value = percent;
        localStorage.setItem('auraGlassBlurPercent', percent);
    },

    showToast(message) {
        const toast = $(`<div class="glass" style="position:fixed; top: 30px; left: 50%; transform: translateX(-50%); padding: 12px 25px; border-radius: 30px; background: rgba(0,0,0,0.8); border: 1px solid var(--accent); color: white; z-index: 5000; font-weight: bold; box-shadow: var(--accent-glow);">${message}</div>`);
        $('body').append(toast); toast.hide().slideDown(200).delay(2000).slideUp(200, function () { $(this).remove(); });
    },

    switchSection(sectionId) {
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active-section'));
        const target = document.getElementById(sectionId); if (target) target.classList.add('active-section');
    },

    initResizers() {
        let isResizing = false; let currentResizer = null;
        const leftSidebar = document.getElementById('left-sidebar');
        const rightSidebar = document.getElementById('right-sidebar');

        document.querySelectorAll('.resizer').forEach(resizer => {
            resizer.addEventListener('mousedown', (e) => {
                isResizing = true; currentResizer = resizer; resizer.classList.add('is-resizing');
                document.body.style.cursor = 'col-resize'; e.preventDefault();
            });
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            if (currentResizer.id === 'resizer-left' && leftSidebar) {
                let newWidth = e.clientX - 15;
                if (newWidth > 160 && newWidth < 400) leftSidebar.style.width = newWidth + 'px';
            } else if (currentResizer.id === 'resizer-right' && rightSidebar) {
                let newWidth = window.innerWidth - e.clientX - 15;
                if (newWidth > 200 && newWidth < 500) rightSidebar.style.width = newWidth + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false; document.querySelectorAll('.resizer').forEach(r => r.classList.remove('is-resizing'));
                document.body.style.cursor = 'default';
            }
        });
    }
};