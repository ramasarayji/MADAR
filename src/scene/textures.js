import * as THREE from 'three';
import { fbm, smooth, mix, rng } from './noise.js';

/**
 * Procedural planet textures (so the app works offline with zero assets).
 * To use REAL NASA imagery instead, drop files into public/textures/:
 *   earth.jpg  moon.jpg  mars.jpg  jupiter.jpg  stars.jpg  (equirectangular, 2:1)
 * They are picked up automatically and replace the procedural versions.
 */
function makeMaps(w, h, fn) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const b = document.createElement('canvas'); b.width = w; b.height = h;
    const cx = c.getContext('2d'), bx = b.getContext('2d');
    const ci = cx.createImageData(w, h), bi = bx.createImageData(w, h);
    const o = [0, 0, 0, 0.5, 255];
    for (let y = 0; y < h; y++) {
        const lat = (0.5 - (y + 0.5) / h) * Math.PI;
        const cl = Math.cos(lat), sl = Math.sin(lat);
        for (let x = 0; x < w; x++) {
            const lon = ((x + 0.5) / w) * Math.PI * 2;
            o[4] = 255; o[3] = 0.5;
            fn(cl * Math.cos(lon), sl, cl * Math.sin(lon), lat, lon, o);
            const i = (y * w + x) * 4;
            ci.data[i] = o[0]; ci.data[i + 1] = o[1]; ci.data[i + 2] = o[2]; ci.data[i + 3] = o[4];
            const hv = Math.max(0, Math.min(255, o[3] * 255));
            bi.data[i] = bi.data[i + 1] = bi.data[i + 2] = hv; bi.data[i + 3] = 255;
        }
    }
    cx.putImageData(ci, 0, 0); bx.putImageData(bi, 0, 0);
    return { c, b, cx, bx };
}

function craters(m, w, h, count, seed, maxR = 36) {
    const r = rng(seed);
    for (let i = 0; i < count; i++) {
        const x = r() * w, y = r() * h;
        const lat = (0.5 - y / h) * Math.PI;
        const rad = 2 + Math.pow(r(), 3.2) * maxR;
        const sx = 1 / Math.max(0.25, Math.cos(lat));
        for (const [ctx, kind] of [[m.cx, 'c'], [m.bx, 'b']]) {
            ctx.save(); ctx.translate(x, y); ctx.scale(sx, 1);
            const g = ctx.createRadialGradient(0, 0, rad * 0.15, 0, 0, rad);
            if (kind === 'c') {
                g.addColorStop(0, 'rgba(0,0,0,0.14)'); g.addColorStop(0.7, 'rgba(0,0,0,0.06)');
                g.addColorStop(0.88, 'rgba(255,255,255,0.10)'); g.addColorStop(1, 'rgba(255,255,255,0)');
            } else {
                g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.72, 'rgba(0,0,0,0.30)');
                g.addColorStop(0.88, 'rgba(255,255,255,0.65)'); g.addColorStop(1, 'rgba(255,255,255,0)');
            }
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }
}

function tex(canvas, srgb = true) {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 8;
    return t;
}

export function moonMaps() {
    const W = 1024, H = 512;
    const m = makeMaps(W, H, (x, y, z, lat, lon, o) => {
        const base = fbm(x * 4, y * 4, z * 4, 6, 1);
        const mare = smooth(0.52, 0.42, fbm(x * 1.6 + 5, y * 1.6, z * 1.6, 4, 9));
        let v = 0.55 + (base - 0.5) * 0.9;
        v = mix(v, 0.28 + (base - 0.5) * 0.4, mare);
        const g = Math.max(0, Math.min(1, v)) * 255;
        o[0] = g * 1.0; o[1] = g * 0.99; o[2] = g * 0.96; o[3] = 0.4 + (base - 0.5) * 0.7;
    });
    craters(m, W, H, 900, 11, 34);
    return { map: tex(m.c), bump: tex(m.b, false) };
}

export function marsMaps() {
    const W = 1024, H = 512;
    const m = makeMaps(W, H, (x, y, z, lat, lon, o) => {
        const n = fbm(x * 3, y * 3, z * 3, 6, 5);
        const dark = smooth(0.5, 0.62, fbm(x * 1.4 + 3, y * 1.4, z * 1.4, 4, 9));
        let r = mix(188, 140, n), g = mix(96, 62, n), b = mix(58, 40, n);
        r = mix(r, 92, dark * 0.75); g = mix(g, 58, dark * 0.75); b = mix(b, 52, dark * 0.75);
        // Valles Marineris-style canyon
        if (lon > 4.1 && lon < 5.7) {
            const c = -0.13 + 0.03 * Math.sin(lon * 7);
            const d = Math.abs(lat - c);
            const f = smooth(0.032, 0.006, d) * smooth(4.1, 4.5, lon) * smooth(5.7, 5.3, lon);
            r = mix(r, 70, f); g = mix(g, 36, f); b = mix(b, 28, f);
            o[3] = 0.5 - f * 0.4;
        } else o[3] = 0.4 + n * 0.4;
        // polar caps
        const cap = smooth(1.38, 1.46, Math.abs(lat) + (fbm(x * 8, y * 8, z * 8, 3, 2) - 0.5) * 0.12);
        o[0] = mix(r, 240, cap); o[1] = mix(g, 236, cap); o[2] = mix(b, 232, cap);
    });
    craters(m, W, H, 350, 21, 26);
    return { map: tex(m.c), bump: tex(m.b, false) };
}

export function earthMaps() {
    const W = 1024, H = 512;
    const m = makeMaps(W, H, (x, y, z, lat, lon, o) => {
        const wx = fbm(x * 1.5 + 9, y * 1.5, z * 1.5, 3, 40) - 0.5;
        const h = fbm(x * 2.3 + wx * 0.8, y * 2.3 + wx * 0.8, z * 2.3, 6, 3);
        const land = smooth(0.545, 0.56, h);
        const elev = Math.max(0, (h - 0.55) / 0.2);
        const alat = Math.abs(lat);
        const dry = fbm(x * 3 + 7, y * 3, z * 3, 4, 31);
        const desert = smooth(0.1, 0.3, alat) * smooth(0.65, 0.45, alat) * smooth(0.48, 0.6, dry);
        // ocean
        const depth = smooth(0.54, 0.3, h);
        let r = mix(22, 6, depth) + 6, g = mix(78, 28, depth), b = mix(138, 70, depth);
        // land
        let lr = mix(48, 86, dry), lg = mix(96, 108, dry), lb = mix(44, 58, dry);
        lr = mix(lr, 178, desert); lg = mix(lg, 152, desert); lb = mix(lb, 104, desert);
        const rock = smooth(0.35, 0.9, elev);
        lr = mix(lr, 128, rock); lg = mix(lg, 118, rock); lb = mix(lb, 108, rock);
        r = mix(r, lr, land); g = mix(g, lg, land); b = mix(b, lb, land);
        const ice = smooth(1.0, 1.15, alat + (fbm(x * 6, y * 6, z * 6, 3, 8) - 0.5) * 0.25);
        o[0] = mix(r, 245, ice); o[1] = mix(g, 248, ice); o[2] = mix(b, 250, ice);
        o[3] = land * (0.35 + elev * 0.6);
    });
    return { map: tex(m.c), bump: tex(m.b, false) };
}

export function cloudMap() {
    const m = makeMaps(1024, 512, (x, y, z, lat, lon, o) => {
        const wx = fbm(x * 2 + 4, y * 2, z * 2, 3, 70) - 0.5;
        const n = fbm(x * 3.2 + wx, y * 3.2 + wx * 1.4, z * 3.2, 6, 12);
        const band = 0.04 * Math.sin(lat * 9);
        const a = smooth(0.5, 0.68, n + band);
        o[0] = o[1] = o[2] = 255; o[4] = a * 235; o[3] = 0;
    });
    return tex(m.c);
}

export function jupiterMap() {
    const m = makeMaps(1024, 512, (x, y, z, lat, lon, o) => {
        const turb = fbm(x * 5, y * 14, z * 5, 5, 4) - 0.5;
        const t = Math.sin(lat * 14 + turb * 3.2) * 0.5 + 0.5;
        const t2 = Math.sin(lat * 31 + turb * 5) * 0.5 + 0.5;
        const s = t * 0.7 + t2 * 0.3;
        let r = mix(150, 232, s), g = mix(96, 200, s), b = mix(60, 160, s);
        // great red spot
        const dl = Math.atan2(Math.sin(lon - 2.2), Math.cos(lon - 2.2));
        const d = Math.hypot(dl / 0.2, (lat + 0.33) / 0.09);
        const f = smooth(1, 0.55, d);
        r = mix(r, 186, f); g = mix(g, 78, f); b = mix(b, 52, f);
        o[0] = r; o[1] = g; o[2] = b; o[3] = 0.5;
    });
    return tex(m.c);
}

export function skyTexture() {
    const W = 2048, H = 1024;
    const ax = new THREE.Vector3(0.25, 0.9, 0.35).normalize();
    const m = makeMaps(W, H, (x, y, z, lat, lon, o) => {
        const d = x * ax.x + y * ax.y + z * ax.z;
        const band = Math.exp(-d * d * 26);
        const cloud = fbm(x * 5, y * 5, z * 5, 6, 3);
        const lane = smooth(0.5, 0.62, fbm(x * 9 + 2, y * 9, z * 9, 5, 19));
        const I = Math.max(0, band * (0.25 + 1.0 * cloud) * (1 - 0.7 * lane * band));
        o[0] = 3 + I * 80; o[1] = 4 + I * 78; o[2] = 9 + I * 100; o[3] = 0;
    });
    const r = rng(99);
    const ctx = m.cx;
    for (let i = 0; i < 9000; i++) {
        const x = r() * W, y = r() * H, a = 0.25 + Math.pow(r(), 4) * 0.75;
        const hue = r();
        ctx.fillStyle = hue < 0.7 ? `rgba(255,255,255,${a})` : hue < 0.85 ? `rgba(170,200,255,${a})` : `rgba(255,214,170,${a})`;
        const s = r() < 0.05 ? 2.2 : 1;
        ctx.fillRect(x, y, s, s);
    }
    return tex(m.c);
}

export function glowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,200,120,0)') {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, inner); g.addColorStop(0.2, 'rgba(255,230,180,0.7)'); g.addColorStop(1, outer);
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    return tex(c);
}

export function solarTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#10204a'; x.fillRect(0, 0, 128, 128);
    const g = x.createLinearGradient(0, 0, 128, 128);
    g.addColorStop(0, 'rgba(90,130,220,0.35)'); g.addColorStop(1, 'rgba(20,30,80,0.1)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = 'rgba(170,190,230,0.55)'; x.lineWidth = 2;
    for (let i = 0; i <= 128; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(128, i); x.stroke(); }
    const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
}

/** Replace a material's map with a real photo if the file exists. */
export function tryRealTexture(file, apply) {
    new THREE.TextureLoader().load('/textures/' + file, t => {
        t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; apply(t);
    }, undefined, () => { /* not provided - keep procedural */ });
}
