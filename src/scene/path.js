import * as THREE from 'three';

/** Roller-coaster flight path through 8 stops. Returns curve + curve-parameter (0..1) of each stop. */
export function buildPath() {
    const P = (x, y, z, stop) => ({ p: new THREE.Vector3(x, y, z), stop });
    const main = [
        P(0, 30, 0, 0),
        P(18, 44, -80),
        P(30, 36, -160, 1),
        P(48, 10, -240),            // crater dive
        P(70, 28, -330, 2),
        P(105, 85, -450),           // climb out of lunar orbit
        P(160, 90, -620, 3),
        null,                        // corkscrew inserted here
        P(320, 150, -1000, 4),
        P(260, 220, -1250),
        P(130, 160, -1600),
        P(10, 100, -1850),
        P(-20, 60, -2000, 5),
        P(-70, 40, -2100),          // Mars canyon dive
        P(-110, 45, -2200, 6),
        P(-150, 70, -2300),
        P(-190, 40, -2400, 7)
    ];
    const pts = []; const stopPts = {};
    main.forEach(m => {
        if (m === null) {
            const a = new THREE.Vector3(160, 90, -620), b = new THREE.Vector3(320, 150, -1000);
            for (let k = 1; k <= 6; k++) {
                const t = k / 7, th = k * 1.15 * Math.PI;
                const base = a.clone().lerp(b, t);
                pts.push(base.add(new THREE.Vector3(Math.cos(th) * 46, Math.sin(th) * 46, 0)));
            }
        } else {
            pts.push(m.p);
            if (m.stop !== undefined) stopPts[m.stop] = m.p;
        }
    });
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    curve.arcLengthDivisions = 4000;
    const samples = curve.getSpacedPoints(4000);
    const stopU = [];
    for (let i = 0; i < 8; i++) {
        let best = 0, bd = Infinity;
        samples.forEach((s, k) => { const d = s.distanceToSquared(stopPts[i]); if (d < bd) { bd = d; best = k; } });
        stopU.push(best / 4000);
    }
    return { curve, stopU, length: curve.getLength() };
}
