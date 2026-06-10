// player.js
import { DOM, state } from './config.js';
import { initAudioContext } from './audioCore.js';
import { UI } from './ui.js';
import { Visualizer } from './visualizer.js';

export const Player = {
    isShuffle: false, isRepeat: false, animationFrameId: null,

    playTrack(url, title, artist, cover, id) {
        document.querySelectorAll('.track-card').forEach(card => card.classList.remove('playing-now'));
        let activeCard = document.querySelector(`.track-card[data-id="${id}"]`);
        if (activeCard) { activeCard.classList.add('playing-now'); this.updateQueue(activeCard); } 
        else { const q = document.getElementById('queue-list'); if (q) q.innerHTML = '<p style="font-size: 12px; color: var(--text-muted);">Кінець списку</p>'; }

        state.currentTrackData = { url, title, artist, cover, id }; DOM.audio.src = url;
        localStorage.setItem('lastTrackData', JSON.stringify(state.currentTrackData));
        localStorage.setItem('auraLastPosition', 0); // Обнуляємо збережений час для нового треку

        if (DOM.progressBar) { DOM.progressBar.value = 0; UI.updateSliderProgress(DOM.progressBar, 0); }
        if (DOM.timeCurrent) DOM.timeCurrent.innerText = '0:00'; 
        if (DOM.timeTotal) DOM.timeTotal.innerText = '0:00';
        initAudioContext();

        const now = Date.now();
        const twelveHours = 12 * 60 * 60 * 1000;
        
        state.recentlyPlayed = state.recentlyPlayed.filter(t => t.id !== id); 
        state.recentlyPlayed.unshift({ url, title, artist, cover, id, timestamp: now });
        
        let validHistory = [];
        for (let i = 0; i < state.recentlyPlayed.length; i++) {
            if (i < 10 || (now - (state.recentlyPlayed[i].timestamp || now)) < twelveHours) {
                validHistory.push(state.recentlyPlayed[i]);
            }
        }
        state.recentlyPlayed = validHistory.slice(0, 50); 
        localStorage.setItem('recentlyPlayed', JSON.stringify(state.recentlyPlayed));
        
        // --- ВІДНОВЛЕНО: Збереження загальної кількості прослуховувань ---
        let stats = JSON.parse(localStorage.getItem('userStats')) || {};
        if (!stats.artists) stats.artists = {};
        if (!stats.tracks) stats.tracks = {};
        if (!stats.listens) stats.listens = 0; // Додали лічильник
        
        stats.listens++; // Додаємо +1 до загальної кількості
        stats.artists[artist] = (stats.artists[artist] || 0) + 1;
        const trackKey = `${title} — ${artist}`;
        stats.tracks[trackKey] = (stats.tracks[trackKey] || 0) + 1;
        
        localStorage.setItem('userStats', JSON.stringify(stats));
        if (window.updateProfileStats) window.updateProfileStats();

        const currentTitle = document.getElementById('current-title'); if(currentTitle) currentTitle.innerText = title;
        const currentArtist = document.getElementById('current-artist'); if(currentArtist) currentArtist.innerText = artist; 
        const currentCover = document.getElementById('current-cover'); if(currentCover) currentCover.src = cover;
        
        const rsCover = document.getElementById('rs-cover'); if (rsCover) rsCover.src = cover;
        const rsTitle = document.getElementById('rs-title'); if (rsTitle) rsTitle.innerText = title;
        const rsArtistEl = document.getElementById('rs-artist');
        if (rsArtistEl) {
            const sourceLabel = url.includes('audius') ? '<span style="color: #b026ff; font-weight: bold; margin-right: 5px;">Audius</span>' : '<span style="color: #ff2626; font-weight: bold; margin-right: 5px;">iTunes</span>';
            rsArtistEl.innerHTML = `${sourceLabel} ${artist}`;
        }

        const fsTitle = document.getElementById('fs-title'); if (fsTitle) fsTitle.innerText = title;
        const fsArtist = document.getElementById('fs-artist'); if (fsArtist) fsArtist.innerText = artist;
        const vinylCover = document.getElementById('vinyl-cover'); if (vinylCover) vinylCover.src = cover;
        const fsBg = document.getElementById('fullscreen-bg'); if (fsBg) fsBg.style.backgroundImage = `url('${cover}')`;

        const likeBtn = document.getElementById('like-btn'); const likeIcon = document.getElementById('like-icon');
        if (likeBtn && likeIcon) {
            const isLiked = state.likedTracks.some(t => t.id === id);
            likeIcon.innerText = isLiked ? "favorite" : "favorite_border"; likeBtn.classList.toggle('liked', isLiked);
        }

        Visualizer.extractColorFromCover(cover);

        const playPromise = DOM.audio.play();
        if (playPromise !== undefined) playPromise.catch(error => console.log("Мікрозатримка перемикання:", error));
        
        window.renderRecentTracks();
    },

    // --- ФІКС: Відновлення останнього стану при перезавантаженні сайту ---
    restoreLastSession() {
        const lastTrack = JSON.parse(localStorage.getItem('lastTrackData'));
        if (!lastTrack) return;

        state.currentTrackData = lastTrack;
        DOM.audio.src = lastTrack.url;

        // Наповнюємо всі текстові блоки та картинки в UI
        const currentTitle = document.getElementById('current-title'); if(currentTitle) currentTitle.innerText = lastTrack.title;
        const currentArtist = document.getElementById('current-artist'); if(currentArtist) currentArtist.innerText = lastTrack.artist;
        const currentCover = document.getElementById('current-cover'); if(currentCover) currentCover.src = lastTrack.cover;

        const rsCover = document.getElementById('rs-cover'); if (rsCover) rsCover.src = lastTrack.cover;
        const rsTitle = document.getElementById('rs-title'); if (rsTitle) rsTitle.innerText = lastTrack.title;
        const rsArtistEl = document.getElementById('rs-artist');
        if (rsArtistEl) {
            const sourceLabel = lastTrack.url.includes('audius') ? '<span style="color: #b026ff; font-weight: bold; margin-right: 5px;">Audius</span>' : '<span style="color: #ff2626; font-weight: bold; margin-right: 5px;">iTunes</span>';
            rsArtistEl.innerHTML = `${sourceLabel} ${lastTrack.artist}`;
        }

        const fsTitle = document.getElementById('fs-title'); if (fsTitle) fsTitle.innerText = lastTrack.title;
        const fsArtist = document.getElementById('fs-artist'); if (fsArtist) fsArtist.innerText = lastTrack.artist;
        const vinylCover = document.getElementById('vinyl-cover'); if (vinylCover) vinylCover.src = lastTrack.cover;
        const fsBg = document.getElementById('fullscreen-bg'); if (fsBg) fsBg.style.backgroundImage = `url('${lastTrack.cover}')`;

        const likeBtn = document.getElementById('like-btn'); const likeIcon = document.getElementById('like-icon');
        if (likeBtn && likeIcon) {
            const isLiked = state.likedTracks.some(t => t.id === lastTrack.id);
            likeIcon.innerText = isLiked ? "favorite" : "favorite_border"; likeBtn.classList.toggle('liked', isLiked);
        }

        // Чекаємо завантаження метаданих аудіофайлу, щоб виставити збережений час
        const savedPosition = parseFloat(localStorage.getItem('auraLastPosition')) || 0;
        DOM.audio.addEventListener('loadedmetadata', () => {
            DOM.audio.currentTime = savedPosition;
            
            const currentTimeStr = UI.formatTime(savedPosition);
            const totalTimeStr = UI.formatTime(DOM.audio.duration);
            const percent = (savedPosition / DOM.audio.duration) * 100;

            if (DOM.timeCurrent) DOM.timeCurrent.innerText = currentTimeStr;
            if (DOM.timeTotal) DOM.timeTotal.innerText = totalTimeStr;
            if (DOM.progressBar) { DOM.progressBar.value = percent; UI.updateSliderProgress(DOM.progressBar, percent); }

            const fsTimeCurrent = document.getElementById('fs-time-current');
            const fsTimeTotal = document.getElementById('fs-time-total');
            const fsProgressBar = document.getElementById('fs-progress-bar');

            if (fsTimeCurrent) fsTimeCurrent.innerText = currentTimeStr;
            if (fsTimeTotal) fsTimeTotal.innerText = totalTimeStr;
            if (fsProgressBar) { fsProgressBar.value = percent; UI.updateSliderProgress(fsProgressBar, percent); }
        }, { once: true });

        // Шукаємо картку треку на екрані та підсвічуємо її
        let activeCard = document.querySelector(`.track-card[data-id="${lastTrack.id}"]`);
        if (activeCard) {
            activeCard.classList.add('playing-now');
            this.updateQueue(activeCard);
        }
        
        Visualizer.extractColorFromCover(lastTrack.cover);
    },

    playNextTrack() {
        const currentCard = document.querySelector('.track-card.playing-now'); if (!currentCard) return;
        const allCards = Array.from(currentCard.parentElement.querySelectorAll('.track-card'));
        if (this.isShuffle && allCards.length > 1) {
            let rc = allCards[Math.floor(Math.random() * allCards.length)]; while (rc === currentCard) rc = allCards[Math.floor(Math.random() * allCards.length)]; rc.click(); return;
        }
        if (currentCard.nextElementSibling && currentCard.nextElementSibling.classList.contains('track-card')) currentCard.nextElementSibling.click();
        else { DOM.audio.pause(); if(DOM.progressBar) DOM.progressBar.value = 0; UI.updateSliderProgress(DOM.progressBar, 0); }
    },

    playPrevTrack() { 
        const currentCard = document.querySelector('.track-card.playing-now'); if (currentCard && currentCard.previousElementSibling) currentCard.previousElementSibling.click(); 
    },

    updateQueue(activeCard) {
        const queueList = document.getElementById('queue-list'); if (!queueList) return; queueList.innerHTML = '';
        
        if (this.isShuffle) {
            queueList.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 120px; color: var(--text-muted); opacity: 0.6; text-align: center;">
                    <span class="material-symbols-rounded" style="font-size: 36px; margin-bottom: 8px; color: var(--accent);">shuffle</span>
                    <span style="font-size: 13px;">Наступні треки<br>перемішано випадково</span>
                </div>`;
            return;
        }

        let next = activeCard.nextElementSibling; let count = 0;
        
        while (next && next.classList.contains('track-card') && count < 20) {
            const img = next.querySelector('img').src; const title = next.querySelector('h3').innerText; const artist = next.querySelector('p').innerText; const onclickAction = next.getAttribute('onclick');
            const urlStr = onclickAction.match(/'([^']+)'/) ? onclickAction.match(/'([^']+)'/)[1] : '';
            const sourceLabel = urlStr.includes('audius') ? '<span style="color: #b026ff; font-weight: bold; margin-right: 5px;">Audius</span>' : '<span style="color: #ff2626; font-weight: bold; margin-right: 5px;">iTunes</span>';
            
            queueList.innerHTML += `
                <div style="display: flex; align-items: center; gap: 10px; font-size: 12px; cursor: pointer; padding: 4px; border-radius: 6px; transition: 0.2s;" 
                     onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'" 
                     onclick="${onclickAction.replace(/\"/g, '&quot;')}">
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
};

window.playTrack = (url, title, artist, cover, id) => Player.playTrack(url, title, artist, cover, id);