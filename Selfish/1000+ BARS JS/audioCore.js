// audioCore.js
import { DOM, state } from './config.js';

export let audioCtx;
export let analyser;
export let eqBands = [];

// Ініціалізація аудіо-контексту (викликається після першого кліку Play)
export function initAudioContext() {
    if (audioCtx) return;
    
    // Створюємо контекст
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128; // Для візуалізатора

    const source = audioCtx.createMediaElementSource(DOM.audio);
    const frequencies = [60, 230, 910, 3600, 14000];
    
    // Створюємо 5 смуг еквалайзера
    frequencies.forEach(freq => {
        let filter = audioCtx.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1.4;
        filter.gain.value = 0;
        eqBands.push(filter);
    });

    // З'єднуємо вузли: source -> eq0 -> eq1 -> eq2 -> eq3 -> eq4 -> analyser -> destination
    source.connect(eqBands[0]);
    for (let i = 0; i < eqBands.length - 1; i++) {
        eqBands[i].connect(eqBands[i + 1]);
    }
    eqBands[eqBands.length - 1].connect(analyser);
    analyser.connect(audioCtx.destination);
}

// Застосування конкретного значення підсилення до смуги еквалайзера
export function setEqGain(index, value) {
    if (state.isEqEnabled && audioCtx && eqBands[index]) {
        eqBands[index].gain.value = value;
    }
}

// Повне оновлення всіх повзунків (при перемиканні пресетів)
export function applyAllEqValues(valuesArray) {
    eqBands.forEach((band, index) => {
        if (state.isEqEnabled && audioCtx) {
            band.gain.value = valuesArray[index];
        }
    });
}