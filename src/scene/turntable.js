import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildModel } from './models.js';
import { skyTexture } from './textures.js';

let state = null;

/** Live 3D inspection viewer. Drag to rotate, scroll to zoom. */
export function openTurntable(container, id) {
    closeTurntable();
    const w = container.clientWidth || 600, h = container.clientHeight || 460;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030712);
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 200);
    camera.position.set(6, 3.5, 8);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x6b7da8, 1.4));
    const key = new THREE.DirectionalLight(0xfff2dd, 3.5); key.position.set(6, 8, 5); scene.add(key);
    const rim = new THREE.DirectionalLight(0x38bdf8, 2.0); rim.position.set(-6, 2, -6); scene.add(rim);
    const model = buildModel(id, 5.5);
    scene.add(model);
    const grid = new THREE.GridHelper(14, 14, 0x0e7490, 0x0b2230); grid.position.y = -3.2; grid.material.transparent = true; grid.material.opacity = 0.5; scene.add(grid);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.autoRotate = true; controls.autoRotateSpeed = 1.6;
    controls.minDistance = 4; controls.maxDistance = 18;
    controls.addEventListener('start', () => { controls.autoRotate = false; });

    const clock = new THREE.Clock();
    let raf;
    const loop = () => {
        raf = requestAnimationFrame(loop);
        model.userData.update(clock.getDelta());
        controls.update();
        renderer.render(scene, camera);
    };
    loop();
    const onResize = () => {
        const W = container.clientWidth, H = container.clientHeight;
        if (!W || !H) return;
        renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);
    state = { raf, renderer, controls, onResize, scene };
}

export function closeTurntable() {
    if (!state) return;
    cancelAnimationFrame(state.raf);
    window.removeEventListener('resize', state.onResize);
    state.controls.dispose();
    state.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    state.renderer.dispose();
    state = null;
}
