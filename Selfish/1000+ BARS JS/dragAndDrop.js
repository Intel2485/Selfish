// dragAndDrop.js
import { Playlists } from './playlists.js';
import { UI } from './ui.js';

export const DND = {
    initDraggableCards() {
        if (typeof $.fn.draggable !== 'function') return;

        // Вимикаємо Drag & Drop на телефонах (ширина <= 850px)
        if (window.innerWidth <= 850) {
            $('.track-card').each(function () { if ($(this).data('ui-draggable')) $(this).draggable('destroy'); });
            return;
        }

        $('.track-card').each(function () { if ($(this).data('ui-draggable')) $(this).draggable('destroy'); });
        let wasDragged = false;

        $('.track-card').draggable({
            containment: 'window', appendTo: 'body', cursorAt: { top: 25, left: 25 }, distance: 15,
            helper: function () {
                return $(`
                    <div class="drag-helper glass" style="width: 220px; padding: 10px; border-radius: 12px; display: flex; align-items: center; gap: 12px; z-index: 9999; transform: rotate(6deg);">
                        <img src="${$(this).data('cover')}" style="width: 45px; height: 45px; border-radius: 6px; object-fit: cover;">
                        <div style="display: flex; flex-direction: column; overflow: hidden; width: 100%;">
                            <span style="font-size: 14px; font-weight: bold; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${$(this).data('title')}</span>
                            <span style="font-size: 12px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${$(this).data('artist')}</span>
                        </div>
                    </div>
                `);
            },
            start: function () { wasDragged = true; $('.track-card').not(this).addClass('shake-anim'); },
            stop: function () { $('.track-card').removeClass('shake-anim'); setTimeout(() => { wasDragged = false; }, 0); }
        });

        // Блокуємо клік (playTrack), якщо ми просто перетягнули картку
        $('.track-card').off('click.dragfix').on('click.dragfix', function (e) { 
            if (wasDragged) { e.stopImmediatePropagation(); return false; } 
        });
    },

    initDroppablePlaylists() {
        if (typeof $.fn.droppable !== 'function') return;
        if (window.innerWidth <= 850) {
            $('#nav-liked, .custom-pl-link').each(function () { if ($(this).data('ui-droppable')) $(this).droppable('destroy'); });
            return;
        }

        $('#nav-liked, .custom-pl-link').droppable({
            accept: '.track-card', hoverClass: 'drop-hover', tolerance: 'pointer',
            drop: function (event, ui) {
                const card = ui.draggable; 
                const trackData = { 
                    id: String(card.data('id')), url: card.data('url'), 
                    title: card.data('title'), artist: card.data('artist'), cover: card.data('cover') 
                }; 
                const targetName = $(this).data('name');
                
                if (!targetName) { 
                    const isLiked = Playlists.toggleLike(trackData);
                    if (isLiked) UI.showToast(`Додано до "Вподобані" 💜`);
                    else UI.showToast(`Вже є у "Вподобаних"`);
                } else { 
                    const added = Playlists.addToSpecific(targetName, trackData);
                    if (added) UI.showToast(`Додано до "${targetName}" 🎵`);
                    else UI.showToast(`Вже є у "${targetName}"`);
                }
            }
        });
    }
};