# Space Explorer — Immersive NASA Journey

First-person cockpit ride from the Moon to Mars past 8 NASA spacecraft. Vite + Three.js, no backend.

## Run
```bash
npm install
npm run dev      # opens http://localhost:3000
npm run build    # production build in dist/
```
Needs Node 18+.

## Controls
Two-finger trackpad / mouse wheel = fly · Space = pause · ← → = previous / next stop · click a stop chip to jump.

## Add your own audio
* **Easiest:** use the *Choose File* box on the start screen (or **Upload Audio** in the HUD). Any mp3/wav.
* **Permanent:** drop a file at `public/audio/soundtrack.mp3`. It plays instead of the built-in synth score.

## Make the voiceover sound less robotic
1. Start screen → *Select voiceover narrator*. Pick a voice marked **Natural / Neural / Online** (Microsoft Edge has the best free ones; on Mac pick *Samantha* or *Daniel* after downloading the Enhanced version in System Settings → Accessibility → Spoken Content).
2. **Best quality:** record or generate (e.g. ElevenLabs) one MP3 per stop and save them as
   `public/audio/voice/<id>.mp3` with ids: `intro, lrv, surveyor3, alsep, dawn, pioneer10, sojourner, opportunity, ingenuity, comet`.
   They automatically replace the browser voice. The spoken text lives in `src/data/stops.js`.

## Real Earth / planets / space photos
Planets are generated in code so the app works offline. For real NASA imagery, save equirectangular (2:1) images in `public/textures/`:
`earth.jpg  moon.jpg  mars.jpg  jupiter.jpg  stars.jpg`
(Free from NASA Visible Earth, Solar System Scope textures, NASA SVS.) They are picked up automatically.

## Photos of each spacecraft
Save `public/images/<id>.jpg` (ids as above, e.g. `lrv.jpg`). If present it shows at the top of that stop's card.

## Code map
* `src/data/equipment.js` – mission facts · `src/data/stops.js` – labels + narration
* `src/scene/` – path, planets (`world.js`, `textures.js`), spacecraft (`models.js`), cockpit, turntable
* `src/audio/` – music manager, narrator, synth score · `src/ui.js` + `src/style.css` – HUD and cards
