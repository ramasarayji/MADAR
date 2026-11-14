import * as THREE from 'three';
import { moonMaps, marsMaps, earthMaps, cloudMap, jupiterMap, skyTexture, glowTexture, tryRealTexture } from './textures.js';
import { fbm, rng } from './noise.js';

function atmosphere(radius, color, power = 3.2) {
    return new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.045, 64, 48),
        new THREE.ShaderMaterial({
            uniforms: { c: { value: new THREE.Color(color) }, p: { value: power } },
            vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
            fragmentShader: 'varying vec3 vN; varying vec3 vV; uniform vec3 c; uniform float p; void main(){ float i=pow(1.0-abs(dot(vN,vV)),p); gl_FragColor=vec4(c*i*1.6,i); }',
            blending: THREE.AdditiveBlending, transparent: true, depthWrite: false
        })
    );
}

export const SUN_POS = new THREE.Vector3(2200, 900, 600);

export function createWorld(scene) {
    const planets = [];

    // ---- sky (procedural Milky Way; override with public/textures/stars.jpg)
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, depthWrite: false, fog: false });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(6000, 48, 32), skyMat);
    sky.renderOrder = -10;
    scene.add(sky);
    tryRealTexture('stars.jpg', t => { skyMat.map = t; skyMat.needsUpdate = true; });

    // ---- lights + sun
    scene.add(new THREE.AmbientLight(0x1b2540, 1.6));
    const sunLight = new THREE.DirectionalLight(0xfff4e0, 3.4);
    sunLight.position.copy(SUN_POS);
    scene.add(sunLight);
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    sun.position.copy(SUN_POS).multiplyScalar(2.2); sun.scale.setScalar(1500);
    scene.add(sun);

    // ---- Moon
    const mm = moonMaps();
    const moonMat = new THREE.MeshStandardMaterial({ map: mm.map, bumpMap: mm.bump, bumpScale: 3.5, roughness: 0.95, metalness: 0 });
    const moon = new THREE.Mesh(new THREE.SphereGeometry(300, 128, 96), moonMat);
    moon.position.set(-310, -130, -260);
    scene.add(moon);
    tryRealTexture('moon.jpg', t => { moonMat.map = t; moonMat.needsUpdate = true; });

    // ---- Earth + clouds + atmosphere
    const em = earthMaps();
    const earthMat = new THREE.MeshStandardMaterial({ map: em.map, bumpMap: em.bump, bumpScale: 2, roughness: 0.75, metalness: 0.05 });
    const earth = new THREE.Mesh(new THREE.SphereGeometry(260, 96, 72), earthMat);
    earth.position.set(-420, 300, -820);
    earth.rotation.y = 2.2; earth.rotation.z = 0.2;
    scene.add(earth);
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(264, 96, 72), new THREE.MeshStandardMaterial({ map: cloudMap(), transparent: true, depthWrite: false, roughness: 1 }));
    clouds.position.copy(earth.position); clouds.rotation.copy(earth.rotation);
    scene.add(clouds);
    const eAtm = atmosphere(260, 0x4a9bff); eAtm.position.copy(earth.position); scene.add(eAtm);
    tryRealTexture('earth.jpg', t => { earthMat.map = t; earthMat.bumpMap = null; earthMat.needsUpdate = true; });
    planets.push({ mesh: earth, spin: 0.004 }, { mesh: clouds, spin: 0.006 });

    // ---- Jupiter (for Pioneer 10)
    const jMat = new THREE.MeshStandardMaterial({ map: jupiterMap(), roughness: 0.9 });
    const jupiter = new THREE.Mesh(new THREE.SphereGeometry(330, 96, 72), jMat);
    jupiter.position.set(820, 40, -1120);
    jupiter.rotation.z = 0.05;
    scene.add(jupiter);
    const jAtm = atmosphere(330, 0xffc890, 4); jAtm.position.copy(jupiter.position); scene.add(jAtm);
    tryRealTexture('jupiter.jpg', t => { jMat.map = t; jMat.needsUpdate = true; });
    planets.push({ mesh: jupiter, spin: 0.01 });

    // ---- Mars
    const ma = marsMaps();
    const marsMat = new THREE.MeshStandardMaterial({ map: ma.map, bumpMap: ma.bump, bumpScale: 4, roughness: 0.95, metalness: 0 });
    const mars = new THREE.Mesh(new THREE.SphereGeometry(450, 128, 96), marsMat);
    mars.position.set(-800, -150, -2250);
    mars.rotation.y = 3.4;
    scene.add(mars);
    const mAtm = atmosphere(450, 0xff9a60, 5); mAtm.position.copy(mars.position); scene.add(mAtm);
    tryRealTexture('mars.jpg', t => { marsMat.map = t; marsMat.bumpMap = null; marsMat.needsUpdate = true; });

    // ---- Asteroid belt + Ceres (Dawn stop) - positioned later via placeBelt()
    const rockGeo = new THREE.IcosahedronGeometry(1, 2);
    const pos = rockGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const d = 0.7 + fbm(x * 1.6, y * 1.6, z * 1.6, 3, 5) * 0.9;
        pos.setXYZ(i, x * d, y * d * 0.8, z * d);
    }
    rockGeo.computeVertexNormals();
    const rocks = new THREE.InstancedMesh(rockGeo, new THREE.MeshStandardMaterial({ color: 0x8a8178, roughness: 1, flatShading: true }), 260);
    rocks.visible = false; scene.add(rocks);
    const ceresMat = new THREE.MeshStandardMaterial({ map: mm.map, bumpMap: mm.bump, bumpScale: 1.5, color: 0xb8aa9c, roughness: 1 });
    const ceres = new THREE.Mesh(new THREE.SphereGeometry(55, 64, 48), ceresMat);
    ceres.visible = false; scene.add(ceres);

    function placeBelt(center, T, R) {
        const r = rng(7); const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
        const up = new THREE.Vector3().crossVectors(R, T).normalize();
        for (let i = 0; i < 260; i++) {
            const along = (r() - 0.5) * 520, ang = r() * Math.PI * 2, rad = 25 + r() * 160;
            p.copy(center).addScaledVector(T, along).addScaledVector(R, Math.cos(ang) * rad).addScaledVector(up, Math.sin(ang) * rad * 0.6);
            q.setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6));
            s.setScalar(0.8 + Math.pow(r(), 3) * 9);
            rocks.setMatrixAt(i, m.compose(p, q, s));
        }
        rocks.instanceMatrix.needsUpdate = true;
        ceres.position.copy(center).addScaledVector(R, -130).addScaledVector(up, -35).addScaledVector(T, 70);
    }

    // ---- comet
    const comet = new THREE.Group();
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(3.2, 1), new THREE.MeshStandardMaterial({ color: 0xcfe9ff, emissive: 0x6fb7ff, emissiveIntensity: 1.2, roughness: 0.8 }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(200,235,255,1)', 'rgba(80,160,255,0)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    halo.scale.setScalar(46);
    const N = 700, tp = new Float32Array(N * 3), r2 = rng(5);
    for (let i = 0; i < N; i++) {
        const t = Math.pow(r2(), 1.5) * 150, spread = t * 0.12 + 0.5;
        tp[i * 3] = (r2() - 0.5) * spread; tp[i * 3 + 1] = (r2() - 0.5) * spread; tp[i * 3 + 2] = t;
    }
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(tp, 3));
    const tail = new THREE.Points(tg, new THREE.PointsMaterial({ color: 0x9fd2ff, size: 1.8, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
    comet.add(head, halo, tail); comet.visible = false; scene.add(comet);

    return {
        sky, comet, earth, clouds, placeBelt,
        update(dt, camPos, u, su) {
            sky.position.copy(camPos);
            // only show what belongs to the current part of the journey
            const inMoon = u < su[3] + 0.02;
            moon.visible = inMoon;
            const belt = u > su[2] - 0.02 && u < su[4] + 0.06;
            rocks.visible = ceres.visible = belt;
            jupiter.visible = jAtm.visible = u > su[2] && u < su[5];
            earth.visible = clouds.visible = eAtm.visible = u < su[4] + 0.05;
            mars.visible = mAtm.visible = u > su[4] - 0.12;
            planets.forEach(p => { p.mesh.rotation.y += p.spin * dt; });
            mars.rotation.y += 0.002 * dt; moon.rotation.y += 0.001 * dt;
        }
    };
}
