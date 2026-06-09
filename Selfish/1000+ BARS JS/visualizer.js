// visualizer.js
import { DOM, state } from './config.js';
import { analyser } from './audioCore.js';

export const Visualizer = {
    fsCoverColor: '',
    visCtx: null,
    fsVisualizer: document.getElementById('fs-visualizer'),
    fsPlayer: document.getElementById('fullscreen-player'),
    fsCoverImg: document.getElementById('vinyl-cover'),

    init() {
        if (this.fsVisualizer) {
            this.visCtx = this.fsVisualizer.getContext('2d');
            this.resizeVis();
            window.addEventListener('resize', () => this.resizeVis());
        }

        // 3D Tilt Effect для обкладинки
        if (this.fsPlayer && this.fsCoverImg) {
            this.fsPlayer.addEventListener('mousemove', (e) => {
                if (this.fsPlayer.classList.contains('hidden')) return;
                const xAxis = (window.innerWidth / 2 - e.pageX) / 25;
                const yAxis = (window.innerHeight / 2 - e.pageY) / 25;
                this.fsCoverImg.style.transform = `perspective(1000px) rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
            });
            this.fsPlayer.addEventListener('mouseleave', () => {
                this.fsCoverImg.style.transform = `perspective(1000px) rotateY(0deg) rotateX(0deg)`;
            });
        }

        // Запуск нескінченного циклу малювання
        this.drawVisualizer();
    },

    resizeVis() {
        if (this.fsVisualizer) {
            this.fsVisualizer.width = this.fsVisualizer.offsetWidth || 400;
            this.fsVisualizer.height = this.fsVisualizer.offsetHeight || 60;
        }
    },

    // Магія добування кольору з картинки
    extractColorFromCover(coverUrl) {
        this.fsCoverColor = state.savedColor || '#b026ff';
        document.documentElement.style.setProperty('--fs-accent', this.fsCoverColor);

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 1; canvas.height = 1;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, 1, 1);
                const data = ctx.getImageData(0, 0, 1, 1).data;
                let [r, g, b] = [data[0], data[1], data[2]];

                if (r < 30 && g < 30 && b < 30) { r += 80; g += 80; b += 80; }
                const isGray = Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && Math.abs(r - b) < 15;

                if (isGray) {
                    this.fsCoverColor = 'rgba(255, 255, 255, 0.85)';
                } else {
                    const max = Math.max(r, g, b);
                    if (max === r) r = Math.min(255, r + 50);
                    if (max === g) g = Math.min(255, g + 50);
                    if (max === b) b = Math.min(255, b + 50);

                    const rgbToHex = (r, g, b) => "#" + [r, g, b].map(x => {
                        const hex = x.toString(16); return hex.length === 1 ? "0" + hex : hex;
                    }).join('');
                    this.fsCoverColor = rgbToHex(r, g, b);
                }
                document.documentElement.style.setProperty('--fs-accent', this.fsCoverColor);
            } catch (e) {
                console.log("CORS/Колір помилка:", e);
            }
        };
        img.src = coverUrl;
    },

    // Малювання стовпчиків
    drawVisualizer() {
        requestAnimationFrame(() => this.drawVisualizer());
        if (!analyser || !this.visCtx || this.fsPlayer.classList.contains('hidden') || DOM.audio.paused) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        this.visCtx.clearRect(0, 0, this.fsVisualizer.width, this.fsVisualizer.height);

        const width = this.fsVisualizer.width;
        const height = this.fsVisualizer.height;
        const centerY = height / 2;
        const barWidth = (width / bufferLength) * 1.8;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const val = dataArray[i] / 255;
            const barHeight = val * (height / 2) * 0.85;

            this.visCtx.fillStyle = this.fsCoverColor || state.savedColor || '#b026ff';

            this.visCtx.globalAlpha = 0.8;
            this.visCtx.beginPath();
            this.visCtx.roundRect(x, centerY - barHeight, barWidth, barHeight, [3, 3, 0, 0]);
            this.visCtx.fill();

            this.visCtx.globalAlpha = 0.3;
            this.visCtx.beginPath();
            this.visCtx.roundRect(x, centerY, barWidth, barHeight * 0.6, [0, 0, 3, 3]);
            this.visCtx.fill();

            x += barWidth + 2;
        }
    }
};