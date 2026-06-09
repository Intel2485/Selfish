// player.js
import { DOM, state } from './config.js';
import { initAudioContext } from './audioCore.js';
import { UI } from './ui.js';

export const Player = {
    isShuffle: false,
    isRepeat: false,
    animationFrameId: null,

    playTrack(url, title, artist, cover, id) {
        // Очищаємо статус на всіх картках
        document.querySelectorAll('.track-card').forEach(card => card.classList.remove('playing-now'));

        // Шукаємо активну картку
        let activeCard = document.querySelector(`.track-card[data-id="${id}"]`);
        if (activeCard) {
            activeCard.classList.add('playing-now');
            this.updateQueue(activeCard);
        } else {
            const q = document.getElementById('queue-list');
            if (q) q.innerHTML = '<p style="font-size: 12px; color: var(--text-muted);">Кінець списку</p>';
        }

        // Оновлюємо стан
        state.currentTrackData = { url, title, artist, cover, id };
        DOM.audio.src = url;
        localStorage.setItem('lastTrackData', JSON.stringify(state.currentTrackData));

        // Оновлюємо UI плеєра
        DOM.progressBar.value = 0;
        UI.updateSliderProgress(DOM.progressBar, 0);
        DOM.timeCurrent.innerText = '0:00';
        DOM.timeTotal.innerText = '0:00';

        // Ініціалізуємо аудіо ядро
        initAudioContext();

        // Оновлюємо історію
        state.recentlyPlayed = state.recentlyPlayed.filter(t => t.id !== id);
        state.recentlyPlayed.unshift({ url, title, artist, cover, id });
        if (state.recentlyPlayed.length > 20) state.recentlyPlayed.pop();
        localStorage.setItem('recentlyPlayed', JSON.stringify(state.recentlyPlayed));
        
        // Візуальне оновлення (назви, обкладинки)
        document.getElementById('current-title').innerText = title;
        document.getElementById('current-artist').innerText = artist;
        document.getElementById('current-cover').src = cover;
        
        // Запуск
        DOM.audio.play();
        DOM.playIcon.innerText = "pause";
        DOM.vinylCover.classList.add('playing');
        
        // TODO: Додати виклик функції renderRecentTracks() з UI модуля
    },

    playNextTrack() {
        const currentCard = document.querySelector('.track-card.playing-now'); 
        if (!currentCard) return;
        
        const allCards = Array.from(currentCard.parentElement.querySelectorAll('.track-card'));
        if (this.isShuffle && allCards.length > 1) {
            let rc = allCards[Math.floor(Math.random() * allCards.length)]; 
            while (rc === currentCard) rc = allCards[Math.floor(Math.random() * allCards.length)]; 
            rc.click(); 
            return;
        }
        
        if (currentCard.nextElementSibling && currentCard.nextElementSibling.classList.contains('track-card')) {
            currentCard.nextElementSibling.click();
        } else { 
            DOM.playIcon.innerText = "play_arrow"; 
            DOM.vinylCover.classList.remove('playing'); 
            DOM.progressBar.value = 0; 
            UI.updateSliderProgress(DOM.progressBar, 0); 
        }
    },

    playPrevTrack() { 
        const currentCard = document.querySelector('.track-card.playing-now'); 
        if (currentCard && currentCard.previousElementSibling) {
            currentCard.previousElementSibling.click(); 
        }
    },

    updateQueue(activeCard) {
        const queueList = document.getElementById('queue-list'); 
        if (!queueList) return; 
        
        queueList.innerHTML = '';
        let next = activeCard.nextElementSibling;
        let count = 0;
        
        while (next && next.classList.contains('track-card') && count < 8) {
            const img = next.querySelector('img').src; 
            const title = next.querySelector('h3').innerText; 
            const artist = next.querySelector('p').innerText; 
            const onclickAction = next.getAttribute('onclick');
            
            queueList.innerHTML += `
                <div style="display: flex; align-items: center; gap: 10px; font-size: 12px; cursor: pointer; padding: 4px; border-radius: 6px; transition: 0.2s;" 
                     onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'" 
                     onclick="${onclickAction.replace(/"/g, '&quot;')}">
                    <img src="${img}" style="width: 32px; height: 32px; border-radius: 4px; object-fit: cover;">
                    <div style="overflow: hidden; white-space: nowrap; width: 100%; text-align: left;">
                        <div style="font-weight: bold; text-overflow: ellipsis; overflow: hidden;">${title}</div>
                        <div style="color: var(--text-muted); text-overflow: ellipsis; overflow: hidden;">${artist}</div>
                    </div>
                </div>`;
            next = next.nextElementSibling; 
            count++;
        }
        if (count === 0) queueList.innerHTML = '<p style="font-size: 12px; color: var(--text-muted);">Кінець списку</p>';
    }
};

// РОБИМО ФУНКЦІЮ ГЛОБАЛЬНОЮ ДЛЯ HTML (Місток для старих onclick)
window.playTrack = (url, title, artist, cover, id) => Player.playTrack(url, title, artist, cover, id);