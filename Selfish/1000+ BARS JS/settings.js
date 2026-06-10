// settings.js
import { state, DOM } from './config.js';
import { UI } from './ui.js';
import { saveBgToDB, getBgFromDB, deleteBgFromDB } from './db.js'; // ДОДАНО deleteBgFromDB
import { setEqGain, audioCtx } from './audioCore.js';
import { Render } from './render.js';
import { Playlists } from './playlists.js';

export const Settings = {
    bgHistoryIds: JSON.parse(localStorage.getItem('auraBgHistoryIds')) || [],

    init() {
        this.initVolumeAndBlur();
        this.initFullscreen();
        this.initSource();
        this.initEQ();
        this.initProfile();
        this.initBackgrounds();
        this.initColorModes(); // ДОДАНО: Ініціалізація кольорів
        this.initPlaylistModals();
        this.renderRecentTracks();
        
        Playlists.renderPlaylists(); // ДОДАНО: Відмальовуємо меню плейлистів при старті
    },

    // --- ВІДНОВЛЕНО: Логіка перемикання режимів кольору ---
    initColorModes() {
        const radios = document.querySelectorAll('input[name="color-mode"]');
        
        document.querySelectorAll('input[name="color-mode"]').forEach(r => { 
            const lbl = r.closest('.settings-radio-label'); 
            if (lbl) lbl.classList.toggle('checked', r.value === state.colorMode); 
        });

        radios.forEach(radio => {
            radio.addEventListener('change', async (e) => {
                state.colorMode = e.target.value; 
                localStorage.setItem('auraColorMode', state.colorMode); 
                
                document.querySelectorAll('input[name="color-mode"]').forEach(r => { 
                    const lbl = r.closest('.settings-radio-label'); 
                    if (lbl) lbl.classList.toggle('checked', r.checked); 
                });

                if (state.colorMode === 'adaptive') {
                    const currentBgId = localStorage.getItem('currentBgId');
                    if (currentBgId) { 
                        const dataUrl = await getBgFromDB(currentBgId); 
                        this.extractColorFromBg(dataUrl); 
                    }
                } else { 
                    UI.applyTheme(state.savedColor); 
                }
            });
        });
    },

    extractColorFromBg(dataUrl) {
        if (state.colorMode !== 'adaptive' || !dataUrl) return;
        const img = new Image(); img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas'); canvas.width = 1; canvas.height = 1;
            const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, 1, 1);
            const data = ctx.getImageData(0, 0, 1, 1).data;
            let [r, g, b] = [data[0], data[1], data[2]];
            if (r < 70 && g < 70 && b < 70) { r += 80; g += 80; b += 80; }
            const rgbToHex = (r, g, b) => "#" + [r, g, b].map(x => { const hex = x.toString(16); return hex.length === 1 ? "0" + hex : hex; }).join('');
            UI.applyTheme(rgbToHex(r, g, b));
        };
        img.src = dataUrl;
    },
    // ------------------------------------------------------

    initVolumeAndBlur() {
        const volumeBar = document.getElementById('volume-bar');
        const volumeIcon = document.getElementById('volume-icon');
        if (volumeBar) {
            const savedVol = localStorage.getItem('auraVolume') || 100;
            volumeBar.value = savedVol;
            DOM.audio.volume = savedVol / 100;
            UI.updateSliderProgress(volumeBar, savedVol);

            volumeBar.addEventListener('input', (e) => {
                DOM.audio.volume = e.target.value / 100;
                UI.updateSliderProgress(volumeBar, e.target.value);
                localStorage.setItem('auraVolume', e.target.value);
                if (e.target.value == 0) volumeIcon.innerText = 'volume_off';
                else if (e.target.value <= 30) volumeIcon.innerText = 'volume_mute';
                else if (e.target.value <= 60) volumeIcon.innerText = 'volume_down';
                else volumeIcon.innerText = 'volume_up';
            });
        }

        const blurSlider = document.getElementById('blur-slider');
        if (blurSlider) {
            blurSlider.addEventListener('input', (e) => UI.applyBlur(e.target.value));
        }
    },

    initFullscreen() {
        document.getElementById('open-fullscreen-btn')?.addEventListener('click', () => {
            document.getElementById('fullscreen-player').classList.remove('hidden');
        });
        document.getElementById('close-fullscreen-btn')?.addEventListener('click', () => {
            document.getElementById('fullscreen-player').classList.add('hidden');
        });
        
        const fsPlayBtn = document.getElementById('fs-play-btn');
        const fsPlayIcon = document.getElementById('fs-play-icon');
        if (fsPlayBtn) {
            fsPlayBtn.addEventListener('click', () => {
                if (DOM.audio.paused) {
                    DOM.audio.play();
                    fsPlayIcon.innerText = "pause";
                } else {
                    DOM.audio.pause();
                    fsPlayIcon.innerText = "play_arrow";
                }
            });
        }
    },

    initSource() {
        const radios = document.querySelectorAll('input[name="music-source"]');
        radios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                state.currentSource = e.target.value;
                localStorage.setItem('auraMusicSource', state.currentSource);
                
                document.querySelectorAll('input[name="music-source"]').forEach(r => { 
                    const lbl = r.closest('.settings-radio-label'); 
                    if (lbl) lbl.classList.toggle('checked', r.checked); 
                });
                
                const activeCat = document.querySelector('.cat-btn.active');
                if (activeCat) Render.loadCategory(activeCat.innerText === 'Топ-100' ? 'top-100' : activeCat.innerText.toLowerCase());
            });
        });
    },

    initEQ() {
        const eqToggle = document.getElementById('eq-toggle');
        const eqSliders = document.querySelectorAll('.eq-band');
        
        if (eqToggle) {
            eqToggle.addEventListener('change', (e) => {
                state.isEqEnabled = e.target.checked;
                document.getElementById('eq-sliders-container').style.opacity = state.isEqEnabled ? '1' : '0.4';
                document.getElementById('eq-sliders-container').style.pointerEvents = state.isEqEnabled ? 'auto' : 'none';
                document.getElementById('eq-status-text').innerText = state.isEqEnabled ? 'Увімкнено' : 'Вимкнено';
                document.getElementById('eq-status-text').style.color = state.isEqEnabled ? 'var(--accent)' : 'var(--text-muted)';
                
                if (audioCtx) {
                    eqSliders.forEach((slider, i) => setEqGain(i, state.isEqEnabled ? parseFloat(slider.value) : 0));
                }
            });
        }

        eqSliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                setEqGain(e.target.dataset.index, parseFloat(e.target.value));
            });
        });

        document.getElementById('open-eq-btn')?.addEventListener('click', () => document.getElementById('eq-modal').classList.remove('hidden'));
        document.getElementById('close-eq-btn')?.addEventListener('click', () => document.getElementById('eq-modal').classList.add('hidden'));
    },

    initProfile() {
        const profileModal = document.getElementById('profile-modal');
        document.getElementById('user-profile-btn')?.addEventListener('click', () => profileModal.classList.remove('hidden'));
        document.getElementById('close-profile-btn')?.addEventListener('click', () => profileModal.classList.add('hidden'));

        const avatarUpload = document.getElementById('avatar-upload');
        if (avatarUpload) {
            avatarUpload.addEventListener('change', function () {
                if (this.files[0]) { 
                    const reader = new FileReader(); 
                    reader.onload = e => { 
                        localStorage.setItem('userAvatar', e.target.result); 
                        Settings.setAvatar(e.target.result);
                    }; 
                    reader.readAsDataURL(this.files[0]); 
                }
            });
        }
        
        document.querySelector('#profile-modal .color-picker-wrapper')?.addEventListener('click', () => avatarUpload?.click());
        
        const savedAvatar = localStorage.getItem('userAvatar');
        if (savedAvatar) this.setAvatar(savedAvatar);
    },

    setAvatar(url) {
        const modalImg = document.getElementById('modal-avatar-img');
        const miniImg = document.getElementById('user-avatar-mini');
        if(modalImg) { modalImg.src = url; modalImg.style.display = 'block'; }
        if(miniImg) { miniImg.src = url; miniImg.style.display = 'block'; }
        document.getElementById('modal-avatar-placeholder').style.display = 'none'; 
        document.getElementById('user-icon-mini').style.display = 'none';
    },

    initBackgrounds() {
        const bgUpload = document.getElementById('bg-upload');
        if (bgUpload) {
            bgUpload.addEventListener('change', function () {
                const file = this.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = async function (e) {
                        const dataUrl = e.target.result;
                        const newId = "bg_" + Date.now();
                        await saveBgToDB(newId, dataUrl);
                        Settings.applyBackground(dataUrl, newId);
                    }
                    reader.readAsDataURL(file);
                }
            });
        }

        document.getElementById('bg-reset')?.addEventListener('click', () => this.applyBackground(null));

        const currentBgId = localStorage.getItem('currentBgId');
        if (currentBgId) {
            getBgFromDB(currentBgId).then(data => this.applyBackground(data, currentBgId));
        }
        
        this.renderBgHistory(); // Оновлюємо історію
    },

    applyBackground(dataUrl, id = null) {
        if (dataUrl) {
            document.body.style.backgroundImage = `url(${dataUrl})`; 
            document.body.classList.add('has-custom-bg');
            if (state.colorMode === 'adaptive') this.extractColorFromBg(dataUrl);
            
            if (id) {
                localStorage.setItem('currentBgId', id); 
                this.bgHistoryIds = this.bgHistoryIds.filter(i => i !== id); 
                this.bgHistoryIds.unshift(id);
                if (this.bgHistoryIds.length > 10) this.bgHistoryIds.pop(); 
                localStorage.setItem('auraBgHistoryIds', JSON.stringify(this.bgHistoryIds)); 
                this.renderBgHistory();
            }
        } else {
            document.body.style.backgroundImage = ''; 
            document.body.classList.remove('has-custom-bg'); 
            localStorage.removeItem('currentBgId');
            if (state.colorMode === 'adaptive') UI.applyTheme(state.savedColor);
        }
    },

    // --- ВІДНОВЛЕНО: Відмальовування історії фонів ---
    async renderBgHistory() {
        const list = document.getElementById('bg-history-list');
        if (!list) return;

        if (this.bgHistoryIds.length === 0) {
            list.innerHTML = '<p style="font-size: 12px; color: var(--text-muted); font-style: italic;">Тут будуть ваші попередні фони</p>';
            return;
        }

        list.innerHTML = '';
        for (let id of this.bgHistoryIds) {
            const dataUrl = await getBgFromDB(id);
            if (!dataUrl) continue;

            const item = document.createElement('div');
            item.style = "position: relative; display: inline-block; margin-right: 10px; flex-shrink: 0; margin-top: 5px;";
            item.innerHTML = `
                <img src="${dataUrl}" style="width: 70px; height: 45px; border-radius: 8px; object-fit: cover; cursor: pointer; border: 2px solid transparent; transition: 0.2s;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='transparent'">
                <div class="delete-bg-btn" style="position: absolute; top: -6px; right: -6px; background: rgba(0,0,0,0.8); color: white; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px; cursor: pointer; border: 1px solid var(--accent);" onmouseover="this.style.background='var(--accent)'" onmouseout="this.style.background='rgba(0,0,0,0.8)'" title="Видалити">&#10005;</div>
            `;
            item.querySelector('img').onclick = () => this.applyBackground(dataUrl, id);
            item.querySelector('.delete-bg-btn').onclick = (e) => { e.stopPropagation(); window.deleteBg(id); };

            list.appendChild(item);
        }
    },

    initPlaylistModals() {
        const plModal = document.getElementById('playlist-modal');
        document.getElementById('create-playlist-btn')?.addEventListener('click', () => {
            document.getElementById('pl-modal-title').innerText = 'Створити плейлист';
            document.getElementById('pl-create-block').style.display = 'block';
            document.getElementById('pl-select-block').style.display = 'none';
            document.getElementById('pl-modal-confirm').style.display = 'block';
            plModal.classList.remove('hidden');
        });
        document.getElementById('pl-modal-cancel')?.addEventListener('click', () => plModal.classList.add('hidden'));
        
        document.getElementById('pl-modal-confirm')?.addEventListener('click', () => {
            const name = document.getElementById('pl-modal-input').value.trim();
            const res = Playlists.saveNew(name);
            if (res.success) {
                UI.showToast(res.msg);
                plModal.classList.add('hidden');
                document.getElementById('pl-modal-input').value = '';
            } else {
                alert(res.msg);
            }
        });
    },

    renderRecentTracks() {
        const container = document.getElementById('recent-list'); 
        if (!container) return; 
        container.innerHTML = '';
        if (state.recentlyPlayed.length === 0) { 
            container.innerHTML = '<p style="font-size: 12px; color: var(--text-muted);">Поки порожньо</p>'; 
            return; 
        }
        state.recentlyPlayed.forEach(track => {
            const sourceLabel = track.url.includes('audius') ? '<span style="color: #b026ff; font-weight: bold; margin-right: 5px;">Audius</span>' : '<span style="color: #ff2626; font-weight: bold; margin-right: 5px;">iTunes</span>';
            container.innerHTML += `
                <div style="display: flex; align-items: center; gap: 10px; font-size: 12px; cursor: pointer; padding: 4px; border-radius: 6px; transition: 0.2s;" 
                     onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'" 
                     onclick="window.playTrack('${track.url}', '${track.title.replace(/'/g, "\\'")}', '${track.artist.replace(/'/g, "\\'")}', '${track.cover}', '${track.id}')">
                    <img src="${track.cover}" style="width: 32px; height: 32px; border-radius: 4px; object-fit: cover;">
                    <div style="overflow: hidden; white-space: nowrap; width: 100%; text-align: left;">
                        <div style="font-weight: bold; text-overflow: ellipsis; overflow: hidden;">${track.title}</div>
                        <div style="color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; display: flex; align-items: center;">${sourceLabel} ${track.artist}</div>
                    </div>
                </div>`;
        });
    }
};

window.renderRecentTracks = () => Settings.renderRecentTracks();

// ДОДАНО: Глобальна функція для видалення фону з історії
window.deleteBg = async function (id) {
    await deleteBgFromDB(id); 
    Settings.bgHistoryIds = Settings.bgHistoryIds.filter(i => i !== id); 
    localStorage.setItem('auraBgHistoryIds', JSON.stringify(Settings.bgHistoryIds));
    if (localStorage.getItem('currentBgId') === id) Settings.applyBackground(null); 
    Settings.renderBgHistory();
};