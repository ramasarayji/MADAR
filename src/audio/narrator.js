/**
 * Voiceover. Uses recorded MP3s from public/audio/voice/<id>.mp3 when present,
 * otherwise the browser's speech engine with the most natural voice available.
 */
const PREFER = [/natural/i, /neural/i, /online/i, /premium|enhanced/i, /google uk english male/i, /google us english/i, /daniel|aaron|ryan|guy|samantha|serena|alex/i];

export class Narrator {
    constructor(audio) {
        this.audio = audio;
        this.on = true;
        this.voiceName = localStorage.getItem('se.voice') || 'auto';
        this.current = null;
    }

    voices() {
        return (window.speechSynthesis?.getVoices() || []).filter(v => /^en/i.test(v.lang));
    }

    bestVoice() {
        const list = this.voices();
        for (const rx of PREFER) {
            const v = list.find(x => rx.test(x.name));
            if (v) return v;
        }
        return list[0] || null;
    }

    pickVoice() {
        if (this.voiceName !== 'auto') {
            const v = this.voices().find(x => x.name === this.voiceName);
            if (v) return v;
        }
        return this.bestVoice();
    }

    setVoice(name) {
        this.voiceName = name;
        localStorage.setItem('se.voice', name);
    }

    stop() {
        window.speechSynthesis?.cancel();
        if (this.current) { this.current.pause(); this.current = null; }
        this.audio.setDuck(false);
    }

    speak(key, text) {
        if (!this.on) return;
        this.stop();
        const clip = new Audio(`/audio/voice/${key}.mp3`);
        let fellBack = false;
        const fallback = () => { if (!fellBack) { fellBack = true; this.tts(text); } };
        clip.addEventListener('error', fallback);
        clip.addEventListener('canplaythrough', () => {
            if (fellBack) return;
            this.current = clip;
            this.audio.setDuck(true);
            clip.play().catch(fallback);
        }, { once: true });
        clip.addEventListener('ended', () => this.audio.setDuck(false));
        clip.load();
        setTimeout(() => { if (!this.current && !fellBack) fallback(); }, 700);
    }

    tts(text) {
        if (!('speechSynthesis' in window)) return;
        const u = new SpeechSynthesisUtterance(text);
        const v = this.pickVoice();
        if (v) { u.voice = v; u.lang = v.lang; }
        u.rate = 0.94;   // slightly slower = less robotic
        u.pitch = 1.0;
        u.volume = 1;
        u.onstart = () => this.audio.setDuck(true);
        u.onend = u.onerror = () => this.audio.setDuck(false);
        window.speechSynthesis.speak(u);
    }
}
