import { synthScore } from './synthScore.js';

/**
 * Background music.
 * Priority: 1) file the user uploaded  2) public/audio/soundtrack.mp3  3) built-in synth score
 */
export class AudioManager {
    constructor() {
        this.el = new Audio();
        this.el.loop = true;
        this.mode = 'auto';        // 'file' | 'default' | 'synth' | 'auto'
        this.musicOn = true;
        this.started = false;
        this.volume = 0.6;
        this.duck = 1;
        this.fileName = '';
        this.objUrl = null;
    }

    setFile(file) {
        if (!file) return;
        if (this.objUrl) URL.revokeObjectURL(this.objUrl);
        this.objUrl = URL.createObjectURL(file);
        this.el.src = this.objUrl;
        this.mode = 'file';
        this.fileName = file.name;
        if (this.started && this.musicOn) this.play();
    }

    async resolveAuto() {
        try {
            const r = await fetch('/audio/soundtrack.mp3', { method: 'HEAD' });
            const type = r.headers.get('content-type') || '';
            if (r.ok && /audio|mpeg|octet/.test(type)) {
                this.el.src = '/audio/soundtrack.mp3';
                return 'default';
            }
        } catch (e) { /* ignore */ }
        return 'synth';
    }

    async start() {
        this.started = true;
        await this.play();
    }

    async play() {
        if (!this.musicOn) return;
        if (this.mode === 'auto') this.mode = await this.resolveAuto();
        this.applyVolume();
        if (this.mode === 'synth') {
            synthScore.start();
        } else {
            synthScore.stop();
            try { await this.el.play(); } catch (e) { console.warn('Audio blocked', e); }
        }
    }

    stop() {
        this.el.pause();
        synthScore.stop();
    }

    toggle() {
        this.musicOn = !this.musicOn;
        if (this.musicOn) this.play(); else this.stop();
        return this.musicOn;
    }

    setDuck(on) {
        this.duck = on ? 0.3 : 1;
        this.applyVolume();
    }

    applyVolume() {
        const v = this.volume * this.duck;
        this.el.volume = v;
        synthScore.setVolume(v);
    }
}
