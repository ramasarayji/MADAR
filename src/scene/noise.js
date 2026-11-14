function hash(x, y, z, s) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177) ^ Math.imul(s | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1103515245);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967295;
}
const fade = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

export function noise3(x, y, z, s = 0) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
    return lerp(
        lerp(lerp(hash(xi, yi, zi, s), hash(xi + 1, yi, zi, s), xf), lerp(hash(xi, yi + 1, zi, s), hash(xi + 1, yi + 1, zi, s), xf), yf),
        lerp(lerp(hash(xi, yi, zi + 1, s), hash(xi + 1, yi, zi + 1, s), xf), lerp(hash(xi, yi + 1, zi + 1, s), hash(xi + 1, yi + 1, zi + 1, s), xf), yf),
        zf);
}

export function fbm(x, y, z, oct = 5, s = 0) {
    let a = 0.5, f = 1, sum = 0, norm = 0;
    for (let i = 0; i < oct; i++) {
        sum += a * noise3(x * f, y * f, z * f, s + i * 17);
        norm += a; f *= 2.07; a *= 0.5;
    }
    return sum / norm;
}

export const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const mix = lerp;

export function rng(seed) {
    let a = seed >>> 0;
    return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
