// ===== Main: scene, light, camera, input, laps, HUD =====
(function () {
  const $ = id => document.getElementById(id);
  let renderer, scene, camera, sun, hemi, sky, ground, world = 'desert', car, T, carNames = [], carIdx = 0, running = false;
  const keys = {};
  addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT') { if (e.code !== 'Tab') return; }
    keys[e.code] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
    if (!running || e.repeat) return;
    if (e.code === 'Tab') Tuning.toggle();
    if (e.code === 'KeyR') resetToRoad();
    if (e.code === 'KeyH') toast(Obstacles.toggleBoxes() ? 'Hitboxes on' : 'Hitboxes off');
    if (e.code === 'KeyO') { Obstacles.reset(); toast('Obstacles reset'); }
    if (e.code === 'KeyC') nextCar(e.shiftKey ? -1 : 1);
  });
  addEventListener('keyup', e => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  const down = (...c) => c.some(k => keys[k]);

  function setupScene() {
    renderer = new THREE.WebGLRenderer({ canvas: $('view'), antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xa9c9a4, 140, 620);
    camera = new THREE.PerspectiveCamera(62, 1, 0.3, 2000);
    // sky: a gradient dome that fades into the haze at the horizon
    sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(0x4f95d6) }, mid: { value: new THREE.Color(0xbfdcef) }, haze: { value: new THREE.Color(0xa9c9a4) } },
      vertexShader: 'varying vec3 vd; void main(){ vd = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 haze; varying vec3 vd; void main(){ float t = clamp(vd.y, 0.0, 1.0); vec3 c = mix(mid, top, pow(t, 0.6)); c = mix(c, haze, exp(-max(vd.y, 0.0) * 10.0)); gl_FragColor = vec4(c, 1.0); }' }));
    scene.add(sky);
    hemi = new THREE.HemisphereLight(0xd8ecff, 0x41592c, 1.0); scene.add(hemi);
    sun = new THREE.DirectionalLight(0xfff0d6, 2.3); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = sc.bottom = -90; sc.right = sc.top = 90; sc.near = 1; sc.far = 400; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
    scene.add(sun, sun.target);
    // ground (its colour comes from the world, see applyWorld)
    ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshLambertMaterial()); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.5; ground.receiveShadow = true; scene.add(ground);
    addEventListener('resize', resize); resize();
  }
  // a map: its surfaces, sky, haze, light, ground and road colours (country, jungle, tundra, desert)
  function applyWorld(w) {
    world = w; Surfaces.setMap(w); const E = Scenery.ENV[w];
    scene.fog.color.set(E.fog); scene.fog.near = E.near; scene.fog.far = E.far;
    const u = sky.material.uniforms; u.top.value.set(E.top); u.mid.value.set(E.mid); u.haze.value.set(E.fog);
    hemi.color.set(E.hemiSky); hemi.groundColor.set(E.hemiGround); hemi.intensity = E.hemi; sun.color.set(E.sun); sun.intensity = E.sunI;
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = E.ground; g.fillRect(0, 0, 256, 256);
    for (let k = 0; k < 3000; k++) { g.fillStyle = Math.random() < 0.5 ? E.specks[0] : E.specks[1]; g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(200, 200); t.colorSpace = THREE.SRGBColorSpace;
    if (ground.material.map) ground.material.map.dispose(); ground.material.map = t; ground.material.needsUpdate = true;
    Track.setLook({ road: E.road, skirt: E.skirt, groundMat: ground.material, tunnel: E.tunnel, sectorColors: [0, 1, 2, 3].map(k => Surfaces.DEF[Surfaces.sectorId(k)].color) });
    try { localStorage.setItem('r31_map', w); } catch (e) {}
  }
  // the lab: put any road surface on any sector, to compare them on the same corner
  function fillLab() {
    const ids = Surfaces.roadIds(), lab = Surfaces.lab;
    $('lab').innerHTML = 'Lab' + [0, 1, 2, 3].map(k => ' <span>S' + (k + 1) + '</span><select data-k="' + k + '"><option value="">' + Surfaces.DEF[Surfaces.MAPS[world].sectors[k]].name + ' (map)</option>' +
      ids.map(id => '<option value="' + id + '"' + (lab[k] === id ? ' selected' : '') + '>' + Surfaces.DEF[id].name + '</option>').join('') + '</select>').join('');
    $('lab').querySelectorAll('select').forEach(s => s.onchange = () => { Surfaces.setLab(+s.dataset.k, s.value); applyWorld(world); buildTrack(Tuning.trackOpts()); Tuning.refresh(); s.blur(); });
  }
  function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }

  function buildTrack(opts) { Track.build(scene, opts); Phys.setTrack(); Scenery.build(scene, Surfaces.MAPS[world].scenery, T); Obstacles.build(scene, world); if (car) resetToRoad(true); }
  function resetToRoad(toStart) {
    const S = Track.S, i = toStart ? 6 : (car.ground ? car.ground.i : 6), m = S[i];
    Car.place(car, m.x, m.z, Math.atan2(m.hx, m.hz)); lap.cur = 0; lap.armed = false; if (toStart) lap.t0 = null;
  }
  function nextCar(d) { carIdx = (carIdx + d + carNames.length) % carNames.length; Car.setModel(car, carNames[carIdx]); try { localStorage.setItem('r1_car', carNames[carIdx]); } catch (e) {} toast(carNames[carIdx]); fillCarSelect(); }

  // ---- laps ----
  const lap = { t0: null, best: null, last: null, n: 0, prevI: 0, armed: false };
  function updateLap(now) {
    const i = car.ground ? car.ground.i : 0, N = Track.S.length;
    if (i > N * 0.45 && i < N * 0.55) lap.armed = true;                 // you have to get halfway round before the line counts
    if (lap.prevI > N - 40 && i < 40 && car.speed > 0) {                // crossed the start line going forwards
      if (lap.t0 !== null && lap.armed) { lap.last = now - lap.t0; if (!lap.best || lap.last < lap.best) { lap.best = lap.last; toast('Best lap ' + fmt(lap.best)); } lap.n++; }
      lap.t0 = now; lap.armed = false; Obstacles.reset();   // walls rebuild every lap
    }
    lap.prevI = i;
  }
  const fmt = ms => ms == null ? '--:--.--' : (Math.floor(ms / 60000) + ':' + ((ms % 60000) / 1000).toFixed(2).padStart(5, '0'));
  let toastT = 0; function toast(s) { $('toast').textContent = s; $('toast').style.opacity = 1; toastT = 1.6; }

  // ---- camera ----
  const cam = { yaw: 0, pos: new THREE.Vector3(), look: new THREE.Vector3(), init: false };
  function updateCamera(dt, x, y, z, yaw) {
    // follow the direction of travel more than the nose, so a slide swings the car under the camera instead of dragging the view
    const sp = Math.hypot(car.vx, car.vz), travel = sp > 4 ? Math.atan2(car.vx, car.vz) : yaw;
    let target = sp > 4 ? travel + angDiff(yaw, travel) * 0.35 : yaw;
    if (car.speed < -1) target = yaw;
    if (!cam.init) { cam.yaw = target; }
    cam.yaw += angDiff(target, cam.yaw) * Math.min(1, T.camLag * 0.6 * dt);
    const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw);
    const want = new THREE.Vector3(x - fx * T.camDist, y + T.camHeight, z - fz * T.camDist);
    const g = Track.surface(want.x, want.z, car.hint); want.y = Math.max(want.y, g.y + 1.2);
    if (!cam.init) { cam.pos.copy(want); cam.look.set(x, y + 1, z); cam.init = true; }
    cam.pos.lerp(want, Math.min(1, T.camLag * dt));
    const lookT = new THREE.Vector3(x + fx * T.camLook, y + 1.1, z + fz * T.camLook);
    cam.look.lerp(lookT, Math.min(1, 12 * dt));
    camera.position.copy(cam.pos); camera.lookAt(cam.look);
    const f = T.fov + T.fovBoost * Math.max(0, Math.min(1.3, car.speed / T.topSpeed)) ** 2;
    if (Math.abs(camera.fov - f) > 0.05) { camera.fov += (f - camera.fov) * Math.min(1, 4 * dt); camera.updateProjectionMatrix(); }
  }
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

  // ---- loop: physics in fixed 1/120 s steps, drawn between steps ----
  const STEP = 1 / 120; let acc = 0, last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000 || 0); last = now; acc += dt;
    T = Tuning.T;
    const inp = { throttle: down('KeyW', 'ArrowUp'), brake: down('KeyS', 'ArrowDown'), steer: (down('KeyD', 'ArrowRight') ? 1 : 0) - (down('KeyA', 'ArrowLeft') ? 1 : 0) };
    let n = 0;
    while (acc >= STEP && n < 12) { Car.savePrev(car); Car.step(car, T, inp, STEP); acc -= STEP; n++; }
    if (n >= 12) acc = 0;
    Car.draw(car, dt, acc / STEP); Obstacles.draw(car);
    const ix = car.ix, iy = car.iy, iz = car.iz, iyaw = car.iyaw;
    updateCamera(dt, ix, iy, iz, iyaw);
    sun.position.set(ix + 60, 110, iz + 35); sun.target.position.set(ix, 0, iz);
    updateLap(now); hud(now, inp, dt);
    sky.position.copy(camera.position); renderer.render(scene, camera);
  }
  let lastHud = '';
  function hud(now, inp, dt) {
    const z = car.ground ? car.ground.zone : 'A', Z = Scenery.ZONES[z];
    const sf = Surfaces.get(Surfaces.sectorId('ABCD'.indexOf(z)), T), pc = v => Math.round(v * 100) + '%';
    const html = '<div class="zLetter">S' + ('ABCD'.indexOf(z) + 1) + '</div><div><div class="zName">' + sf.name + '</div><div class="zNote">grip ' + pc(sf.grip) + ' · drag ' + sf.drag.toFixed(2) + ' · top speed ' + pc(sf.top) + ' · brakes ' + pc(sf.brake) + (Z ? ' · scenery: ' + Z.name : '') + '</div></div>';
    if (html !== lastHud) { $('zone').innerHTML = html; lastHud = html; }
    $('speed').textContent = Math.round(Math.hypot(car.vx, car.vz) * 3.6);
    $('laps').innerHTML = 'Lap <b>' + fmt(lap.t0 === null ? null : now - lap.t0) + '</b><br>Last ' + fmt(lap.last) + '<br>Best ' + fmt(lap.best);
    // live readout so it's easy to say what the car was doing when it felt wrong
    const slideDeg = Math.round(Math.abs(car.slipR) * 57.3), lim = slideDeg > 4;
    $('tele').innerHTML = '<b class="' + (lim ? 'm-wide' : 'm-grip') + '">' + (car.air ? 'AIR' : lim ? 'SLIDING' : 'GRIP') + '</b> · slide ' + slideDeg + '° · bank ' + Math.round((car.ground ? car.ground.b : 0) * 57.3) + '° · ' + (car.surf ? car.surf.name : '');
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').style.opacity = 0; }
  }
  function fillCarSelect() { $('carSel').innerHTML = carNames.map((n, i) => '<option value="' + i + '"' + (i === carIdx ? ' selected' : '') + '>' + n + '</option>').join(''); }

  async function boot() {
    setupScene();
    await Phys.init(Car.DEF.gravity);
    await Assets.load(p => { $('loadBar').style.width = Math.round(p * 100) + '%'; });
    T = Tuning.init(opts => buildTrack(opts));
    try { world = localStorage.getItem('r31_map') || 'desert'; } catch (e) {} if (!Surfaces.MAPS[world]) world = 'desert';
    applyWorld(world); Track.build(scene, Tuning.trackOpts()); Phys.setTrack(); Scenery.build(scene, Surfaces.MAPS[world].scenery, T); Obstacles.build(scene, world);
    Obstacles.onHit = (h, TT) => toast(h.broke ? 'Smashed through at ' + Math.round(h.kmh) + ' km/h' : h.it.kind === 'break' ? 'Wall held: ' + Math.round(h.kmh) + ' km/h into it (needs ' + TT.breakKmh + ')' : (h.glancing ? 'Glancing hit: ' : 'Head-on: ') + Math.round(h.kmh) + ' km/h into the ' + h.it.label);
    carNames = Assets.carNames(); let saved = null; try { saved = localStorage.getItem('r1_car'); } catch (e) {}
    carIdx = Math.max(0, carNames.indexOf(saved || 'race'));
    car = Car.create(scene, carNames[carIdx]); resetToRoad(true);
    fillCarSelect(); $('carSel').onchange = e => { carIdx = +e.target.value; nextCar(0); };
    $('worldSel').innerHTML = Object.entries(Surfaces.MAPS).map(([k, m]) => '<option value="' + k + '"' + (k === world ? ' selected' : '') + '>' + m.name + '</option>').join('');
    $('worldSel').onchange = e => { applyWorld(e.target.value); buildTrack(Tuning.trackOpts()); fillLab(); Tuning.refresh(); e.target.blur(); };
    fillLab();
    $('loading').style.display = 'none'; $('start').style.display = 'flex';
    $('go').onclick = () => { $('start').style.display = 'none'; running = true; lap.t0 = performance.now(); $('view').focus(); };
    last = performance.now(); requestAnimationFrame(frame);
    window.__game = { car, Track, Scenery, keys, Phys, get camera() { return camera; }, get scene() { return scene; } };
  }
  boot().catch(e => { $('loading').textContent = 'Could not load: ' + e.message; console.error(e); });
})();
