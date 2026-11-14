class ApolloSynthScore {
    constructor() {
        this.ctx = null;
        this.isPlaying = false;
        this.timer = null;
        this.step = 0;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.vol ?? 0.6;
        this.master.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    start() {
        this.init();
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.step = 0;

        // 138 BPM Apollo 13 inspired ostinato
        const intervalMs = (60 / 138) * 1000 / 2; // 8th notes

        this.timer = setInterval(() => {
            if (!this.isPlaying) return;
            this.playTick(this.step);
            this.step = (this.step + 1) % 32;
        }, intervalMs);
    }

    setVolume(v) {
        this.vol = v;
        if (this.master) this.master.gain.value = v;
    }

    stop() {
        this.isPlaying = false;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    playTick(step) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // Snare / Timpani pulse on 1st and 5th 8th notes
        if (step % 4 === 0) {
            this.playTimpani(55 + (step % 8 === 0 ? 0 : 7), now);
        }

        // Pulsing synth strings (A minor / D minor chords)
        const chordNotes = [220, 261.63, 329.63, 392.00]; // Am7
        if (step % 2 === 0) {
            const freq = chordNotes[(step / 2) % chordNotes.length];
            this.playSynthPad(freq, now);
        }

        // Dramatic horn accent on phrase start
        if (step === 0 || step === 16) {
            this.playHorn(440, now);
        }
    }

    playTimpani(freq, time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, time + 0.3);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, time);

        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.master);

        osc.start(time);
        osc.stop(time + 0.35);
    }

    playSynthPad(freq, time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, time);
        filter.frequency.linearRampToValueAtTime(1200, time + 0.2);

        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.master);

        osc.start(time);
        osc.stop(time + 0.3);
    }

    playHorn(freq, time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.8);

        osc.connect(gain);
        gain.connect(this.master);

        osc.start(time);
        osc.stop(time + 0.8);
    }
}

export const synthScore = new ApolloSynthScore();
