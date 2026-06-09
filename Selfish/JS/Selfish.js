// ==========================================
// 1. БАЗОВІ НАЛАШТУВАННЯ ТА INDEXED DB
// ==========================================
const audio = new Audio();
audio.crossOrigin = "anonymous";
let currentTrackData = null;

const appName = "SelfishMusicRGR";

const playBtn = document.getElementById('play-btn');
const playIcon = document.getElementById('play-icon');
const progressBar = document.getElementById('progress-bar');
const volumeBar = document.getElementById('volume-bar');
const timeCurrent = document.getElementById('time-current');
const timeTotal = document.getElementById('time-total');
const vinylCover = document.getElementById('vinyl-cover');
const searchInput = document.getElementById('search-input');

const dbName = "SelfishMusicDB";
const storeName = "backgrounds";

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName, { keyPath: "id" });
        };
        request.onsuccess = e => resolve(e.target.result);
        request.onerror = e => reject(e.target.error);
    });
}

async function saveBgToDB(id, dataUrl) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readwrite");
        transaction.objectStore(storeName).put({ id, dataUrl });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

async function getBgFromDB(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readonly");
        const request = transaction.objectStore(storeName).get(id);
        request.onsuccess = () => resolve(request.result ? request.result.dataUrl : null);
        request.onerror = () => reject(request.error);
    });
}

async function deleteBgFromDB(id) {
    const db = await openDB();
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).delete(id);
}

// ==========================================
// 2. КАСТОМІЗАЦІЯ (БЛЮР %, КОЛІР, ПАЛІТРА)
// ==========================================
const blurSlider = document.getElementById('blur-slider');
const blurValText = document.getElementById('blur-val-text');
const savedBlurPercent = localStorage.getItem('auraGlassBlurPercent') || '33';

function applyBlur(percent) {
    const px = (percent / 100) * 60;
    document.documentElement.style.setProperty('--glass-blur', `${px}px`);
    if (blurValText) blurValText.innerText = `${percent}%`;
    if (blurSlider) blurSlider.value = percent;
    localStorage.setItem('auraGlassBlurPercent', percent);
}
applyBlur(savedBlurPercent);
if (blurSlider) blurSlider.addEventListener('input', (e) => applyBlur(e.target.value));

let savedColor = localStorage.getItem('auraThemeColor') || '#b026ff';
let colorMode = localStorage.getItem('auraColorMode') || 'fixed';

if (document.querySelector(`input[name="color-mode"][value="${colorMode}"]`)) {
    document.querySelector(`input[name="color-mode"][value="${colorMode}"]`).checked = true;
}

function hexToRgba(hex, alpha) {
    let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyTheme(color) {
    const glow = hexToRgba(color, 0.6);
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--accent-glow', `0 0 15px ${glow}`);
    localStorage.setItem('auraThemeColor', color);
}

const openColorPickerBtn = document.getElementById('open-color-picker');
function updateColorPickerUI() {
    if (openColorPickerBtn) {
        if (colorMode === 'adaptive') {
            openColorPickerBtn.style.opacity = '0.3'; openColorPickerBtn.style.pointerEvents = 'none';
        } else {
            openColorPickerBtn.style.opacity = '1'; openColorPickerBtn.style.pointerEvents = 'auto';
        }
    }
}

function extractColorFromBg(dataUrl) {
    if (colorMode !== 'adaptive' || !dataUrl) return;
    const img = new Image(); img.crossOrigin = "Anonymous";
    img.onload = function () {
        const canvas = document.createElement('canvas'); canvas.width = 1; canvas.height = 1;
        const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, 1, 1);
        const data = ctx.getImageData(0, 0, 1, 1).data;
        let [r, g, b] = [data[0], data[1], data[2]];
        if (r < 70 && g < 70 && b < 70) { r += 80; g += 80; b += 80; }
        const rgbToHex = (r, g, b) => "#" + [r, g, b].map(x => { const hex = x.toString(16); return hex.length === 1 ? "0" + hex : hex; }).join('');
        applyTheme(rgbToHex(r, g, b));
    };
    img.src = dataUrl;
}

document.querySelectorAll('input[name="color-mode"]').forEach(radio => {
    radio.addEventListener('change', async (e) => {
        colorMode = e.target.value; localStorage.setItem('auraColorMode', colorMode); updateColorPickerUI();
        if (colorMode === 'adaptive') {
            const currentBgId = localStorage.getItem('currentBgId');
            if (currentBgId) { const dataUrl = await getBgFromDB(currentBgId); extractColorFromBg(dataUrl); }
        } else { applyTheme(savedColor); }
        syncRadioLabels();
    });
});

function syncRadioLabels() {
    document.querySelectorAll('input[name="color-mode"]').forEach(r => { const lbl = r.closest('.settings-radio-label'); if (lbl) lbl.classList.toggle('checked', r.checked); });
    document.querySelectorAll('input[name="music-source"]').forEach(r => { const lbl = r.closest('.settings-radio-label'); if (lbl) lbl.classList.toggle('checked', r.checked); });
}

// --- CANVAS КОЛЬОРОВА ПАЛІТРА ---
const customColorModal = document.getElementById('custom-color-modal');
const colorCanvas = document.getElementById('color-canvas');
let colorCtx = null;
const colorPreview = document.getElementById('color-preview');
const hexInput = document.getElementById('hex-color-input');
const applyColorBtn = document.getElementById('apply-color-btn');

function drawColorCanvas() {
    if (!colorCanvas) return;
    if (!colorCtx) colorCtx = colorCanvas.getContext('2d', { willReadFrequently: true });
    let gradient = colorCtx.createLinearGradient(0, 0, colorCanvas.width, 0);
    gradient.addColorStop(0, "rgb(255, 0, 0)"); gradient.addColorStop(0.15, "rgb(255, 0, 255)"); gradient.addColorStop(0.33, "rgb(0, 0, 255)"); gradient.addColorStop(0.49, "rgb(0, 255, 255)"); gradient.addColorStop(0.67, "rgb(0, 255, 0)"); gradient.addColorStop(0.84, "rgb(255, 255, 0)"); gradient.addColorStop(1, "rgb(255, 0, 0)");
    colorCtx.fillStyle = gradient; colorCtx.fillRect(0, 0, colorCanvas.width, colorCanvas.height);
    let bwGradient = colorCtx.createLinearGradient(0, 0, 0, colorCanvas.height);
    bwGradient.addColorStop(0, "rgba(255, 255, 255, 1)"); bwGradient.addColorStop(0.5, "rgba(255, 255, 255, 0)"); bwGradient.addColorStop(0.5, "rgba(0, 0, 0, 0)"); bwGradient.addColorStop(1, "rgba(0, 0, 0, 1)");
    colorCtx.fillStyle = bwGradient; colorCtx.fillRect(0, 0, colorCanvas.width, colorCanvas.height);
}

let isSelectingColor = false;
function pickColor(e) {
    if (!colorCtx) return;
    const rect = colorCanvas.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top;
    if (x < 0 || x >= rect.width || y < 0 || y >= rect.height) return;
    const scaleX = colorCanvas.width / rect.width; const scaleY = colorCanvas.height / rect.height;
    const pixelData = colorCtx.getImageData(x * scaleX, y * scaleY, 1, 1).data;
    const hex = "#" + [pixelData[0], pixelData[1], pixelData[2]].map(val => val.toString(16).padStart(2, '0')).join('');
    colorPreview.style.background = hex; colorPreview.style.boxShadow = `0 0 15px ${hex}`; hexInput.value = hex;
}

if (openColorPickerBtn) {
    openColorPickerBtn.addEventListener('click', () => {
        customColorModal.classList.remove('hidden'); setTimeout(drawColorCanvas, 50);
        colorPreview.style.background = savedColor; colorPreview.style.boxShadow = `0 0 15px ${savedColor}`; hexInput.value = savedColor;
    });
}
if (document.getElementById('close-color-btn')) document.getElementById('close-color-btn').addEventListener('click', () => customColorModal.classList.add('hidden'));
if (colorCanvas) {
    colorCanvas.addEventListener('mousedown', (e) => { isSelectingColor = true; pickColor(e); });
    colorCanvas.addEventListener('mousemove', (e) => { if (isSelectingColor) pickColor(e); });
    window.addEventListener('mouseup', () => { isSelectingColor = false; });
}
if (applyColorBtn) {
    applyColorBtn.addEventListener('click', () => {
        document.querySelector('input[name="color-mode"][value="fixed"]').checked = true;
        colorMode = 'fixed'; localStorage.setItem('auraColorMode', 'fixed');
        savedColor = hexInput.value; applyTheme(savedColor);
        syncRadioLabels(); updateColorPickerUI(); customColorModal.classList.add('hidden');
    });
}
if (hexInput) {
    hexInput.addEventListener('input', (e) => {
        let val = e.target.value;
        if (val.startsWith('#') && (val.length === 4 || val.length === 7)) { colorPreview.style.background = val; colorPreview.style.boxShadow = `0 0 15px ${val}`; }
    });
}

// ==========================================
// 3. ФОНИ ТА ІСТОРІЯ (INDEXED DB)
// ==========================================
const currentBgId = localStorage.getItem('currentBgId');
let bgHistoryIds = JSON.parse(localStorage.getItem('auraBgHistoryIds')) || [];

// Додаємо лічильник рендерів для уникнення стану гонитви (Race Condition)
let renderCounter = 0;

async function renderBgHistory() {
    const list = document.getElementById('bg-history-list');
    if (!list) return;

    if (bgHistoryIds.length === 0) {
        list.innerHTML = '<p style="font-size: 12px; color: var(--text-muted); font-style: italic;">Тут будуть ваші попередні фони</p>';
        return;
    }

    const currentRender = ++renderCounter; // Унікальний номер поточного виклику
    const seenDataUrls = new Set();
    const uniqueIds = [];

    // Створюємо фрагмент (невидимий контейнер), щоб додати все в DOM за 1 раз і без лагів
    const fragment = document.createDocumentFragment();

    // Працюємо з копією масиву, щоб уникнути конфліктів, якщо користувач швидко клікає
    const idsToRender = [...bgHistoryIds];

    for (let id of idsToRender) {
        const dataUrl = await getBgFromDB(id);
        if (!dataUrl) continue;

        // Якщо така картинка вже є у фрагменті — це дублікат, знищуємо його
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
        item.querySelector('img').onclick = () => applyBackground(dataUrl, id);
        item.querySelector('.delete-bg-btn').onclick = (e) => { e.stopPropagation(); deleteBg(id); };

        fragment.appendChild(item);
    }

    // НАЙГОЛОВНІШЕ: Якщо поки ми діставали картинки з БД, функцію викликали ще раз - скасовуємо цей старий рендер!
    if (currentRender !== renderCounter) return;

    // Оновлюємо DOM синхронно і тільки 1 раз. Більше ніяких візуальних дублікатів!
    list.innerHTML = '';
    list.appendChild(fragment);

    // Оновлюємо масив у пам'яті, якщо знайшли і видалили сміття
    if (bgHistoryIds.length !== uniqueIds.length) {
        bgHistoryIds = uniqueIds;
        localStorage.setItem('auraBgHistoryIds', JSON.stringify(bgHistoryIds));
    }
}

async function applyBackground(dataUrl, id = null) {
    if (dataUrl) {
        document.body.style.backgroundImage = `url(${dataUrl})`; document.body.classList.add('has-custom-bg');
        if (colorMode === 'adaptive') extractColorFromBg(dataUrl);
        if (id) {
            localStorage.setItem('currentBgId', id); bgHistoryIds = bgHistoryIds.filter(i => i !== id); bgHistoryIds.unshift(id);
            if (bgHistoryIds.length > 10) bgHistoryIds.pop(); localStorage.setItem('auraBgHistoryIds', JSON.stringify(bgHistoryIds)); renderBgHistory();
        }
    } else {
        document.body.style.backgroundImage = ''; document.body.classList.remove('has-custom-bg'); localStorage.removeItem('currentBgId');
        if (colorMode === 'adaptive') applyTheme(savedColor);
    }
}

if (currentBgId) { getBgFromDB(currentBgId).then(data => applyBackground(data, currentBgId)); }
renderBgHistory();

window.deleteBg = async function (id) {
    await deleteBgFromDB(id); bgHistoryIds = bgHistoryIds.filter(i => i !== id); localStorage.setItem('auraBgHistoryIds', JSON.stringify(bgHistoryIds));
    if (localStorage.getItem('currentBgId') === id) applyBackground(null); renderBgHistory();
};

const bgUpload = document.getElementById('bg-upload');
if (bgUpload) bgUpload.addEventListener('change', function () {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async function (e) {
            const dataUrl = e.target.result;

            // Перевіряємо, чи немає вже такого фону в історії
            let isDuplicate = false;
            for (let id of bgHistoryIds) {
                const existingData = await getBgFromDB(id);
                if (existingData === dataUrl) {
                    applyBackground(existingData, id); // Застосовуємо існуючий
                    isDuplicate = true;
                    break;
                }
            }

            // Якщо це дійсно новий фон, зберігаємо його
            if (!isDuplicate) {
                const newId = "bg_" + Date.now();
                await saveBgToDB(newId, dataUrl);
                applyBackground(dataUrl, newId);
            }
        }
        reader.readAsDataURL(file);
    }
});
if (document.getElementById('bg-reset')) document.getElementById('bg-reset').addEventListener('click', () => { applyBackground(null); });

// ==========================================
// 4. ДЖЕРЕЛО ТА ЕКВАЛАЙЗЕР
// ==========================================
const sourceRadios = document.querySelectorAll('input[name="music-source"]');
let currentSource = localStorage.getItem('auraMusicSource') || 'audius';
if (document.getElementById(`source-${currentSource}`)) document.getElementById(`source-${currentSource}`).checked = true;

sourceRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        currentSource = e.target.value; localStorage.setItem('auraMusicSource', currentSource); syncRadioLabels();
        const activeCat = document.querySelector('.cat-btn.active');
        if (activeCat) { loadCategory(activeCat.innerText === 'Топ-100' ? 'top-100' : activeCat.innerText.toLowerCase()); }
    });
});

let audioCtx, eqBands = [], isEqEnabled = false, analyser;

function initAudioContext() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;

    const source = audioCtx.createMediaElementSource(audio);
    [60, 230, 910, 3600, 14000].forEach(freq => {
        let filter = audioCtx.createBiquadFilter();
        filter.type = 'peaking'; filter.frequency.value = freq; filter.Q.value = 1.4; filter.gain.value = 0;
        eqBands.push(filter);
    });

    source.connect(eqBands[0]); eqBands[0].connect(eqBands[1]); eqBands[1].connect(eqBands[2]); eqBands[2].connect(eqBands[3]); eqBands[3].connect(eqBands[4]); eqBands[4].connect(analyser); analyser.connect(audioCtx.destination);
}

const basePresets = { 'flat': [0, 0, 0, 0, 0], 'bass': [6, 4, 0, -2, -2], 'rock': [5, -2, -3, 4, 6], 'vocal': [-4, 2, 6, 4, -2] };
let customEqPresets = JSON.parse(localStorage.getItem('customEqPresets')) || {};
let currentEqValues = [0, 0, 0, 0, 0];
const eqSelect = document.getElementById('eq-presets');
const eqSliders = document.querySelectorAll('.eq-band');

function renderEqOptions(selectedValue = 'flat') {
    if (!eqSelect) return;
    eqSelect.innerHTML = `<option value="flat">Оригінал (Flat)</option><option value="bass">Bass Boost</option><option value="rock">Rock</option><option value="vocal">Vocal Focus</option><option disabled>──────────</option>`;
    Object.keys(customEqPresets).forEach(name => { eqSelect.innerHTML += `<option value="custom_${name}">Власний: ${name}</option>`; });
    eqSelect.innerHTML += `<option value="manual" style="display:none;">Ручне налаштування</option>`;
    setTimeout(() => { eqSelect.value = selectedValue; }, 10);
}
renderEqOptions();

function applyEqValues(values) {
    currentEqValues = [...values];
    eqSliders.forEach((slider, index) => {
        slider.value = values[index];
        if (isEqEnabled && audioCtx) eqBands[index].gain.value = values[index];
    });
}

if (eqSelect) eqSelect.addEventListener('change', (e) => {
    const mode = e.target.value;
    if (basePresets[mode]) applyEqValues(basePresets[mode]);
    else if (mode.startsWith('custom_')) applyEqValues(customEqPresets[mode.replace('custom_', '')]);
});

eqSliders.forEach(slider => {
    slider.addEventListener('input', (e) => {
        if (eqSelect) eqSelect.value = 'manual';
        currentEqValues[e.target.dataset.index] = parseFloat(e.target.value);
        if (isEqEnabled && audioCtx) eqBands[e.target.dataset.index].gain.value = parseFloat(e.target.value);
    });
});

if (document.getElementById('save-eq-btn')) document.getElementById('save-eq-btn').addEventListener('click', () => {
    const name = document.getElementById('custom-eq-name').value.trim(); if (!name) return alert('Введіть назву!');
    customEqPresets[name] = [...currentEqValues]; localStorage.setItem('customEqPresets', JSON.stringify(customEqPresets));
    renderEqOptions(`custom_${name}`); document.getElementById('custom-eq-name').value = ''; showToast(`Пресет "${name}" збережено!`);
});

const eqToggle = document.getElementById('eq-toggle');
if (eqToggle) {
    eqToggle.addEventListener('change', (e) => {
        isEqEnabled = e.target.checked;
        document.getElementById('eq-sliders-container').style.opacity = isEqEnabled ? '1' : '0.4';
        document.getElementById('eq-sliders-container').style.pointerEvents = isEqEnabled ? 'auto' : 'none';
        document.getElementById('eq-status-text').innerText = isEqEnabled ? 'Увімкнено' : 'Вимкнено';
        document.getElementById('eq-status-text').style.color = isEqEnabled ? 'var(--accent)' : 'var(--text-muted)';

        const eqBtnIcon = document.querySelector('#open-eq-btn .material-symbols-rounded');
        if (eqBtnIcon) {
            eqBtnIcon.style.color = isEqEnabled ? 'var(--accent)' : 'var(--text-muted)';
            eqBtnIcon.style.textShadow = isEqEnabled ? 'var(--accent-glow)' : 'none';
        }
        if (audioCtx) eqSliders.forEach((slider, i) => eqBands[i].gain.value = isEqEnabled ? parseFloat(slider.value) : 0);
    });
}

if (document.getElementById('open-eq-btn')) document.getElementById('open-eq-btn').addEventListener('click', () => document.getElementById('eq-modal').classList.remove('hidden'));
if (document.getElementById('close-eq-btn')) document.getElementById('close-eq-btn').addEventListener('click', () => document.getElementById('eq-modal').classList.add('hidden'));

// ==========================================
// 5. ПЛЕЄР, ПОВЗУНОК ТА ПАМ'ЯТЬ
// ==========================================
function togglePlay() {
    if (!audio.src) return; initAudioContext();
    if (audio.paused) { if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); audio.play(); playIcon.innerText = "pause"; vinylCover.classList.add('playing'); }
    else { audio.pause(); playIcon.innerText = "play_arrow"; vinylCover.classList.remove('playing'); }
}
if (playBtn) playBtn.addEventListener('click', togglePlay);

function formatTime(sec) { const m = Math.floor(sec / 60); const s = Math.floor(sec % 60); return `${m}:${s < 10 ? '0' : ''}${s}`; }
function updateSliderProgress(slider, percent) { slider.style.setProperty('--progress', `${percent}%`); }

const savedVolume = localStorage.getItem('auraVolume') !== null ? localStorage.getItem('auraVolume') : 100;
if (volumeBar) {
    volumeBar.value = savedVolume; audio.volume = savedVolume / 100; updateSliderProgress(volumeBar, savedVolume);
    const vI = document.getElementById('volume-icon');
    if (savedVolume == 0) vI.innerText = 'volume_off'; else if (savedVolume <= 30) vI.innerText = 'volume_mute'; else if (savedVolume <= 60) vI.innerText = 'volume_down'; else vI.innerText = 'volume_up';
}

if (volumeBar) volumeBar.addEventListener('input', (e) => {
    audio.volume = e.target.value / 100; updateSliderProgress(volumeBar, e.target.value);
    localStorage.setItem('auraVolume', e.target.value);
    const vI = document.getElementById('volume-icon');
    if (e.target.value == 0) vI.innerText = 'volume_off'; else if (e.target.value <= 30) vI.innerText = 'volume_mute'; else if (e.target.value <= 60) vI.innerText = 'volume_down'; else vI.innerText = 'volume_up';
});

let animationFrameId;
let isDraggingProgressBar = false;

if (progressBar) {
    progressBar.addEventListener('mousedown', () => isDraggingProgressBar = true);
    progressBar.addEventListener('touchstart', () => isDraggingProgressBar = true);
    progressBar.addEventListener('mouseup', () => isDraggingProgressBar = false);
    progressBar.addEventListener('touchend', () => isDraggingProgressBar = false);
}

function smoothProgressBar() {
    if (!audio.paused && audio.duration && !isDraggingProgressBar) {
        const percent = (audio.currentTime / audio.duration) * 100;
        progressBar.value = percent; updateSliderProgress(progressBar, percent);
    }
    animationFrameId = requestAnimationFrame(smoothProgressBar);
}

audio.addEventListener('play', () => { cancelAnimationFrame(animationFrameId); animationFrameId = requestAnimationFrame(smoothProgressBar); });
audio.addEventListener('pause', () => cancelAnimationFrame(animationFrameId));
audio.addEventListener('timeupdate', () => {
    if (audio.duration && !isDraggingProgressBar) { timeCurrent.innerText = formatTime(audio.currentTime); timeTotal.innerText = formatTime(audio.duration); }
});

if (progressBar) progressBar.addEventListener('input', (e) => {
    if (audio.duration) { const newTime = (audio.duration / 100) * e.target.value; audio.currentTime = newTime; timeCurrent.innerText = formatTime(newTime); updateSliderProgress(progressBar, e.target.value); }
});

let isShuffle = false, isRepeat = false;
document.getElementById('shuffle-btn').addEventListener('click', function () { isShuffle = !isShuffle; this.classList.toggle('active-mode', isShuffle); });
document.getElementById('repeat-btn').addEventListener('click', function () { isRepeat = !isRepeat; this.classList.toggle('active-mode', isRepeat); });

function playNextTrack() {
    const currentCard = document.querySelector('.track-card.playing-now'); if (!currentCard) return;
    const allCards = Array.from(currentCard.parentElement.querySelectorAll('.track-card'));
    if (isShuffle && allCards.length > 1) {
        let rc = allCards[Math.floor(Math.random() * allCards.length)]; while (rc === currentCard) rc = allCards[Math.floor(Math.random() * allCards.length)]; rc.click(); return;
    }
    if (currentCard.nextElementSibling && currentCard.nextElementSibling.classList.contains('track-card')) currentCard.nextElementSibling.click();
    else { playIcon.innerText = "play_arrow"; vinylCover.classList.remove('playing'); progressBar.value = 0; updateSliderProgress(progressBar, 0); }
}
function playPrevTrack() { const currentCard = document.querySelector('.track-card.playing-now'); if (currentCard && currentCard.previousElementSibling) currentCard.previousElementSibling.click(); }

document.getElementById('next-btn').addEventListener('click', playNextTrack);
document.getElementById('prev-btn').addEventListener('click', playPrevTrack);
audio.addEventListener('ended', () => { if (isRepeat && audio.src) { audio.currentTime = 0; audio.play(); } else playNextTrack(); });

// ==========================================
// 6. ЗАПУСК ТРЕКУ, ІСТОРІЯ ТА ПРОФІЛЬ
// ==========================================
let recentlyPlayed = JSON.parse(localStorage.getItem('recentlyPlayed')) || [];
let userStats = JSON.parse(localStorage.getItem('userStats')) || { listens: 0, tracks: {}, genres: {} };

function renderRecentTracks() {
    const container = document.getElementById('recent-list'); if (!container) return; container.innerHTML = '';
    if (recentlyPlayed.length === 0) { container.innerHTML = '<p style="font-size: 12px; color: var(--text-muted);">Поки порожньо</p>'; return; }
    recentlyPlayed.forEach(track => {
        const sourceLabel = track.url.includes('audius') ? '<span style="color: #b026ff; font-weight: bold; margin-right: 5px;">Audius</span>' : '<span style="color: #ff2626; font-weight: bold; margin-right: 5px;">iTunes</span>';
        container.innerHTML += `
            <div style="display: flex; align-items: center; gap: 10px; font-size: 12px; cursor: pointer; padding: 4px; border-radius: 6px; transition: 0.2s;" 
                 onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'" 
                 onclick="playTrack('${track.url}', '${track.title.replace(/'/g, "\\'")}', '${track.artist.replace(/'/g, "\\'")}', '${track.cover}', '${track.id}')">
                <img src="${track.cover}" style="width: 32px; height: 32px; border-radius: 4px; object-fit: cover;">
                <div style="overflow: hidden; white-space: nowrap; width: 100%; text-align: left;">
                    <div style="font-weight: bold; text-overflow: ellipsis; overflow: hidden;">${track.title}</div>
                    <div style="color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; display: flex; align-items: center;">${sourceLabel} ${track.artist}</div>
                </div>
            </div>`;
    });
}
renderRecentTracks();

function updateProfileStats(title, artist) {
    userStats.listens++; const trackKey = `${title} - ${artist}`; userStats.tracks[trackKey] = (userStats.tracks[trackKey] || 0) + 1;
    const activeCat = document.querySelector('.cat-btn.active');
    if (activeCat && activeCat.innerText !== "Завантажити" && activeCat.innerText !== "Скинути" && activeCat.innerText !== "Зберегти") {
        userStats.genres[activeCat.innerText] = (userStats.genres[activeCat.innerText] || 0) + 1;
    }
    localStorage.setItem('userStats', JSON.stringify(userStats)); renderProfileData();
}

let fsCoverColor = '';

function extractColorFromCover(coverUrl) {
    fsCoverColor = savedColor || '#b026ff';
    document.documentElement.style.setProperty('--fs-accent', fsCoverColor);

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = function () {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 1; canvas.height = 1;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 1, 1);
            const data = ctx.getImageData(0, 0, 1, 1).data;
            let [r, g, b] = [data[0], data[1], data[2]];

            // Якщо колір дуже темний, робимо його світлішим
            if (r < 30 && g < 30 && b < 30) { r += 80; g += 80; b += 80; }

            // Перевірка на сірість
            const isGray = Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && Math.abs(r - b) < 15;

            if (isGray) {
                fsCoverColor = 'rgba(255, 255, 255, 0.85)';
            } else {
                // Збільшуємо насиченість
                const max = Math.max(r, g, b);
                if (max === r) r = Math.min(255, r + 50);
                if (max === g) g = Math.min(255, g + 50);
                if (max === b) b = Math.min(255, b + 50);

                const rgbToHex = (r, g, b) => "#" + [r, g, b].map(x => {
                    const hex = x.toString(16); return hex.length === 1 ? "0" + hex : hex;
                }).join('');
                fsCoverColor = rgbToHex(r, g, b);
            }

            document.documentElement.style.setProperty('--fs-accent', fsCoverColor);
        } catch (e) {
            console.log("CORS/Колір помилка:", e);
        }
    };
    img.src = coverUrl;
}

// ЗБЕРЕЖЕННЯ ОСТАННЬОГО ТРЕКУ ПРИ СТАРТІ
const lastSavedTrack = JSON.parse(localStorage.getItem('lastTrackData'));
if (lastSavedTrack) {
    currentTrackData = lastSavedTrack; audio.src = lastSavedTrack.url;
    document.getElementById('current-title').innerText = lastSavedTrack.title; document.getElementById('current-artist').innerText = lastSavedTrack.artist; document.getElementById('current-cover').src = lastSavedTrack.cover;
    document.getElementById('fs-title').innerText = lastSavedTrack.title; document.getElementById('fs-artist').innerText = lastSavedTrack.artist; document.getElementById('vinyl-cover').src = lastSavedTrack.cover; document.getElementById('rs-cover').src = lastSavedTrack.cover;
    document.getElementById('rs-title').innerText = lastSavedTrack.title;
    const rsArtistEl = document.getElementById('rs-artist'); const sourceLabel = lastSavedTrack.url.includes('audius') ? '<span style="color: #b026ff; font-weight: bold; margin-right: 5px;">Audius</span>' : '<span style="color: #ff2626; font-weight: bold; margin-right: 5px;">iTunes</span>';
    if (rsArtistEl) rsArtistEl.innerHTML = `${sourceLabel} ${lastSavedTrack.artist}`;
    const fsBg = document.getElementById('fullscreen-bg'); if (fsBg) fsBg.style.backgroundImage = `url('${lastSavedTrack.cover}')`;

    extractColorFromCover(lastSavedTrack.cover);
}

function playTrack(url, title, artist, cover, id) {
    // 1. Очищаємо статус на всіх картках
    document.querySelectorAll('.track-card').forEach(card => card.classList.remove('playing-now'));

    // 2. Шукаємо, звідки був клік або перемикання
    let activeCard = null;
    if (window.event && window.event.currentTarget && window.event.currentTarget.classList && window.event.currentTarget.classList.contains('track-card')) {
        activeCard = window.event.currentTarget;
    } else {
        // Якщо кліку не було (перемикання Next), беремо з поточної вкладки
        activeCard = document.querySelector('.content-section.active-section .track-card[data-id="' + id + '"]')
            || document.querySelector(`.track-card[data-id="${id}"]`);
    }

    if (activeCard) {
        activeCard.classList.add('playing-now');
        updateQueue(activeCard);
    } else {
        const q = document.getElementById('queue-list');
        if (q) q.innerHTML = '<p style="font-size: 12px; color: var(--text-muted);">Кінець списку</p>';
    }

    currentTrackData = { url, title, artist, cover, id }; audio.src = url;
    localStorage.setItem('lastTrackData', JSON.stringify(currentTrackData));

    progressBar.value = 0; updateSliderProgress(progressBar, 0); timeCurrent.innerText = '0:00'; timeTotal.innerText = '0:00'; cancelAnimationFrame(animationFrameId);
    initAudioContext(); if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

    recentlyPlayed = recentlyPlayed.filter(t => t.id !== id); recentlyPlayed.unshift({ url, title, artist, cover, id });
    if (recentlyPlayed.length > 20) recentlyPlayed.pop(); localStorage.setItem('recentlyPlayed', JSON.stringify(recentlyPlayed)); renderRecentTracks();

    document.getElementById('current-title').innerText = title; document.getElementById('current-artist').innerText = artist; document.getElementById('current-cover').src = cover;
    document.getElementById('fs-title').innerText = title; document.getElementById('fs-artist').innerText = artist; document.getElementById('vinyl-cover').src = cover; document.getElementById('rs-cover').src = cover;
    document.getElementById('rs-title').innerText = title;

    const rsArtistEl = document.getElementById('rs-artist');
    const sourceLabel = url.includes('audius') ? '<span style="color: #b026ff; font-weight: bold; margin-right: 5px;">Audius</span>' : '<span style="color: #ff2626; font-weight: bold; margin-right: 5px;">iTunes</span>';
    if (rsArtistEl) rsArtistEl.innerHTML = `${sourceLabel} ${artist}`;

    const fsBg = document.getElementById('fullscreen-bg'); if (fsBg) fsBg.style.backgroundImage = `url('${cover}')`;
    if (likedTracks.some(t => t.id === id)) { likeIcon.innerText = "favorite"; likeBtn.classList.add('liked'); } else { likeIcon.innerText = "favorite_border"; likeBtn.classList.remove('liked'); }

    audio.play(); playIcon.innerText = "pause"; vinylCover.classList.add('playing');
    updateProfileStats(title, artist);

    extractColorFromCover(cover);
}

function updateQueue(activeCard) {
    const queueList = document.getElementById('queue-list'); if (!queueList) return; queueList.innerHTML = '';
    let next = activeCard.nextElementSibling, count = 0;
    while (next && next.classList.contains('track-card') && count < 8) {
        const img = next.querySelector('img').src; const title = next.querySelector('h3').innerText; const artist = next.querySelector('p').innerText; const onclickAction = next.getAttribute('onclick');
        const urlStr = onclickAction.match(/'([^']+)'/) ? onclickAction.match(/'([^']+)'/)[1] : '';
        const sourceLabel = urlStr.includes('audius') ? '<span style="color: #b026ff; font-weight: bold; margin-right: 5px;">Audius</span>' : '<span style="color: #ff2626; font-weight: bold; margin-right: 5px;">iTunes</span>';

        queueList.innerHTML += `
            <div style="display: flex; align-items: center; gap: 10px; font-size: 12px; cursor: pointer; padding: 4px; border-radius: 6px; transition: 0.2s;" 
                 onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'" 
                 onclick="${onclickAction.replace(/"/g, '&quot;')}">
                <img src="${img}" style="width: 32px; height: 32px; border-radius: 4px; object-fit: cover;">
                <div style="overflow: hidden; white-space: nowrap; width: 100%; text-align: left;">
                    <div style="font-weight: bold; text-overflow: ellipsis; overflow: hidden;">${title}</div>
                    <div style="color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; display: flex; align-items: center;">${sourceLabel} ${artist}</div>
                </div>
            </div>`;
        next = next.nextElementSibling; count++;
    }
    if (count === 0) queueList.innerHTML = '<p style="font-size: 12px; color: var(--text-muted);">Кінець списку</p>';
}

// ==========================================
// 7. ПЛЕЙЛИСТИ
// ==========================================
let customPlaylists = JSON.parse(localStorage.getItem('myPlaylists')) || [];
let playlistsData = JSON.parse(localStorage.getItem('playlistsData')) || {};
let likedTracks = JSON.parse(localStorage.getItem('likedTracksData')) || [];

function renderPlaylists() {
    const playlistsContainer = document.getElementById('user-playlists-list');
    playlistsContainer.innerHTML = `<li><a href="#liked-section" id="nav-liked"><span class="material-symbols-rounded">favorite</span> Вподобані</a></li>`;
    customPlaylists.forEach((name, index) => {
        playlistsContainer.innerHTML += `
            <li style="display: flex; justify-content: space-between; align-items: center;">
                <a href="#liked-section" class="custom-pl-link" data-name="${name}" style="flex-grow: 1;">
                    <span class="material-symbols-rounded">queue_music</span> ${name}
                </a>
                <span class="material-symbols-rounded delete-pl-btn" data-index="${index}" style="cursor:pointer; color: var(--text-muted); font-size: 18px;">delete</span>
            </li>`;
    });
    document.getElementById('nav-liked').onclick = (e) => { e.preventDefault(); openPlaylistSection('Вподобані треки', likedTracks); };
    document.querySelectorAll('.custom-pl-link').forEach(link => { link.onclick = (e) => { e.preventDefault(); openPlaylistSection(link.dataset.name, playlistsData[link.dataset.name] || []); }; });
    document.querySelectorAll('.delete-pl-btn').forEach(btn => {
        btn.onclick = (e) => {
            const idx = e.target.dataset.index; const plName = customPlaylists[idx];
            if (confirm(`Видалити плейлист "${plName}"?`)) { customPlaylists.splice(idx, 1); delete playlistsData[plName]; localStorage.setItem('myPlaylists', JSON.stringify(customPlaylists)); localStorage.setItem('playlistsData', JSON.stringify(playlistsData)); renderPlaylists(); }
        };
    });
    initDroppablePlaylists();
}

function openPlaylistSection(title, tracksArray) {
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active-section'));
    document.getElementById('liked-section').classList.add('active-section'); document.querySelector('#liked-section h1').innerText = title;
    const container = document.getElementById('liked-tracks-container');
    if (tracksArray.length === 0) { container.innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1;">Тут поки порожньо.</p>'; return; }
    container.innerHTML = '';
    tracksArray.forEach(track => {
        const safeTitle = track.title.replace(/"/g, '&quot;'); const safeArtist = track.artist.replace(/"/g, '&quot;');
        container.innerHTML += `<div class="track-card glass" data-id="${track.id}" data-url="${track.url}" data-title="${safeTitle}" data-artist="${safeArtist}" data-cover="${track.cover}" onclick="playTrack('${track.url}', '${track.title.replace(/'/g, "\\'")}', '${track.artist.replace(/'/g, "\\'")}', '${track.cover}', '${track.id}')"><div class="track-card-img-container"><img src="${track.cover}"></div><h3>${track.title}</h3><p>${track.artist}</p></div>`;
    });
    initDraggableCards();
}

// ==========================================
// ЛОГІКА МОДАЛЬНОГО ВІКНА ПЛЕЙЛИСТІВ
// ==========================================
const plModal = document.getElementById('playlist-modal');
const plInput = document.getElementById('pl-modal-input');
let modalMode = '';

function closePlModal() { plModal.classList.add('hidden'); plInput.value = ''; }

if (document.getElementById('pl-modal-cancel')) document.getElementById('pl-modal-cancel').onclick = closePlModal;

// ДОДАНО: Закриття будь-якої модалки по кліку на темний фон навколо
document.querySelectorAll('.fullscreen-overlay').forEach(modal => {
    modal.addEventListener('click', function (e) {
        // Перевіряємо, чи клік був саме по фону, а не по картці всередині
        if (e.target === this && this.id !== 'fullscreen-player') {
            if (this.id === 'playlist-modal') closePlModal();
            else this.classList.add('hidden');
        }
    });
});

if (document.getElementById('create-playlist-btn')) document.getElementById('create-playlist-btn').onclick = () => {
    modalMode = 'create';
    document.getElementById('pl-modal-title').innerText = 'Створити плейлист';
    document.getElementById('pl-create-block').style.display = 'block';
    document.getElementById('pl-select-block').style.display = 'none';
    document.getElementById('pl-modal-confirm').style.display = 'block';
    plModal.classList.remove('hidden');
    setTimeout(() => plInput.focus(), 100);
};

// ДОДАНО: Винесена функція збереження для кнопки і клавіші Enter
function saveNewPlaylist() {
    if (modalMode !== 'create') return;

    const name = plInput.value.trim();
    
    if (name && !customPlaylists.includes(name)) {
        customPlaylists.push(name);
        playlistsData[name] = [];
        localStorage.setItem('myPlaylists', JSON.stringify(customPlaylists));
        localStorage.setItem('playlistsData', JSON.stringify(playlistsData));
        renderPlaylists();
        closePlModal();
        showToast(`Плейлист "${name}" створено!`);
    } else if (customPlaylists.includes(name)) {
        alert("Плейлист з такою назвою вже існує!");
    } else {
        alert("Будь ласка, введіть назву плейлиста."); // Виправлено: тепер не "застряє" при пустому вводі
    }
}

if (document.getElementById('pl-modal-confirm')) document.getElementById('pl-modal-confirm').onclick = saveNewPlaylist;

// ДОДАНО: Збереження плейлиста по кнопці Enter на клавіатурі
if (plInput) plInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        saveNewPlaylist();
    }
});

// Розумна кнопка "Додати в плейлист" на самому плеєрі
if (document.getElementById('add-to-playlist-btn')) document.getElementById('add-to-playlist-btn').onclick = () => {
    if (!currentTrackData) return alert("Спочатку увімкніть трек!");
    if (customPlaylists.length === 0) {
        alert("У вас ще немає плейлистів. Створіть один!");
        document.getElementById('create-playlist-btn').click(); // Покращено UX: одразу відкриваємо створення
        return;
    }
    modalMode = 'add';
    document.getElementById('pl-modal-title').innerText = 'Оберіть плейлист';
    document.getElementById('pl-create-block').style.display = 'none';
    document.getElementById('pl-select-block').style.display = 'block';
    document.getElementById('pl-modal-confirm').style.display = 'none';

    document.getElementById('pl-select-block').innerHTML = '';
    customPlaylists.forEach(pl => {
        document.getElementById('pl-select-block').innerHTML += `<button class="cat-btn" style="width: 100%; margin-bottom: 8px; text-align: left; display: flex; align-items: center; gap: 10px;" onclick="addTrackToSpecificPlaylist('${pl}')"><span class="material-symbols-rounded">queue_music</span> ${pl}</button>`;
    });
    plModal.classList.remove('hidden');
};

window.addTrackToSpecificPlaylist = function (plName) {
    if (!playlistsData[plName].some(t => t.id === currentTrackData.id)) {
        playlistsData[plName].push(currentTrackData);
        localStorage.setItem('playlistsData', JSON.stringify(playlistsData));
        const addBtn = document.getElementById('add-to-playlist-btn');
        addBtn.style.color = 'var(--accent)';
        setTimeout(() => addBtn.style.color = '', 1000);
        showToast(`Додано до "${plName}" 🎵`); // Покращено: показуємо сповіщення
    } else {
        alert("Цей трек вже є у плейлисті.");
    }
    closePlModal();
};

const likeBtn = document.getElementById('like-btn'); const likeIcon = document.getElementById('like-icon');
likeBtn.onclick = () => {
    if (!currentTrackData) return; const index = likedTracks.findIndex(t => t.id === currentTrackData.id);
    if (index > -1) { likedTracks.splice(index, 1); likeIcon.innerText = "favorite_border"; likeBtn.classList.remove('liked'); } else { likedTracks.push(currentTrackData); likeIcon.innerText = "favorite"; likeBtn.classList.remove('liked'); void likeBtn.offsetWidth; likeBtn.classList.add('liked'); }
    localStorage.setItem('likedTracksData', JSON.stringify(likedTracks)); if (document.querySelector('#liked-section h1').innerText === 'Вподобані треки' && document.getElementById('liked-section').classList.contains('active-section')) { openPlaylistSection('Вподобані треки', likedTracks); }
};
renderPlaylists();

// ==========================================
// 8. API (AUDIUS/ITUNES) ТА ПОШУК (БЕЗПЕЧНИЙ ІНФІНІТІ СКРОЛ - 200 ТРЕКІВ)
// ==========================================
let currentAudiusHost = '';
async function getAudiusHost() {
    if (currentAudiusHost) return currentAudiusHost;
    const res = await fetch('https://api.audius.co');
    const data = await res.json();
    currentAudiusHost = data.data[Math.floor(Math.random() * data.data.length)];
    return currentAudiusHost;
}

// Функція для Audius (з підтримкою додавання вниз списку)
async function renderAudiusCards(tracksArray, containerId, host, isLoadMore = false) {
    const grid = document.getElementById(containerId);
    if (!tracksArray || tracksArray.length === 0) {
        if (!isLoadMore) grid.innerHTML = '<p>Нічого не знайдено.</p>';
        return false;
    }

    let htmlContent = '';
    tracksArray.forEach(track => {
        const id = track.id;
        const url = `${host}/v1/tracks/${id}/stream?app_name=${appName}`;
        const title = track.title.replace(/'/g, "\\'");
        const artist = track.user.name.replace(/'/g, "\\'");
        const cover = track.artwork ? track.artwork['480x480'] : '../IMG/default.jpg';
        const duration = formatTime(track.duration || 0);

        htmlContent += `<div class="track-card glass" data-id="${id}" data-url="${url}" data-title="${title.replace(/"/g, '&quot;')}" data-artist="${artist.replace(/"/g, '&quot;')}" data-cover="${cover}" onclick="playTrack('${url}', '${title}', '${artist}', '${cover}', '${id}')"><div class="track-card-img-container"><img src="${cover}"><span class="track-badge-source" style="background: rgba(176,38,255,0.7);">Audius</span><span class="track-badge-time">${duration}</span></div><h3>${track.title}</h3><p>${track.user.name}</p></div>`;
    });

    if (isLoadMore) grid.insertAdjacentHTML('beforeend', htmlContent);
    else grid.innerHTML = htmlContent;

    await new Promise(resolve => requestAnimationFrame(resolve));
    initDraggableCards();
    return true;
}

// Функція для iTunes (з підтримкою додавання вниз списку)
async function renderItunesCards(tracksArray, containerId, isLoadMore = false) {
    const grid = document.getElementById(containerId);
    if (!tracksArray || tracksArray.length === 0) {
        if (!isLoadMore) grid.innerHTML = '<p>Нічого не знайдено.</p>';
        return false;
    }

    let htmlContent = '';
    tracksArray.forEach(track => {
        if (!track.previewUrl) return;
        const id = track.trackId;
        const url = track.previewUrl;
        const title = track.trackName.replace(/'/g, "\\'");
        const artist = track.artistName.replace(/'/g, "\\'");
        const cover = track.artworkUrl100.replace('100x100', '300x300');
        const duration = formatTime((track.trackTimeMillis || 0) / 1000);

        htmlContent += `<div class="track-card glass" data-id="${id}" data-url="${url}" data-title="${title.replace(/"/g, '&quot;')}" data-artist="${artist.replace(/"/g, '&quot;')}" data-cover="${cover}" onclick="playTrack('${url}', '${title}', '${artist}', '${cover}', '${id}')"><div class="track-card-img-container"><img src="${cover}"><span class="track-badge-source" style="background: rgba(255,38,38,0.7);">iTunes</span><span class="track-badge-time">${duration}</span></div><h3>${track.trackName}</h3><p>${track.artistName}</p></div>`;
    });

    if (isLoadMore) grid.insertAdjacentHTML('beforeend', htmlContent);
    else grid.innerHTML = htmlContent;

    await new Promise(resolve => requestAnimationFrame(resolve));
    initDraggableCards();
    return true;
}

// -- ЗМІННІ ДЛЯ РОЗУМНОГО КЕШУВАННЯ ТА СКРОЛУ --
let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];
const renderChunkSize = 20; // Скільки карток докидати при скролі
let currentApiSource = 'audius';

// Незалежні "розумні" сховища пам'яті для Головної та Пошуку
let catState = { query: 'top-100', cache: [], renderOffset: 0, isLoading: false };
let searchState = { query: '', cache: [], renderOffset: 0, isLoading: false };

function renderSearchHistory() {
    const hc = document.getElementById('search-history-chips'); if (!hc) return; hc.innerHTML = '';
    searchHistory.forEach(term => { hc.innerHTML += `<span class="history-chip" onclick="executeSearch('${term}')">${term}</span>`; });
}
function executeSearch(query) { document.getElementById('search-input').value = query; document.querySelector('a[href="#search-section"]').click(); performSearch(query); }

// ФУНКЦІЯ: Завантажує всі 100-200 треків за один раз і ховає в пам'ять
async function fetchMassiveData(type) {
    const state = type === 'category' ? catState : searchState;
    try {
        let rawData = [];
        if (currentApiSource === 'audius') {
            const host = await getAudiusHost();
            let url = '';
            if (type === 'category') {
                if (state.query === 'top-100') url = `${host}/v1/tracks/trending?app_name=${appName}&limit=100`;
                else url = `${host}/v1/tracks/search?query=${state.query}&app_name=${appName}&limit=100`;
            } else {
                url = `${host}/v1/tracks/search?query=${encodeURIComponent(state.query)}&app_name=${appName}&limit=100`;
            }
            const res = await fetch(url);
            const json = await res.json();
            rawData = json.data || [];
        } else {
            // iTunes дозволяє завантажити до 200 треків за один раз!
            const searchTerm = (type === 'category' && state.query === 'top-100') ? 'top hits' : state.query;
            const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&limit=200&entity=song`);
            const data = await res.json();
            rawData = data.results || [];
        }

        // ЖОРСТКА ФІЛЬТРАЦІЯ ДУБЛІКАТІВ (захист від збоїв API)
        const uniqueIds = new Set();
        state.cache = [];
        rawData.forEach(track => {
            const trackId = track.id || track.trackId;
            if (trackId && !uniqueIds.has(trackId)) {
                uniqueIds.add(trackId);
                state.cache.push(track);
            }
        });
    } catch (e) {
        console.error("Помилка завантаження бази:", e);
    }
}

// ФУНКЦІЯ: Бере наступні 20 треків з пам'яті і малює на екрані
async function renderNextChunk(type) {
    const state = type === 'category' ? catState : searchState;
    const containerId = type === 'category' ? 'spotify-tracks' : 'search-results';

    if (state.isLoading || state.renderOffset >= state.cache.length) return;
    state.isLoading = true;

    const chunk = state.cache.slice(state.renderOffset, state.renderOffset + renderChunkSize);
    if (chunk.length === 0) {
        state.isLoading = false; return;
    }

    const isLoadMore = state.renderOffset > 0;

    if (currentApiSource === 'audius') {
        const host = await getAudiusHost();
        await renderAudiusCards(chunk, containerId, host, isLoadMore);
    } else {
        await renderItunesCards(chunk, containerId, isLoadMore);
    }

    state.renderOffset += chunk.length;
    state.isLoading = false;
}

// ОБРОБКА ПОШУКУ
async function performSearch(query) {
    if (!query) return;
    currentApiSource = currentSource;
    searchState = { query: query, cache: [], renderOffset: 0, isLoading: false }; // Скидаємо старий пошук

    if (!searchHistory.includes(query)) { searchHistory.unshift(query); if (searchHistory.length > 6) searchHistory.pop(); localStorage.setItem('searchHistory', JSON.stringify(searchHistory)); renderSearchHistory(); }

    document.getElementById('search-results').innerHTML = `<p style="color: var(--text-muted); grid-column: 1 / -1;">Завантажуємо базу ${currentApiSource === 'audius' ? 'Audius (100 треків)' : 'iTunes (200 треків)'}...</p>`;

    await fetchMassiveData('search'); // Вантажимо всю базу

    if (searchState.cache.length === 0) {
        document.getElementById('search-results').innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1;">Нічого не знайдено.</p>';
    } else {
        document.getElementById('search-results').innerHTML = ''; // Очищаємо повідомлення
        await renderNextChunk('search'); // Малюємо перші 20
    }
}

let searchTimeout;
if (searchInput) searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout); const query = e.target.value.trim();
    if (query.length === 0) { document.getElementById('search-results').innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1;">Почніть вводити текст...</p>'; return; }
    searchTimeout = setTimeout(() => performSearch(query), 1000);
});
renderSearchHistory();

// ОБРОБКА КАТЕГОРІЙ
async function loadCategory(genre, btnEl = null) {
    currentApiSource = currentSource;
    catState = { query: genre, cache: [], renderOffset: 0, isLoading: false }; // Скидаємо стару категорію

    if (btnEl) { document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active')); btnEl.classList.add('active'); }
    else if (typeof event !== 'undefined' && event && event.target && event.target.classList.contains('cat-btn')) { document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active')); event.target.classList.add('active'); }

    document.getElementById('spotify-tracks').innerHTML = `<p style="color: var(--text-muted);">Завантажуємо базу ${genre}...</p>`;

    await fetchMassiveData('category'); // Вантажимо всю базу
    document.getElementById('spotify-tracks').innerHTML = ''; // Очищаємо повідомлення
    await renderNextChunk('category'); // Малюємо перші 20
}
loadCategory('top-100');

// ОБРОБНИК СКРОЛУ (Миттєво докидає нові треки з кешу, коли ти гортаєш вниз)
const mainContentArea = document.querySelector('.main-content');
if (mainContentArea) {
    mainContentArea.addEventListener('scroll', () => {
        // Якщо до кінця екрана лишилося менше 400px...
        if (mainContentArea.scrollTop + mainContentArea.clientHeight >= mainContentArea.scrollHeight - 400) {
            if (document.getElementById('home-section').classList.contains('active-section')) {
                renderNextChunk('category');
            } else if (document.getElementById('search-section').classList.contains('active-section') && searchState.query) {
                renderNextChunk('search');
            }
        }
    });
}

// ==========================================
// 9. UI, ПОВНОЕКРАННИЙ РЕЖИМ, DRAG & DROP ТА ПРОФІЛЬ
// ==========================================
document.querySelectorAll('.nav-links a').forEach(link => {
    link.onclick = (e) => {
        e.preventDefault(); document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active')); link.classList.add('active');
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active-section')); document.getElementById(link.getAttribute('href').substring(1)).classList.add('active-section');
    };
});

document.getElementById('open-fullscreen-btn').onclick = () => document.getElementById('fullscreen-player').classList.remove('hidden');
document.getElementById('close-fullscreen-btn').onclick = () => document.getElementById('fullscreen-player').classList.add('hidden');
const fsPlayBtn = document.getElementById('fs-play-btn'); const fsPlayIcon = document.getElementById('fs-play-icon');
if (fsPlayBtn) fsPlayBtn.onclick = () => { togglePlay(); fsPlayIcon.innerText = audio.paused ? "play_arrow" : "pause"; };
if (document.getElementById('fs-prev-btn')) document.getElementById('fs-prev-btn').onclick = playPrevTrack;
if (document.getElementById('fs-next-btn')) document.getElementById('fs-next-btn').onclick = playNextTrack;
audio.addEventListener('play', () => { if (fsPlayIcon) fsPlayIcon.innerText = "pause"; }); audio.addEventListener('pause', () => { if (fsPlayIcon) fsPlayIcon.innerText = "play_arrow"; });

$(document).ready(function () {
    let isResizing = false; let currentResizer = null;
    $('.resizer').on('mousedown', function (e) { isResizing = true; currentResizer = $(this); currentResizer.addClass('is-resizing'); $('body').css('cursor', 'col-resize'); e.preventDefault(); });
    $(document).on('mousemove', function (e) {
        if (!isResizing) return;
        if (currentResizer.attr('id') === 'resizer-left') { let newWidth = e.clientX - 15; if (newWidth > 160 && newWidth < 400) $('#left-sidebar').css('width', newWidth + 'px'); }
        else if (currentResizer.attr('id') === 'resizer-right') { let newWidth = $(window).width() - e.clientX - 15; if (newWidth > 200 && newWidth < 500) $('#right-sidebar').css('width', newWidth + 'px'); }
    });
    $(document).on('mouseup', function () { if (isResizing) { isResizing = false; $('.resizer').removeClass('is-resizing'); $('body').css('cursor', 'default'); } });
});

function initDraggableCards() {
    if (typeof $.fn.draggable !== 'function') return;

    // ДОДАНО: Якщо екран менше 850px (телефон), вимикаємо Drag & Drop
    if (window.innerWidth <= 850) {
        // Якщо він був увімкнений до цього (наприклад, при повороті екрана), то знищуємо його
        $('.track-card').each(function () { if ($(this).data('ui-draggable')) $(this).draggable('destroy'); });
        return; // Зупиняємо виконання функції
    }

    $('.track-card').each(function () { if ($(this).data('ui-draggable')) $(this).draggable('destroy'); });
    let wasDragged = false;
    $('.track-card').draggable({
        containment: 'window', appendTo: 'body', cursorAt: { top: 25, left: 25 }, distance: 15,
        helper: function () {
            return $(`<div class="drag-helper glass" style="width: 220px; padding: 10px; border-radius: 12px; display: flex; align-items: center; gap: 12px; z-index: 9999; transform: rotate(6deg);"><img src="${$(this).data('cover')}" style="width: 45px; height: 45px; border-radius: 6px; object-fit: cover;"><div style="display: flex; flex-direction: column; overflow: hidden; width: 100%;"><span style="font-size: 14px; font-weight: bold; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${$(this).data('title')}</span><span style="font-size: 12px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${$(this).data('artist')}</span></div></div>`);
        },
        start: function () { wasDragged = true; $('.track-card').not(this).addClass('shake-anim'); },
        stop: function () { $('.track-card').removeClass('shake-anim'); setTimeout(() => { wasDragged = false; }, 0); }
    });
    $('.track-card').off('click.dragfix').on('click.dragfix', function (e) { if (wasDragged) { e.stopImmediatePropagation(); return false; } });
}

function initDroppablePlaylists() {
    if (typeof $.fn.droppable !== 'function') return;

    // ДОДАНО: Перевірка для телефонів
    if (window.innerWidth <= 850) {
        $('#nav-liked, .custom-pl-link').each(function () { if ($(this).data('ui-droppable')) $(this).droppable('destroy'); });
        return;
    }

    $('#nav-liked, .custom-pl-link').droppable({
        accept: '.track-card', hoverClass: 'drop-hover', tolerance: 'pointer',
        drop: function (event, ui) {
            const card = ui.draggable; const trackData = { id: String(card.data('id')), url: card.data('url'), title: card.data('title'), artist: card.data('artist'), cover: card.data('cover') }; const targetName = $(this).data('name');
            if (!targetName) { if (!likedTracks.some(t => t.id === trackData.id)) { likedTracks.push(trackData); localStorage.setItem('likedTracksData', JSON.stringify(likedTracks)); showToast(`Додано до "Вподобані" 💜`); } else showToast(`Вже є у "Вподобаних"`); }
            else { if (!playlistsData[targetName].some(t => t.id === trackData.id)) { playlistsData[targetName].push(trackData); localStorage.setItem('playlistsData', JSON.stringify(playlistsData)); showToast(`Додано до "${targetName}" 🎵`); } else showToast(`Вже є у "${targetName}"`); }
        }
    });
}

// ДОДАНО: Автоматично перевіряємо, чи потрібно увімкнути/вимкнути Drag & Drop 
// при повороті екрана телефону або зміні розміру вікна
let resizeDragTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeDragTimeout);
    resizeDragTimeout = setTimeout(() => {
        initDraggableCards();
        initDroppablePlaylists();
    }, 300); // Затримка 300мс, щоб не перевантажувати браузер під час ресайзу
});

function showToast(message) {
    const toast = $(`<div class="glass" style="position:fixed; top: 30px; left: 50%; transform: translateX(-50%); padding: 12px 25px; border-radius: 30px; background: rgba(0,0,0,0.8); border: 1px solid var(--accent); color: white; z-index: 5000; font-weight: bold; box-shadow: var(--accent-glow);">${message}</div>`);
    $('body').append(toast); toast.hide().slideDown(200).delay(2000).slideUp(200, function () { $(this).remove(); });
}

function renderProfileData() {
    const listensEl = document.getElementById('stat-listens'); const topTrackEl = document.getElementById('stat-top-track'); const genreEl = document.getElementById('stat-genre');
    if (!listensEl) return;
    listensEl.innerText = `${userStats.listens} треків`;
    let topTrack = "Ще немає даних", maxT = 0; for (let t in userStats.tracks) { if (userStats.tracks[t] > maxT) { maxT = userStats.tracks[t]; topTrack = t; } } topTrackEl.innerText = topTrack;
    let topGenre = "Невідомо", maxG = 0; for (let g in userStats.genres) { if (userStats.genres[g] > maxG) { maxG = userStats.genres[g]; topGenre = g; } } genreEl.innerText = topGenre;
}
const profileModal = document.getElementById('profile-modal');
if (document.getElementById('user-profile-btn')) document.getElementById('user-profile-btn').onclick = () => { renderProfileData(); profileModal.classList.remove('hidden'); };
if (document.getElementById('close-profile-btn')) document.getElementById('close-profile-btn').onclick = () => profileModal.classList.add('hidden');

function setAvatar(url) {
    document.getElementById('modal-avatar-img').src = url; document.getElementById('user-avatar-mini').src = url;
    document.getElementById('modal-avatar-img').style.display = 'block'; document.getElementById('user-avatar-mini').style.display = 'block';
    document.getElementById('modal-avatar-placeholder').style.display = 'none'; document.getElementById('user-icon-mini').style.display = 'none';
}
if (localStorage.getItem('userAvatar')) setAvatar(localStorage.getItem('userAvatar'));
const avatarUpload = document.getElementById('avatar-upload');
if (document.querySelector('#profile-modal .color-picker-wrapper')) document.querySelector('#profile-modal .color-picker-wrapper').onclick = () => avatarUpload.click();
if (avatarUpload) avatarUpload.onchange = function () {
    if (this.files[0]) { const reader = new FileReader(); reader.onload = e => { try { localStorage.setItem('userAvatar', e.target.result); setAvatar(e.target.result); } catch (err) { showToast('Зображення завелике!'); setAvatar(e.target.result); } }; reader.readAsDataURL(this.files[0]); }
};

const nameInput = document.getElementById('profile-name-input');
if (nameInput) { nameInput.value = localStorage.getItem('userName') || "Слухач"; nameInput.oninput = e => localStorage.setItem('userName', e.target.value); }
syncRadioLabels(); updateColorPickerUI();

// --- СИНХРОНІЗАЦІЯ ПОВНОЕКРАННОГО РЕЖИМУ 2.0 ---
const fsProgressBar = document.getElementById('fs-progress-bar');
const fsTimeCurrent = document.getElementById('fs-time-current');
const fsTimeTotal = document.getElementById('fs-time-total');

audio.addEventListener('timeupdate', () => {
    if (audio.duration && !isDraggingProgressBar) {
        if (fsTimeCurrent) fsTimeCurrent.innerText = formatTime(audio.currentTime);
        if (fsTimeTotal) fsTimeTotal.innerText = formatTime(audio.duration);
        if (fsProgressBar) {
            const percent = (audio.currentTime / audio.duration) * 100;
            fsProgressBar.value = percent;
            updateSliderProgress(fsProgressBar, percent);
        }
    }
});

if (fsProgressBar) {
    fsProgressBar.addEventListener('mousedown', () => isDraggingProgressBar = true);
    fsProgressBar.addEventListener('touchstart', () => isDraggingProgressBar = true);
    fsProgressBar.addEventListener('mouseup', () => isDraggingProgressBar = false);
    fsProgressBar.addEventListener('touchend', () => isDraggingProgressBar = false);

    fsProgressBar.addEventListener('input', (e) => {
        if (audio.duration) {
            const newTime = (audio.duration / 100) * e.target.value;
            audio.currentTime = newTime;
            fsTimeCurrent.innerText = formatTime(newTime);
            updateSliderProgress(fsProgressBar, e.target.value);
            progressBar.value = e.target.value;
            updateSliderProgress(progressBar, e.target.value);
            timeCurrent.innerText = formatTime(newTime);
        }
    });
}

// ==========================================
// 10. ПОВНОЕКРАННА МАГІЯ (Кіно-режим, 3D, Візуалізатор)
// ==========================================
let hideUiTimeout;
const fsPlayer = document.getElementById('fullscreen-player');

function resetUiTimer() {
    fsPlayer.classList.remove('fs-hide-ui');
    clearTimeout(hideUiTimeout);
    hideUiTimeout = setTimeout(() => {
        if (!audio.paused) {
            fsPlayer.classList.add('fs-hide-ui');
        }
    }, 3000);
}

fsPlayer.addEventListener('mousemove', resetUiTimer);
fsPlayer.addEventListener('click', resetUiTimer);
audio.addEventListener('pause', () => {
    fsPlayer.classList.remove('fs-hide-ui');
    clearTimeout(hideUiTimeout);
});
audio.addEventListener('play', resetUiTimer); // <--- ДОДАНО ЦЕЙ РЯДОК

const fsCoverImg = document.getElementById('vinyl-cover');
fsPlayer.addEventListener('mousemove', (e) => {
    if (fsPlayer.classList.contains('hidden') || !fsCoverImg) return;
    const xAxis = (window.innerWidth / 2 - e.pageX) / 25;
    const yAxis = (window.innerHeight / 2 - e.pageY) / 25;
    fsCoverImg.style.transform = `perspective(1000px) rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
});
fsPlayer.addEventListener('mouseleave', () => {
    if (fsCoverImg) fsCoverImg.style.transform = `perspective(1000px) rotateY(0deg) rotateX(0deg)`;
});

const fsVisualizer = document.getElementById('fs-visualizer');
let visCtx = null;

if (fsVisualizer) {
    visCtx = fsVisualizer.getContext('2d');
    function resizeVis() {
        fsVisualizer.width = fsVisualizer.offsetWidth || 400;
        fsVisualizer.height = fsVisualizer.offsetHeight || 60;
    }
    setTimeout(resizeVis, 100);
    window.addEventListener('resize', resizeVis);
}

function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);
    if (!analyser || !visCtx || fsPlayer.classList.contains('hidden') || audio.paused) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    visCtx.clearRect(0, 0, fsVisualizer.width, fsVisualizer.height);

    const width = fsVisualizer.width;
    const height = fsVisualizer.height;
    const centerY = height / 2;
    const barWidth = (width / bufferLength) * 1.8;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        const val = dataArray[i] / 255;
        const barHeight = val * (height / 2) * 0.85;

        visCtx.fillStyle = fsCoverColor || savedColor || '#b026ff';

        visCtx.globalAlpha = 0.8;
        visCtx.beginPath();
        visCtx.roundRect(x, centerY - barHeight, barWidth, barHeight, [3, 3, 0, 0]);
        visCtx.fill();

        visCtx.globalAlpha = 0.3;
        visCtx.beginPath();
        visCtx.roundRect(x, centerY, barWidth, barHeight * 0.6, [0, 0, 3, 3]);
        visCtx.fill();

        x += barWidth + 2;
    }
}
drawVisualizer();