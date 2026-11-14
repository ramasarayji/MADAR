import * as THREE from 'three';
import { solarTexture } from './textures.js';

const V = (a) => new THREE.Vector3(...a);
const mat = (color, metalness, roughness, extra = {}) => new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
let _solar;
const solarMat = (rx = 1, ry = 1) => {
    _solar = _solar || solarTexture();
    const t = _solar.clone(); t.needsUpdate = true; t.repeat.set(rx, ry);
    return new THREE.MeshStandardMaterial({ map: t, color: 0xffffff, metalness: 0.6, roughness: 0.35 });
};

const M = {
    foil: mat(0xd9a441, 0.75, 0.4),
    gold: mat(0xc9992f, 0.9, 0.3),
    silver: mat(0xc9d1d9, 0.85, 0.3),
    white: mat(0xe9edf0, 0.2, 0.5),
    dark: mat(0x2b333d, 0.6, 0.5),
    black: mat(0x0d1014, 0.4, 0.6),
    mesh: new THREE.MeshStandardMaterial({ color: 0xaab3bd, metalness: 0.8, roughness: 0.4, wireframe: true }),
    rubber: mat(0x14171b, 0.1, 0.9),
    blue: mat(0x2a60c8, 0.5, 0.4, { emissive: 0x0a1c44, emissiveIntensity: 0.6 }),
    dish: mat(0xf2f4f6, 0.3, 0.35, { side: THREE.DoubleSide })
};

export function tube(a, b, r, m, seg = 8) {
    const A = V(a), B = V(b), len = A.distanceTo(B);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), m);
    mesh.position.copy(A).add(B).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    return mesh;
}

function add(g, geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz);
    g.add(mesh); return mesh;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, s = 20) => new THREE.CylinderGeometry(rt, rb, h, s);
const cap = (r, ang = 1.0) => new THREE.SphereGeometry(r, 32, 12, 0, Math.PI * 2, 0, ang);

function dishFacing(g, r, ang, x, y, z, rotX, rotY = 0) {
    const d = add(g, cap(r, ang), M.dish, x, y, z, rotX, rotY, 0);
    return d;
}

function wheel(g, x, y, z, r = 0.34, w = 0.2, mesh = false) {
    if (mesh) {
        const t = add(g, new THREE.TorusGeometry(r, w * 0.5, 6, 24), M.mesh, x, y, z, 0, Math.PI / 2, 0);
        add(g, cyl(r * 0.35, r * 0.35, w * 1.1, 12), M.silver, x, y, z, 0, 0, Math.PI / 2);
        return t;
    }
    add(g, cyl(r, r, w, 24), M.rubber, x, y, z, 0, 0, Math.PI / 2);
    add(g, cyl(r * 0.5, r * 0.5, w * 1.05, 16), M.silver, x, y, z, 0, 0, Math.PI / 2);
}

/* ---------------- individual spacecraft ---------------- */
function lrv() {
    const g = new THREE.Group();
    add(g, box(1.5, 0.1, 2.7), M.silver, 0, 0.55, 0);
    add(g, box(0.5, 0.08, 2.9), M.white, 0, 0.5, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        wheel(g, sx * 1.0, 0.4, sz * 1.0, 0.38, 0.22, true);
        add(g, box(0.3, 0.04, 0.85), M.white, sx * 1.0, 0.82, sz * 1.0);
        g.add(tube([sx * 0.7, 0.55, sz * 0.9], [sx * 1.0, 0.4, sz * 1.0], 0.03, M.silver));
    }
    for (const x of [-0.32, 0.32]) {
        add(g, box(0.5, 0.06, 0.5), M.dark, x, 0.72, 0.1);
        add(g, box(0.5, 0.5, 0.06), M.dark, x, 1.0, -0.14);
        add(g, box(0.07, 0.3, 0.07), M.silver, x * 1.6, 0.9, 0.1);
    }
    add(g, box(1.3, 0.4, 0.7), M.foil, 0, 0.82, -0.95);
    add(g, cyl(0.03, 0.03, 0.55, 8), M.silver, 0, 0.98, 0.7);
    add(g, cyl(0.03, 0.03, 0.4, 8), M.silver, 0, 1.25, 0.7, 0, 0, Math.PI / 2);
    g.add(tube([-0.5, 0.7, 1.0], [-0.5, 1.5, 1.0], 0.03, M.silver));
    dishFacing(g, 0.5, 0.95, -0.5, 1.55, 1.0, -Math.PI / 2.4, 0.5);
    add(g, box(0.18, 0.14, 0.2), M.dark, 0.55, 1.45, 1.05);
    g.add(tube([0.55, 0.95, 1.0], [0.55, 1.4, 1.05], 0.025, M.silver));
    return g;
}

function surveyor() {
    const g = new THREE.Group();
    const feet = [0, 1, 2].map(i => { const a = i * Math.PI * 2 / 3 + 0.4; return [Math.cos(a) * 1.8, 0.06, Math.sin(a) * 1.8]; });
    feet.forEach((f, i) => {
        g.add(tube([0, 1.5, 0], f, 0.045, M.silver));
        add(g, cyl(0.28, 0.32, 0.08, 20), M.silver, f[0], 0.04, f[2]);
        const nxt = feet[(i + 1) % 3];
        g.add(tube([f[0] * 0.55, 0.8, f[2] * 0.55], [nxt[0] * 0.55, 0.8, nxt[2] * 0.55], 0.03, M.silver));
        add(g, box(0.5, 0.36, 0.34), M.foil, f[0] * 0.5, 1.0, f[2] * 0.5, 0, -i * Math.PI * 2 / 3 - 0.4, 0);
        add(g, cyl(0.07, 0.1, 0.35, 10), M.dark, f[0] * 0.45, 0.65, f[2] * 0.45);
    });
    add(g, cyl(0.12, 0.12, 1.6, 12), M.white, 0, 1.6, 0);
    add(g, cyl(0.72, 0.72, 0.05, 6), solarMat(1, 1), 0, 2.45, 0);
    add(g, cyl(0.76, 0.76, 0.03, 6), M.silver, 0, 2.42, 0);
    g.add(tube([0.5, 2.45, 0.3], [0.9, 3.2, 0.5], 0.015, M.silver));
    add(g, box(0.22, 0.28, 0.2), M.dark, 0.25, 2.0, 0.1);
    add(g, cyl(0.07, 0.07, 0.22, 12), M.black, 0.25, 2.25, 0.1);
    g.add(tube([-0.1, 1.2, 0.1], [-1.0, 0.7, 0.9], 0.03, M.silver));
    add(g, box(0.15, 0.1, 0.25), M.dark, -1.0, 0.65, 0.95);
    return g;
}

function alsep() {
    const g = new THREE.Group();
    add(g, cyl(3.4, 3.4, 0.02, 40), mat(0x6d6a66, 0.1, 1), 0, -0.02, 0);
    add(g, box(1.0, 0.65, 0.8), M.foil, 0, 0.35, 0);
    add(g, box(1.05, 0.08, 0.85), M.silver, 0, 0.72, 0);
    add(g, cyl(0.03, 0.03, 1.6, 8), M.silver, 0.35, 1.5, 0);
    dishFacing(g, 0.45, 0.95, 0.35, 2.3, 0, -Math.PI / 2.8, 0);
    // RTG with fins
    const rx = -2.4;
    add(g, cyl(0.2, 0.2, 1.0, 16), M.dark, rx, 0.3, 0.9, 0, 0, Math.PI / 2);
    for (let i = 0; i < 9; i++) add(g, cyl(0.3, 0.3, 0.02, 20), M.silver, rx - 0.4 + i * 0.1, 0.3, 0.9, 0, 0, Math.PI / 2);
    // instruments
    add(g, new THREE.SphereGeometry(0.3, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.silver, 1.6, 0.05, 0.9);
    add(g, box(0.4, 0.3, 0.4), M.foil, 1.6, 0.25, -1.1);
    add(g, cyl(0.02, 0.02, 1.0, 6), M.silver, -1.2, 0.5, -1.3);
    add(g, new THREE.SphereGeometry(0.16, 14, 12), M.white, -1.2, 1.0, -1.3);
    add(g, cyl(0.05, 0.05, 0.6, 8), M.dark, 2.6, 0.3, -0.2);
    add(g, box(0.3, 0.24, 0.3), M.dark, 2.6, 0.7, -0.2);
    // cables
    const cable = (pts) => {
        const c = new THREE.CatmullRomCurve3(pts.map(V));
        const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.getPoints(30)), new THREE.LineBasicMaterial({ color: 0xcfd6dc }));
        g.add(l);
    };
    cable([[0.5, 0.2, 0], [1.0, 0.03, 0.4], [1.6, 0.03, 0.9]]);
    cable([[-0.5, 0.2, 0], [-1.2, 0.03, -0.6], [-1.2, 0.03, -1.3]]);
    cable([[0.5, 0.2, 0.1], [1.4, 0.03, -0.5], [1.6, 0.03, -1.1]]);
    cable([[0, 0.2, 0.4], [-1.2, 0.03, 0.8], [-1.9, 0.2, 0.9]]);
    return g;
}

function dawn() {
    const g = new THREE.Group();
    add(g, box(1.2, 1.2, 1.7), M.foil, 0, 0, 0);
    add(g, box(1.24, 0.05, 1.74), M.silver, 0, 0.62, 0);
    for (const s of [-1, 1]) {
        add(g, box(0.25, 0.12, 0.12), M.silver, s * 0.7, 0, 0);
        for (let i = 0; i < 3; i++) {
            const x = s * (1.4 + i * 1.65);
            add(g, box(1.6, 0.04, 2.4), solarMat(2, 3), x, 0, 0);
            add(g, box(1.62, 0.02, 0.04), M.silver, x, 0.03, 1.2);
        }
        add(g, box(0.1, 0.1, 2.5), M.silver, s * 0.8, 0, 0);
    }
    dishFacing(g, 0.6, 1.0, 0, 0.35, 1.0, -Math.PI / 2 - 0.25);
    g.add(tube([0, 0.45, 0.9], [0, 0.4, 1.2], 0.03, M.silver));
    for (const x of [-0.25, 0, 0.25]) {
        add(g, cyl(0.1, 0.17, 0.3, 14), M.dark, x, -0.2, -1.0, Math.PI / 2, 0, 0);
        add(g, cyl(0.07, 0.07, 0.05, 14), mat(0x4ab4ff, 0, 0.3, { emissive: 0x2a9bff, emissiveIntensity: 2.2 }), x, -0.2, -1.17, Math.PI / 2, 0, 0);
    }
    add(g, box(0.35, 0.3, 0.3), M.dark, 0.35, 0.45, 0.6);
    return g;
}

function pioneer() {
    const g = new THREE.Group();
    dishFacing(g, 2.0, 0.95, 0, 0, 0.6, -Math.PI / 2);
    add(g, cyl(0.04, 0.04, 0.7, 8), M.silver, 0, 0, 1.1, Math.PI / 2, 0, 0);
    add(g, cyl(0.12, 0.12, 0.2, 10), M.dark, 0, 0, 1.45, Math.PI / 2, 0, 0);
    add(g, cyl(0.62, 0.62, 0.55, 6), M.foil, 0, 0, -0.3, Math.PI / 2, 0, 0);
    add(g, cyl(0.64, 0.64, 0.04, 6), M.silver, 0, 0, -0.03, Math.PI / 2, 0, 0);
    // plaque
    add(g, box(0.45, 0.28, 0.02), M.gold, 0.75, -0.55, -0.15, 0, 0, 0.4);
    // RTG booms
    for (const s of [-1, 1]) {
        g.add(tube([s * 0.5, 0.0, -0.4], [s * 2.8, 0.1, -0.8], 0.03, M.silver));
        for (let k = 0; k < 2; k++) add(g, cyl(0.17, 0.17, 0.75, 14), M.dark, s * (2.6 + k * 0.2), 0.1 - k * 0.3, -0.8 - k * 0.05, 0, 0, Math.PI / 2);
    }
    g.add(tube([0.1, 0.4, -0.5], [0.9, 2.8, -0.9], 0.025, M.silver));
    add(g, box(0.18, 0.18, 0.18), M.dark, 0.9, 2.85, -0.9);
    return g;
}

function sojourner() {
    const g = new THREE.Group();
    add(g, box(1.3, 0.35, 0.95), M.foil, 0, 0.62, 0);
    add(g, box(1.28, 0.05, 0.92), solarMat(2, 1.5), 0, 0.82, 0, 0, 0, 0.0);
    for (const s of [-1, 1]) {
        for (const z of [-0.62, 0, 0.62]) wheel(g, z * 0.0 + s * 0.78, 0.26, z * 1.3, 0.26, 0.2);
        g.add(tube([s * 0.55, 0.62, -0.5], [s * 0.78, 0.26, -0.8], 0.03, M.silver));
        g.add(tube([s * 0.55, 0.62, 0.0], [s * 0.78, 0.4, 0.0], 0.03, M.silver));
        g.add(tube([s * 0.78, 0.26, -0.8], [s * 0.78, 0.26, 0.8], 0.025, M.silver));
    }
    g.add(tube([0.5, 0.8, 0.2], [0.7, 1.5, 0.1], 0.015, M.silver));
    add(g, box(0.32, 0.2, 0.32), M.dark, -0.4, 0.95, 0.5);
    add(g, box(0.18, 0.12, 0.1), M.black, 0.3, 0.55, 0.52);
    add(g, box(0.4, 0.1, 0.1), M.white, 0, 0.62, 0.52);
    return g;
}

function opportunity() {
    const g = new THREE.Group();
    add(g, box(1.9, 0.14, 1.4), M.white, 0, 0.95, 0);
    add(g, box(1.8, 0.04, 1.3), solarMat(3, 2), 0, 1.04, 0);
    for (const s of [-1, 1]) {
        for (const z of [-1, 0, 1]) wheel(g, s * 1.05, 0.3, z * 0.95, 0.3, 0.22);
        g.add(tube([s * 0.9, 0.95, -0.5], [s * 1.05, 0.3, -0.95], 0.04, M.silver));
        g.add(tube([s * 0.9, 0.95, 0.4], [s * 1.05, 0.3, 0.0], 0.04, M.silver));
        g.add(tube([s * 1.05, 0.3, -0.95], [s * 1.05, 0.3, 0.95], 0.03, M.silver));
    }
    g.add(tube([-0.5, 1.0, -0.4], [-0.5, 2.0, -0.4], 0.04, M.silver));
    add(g, box(0.5, 0.18, 0.18), M.dark, -0.5, 2.1, -0.4);
    add(g, cyl(0.05, 0.05, 0.1, 10), M.black, -0.68, 2.1, -0.28, Math.PI / 2, 0, 0);
    add(g, cyl(0.05, 0.05, 0.1, 10), M.black, -0.32, 2.1, -0.28, Math.PI / 2, 0, 0);
    g.add(tube([0.6, 1.0, -0.5], [0.7, 1.55, -0.5], 0.03, M.silver));
    add(g, cyl(0.3, 0.3, 0.04, 22), M.silver, 0.7, 1.6, -0.5, 0.4, 0, 0.3);
    g.add(tube([0.2, 0.9, 0.7], [0.2, 0.7, 1.4], 0.04, M.silver));
    g.add(tube([0.2, 0.7, 1.4], [-0.2, 0.55, 1.75], 0.035, M.silver));
    add(g, box(0.3, 0.2, 0.25), M.dark, -0.3, 0.5, 1.8);
    add(g, box(1.4, 0.36, 1.0), M.foil, 0, 0.7, 0.0);
    return g;
}

function ingenuity() {
    const g = new THREE.Group();
    add(g, box(0.55, 0.4, 0.55), M.foil, 0, 0.75, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        g.add(tube([sx * 0.22, 0.6, sz * 0.22], [sx * 0.85, 0.0, sz * 0.85], 0.025, M.silver));
        add(g, cyl(0.05, 0.05, 0.02, 8), M.dark, sx * 0.85, 0.01, sz * 0.85);
    }
    add(g, cyl(0.04, 0.04, 1.1, 8), M.silver, 0, 1.7, 0);
    add(g, box(0.95, 0.03, 0.55), solarMat(2, 1), 0, 2.35, 0, 0, 0, 0.08);
    g.userData.rotors = [];
    for (const [y, dir] of [[1.55, 1], [1.95, -1]]) {
        const r = new THREE.Group(); r.position.y = y;
        add(r, cyl(0.05, 0.05, 0.1, 10), M.dark);
        for (const s of [-1, 1]) {
            const b = add(r, box(1.25, 0.02, 0.14), M.silver, s * 0.62, 0, 0);
            b.rotation.x = 0.06 * s;
        }
        r.userData.dir = dir; g.add(r); g.userData.rotors.push(r);
    }
    add(g, box(0.3, 0.2, 0.05), M.dark, 0, 0.8, 0.3);
    return g;
}

const BUILDERS = { lrv, surveyor3: surveyor, alsep, dawn, pioneer10: pioneer, sojourner, opportunity, ingenuity };

/** Returns a centred, size-normalised model wrapper with an optional update(t) animation hook. */
export function buildModel(id, size = 6) {
    const raw = (BUILDERS[id] || lrv)();
    const box3 = new THREE.Box3().setFromObject(raw);
    const c = box3.getCenter(new THREE.Vector3());
    const dim = box3.getSize(new THREE.Vector3());
    const s = size / Math.max(dim.x, dim.y, dim.z);
    raw.position.sub(c);
    const wrap = new THREE.Group();
    wrap.add(raw); wrap.scale.setScalar(s);
    wrap.userData.update = (dt) => {
        (raw.userData.rotors || []).forEach(r => { r.rotation.y += r.userData.dir * dt * 45; });
    };
    return wrap;
}
