import { EQUIPMENT_DATA } from './data/equipment.js';
import { STOP_META, STAGES } from './data/stops.js';

const firstDate = (s) => (s.match(/[A-Z][a-z]+ \d{1,2}, \d{4}/) || [s])[0];
const el = (id) => document.getElementById(id);

export function buildUI(container) {
    container.insertAdjacentHTML('beforeend', `
    <div id="intro" class="intro">
      <div class="intro-card">
        <div class="pill">NASA SPACE APPS CHALLENGE · FIRST-PERSON COCKPIT READY</div>
        <h1>SPACE EXPLORER</h1>
        <p class="lead">Photorealistic Moon-to-Mars rollercoaster &amp; NASA artifact expedition</p>
        <div class="field">
          <label>🎵 Upload your chosen background soundtrack (.mp3 / .wav)</label>
          <input type="file" id="intro-audio" accept="audio/*">
          <div class="hint" id="intro-audio-name">No file chosen — a built-in orchestral score plays instead.</div>
        </div>
        <div class="field">
          <label>🎙 Select voiceover narrator</label>
          <select id="intro-voice"><option value="auto">Auto — best available voice</option></select>
          <button class="btn small" id="voice-test" type="button">▶ Preview voice</button>
        </div>
        <button id="engage" class="btn primary big" disabled>Generating planets…</button>
        <p class="tip">Tip: scroll smoothly with two fingers on your trackpad to pilot the ship along the 8 NASA stops. Space = pause.</p>
      </div>
    </div>

    <div class="hud hidden" id="hud">
      <div class="hud-top panel">
        <div class="brand"><div class="logo">▲</div><div><div class="brand-name">SPACE EXPLORER</div><div class="brand-sub" id="stage-sub">Stage 1: The Moon</div></div></div>
        <div class="chips" id="chips">
          ${EQUIPMENT_DATA.map((e, i) => `<button class="chip" data-i="${i}"><b>${i + 1}.</b> ${STOP_META[e.id].short}</button>`).join('')}
        </div>
        <div class="toggles">
          <button class="toggle" id="hud-upload">🎵 Upload Audio</button>
          <button class="toggle on" id="music-toggle"><i></i>Music: ON</button>
          <button class="toggle on" id="voice-toggle"><i></i>Voice: ON</button>
          <input type="file" id="hud-audio" accept="audio/*" hidden>
        </div>
      </div>

      <div id="warning" class="warning hidden">⚠ COMET GRAZE — SHIELDS UP</div>

      <aside id="card" class="card panel"></aside>

      <div class="hud-bottom panel">
        <div class="stats">
          <div><span>VELOCITY</span><b id="s-vel">0.01 km/s</b></div>
          <div><span>G-FORCE</span><b id="s-g">1.0 G</b></div>
          <div><span>PROGRESS</span><b id="s-prog">0%</b></div>
        </div>
        <div class="bar"><div class="bar-fill" id="bar-fill"></div></div>
        <div class="bar-labels"><span>Moon</span><span>Deep Space</span><span>Mars</span></div>
        <div class="nav">
          <button class="btn" id="prev">‹ Previous</button>
          <button class="btn" id="pause">❚❚ Pause</button>
          <button class="btn primary" id="next">Continue Journey ›</button>
        </div>
      </div>
    </div>

    <div id="modal" class="modal">
      <div class="modal-box panel">
        <div class="modal-head"><h3 id="m-title"></h3><button class="btn small" id="m-close">✕ Close</button></div>
        <div class="modal-body">
          <div id="m-view" class="m-view"></div>
          <div class="m-side" id="m-side"></div>
        </div>
        <div class="m-hint">Drag to rotate · scroll to zoom</div>
      </div>
    </div>`);
}

export function fillVoices(select, voices, current) {
    select.innerHTML = '<option value="auto">Auto — best available voice</option>' +
        voices.map(v => `<option value="${v.name}">${v.name} (${v.lang})</option>`).join('');
    select.value = current;
    if (select.value !== current) select.value = 'auto';
}

export function renderCard(i, open = false) {
    const e = EQUIPMENT_DATA[i], m = STOP_META[e.id];
    el('card').innerHTML = `
      <div class="card-top">
        <span class="pill">STOP ${i + 1} OF 8 · ${STAGES[m.stage].toUpperCase()}</span>
        <a class="verified" href="${e.source}" target="_blank" rel="noopener">NASA SOURCE ↗</a>
      </div>
      <img class="photo" src="/images/${e.id}.jpg" alt="" onerror="this.remove()">
      <h2>${e.name}</h2>
      <div class="sub">${e.type} • ${e.mission}</div>
      <div class="tiles">
        <div class="tile"><span>LAUNCH</span><b>${firstDate(e.launchDate)}</b></div>
        <div class="tile"><span>ARRIVAL</span><b>${firstDate(e.arrivalDate)}</b></div>
      </div>
      <div class="purpose"><span>KEY PURPOSE</span><p>${e.purpose}</p></div>
      <button class="more" id="more">${open ? 'Less ▴' : 'More details ▾'}</button>
      <div class="drawer ${open ? 'open' : ''}" id="drawer">
        <div class="drawer-in">
          <div><span>WHAT IT DID</span><p>${e.whatItDid}</p></div>
          <div><span>DISCOVERIES</span><p>${e.discoveries}</p></div>
          <div><span>STATUS</span><p>${e.status}</p></div>
          <div><span>DID YOU KNOW?</span><p>${e.fact}</p></div>
        </div>
      </div>
      <div class="actions">
        <button class="btn primary" id="remember">🔍 Remember My Journey</button>
        <button class="btn" id="card-next">Continue ›</button>
      </div>`;
    el('more').onclick = () => {
        const d = el('drawer'); const o = d.classList.toggle('open');
        el('more').textContent = o ? 'Less ▴' : 'More details ▾';
    };
}

export function renderModal(i) {
    const e = EQUIPMENT_DATA[i];
    el('m-title').textContent = e.name;
    el('m-side').innerHTML = `
      <div class="sub">${e.type}</div>
      <div><span>MISSION</span><p>${e.mission}</p></div>
      <div><span>SIGNIFICANCE</span><p>${e.significance}</p></div>
      <div><span>DID YOU KNOW?</span><p>${e.fact}</p></div>
      <a class="btn small" href="${e.source}" target="_blank" rel="noopener">NASA source ↗</a>`;
}
