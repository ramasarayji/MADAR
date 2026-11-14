import * as THREE from 'three';
import { tube } from './models.js';

const mat = (c, m = 0.6, r = 0.45, e = {}) => new THREE.MeshStandardMaterial({ color: c, metalness: m, roughness: r, ...e });

function screen(w, h) {
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
    return { canvas, ctx: canvas.getContext('2d'), tex };
}

/** First-person cockpit parented to the camera. */
export function createCockpit(camera) {
    const g = new THREE.Group();
    const hull = mat(0x0b1220, 0.7, 0.35);
    const panel = mat(0x141c2b, 0.5, 0.5);
    const trim = mat(0x1d2a40, 0.8, 0.3);
    const glowCyan = new THREE.MeshBasicMaterial({ color: 0x22d3ee });

    // dashboard body
    const dash = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 1.0), hull); dash.position.set(0, -0.76, -0.9); g.add(dash);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 0.3), panel); lip.position.set(0, -0.5, -1.35); lip.rotation.x = 0.35; g.add(lip);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.012, 0.012), glowCyan); strip.position.set(0, -0.49, -1.2); g.add(strip);

    // instrument binnacle
    const bin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.42, 0.08), panel); bin.position.set(0, -0.34, -1.12); bin.rotation.x = -0.45; g.add(bin);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.48, 0.05), trim); frame.position.copy(bin.position).add(new THREE.Vector3(0, 0, -0.03)); frame.rotation.x = -0.45; g.add(frame);

    // MFD screens
    const left = screen(512, 256), right = screen(512, 256), mid = screen(256, 128);
    const mk = (s, w, h, x) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: s.tex, toneMapped: false }));
        m.position.set(x, -0.34, -1.075); m.position.z += 0.0; m.rotation.x = -0.45;
        m.position.add(new THREE.Vector3(0, 0.018, 0.04)); g.add(m); return m;
    };
    mk(left, 0.66, 0.33, -0.55); mk(right, 0.66, 0.33, 0.55); mk(mid, 0.36, 0.18, 0);

    // A-pillars + canopy frame
    for (const s of [-1, 1]) {
        g.add(tube([s * 1.3, -0.42, -0.95], [s * 0.62, 0.72, -1.35], 0.05, hull));
        g.add(tube([s * 1.3, -0.42, -0.95], [s * 0.62, 0.72, -1.35], 0.012, glowCyan, 6)).position.x -= s * 0.05;
    }
    g.add(tube([-0.6, 0.72, -1.35], [0.6, 0.72, -1.35], 0.045, hull));
    g.add(tube([-1.4, 0.62, -0.5], [-0.6, 0.72, -1.35], 0.04, hull));
    g.add(tube([1.4, 0.62, -0.5], [0.6, 0.72, -1.35], 0.04, hull));

    // overhead switch panel
    const ov = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.07, 0.34), panel); ov.position.set(0, 0.56, -1.15); g.add(ov);
    const cols = [0x22c55e, 0xf59e0b, 0x22d3ee, 0xef4444, 0x22c55e, 0x22d3ee];
    const lights = [];
    for (let i = 0; i < 12; i++) {
        const x = -0.45 + (i % 6) * 0.18, z = -1.22 + Math.floor(i / 6) * 0.14;
        const sw = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.015, 0.04), new THREE.MeshBasicMaterial({ color: cols[i % 6] }));
        sw.position.set(x, 0.515, z + 0.1); g.add(sw); lights.push(sw);
    }

    // yoke (rolls/pitches with ship)
    const yoke = new THREE.Group(); yoke.position.set(0, -0.66, -0.58);
    const yokeMat = mat(0x0a0f18, 0.5, 0.5);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.4, 12), yokeMat); col.position.y = -0.1; yoke.add(col);
    const bar = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.022, 10, 36, Math.PI * 1.15), yokeMat); bar.rotation.z = Math.PI * 0.425 + Math.PI; yoke.add(bar);
    for (const s of [-1, 1]) { const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.16, 12), mat(0x1b2433, 0.3, 0.8)); grip.position.set(s * 0.2, 0.07, 0); yoke.add(grip); const btn = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshBasicMaterial({ color: s > 0 ? 0xef4444 : 0x22d3ee })); btn.position.set(s * 0.2, 0.13, 0.03); yoke.add(btn); }
    g.add(yoke);

    // cockpit light so it reads against black space
    const fill = new THREE.PointLight(0x7dd3fc, 1.4, 4); fill.position.set(0, 0.2, -0.3); g.add(fill);
    const warm = new THREE.PointLight(0xffb36b, 0.5, 3); warm.position.set(0.4, -0.2, -0.6); g.add(warm);

    camera.add(g);
    let acc = 0;

    function drawMFDs(s) {
        // LEFT: navigation
        let c = left.ctx; c.fillStyle = '#031019'; c.fillRect(0, 0, 512, 256);
        c.strokeStyle = '#0e7490'; c.lineWidth = 2; c.strokeRect(4, 4, 504, 248);
        c.fillStyle = '#22d3ee'; c.font = 'bold 22px monospace'; c.fillText('NAV  ' + s.stage, 16, 34);
        c.fillStyle = '#94a3b8'; c.font = '18px monospace';
        c.fillText('NEXT  ' + s.next, 16, 66);
        c.fillText('VEL   ' + s.vel.toFixed(2) + ' km/s', 16, 92);
        c.fillStyle = '#0f2a38'; c.fillRect(16, 118, 480, 14);
        c.fillStyle = '#22d3ee'; c.fillRect(16, 118, 480 * s.progress, 14);
        for (let i = 0; i < 8; i++) { const x = 16 + 480 * s.stops[i]; c.fillStyle = i === s.index ? '#fbbf24' : '#38bdf8'; c.beginPath(); c.arc(x, 125, i === s.index ? 7 : 4, 0, 7); c.fill(); }
        // little trajectory trace
        c.strokeStyle = '#155e75'; c.beginPath();
        for (let i = 0; i < 60; i++) { const x = 16 + i * 8, y = 205 + Math.sin(i * 0.35 + s.t) * 20; i ? c.lineTo(x, y) : c.moveTo(x, y); }
        c.stroke();
        c.fillStyle = '#e0f2fe'; c.fillText('HDG ' + String(Math.round(s.heading)).padStart(3, '0') + '°', 380, 34);
        left.tex.needsUpdate = true;
        // RIGHT: systems
        c = right.ctx; c.fillStyle = '#031019'; c.fillRect(0, 0, 512, 256);
        c.strokeStyle = '#0e7490'; c.strokeRect(4, 4, 504, 248);
        c.fillStyle = '#22d3ee'; c.font = 'bold 22px monospace'; c.fillText('SYSTEMS', 16, 34);
        const bars = [['G-LOAD', Math.min(1, (s.g - 1) / 3 + 0.2), s.g.toFixed(1) + ' G'], ['PWR', 0.92, '92%'], ['SHLD', s.shield, Math.round(s.shield * 100) + '%'], ['O2', 0.97, '97%']];
        bars.forEach(([n, v, t], i) => {
            const y = 56 + i * 34; c.fillStyle = '#94a3b8'; c.font = '16px monospace'; c.fillText(n, 16, y + 14);
            c.fillStyle = '#0f2a38'; c.fillRect(96, y, 300, 16);
            c.fillStyle = v > 0.8 && i === 0 ? '#f59e0b' : '#22d3ee'; c.fillRect(96, y, 300 * v, 16);
            c.fillStyle = '#e0f2fe'; c.fillText(t, 410, y + 14);
        });
        // radar
        c.strokeStyle = '#155e75'; c.beginPath(); c.arc(430, 205, 40, 0, 7); c.stroke(); c.beginPath(); c.arc(430, 205, 20, 0, 7); c.stroke();
        c.strokeStyle = '#22d3ee'; c.beginPath(); c.moveTo(430, 205); c.lineTo(430 + Math.cos(s.t * 2) * 40, 205 + Math.sin(s.t * 2) * 40); c.stroke();
        c.fillStyle = s.alert ? '#ef4444' : '#22c55e'; c.font = 'bold 16px monospace'; c.fillText(s.alert ? 'WARN: COMET' : 'ALL NOMINAL', 16, 215);
        right.tex.needsUpdate = true;
        // MID: stage
        c = mid.ctx; c.fillStyle = '#031019'; c.fillRect(0, 0, 256, 128);
        c.strokeStyle = '#0e7490'; c.strokeRect(3, 3, 250, 122);
        c.fillStyle = '#22d3ee'; c.font = 'bold 18px monospace'; c.textAlign = 'center';
        c.fillText(s.stageShort, 128, 52); c.fillStyle = '#94a3b8'; c.font = '15px monospace';
        c.fillText(Math.round(s.progress * 100) + '% COMPLETE', 128, 84); c.textAlign = 'left';
        mid.tex.needsUpdate = true;
    }

    return {
        group: g,
        update(dt, s) {
            // sway + yoke follows the ship
            g.position.x = THREE.MathUtils.lerp(g.position.x, -s.bank * 0.12, 1 - Math.exp(-dt * 4));
            g.position.y = Math.sin(s.t * 1.7) * 0.004 * (1 + s.speedNorm * 3);
            yoke.rotation.z = THREE.MathUtils.lerp(yoke.rotation.z, s.bank * 1.4, 1 - Math.exp(-dt * 6));
            yoke.rotation.x = THREE.MathUtils.lerp(yoke.rotation.x, -s.pitch * 0.8, 1 - Math.exp(-dt * 6));
            lights.forEach((l, i) => { l.visible = ((Math.floor(s.t * 2) + i) % 7) !== 0; });
            acc += dt;
            if (acc > 0.12) { acc = 0; drawMFDs(s); }
        }
    };
}
