// colorPicker.js
import { UI } from './ui.js';
import { state } from './config.js';

export const ColorPicker = {
    canvas: document.getElementById('color-canvas'),
    ctx: null,
    preview: document.getElementById('color-preview'),
    hexInput: document.getElementById('hex-color-input'),
    isSelecting: false,

    // --- ФІКС 1: Функція блокування кнопки кольору ---
    updateUI(mode) {
        const btn = document.getElementById('open-color-picker');
        if (btn) {
            if (mode === 'adaptive') { 
                btn.style.opacity = '0.3'; 
                btn.style.pointerEvents = 'none'; 
            } else { 
                btn.style.opacity = '1'; 
                btn.style.pointerEvents = 'auto'; 
            }
        }
    },

    init() {
        this.updateUI(state.colorMode); // Викликаємо при старті
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        
        const openColorPickerBtn = document.getElementById('open-color-picker');
        if (openColorPickerBtn) {
            openColorPickerBtn.addEventListener('click', () => {
                document.getElementById('custom-color-modal').classList.remove('hidden');
                setTimeout(() => this.draw(), 50);
                this.preview.style.background = state.savedColor; 
                this.preview.style.boxShadow = `0 0 15px ${state.savedColor}`; 
                this.hexInput.value = state.savedColor;
            });
        }
        
        this.canvas.addEventListener('mousedown', (e) => { this.isSelecting = true; this.pickColor(e); });
        this.canvas.addEventListener('mousemove', (e) => { if (this.isSelecting) this.pickColor(e); });
        window.addEventListener('mouseup', () => { this.isSelecting = false; });

        if (this.hexInput) {
            this.hexInput.addEventListener('input', (e) => {
                let val = e.target.value;
                if (val.startsWith('#') && (val.length === 4 || val.length === 7)) { 
                    this.preview.style.background = val; 
                    this.preview.style.boxShadow = `0 0 15px ${val}`; 
                }
            });
        }

        const applyBtn = document.getElementById('apply-color-btn');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                const fixedRadio = document.querySelector('input[name="color-mode"][value="fixed"]');
                if (fixedRadio) fixedRadio.checked = true;
                
                state.colorMode = 'fixed'; 
                localStorage.setItem('auraColorMode', 'fixed');
                
                state.savedColor = this.hexInput.value; 
                UI.applyTheme(state.savedColor);
                this.updateUI('fixed');
                
                document.getElementById('custom-color-modal').classList.add('hidden');
            });
        }

        const closeBtn = document.getElementById('close-color-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.getElementById('custom-color-modal').classList.add('hidden');
            });
        }
    },

    draw() {
        if (!this.ctx) return;
        let gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
        gradient.addColorStop(0, "rgb(255, 0, 0)"); gradient.addColorStop(0.15, "rgb(255, 0, 255)"); gradient.addColorStop(0.33, "rgb(0, 0, 255)"); gradient.addColorStop(0.49, "rgb(0, 255, 255)"); gradient.addColorStop(0.67, "rgb(0, 255, 0)"); gradient.addColorStop(0.84, "rgb(255, 255, 0)"); gradient.addColorStop(1, "rgb(255, 0, 0)");
        this.ctx.fillStyle = gradient; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        let bwGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        bwGradient.addColorStop(0, "rgba(255, 255, 255, 1)"); bwGradient.addColorStop(0.5, "rgba(255, 255, 255, 0)"); bwGradient.addColorStop(0.5, "rgba(0, 0, 0, 0)"); bwGradient.addColorStop(1, "rgba(0, 0, 0, 1)");
        this.ctx.fillStyle = bwGradient; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    },

    pickColor(e) {
        if (!this.ctx) return;
        const rect = this.canvas.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top;
        if (x < 0 || x >= rect.width || y < 0 || y >= rect.height) return;
        const scaleX = this.canvas.width / rect.width; const scaleY = this.canvas.height / rect.height;
        const pixelData = this.ctx.getImageData(x * scaleX, y * scaleY, 1, 1).data;
        const hex = "#" + [pixelData[0], pixelData[1], pixelData[2]].map(val => val.toString(16).padStart(2, '0')).join('');
        this.preview.style.background = hex; this.preview.style.boxShadow = `0 0 15px ${hex}`; this.hexInput.value = hex;
    }
};