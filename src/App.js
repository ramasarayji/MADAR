import * as THREE from 'three';
import { EQUIPMENT_DATA } from './data/equipment.js';
import { STOP_META, STAGES, INTRO_LINE, COMET_LINE } from './data/stops.js';
import { buildPath } from './scene/path.js';
import { createWorld } from './scene/world.js';
import { createCockpit } from './scene/cockpit.js';
import { buildModel } from './scene/models.js';
import { openTurntable, closeTurntable } from './scene/turntable.js';
import { AudioManager } from './audio/audioManager.js';
import { Narrator } from './audio/narrator.js';
import { buildUI, fillVoices, renderCard, renderModal } from './ui.js';

const MAXV = 0.03;          // max flight speed in curve-units / second
const UP = new THREE.Vector3(0, 1, 0);
const $ = (id) => document.getElementById(id);

export class SpaceExplorerApp {
    constructor() {
        this.container = document.getElementById('app');
        this.audio = new AudioManager();
        this.narrator = new Narrator(this.audio);
        this.u = 0; this.vel = 0; this.wheelV = 0;
        this.autoTarget = null; this.paused = false; this.running = false;
        this.atStop = null; this.cardShown = false;
        this.bank = 0; this.pitch = 0; this.g = 1; this.speedNorm = 0; this.shield = 1;
        this.shake = 0; this.cometState = { done: false, t: -1 };
        this.time = 0; this.prevU = 0;

        buildUI(this.container);
        this.initThree();
        this.initEvents();
        // let the intro paint, then generate textures
        setTimeout(() => this.buildWorld(), 60);
    }

    /* ------------------------------------------------------------ setup */
    initThree() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 12000);
        this.scene.add(this.camera);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(innerWidth, innerHeight);
        this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;
        this.container.prepend(this.renderer.domElement);
        this.clock = new THREE.Clock();
        this.lookSm = new THREE.Vector3();
        this.animate = this.animate.bind(this);
    }

    buildWorld() {
        const { curve, stopU } = buildPath();
        this.curve = curve; this.stopU = stopU;
        this.world = createWorld(this.scene);
        this.cockpit = createCockpit(this.camera);

        // 8 hardware models floating just ahead of the ship at each stop
        this.stops = EQUIPMENT_DATA.map((eq, i) => {
            const P = curve.getPointAt(stopU[i]), T = curve.getTangentAt(stopU[i]).normalize();
            const R = new THREE.Vector3().crossVectors(T, UP).normalize();
            const model = buildModel(eq.id, 8.5);
            const pos = P.clone().addScaledVector(T, 19).addScaledVector(R, -5.5).addScaledVector(UP, -0.5);
            model.position.copy(pos);
            model.rotation.y = 0.6;
            this.scene.add(model);
            if (i === 3) this.world.placeBelt(P.clone().addScaledVector(T, 60), T, R);
            return { model, pos, P, T, R };
        });

        // dashed target ring
        const pts = []; for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * 6.4, Math.sin(a) * 6.4, 0)); }
        this.ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0x22d3ee, dashSize: 0.7, gapSize: 0.5, transparent: true, opacity: 0.85, depthTest: false }));
        this.ring.computeLineDistances(); this.ring.renderOrder = 5; this.ring.visible = false;
        this.scene.add(this.ring);

        this.cometU = (stopU[3] + stopU[4]) / 2 + 0.01;

        // start view at stop 1
        this.u = stopU[0];
        this.applyCamera(0.016, true);
        this.ready = true;
        const btn = $('engage'); btn.disabled = false; btn.textContent = 'Engage Flight Deck & Thrusters';
        this.renderer.setAnimationLoop(null);
        requestAnimationFrame(this.animate);
    }

    initEvents() {
        const pick = (e) => { this.audio.setFile(e.target.files[0]); $('intro-audio-name').textContent = e.target.files[0] ? '✓ ' + e.target.files[0].name : ''; };
        $('intro-audio').addEventListener('change', pick);
        $('hud-audio').addEventListener('change', (e) => { this.audio.setFile(e.target.files[0]); });
        $('hud-upload').addEventListener('click', () => $('hud-audio').click());

        const populate = () => fillVoices($('intro-voice'), this.narrator.voices(), this.narrator.voiceName);
        populate();
        if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', populate);
        $('intro-voice').addEventListener('change', (e) => this.narrator.setVoice(e.target.value));
        $('voice-test').addEventListener('click', () => this.narrator.tts(INTRO_LINE));

        $('engage').addEventListener('click', () => this.engage());

        $('music-toggle').addEventListener('click', (e) => { const on = this.audio.toggle(); e.currentTarget.classList.toggle('on', on); e.currentTarget.lastChild.textContent = 'Music: ' + (on ? 'ON' : 'OFF'); });
        $('voice-toggle').addEventListener('click', (e) => { this.narrator.on = !this.narrator.on; if (!this.narrator.on) this.narrator.stop(); e.currentTarget.classList.toggle('on', this.narrator.on); e.currentTarget.lastChild.textContent = 'Voice: ' + (this.narrator.on ? 'ON' : 'OFF'); });

        $('next').addEventListener('click', () => this.step(1));
        $('prev').addEventListener('click', () => this.step(-1));
        $('pause').addEventListener('click', () => this.togglePause());
        document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => this.goTo(+c.dataset.i)));
        $('card').addEventListener('click', (e) => {
            if (e.target.closest('#remember')) this.openModal();
            if (e.target.closest('#card-next')) this.step(1);
        });
        $('m-close').addEventListener('click', () => this.closeModal());
        $('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') this.closeModal(); });

        addEventListener('wheel', (e) => {
            if (!this.running || $('modal').classList.contains('open') || e.target.closest('.card')) return;
            this.autoTarget = null;
            this.wheelV = THREE.MathUtils.clamp(this.wheelV + e.deltaY * 0.00005, -MAXV, MAXV);
        }, { passive: true });
        addEventListener('keydown', (e) => {
            if (!this.running) return;
            if (e.code === 'Space') { e.preventDefault(); this.togglePause(); }
            if (e.code === 'ArrowRight' || e.code === 'ArrowDown') this.step(1);
            if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') this.step(-1);
            if (e.code === 'Escape') this.closeModal();
        });
        addEventListener('resize', () => {
            this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
            this.renderer.setSize(innerWidth, innerHeight);
        });
    }

    async engage() {
        $('intro').classList.add('hidden');
        $('hud').classList.remove('hidden');
        this.running = true;
        this.audio.start();
        this.arrive(0, true);
        this.narrator.speak('intro', INTRO_LINE);
    }

    /* ------------------------------------------------------- navigation */
    nearestStop() {
        let best = 0, bd = 9;
        this.stopU.forEach((s, i) => { const d = Math.abs(s - this.u); if (d < bd) { bd = d; best = i; } });
        return { i: best, d: bd };
    }

    step(dir) {
        const n = this.nearestStop();
        let target;
        if (this.autoTarget !== null) target = this.autoTarget + dir;
        else if (n.d < 0.006) target = n.i + dir;
        else target = dir > 0 ? this.stopU.findIndex(s => s > this.u) : this.stopU.map(s => s < this.u).lastIndexOf(true);
        this.goTo(target);
    }

    goTo(i) {
        if (i < 0 || i >= 8 || !this.running) return;
        this.paused = false; this.setPauseLabel();
        this.autoTarget = i;
        this.narrator.stop();
    }

    togglePause() { this.paused = !this.paused; this.setPauseLabel(); }
    setPauseLabel() { $('pause').textContent = this.paused ? '▶ Resume' : '❚❚ Pause'; }

    arrive(i, silent = false) {
        this.atStop = i;
        renderCard(i, false);
        $('card').classList.add('show');
        this.cardShown = true;
        const m = STOP_META[EQUIPMENT_DATA[i].id];
        document.querySelectorAll('.chip').forEach((c, k) => c.classList.toggle('active', k === i));
        $('stage-sub').textContent = `${STAGES[m.stage].replace(' — ', ': ')} • ${m.stage === 1 ? 'Lunar Orbit (Earth Visible)' : m.stage === 2 ? 'Beyond the Moon' : 'Martian Orbit'}`;
        if (!silent) this.narrator.speak(EQUIPMENT_DATA[i].id, m.narration);
    }

    openModal() {
        const i = this.atStop ?? this.nearestStop().i;
        renderModal(i);
        $('modal').classList.add('open');
        this.paused = true; this.setPauseLabel();
        requestAnimationFrame(() => openTurntable($('m-view'), EQUIPMENT_DATA[i].id));
    }
    closeModal() {
        $('modal').classList.remove('open');
        closeTurntable();
        this.paused = false; this.setPauseLabel();
    }

    /* -------------------------------------------------------- per frame */
    update(dt) {
        this.time += dt;
        if (!this.running) return;
        const prev = this.u;
        if (!this.paused) {
            if (this.autoTarget !== null) {
                const tu = this.stopU[this.autoTarget], diff = tu - this.u, dist = Math.abs(diff);
                const desired = Math.min(MAXV, 0.004 + dist * 0.9);
                this.vel += (desired - this.vel) * Math.min(1, dt * 2.0);
                this.u += Math.sign(diff) * Math.min(dist, this.vel * dt);
                if (dist < 0.0004) { this.u = tu; const t = this.autoTarget; this.autoTarget = null; this.vel = 0; this.arrive(t); }
            } else {
                this.u = THREE.MathUtils.clamp(this.u + this.wheelV * dt, 0, 1);
                this.wheelV *= Math.exp(-dt * 3.5);
                if (Math.abs(this.wheelV) < 0.0004) this.wheelV = 0;
            }
        }
        const du = (this.u - prev) / Math.max(dt, 1e-4);
        const sn = THREE.MathUtils.lerp(this.speedNorm, Math.min(1, Math.abs(du) / MAXV), 1 - Math.exp(-dt * 5));
        this.speedNorm = sn;

        // arrival / leaving detection (manual scrolling too)
        const n = this.nearestStop();
        if (this.autoTarget === null && n.d < 0.0035 && this.atStop !== n.i) this.arrive(n.i);
        if (n.d > 0.012 && this.cardShown && this.autoTarget !== null || (n.d > 0.02 && this.cardShown)) { $('card').classList.remove('show'); this.cardShown = false; this.atStop = null; }

        // comet event
        if (this.u < this.cometU - 0.05) this.cometState.done = false;
        if (!this.cometState.done && this.u > this.cometU - 0.006 && this.u < this.cometU + 0.02) this.triggerComet();
        this.updateComet(dt);

        this.applyCamera(dt);
        this.world.update(dt, this.camera.position, this.u, this.stopU);
        this.stops.forEach(s => s.model.userData.update(dt));
        this.updateHud(n);
    }

    triggerComet() {
        this.cometState = { done: true, t: 0 };
        const c = this.world.comet, P = this.camera.position.clone();
        const T = this.curve.getTangentAt(this.u).normalize(), R = new THREE.Vector3().crossVectors(T, UP).normalize();
        this.cometFrom = P.clone().addScaledVector(T, 320).addScaledVector(R, 260).addScaledVector(UP, 70);
        this.cometTo = P.clone().addScaledVector(T, -80).addScaledVector(R, -30).addScaledVector(UP, 10);
        c.visible = true; this.narrator.speak('comet', COMET_LINE);
        $('warning').classList.remove('hidden');
    }
    updateComet(dt) {
        const s = this.cometState; if (s.t < 0) return;
        const c = this.world.comet; s.t += dt;
        const k = s.t / 4.5;
        if (k >= 1) { c.visible = false; s.t = -1; $('warning').classList.add('hidden'); return; }
        c.position.lerpVectors(this.cometFrom, this.cometTo, k);
        const dir = this.cometTo.clone().sub(this.cometFrom).normalize();
        c.lookAt(c.position.clone().sub(dir));       // tail (+z) trails behind
        const close = Math.max(0, 1 - Math.abs(k - 0.7) / 0.18);
        this.shake = close * 0.05; this.shield = 1 - close * 0.35;
    }

    applyCamera(dt, snap = false) {
        const u = THREE.MathUtils.clamp(this.u, 0, 1);
        const pos = this.curve.getPointAt(u), T = this.curve.getTangentAt(u).normalize();
        const R = new THREE.Vector3().crossVectors(T, UP).normalize();
        // curvature -> banking
        const d = 0.004, T1 = this.curve.getTangentAt(Math.max(0, u - d)), T2 = this.curve.getTangentAt(Math.min(1, u + d));
        const turn = T2.clone().sub(T1).dot(R);
        const bankT = THREE.MathUtils.clamp(turn * 5.0, -0.6, 0.6) * Math.min(1, this.speedNorm * 1.6);
        this.bank = THREE.MathUtils.lerp(this.bank, bankT, snap ? 1 : 1 - Math.exp(-dt * 3));
        this.pitch = Math.asin(THREE.MathUtils.clamp(T.y, -1, 1));
        // look target: ahead, drifting toward the hardware near each stop
        const ahead = pos.clone().addScaledVector(T, 60);
        let w = 0, focus = null;
        this.stops.forEach((s, i) => { const dd = Math.abs(this.stopU[i] - u); const k = 1 - THREE.MathUtils.smoothstep(dd, 0.004, 0.045); if (k > w) { w = k; focus = s; } });
        const aim = focus ? focus.pos.clone().addScaledVector(focus.R, 4.5).addScaledVector(UP, -2.5) : null;
        const target = focus ? ahead.clone().lerp(aim, w) : ahead;
        

        if (snap) this.lookSm.copy(target); else this.lookSm.lerp(target, 1 - Math.exp(-dt * 4));
        this.camera.position.copy(pos);
        this.camera.up.copy(UP);
        this.camera.lookAt(this.lookSm);
        this.camera.rotateZ(-this.bank);
        // shake + warp
        if (this.shake > 0 || this.speedNorm > 0.5) {
            const s = this.shake + this.speedNorm * 0.004;
            this.camera.position.add(new THREE.Vector3((Math.random() - .5) * s, (Math.random() - .5) * s, (Math.random() - .5) * s).multiplyScalar(10));
        }
        this.camera.fov = 68 + this.speedNorm * 16; this.camera.updateProjectionMatrix();

        // target ring around the nearest hardware
        if (focus) {
            this.ring.visible = w > 0.3; this.ring.position.copy(focus.pos);
            this.ring.quaternion.copy(this.camera.quaternion); this.ring.rotateZ(this.time * 0.3);
            this.ring.material.opacity = 0.85 * w;
        }
        this.accelG = Math.abs(this.bank) * 3.2 * this.speedNorm;
        this.g = THREE.MathUtils.lerp(this.g, 1 + this.accelG + this.speedNorm * 0.6, 1 - Math.exp(-dt * 3));
        this.heading = (Math.atan2(T.x, -T.z) * 180 / Math.PI + 360) % 360;
        this.cockpit?.update(dt, {
            bank: this.bank, pitch: this.pitch, speedNorm: this.speedNorm, t: this.time, g: this.g,
            progress: u, index: this.nearestStop().i, stops: this.stopU, heading: this.heading, shield: this.shield,
            alert: this.cometState.t >= 0, vel: 0.01 + this.speedNorm * 28.6,
            stage: STAGES[STOP_META[EQUIPMENT_DATA[this.nearestStop().i].id].stage].split('—')[1].trim().toUpperCase(),
            stageShort: STOP_META[EQUIPMENT_DATA[this.nearestStop().i].id].short.toUpperCase(),
            next: STOP_META[EQUIPMENT_DATA[Math.min(7, this.nearestStop().i + 1)].id].short
        });
        this.shield = Math.min(1, this.shield + dt * 0.1);
    }

    updateHud(n) {
        const v = 0.01 + this.speedNorm * 28.6;
        $('s-vel').textContent = v.toFixed(2) + ' km/s';
        $('s-g').textContent = this.g.toFixed(1) + ' G';
        const p = Math.round(this.u * 100);
        $('s-prog').textContent = p + '%';
        $('bar-fill').style.width = (this.u * 100) + '%';
    }

    animate() {
        requestAnimationFrame(this.animate);
        const dt = Math.min(this.clock.getDelta(), 0.05);
        this.update(dt);
        this.renderer.render(this.scene, this.camera);
    }
}
