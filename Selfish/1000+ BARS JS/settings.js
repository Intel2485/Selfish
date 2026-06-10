// settings.js
import { state, DOM } from './config.js';
import { UI } from './ui.js';
import { saveBgToDB, getBgFromDB, deleteBgFromDB } from './db.js';
import { setEqGain, audioCtx } from './audioCore.js';
import { Render } from './render.js';
import { Playlists } from './playlists.js';

export const Settings = {
    bgHistoryIds: JSON.parse(localStorage.getItem('auraBgHistoryIds')) || [],
    renderCounter: 0, // Фікс дублювання фонів

    init() {
        this.initVolumeAndBlur();
        this.initFullscreen();
        this.initSource();
        this.initEQ();
        this.initProfile();
        this.initBackgrounds();
        this.initColorModes();
        this.initPlaylistModals();
        this.initTrackActions(); // ДОДАНО: Активація кнопок плеєра
        this.renderRecentTracks();
        
        Playlists.renderPlaylists();
    },

    // --- ВІДНОВЛЕНО: Логіка кнопок "Вподобати" та "В плейлист" ---
    initTrackActions() {
        const likeBtn = document.getElementById('like-btn');
        const likeIcon = document.getElementById('like-icon');
        if (likeBtn) {
            likeBtn.addEventListener('click', () => {
                if (!state.currentTrackData) return;
                const isLiked = Playlists.toggleLike(state.currentTrackData);
                likeIcon.innerText = isLiked ? "favorite" : "favorite_border";
                likeBtn.classList.toggle('liked', isLiked);
                
                if (document.querySelector('#liked-section h1')?.innerText === 'Вподобані треки' && document.getElementById('liked-section').classList.contains('active-section')) {
                    Playlists.openPlaylistSection('Вподобані треки', state.likedTracks);
                }
            });
        }

        const addBtn = document.getElementById('add-to-playlist-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                if (!state.currentTrackData) return alert("Спочатку увімкніть трек!");
                if (state.customPlaylists.length === 0) {
                    alert("У вас ще немає плейлистів. Створіть один!");
                    document.getElementById('create-playlist-btn')?.click();
                    return;
                }
                
                document.getElementById('pl-modal-title').innerText = 'Оберіть плейлист';
                document.getElementById('pl-create-block').style.display = 'none';
                document.getElementById('pl-select-block').style.display = 'block';
                document.getElementById('pl-modal-confirm').style.display = 'none';
                
                const selectBlock = document.getElementById('pl-select-block');
                selectBlock.innerHTML = '';
                state.customPlaylists.forEach(pl => {
                    const btn = document.createElement('button');
                    btn.className = 'cat-btn';
                    btn.style = 'width: 100%; margin-bottom: 8px; text-align: left; display: flex; align-items: center; gap: 10px;';
                    btn.innerHTML = `<span class="material-symbols-rounded">queue_music</span> ${pl}`;
                    btn.onclick = () => {
                        const added = Playlists.addToSpecific(pl, state.currentTrackData);
                        if (added) {
                            UI.showToast(`Додано до "${pl}" 🎵`);
                            document.getElementById('playlist-modal').classList.add('hidden');
                        } else {
                            alert("Цей трек вже є у плейлисті.");
                        }
                    };
                    selectBlock.appendChild(btn);
                });
                document.getElementById('playlist-modal').classList.remove('hidden');
            });
        }
    },

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

    initVolumeAndBlur() {
        const volumeBar = document.getElementById('volume-bar');
        const volumeIcon = document.getElementById('volume-icon');
        if (volumeBar) {
            const savedVol = localStorage.getItem('auraVolume') || 100;
            volumeBar.value = savedVol; DOM.audio.volume = savedVol / 100; UI.updateSliderProgress(volumeBar, savedVol);
            volumeBar.addEventListener('input', (e) => {
                DOM.audio.volume = e.target.value / 100; UI.updateSliderProgress(volumeBar, e.target.value);
                localStorage.setItem('auraVolume', e.target.value);
                if (e.target.value == 0) volumeIcon.innerText = 'volume_off';
                else if (e.target.value <= 30) volumeIcon.innerText = 'volume_mute';
                else if (e.target.value <= 60) volumeIcon.innerText = 'volume_down';
                else volumeIcon.innerText = 'volume_up';
            });
        }
        const blurSlider = document.getElementById('blur-slider');
        if (blurSlider) blurSlider.addEventListener('input', (e) => UI.applyBlur(e.target.value));
    },

    initFullscreen() {
        document.getElementById('open-fullscreen-btn')?.addEventListener('click', () => document.getElementById('fullscreen-player').classList.remove('hidden'));
        document.getElementById('close-fullscreen-btn')?.addEventListener('click', () => document.getElementById('fullscreen-player').classList.add('hidden'));
        
        const fsPlayBtn = document.getElementById('fs-play-btn');
        const fsPlayIcon = document.getElementById('fs-play-icon');
        if (fsPlayBtn) {
            fsPlayBtn.addEventListener('click', () => {
                if (DOM.audio.paused) {
                    DOM.audio.play().catch(e => console.log(e)); // ФІКС AbortError
                    fsPlayIcon.innerText = "pause";
                } else {
                    DOM.audio.pause();
                    fsPlayIcon.innerText = "play_arrow";
                }
            });
        }
    },

    // --- ВІДНОВЛЕНО: Підсвічування джерела ---
    initSource() {
        const syncLabels = () => {
            document.querySelectorAll('input[name="music-source"]').forEach(r => { 
                const lbl = r.closest('.settings-radio-label'); 
                if (lbl) lbl.classList.toggle('checked', r.checked); 
            });
        };
        
        const currentInput = document.getElementById(`source-${state.currentSource}`);
        if (currentInput) currentInput.checked = true;
        syncLabels();

        const radios = document.querySelectorAll('input[name="music-source"]');
        radios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                state.currentSource = e.target.value;
                localStorage.setItem('auraMusicSource', state.currentSource);
                syncLabels();
                
                const activeCat = document.querySelector('.cat-btn.active');
                if (activeCat && window.loadCategory) window.loadCategory(activeCat.innerText === 'Топ-100' ? 'top-100' : activeCat.innerText.toLowerCase());
            });
        });
    },

    // --- ВІДНОВЛЕНО: Пресети еквалайзера ---
    initEQ() {
        const eqToggle = document.getElementById('eq-toggle');
        const eqSliders = document.querySelectorAll('.eq-band');
        const eqSelect = document.getElementById('eq-presets');
        
        const basePresets = { 'flat': [0, 0, 0, 0, 0], 'bass': [6, 4, 0, -2, -2], 'rock': [5, -2, -3, 4, 6], 'vocal': [-4, 2, 6, 4, -2] };
        let customEqPresets = JSON.parse(localStorage.getItem('customEqPresets')) || {};
        
        const renderEqOptions = (selectedValue = 'flat') => {
            if (!eqSelect) return;
            eqSelect.innerHTML = `<option value="flat">Оригінал (Flat)</option><option value="bass">Bass Boost</option><option value="rock">Rock</option><option value="vocal">Vocal Focus</option><option disabled>──────────</option>`;
            Object.keys(customEqPresets).forEach(name => { eqSelect.innerHTML += `<option value="custom_${name}">Власний: ${name}</option>`; });
            eqSelect.innerHTML += `<option value="manual" style="display:none;">Ручне налаштування</option>`;
            setTimeout(() => { eqSelect.value = selectedValue; }, 10);
        };
        renderEqOptions();

        if (eqSelect) {
            eqSelect.addEventListener('change', (e) => {
                const mode = e.target.value;
                let vals = [0,0,0,0,0];
                if (basePresets[mode]) vals = basePresets[mode];
                else if (mode.startsWith('custom_')) vals = customEqPresets[mode.replace('custom_', '')] || [0,0,0,0,0];
                
                eqSliders.forEach((slider, index) => {
                    slider.value = vals[index];
                    if (state.isEqEnabled) setEqGain(index, vals[index]);
                });
            });
        }
        
        if (eqToggle) {
            eqToggle.addEventListener('change', (e) => {
                state.isEqEnabled = e.target.checked;
                document.getElementById('eq-sliders-container').style.opacity = state.isEqEnabled ? '1' : '0.4';
                document.getElementById('eq-sliders-container').style.pointerEvents = state.isEqEnabled ? 'auto' : 'none';
                document.getElementById('eq-status-text').innerText = state.isEqEnabled ? 'Увімкнено' : 'Вимкнено';
                document.getElementById('eq-status-text').style.color = state.isEqEnabled ? 'var(--accent)' : 'var(--text-muted)';
                
                if (audioCtx) eqSliders.forEach((slider, i) => setEqGain(i, state.isEqEnabled ? parseFloat(slider.value) : 0));
            });
        }

        eqSliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                if (eqSelect) eqSelect.value = 'manual';
                setEqGain(e.target.dataset.index, parseFloat(e.target.value));
            });
        });

        document.getElementById('save-eq-btn')?.addEventListener('click', () => {
            const name = document.getElementById('custom-eq-name').value.trim();
            if (!name) return alert('Введіть назву!');
            const vals = Array.from(eqSliders).map(s => parseFloat(s.value));
            customEqPresets[name] = vals;
            localStorage.setItem('customEqPresets', JSON.stringify(customEqPresets));
            renderEqOptions(`custom_${name}`);
            document.getElementById('custom-eq-name').value = '';
            UI.showToast(`Пресет "${name}" збережено!`);
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
                    reader.onload = e => { localStorage.setItem('userAvatar', e.target.result); Settings.setAvatar(e.target.result); }; 
                    reader.readAsDataURL(this.files[0]); 
                }
            });
        }
        document.querySelector('#profile-modal .color-picker-wrapper')?.addEventListener('click', () => avatarUpload?.click());
        if (localStorage.getItem('userAvatar')) this.setAvatar(localStorage.getItem('userAvatar'));
    },

    setAvatar(url) {
        const modalImg = document.getElementById('modal-avatar-img'); const miniImg = document.getElementById('user-avatar-mini');
        if(modalImg) { modalImg.src = url; modalImg.style.display = 'block'; }
        if(miniImg) { miniImg.src = url; miniImg.style.display = 'block'; }
        document.getElementById('modal-avatar-placeholder').style.display = 'none'; document.getElementById('user-icon-mini').style.display = 'none';
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
        if (currentBgId) getBgFromDB(currentBgId).then(data => this.applyBackground(data, currentBgId));
        this.renderBgHistory();
    },

    applyBackground(dataUrl, id = null) {
        if (dataUrl) {
            document.body.style.backgroundImage = `url(${dataUrl})`; document.body.classList.add('has-custom-bg');
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
            document.body.style.backgroundImage = ''; document.body.classList.remove('has-custom-bg'); localStorage.removeItem('currentBgId');
            if (state.colorMode === 'adaptive') UI.applyTheme(state.savedColor);
        }
    },

    // --- ФІКС: Очищення дублікатів фонів ---
    async renderBgHistory() {
        const list = document.getElementById('bg-history-list');
        if (!list) return;

        if (this.bgHistoryIds.length === 0) {
            list.innerHTML = '<p style="font-size: 12px; color: var(--text-muted); font-style: italic;">Тут будуть ваші попередні фони</p>';
            return;
        }

        const currentRender = ++this.renderCounter;
        const seenDataUrls = new Set();
        const uniqueIds = [];
        const fragment = document.createDocumentFragment();

        const idsToRender = [...this.bgHistoryIds];

        for (let id of idsToRender) {
            const dataUrl = await getBgFromDB(id);
            if (!dataUrl) continue;

            if (seenDataUrls.has(dataUrl)) {
                await deleteBgFromDB(id);
                continue;
            }

            seenDataUrls.add(dataUrl);
            uniqueIds.push(id);

            const item = document.createElement('div');
            item.style = "position: relative; display: inline-block; margin-right: 10px; flex-shrink: 0; margin-top: 5px;";
            item.innerHTML = `
                <img src="${dataUrl}" style="width: 70px; height: 45px; border-radius: 8px; object-fit: cover; cursor: pointer; border: 2px solid transparent; transition: 0.2s;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='transparent'">
                <div class="delete-bg-btn" style="position: absolute; top: -6px; right: -6px; background: rgba(0,0,0,0.8); color: white; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px; cursor: pointer; border: 1px solid var(--accent);" onmouseover="this.style.background='var(--accent)'" onmouseout="this.style.background='rgba(0,0,0,0.8)'" title="Видалити">&#10005;</div>
            `;
            item.querySelector('img').onclick = () => this.applyBackground(dataUrl, id);
            item.querySelector('.delete-bg-btn').onclick = (e) => { e.stopPropagation(); window.deleteBg(id); };

            fragment.appendChild(item);
        }

        if (currentRender !== this.renderCounter) return;

        list.innerHTML = '';
        list.appendChild(fragment);

        if (this.bgHistoryIds.length !== uniqueIds.length) {
            this.bgHistoryIds = uniqueIds;
            localStorage.setItem('auraBgHistoryIds', JSON.stringify(this.bgHistoryIds));
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

window.deleteBg = async function (id) {
    await deleteBgFromDB(id); 
    Settings.bgHistoryIds = Settings.bgHistoryIds.filter(i => i !== id); 
    localStorage.setItem('auraBgHistoryIds', JSON.stringify(Settings.bgHistoryIds));
    if (localStorage.getItem('currentBgId') === id) Settings.applyBackground(null); 
    Settings.renderBgHistory();
};