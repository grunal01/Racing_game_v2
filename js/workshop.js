// ===== Workshop: shape models into named variants and check their hitboxes =====
// Pick a model, stretch it (width / height / depth), size it, sink it, tilt it, tint it, choose solid or drive-through,
// and see the hitbox the game would use: a shrink-wrapped hull made from the model's own shape (Rapier convex hull),
// worked out after stretching, so a stretched rock gets a stretched hitbox. Save it as a variant; Lineup shows all
// saved variants side by side with the kart; Copy all puts them on the clipboard to send back.
(function () {
  const $ = id => document.getElementById(id);
  const TINTS = { original: null, sandstone: 0xc8683a, pale: 0xd9b98c, khaki: 0x9c9455, wood: 0xb89a72, cream: 0xe6d3b0 };
  const KEY = 'workshop_variants', SEEDED = 'workshop_seeded';
  // a few starting ideas, so there is something to react to
  const SUGGEST = [
    { name: 'mesa', model: 'rock_tallF', h: 8, sx: 2.5, sy: 1, sz: 2, sink: 0, tilt: 0, turn: 0, tint: 'sandstone', solid: 'solid', hull: 'whole' },
    { name: 'spire', model: 'rock_tallC', h: 16, sx: 0.7, sy: 1, sz: 0.7, sink: 0, tilt: 0, turn: 0, tint: 'sandstone', solid: 'solid', hull: 'whole' },
    { name: 'canyon wall', model: 'cliff_large_rock', h: 14, sx: 2.2, sy: 1, sz: 0.5, sink: 0, tilt: 0, turn: 0, tint: 'sandstone', solid: 'solid', hull: 'whole' },
    { name: 'slab boulder', model: 'rock_largeD', h: 1.8, sx: 1.4, sy: 1, sz: 1, sink: 0.2, tilt: 0, turn: 0, tint: 'pale', solid: 'solid', hull: 'whole' },
    { name: 'squat cactus', model: 'cactus_tall', h: 4, sx: 1.15, sy: 0.9, sz: 1.15, sink: 0, tilt: 0, turn: 0, tint: 'original', solid: 'solid', hull: 'parts' },
    { name: 'leaning palm', model: 'tree_palmTall', h: 11, sx: 1, sy: 1, sz: 1, sink: 0, tilt: 8, turn: 0, tint: 'original', solid: 'solid', hull: 'parts' }
  ];
  const DEFAULT_H = { rock_tall: 8, rock_large: 3, rock_small: 0.8, cliff: 12, cactus_tall: 5, cactus_short: 2, tree_palm: 9, tree: 8, tent: 3.5, plant: 1, flower: 0.8, grass: 0.8, fence: 1.4, log: 1, stump: 1, campfire: 0.7, mushroom: 0.8 };
  const defaultH = m => { for (const k of Object.keys(DEFAULT_H).sort((a, b) => b.length - a.length)) if (m.startsWith(k)) return DEFAULT_H[k]; return 2; };
  const blank = model => ({ name: '', model, h: defaultH(model), sx: 1, sy: 1, sz: 1, sink: 0, tilt: 0, turn: 0, tint: 'original', solid: 'solid', hull: 'whole' });

  let lastSize = null, renderer, scene, camera, world, stage, kartObj, hullOn = true, lineup = false, V = null, saved = [];
  const cam = { az: 0.7, el: 0.32, dist: 22, target: new THREE.Vector3(0, 2, 0) };

  // ---------- storage ----------
  function loadSaved() {
    try { saved = JSON.parse(localStorage.getItem(KEY) || '[]'); if (!localStorage.getItem(SEEDED)) { saved = SUGGEST.map(s => Object.assign({}, s)).concat(saved); localStorage.setItem(SEEDED, '1'); store(); } } catch (e) { saved = SUGGEST.slice(); }
  }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {} }

  // ---------- tint: recolour a model, keeping its light and dark parts (same rule as the game) ----------
  const tintCache = {};
  function tinted(mat, tint) {
    if (tint == null) return mat; const key = mat.uuid + tint; if (tintCache[key]) return tintCache[key];
    const c = mat.color, l = 0.3 * c.r + 0.59 * c.g + 0.11 * c.b, m = mat.clone(); m.color = new THREE.Color(tint).multiplyScalar(0.55 + 0.9 * l);
    return (tintCache[key] = m);
  }

  // ---------- hull: shrink-wrap a list of points with Rapier ----------
  function hullOf(points) {
    if (points.length < 12) return null;
    const desc = RAPIER.ColliderDesc.convexHull(new Float32Array(points)); if (!desc) return null;
    const col = world.createCollider(desc), v = col.vertices(), ix = col.indices(); world.removeCollider(col, false);
    if (!v || !ix) return null;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(v), 3)); g.setIndex(Array.from(ix)); g.computeVertexNormals();
    return g;
  }
  const hullFill = new THREE.MeshBasicMaterial({ color: 0x40d0ff, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  const hullLine = new THREE.LineBasicMaterial({ color: 0x7fe6ff });

  // ---------- one variant as a 3D object: { node, size: Vector3, tris } ----------
  function buildVariant(v) {
    const parts = Assets.parts(v.model); if (!parts.length) return null;
    const k = v.h / parts.h, pivot = new THREE.Group(), body = new THREE.Group();
    body.scale.set(k * v.sx, k * v.sy, k * v.sz);
    const meshes = [];
    for (const [geo, mat, rel] of parts) { const m = new THREE.Mesh(geo, tinted(mat, TINTS[v.tint])); m.matrixAutoUpdate = false; m.matrix.copy(rel); m.castShadow = m.receiveShadow = true; body.add(m); meshes.push([geo, rel]); }
    body.updateMatrix(); body.updateMatrixWorld(true);
    const box0 = new THREE.Box3().setFromObject(body); body.position.y = -box0.min.y; body.updateMatrix();   // stand it on the ground
    pivot.add(body);
    // hull points in the pivot's space: stretched and sized, but before tilt and turn
    const lists = [], p = new THREE.Vector3(), M = new THREE.Matrix4();
    for (const [geo, rel] of meshes) {
      M.multiplyMatrices(body.matrix, rel); const pos = geo.attributes.position, out = [];
      for (let i = 0; i < pos.count; i++) { p.fromBufferAttribute(pos, i).applyMatrix4(M); out.push(p.x, p.y, p.z); }
      if (v.hull === 'parts') lists.push(out); else (lists[0] = lists[0] || []).push(...out);
    }
    let tris = 0; const hulls = new THREE.Group();
    for (const pts of lists) { const g = hullOf(pts); if (!g) continue; tris += g.index.count / 3; hulls.add(new THREE.Mesh(g, hullFill), new THREE.LineSegments(new THREE.EdgesGeometry(g, 20), hullLine)); }
    hulls.visible = hullOn && v.solid === 'solid'; hulls.userData.hull = true; pivot.add(hulls);
    pivot.rotation.set(0, v.turn * Math.PI / 180, v.tilt * Math.PI / 180); pivot.position.y = -v.sink;
    pivot.updateMatrixWorld(true);
    const size = new THREE.Box3().setFromObject(body).getSize(new THREE.Vector3());
    return { node: pivot, size, tris, parts: lists.length };
  }

  function label(text) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 96; const g = c.getContext('2d');
    g.fillStyle = 'rgba(30,22,14,0.85)'; g.fillRect(0, 0, 512, 96); g.fillStyle = '#f6c36a'; g.font = 'bold 54px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 50);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false })); s.scale.set(5, 0.94, 1); return s;
  }

  // ---------- the stage: either the variant being edited, or every saved variant in a row ----------
  function rebuild() {
    if (stage) { scene.remove(stage); }
    stage = new THREE.Group(); scene.add(stage);
    if (!lineup) {
      const b = buildVariant(V); if (!b) return; stage.add(b.node); lastSize = b.size;
      info(b);
    } else {
      let x = 0; const items = saved.map(v => buildVariant(v)).filter(Boolean);
      const total = items.reduce((s, b) => s + Math.max(b.size.x, b.size.z) + 4, 0);
      x = -total / 2;
      items.forEach((b, i) => { const w = Math.max(b.size.x, b.size.z) + 4; b.node.position.x = x + w / 2; stage.add(b.node); const l = label(saved[i].name || saved[i].model); l.position.set(x + w / 2, b.size.y + 1.6 - saved[i].sink, 0); stage.add(l); x += w; });
      $('info').innerHTML = '<b>Lineup</b> · ' + saved.length + ' saved variants · the kart is 4.4 m long · blue = hitbox (solid ones only)';
      cam.target.set(0, 3, 0); cam.dist = Math.max(30, total * 0.7);
    }
  }
  function info(b) {
    $('info').innerHTML = '<b>' + (V.name || V.model) + '</b> · ' + b.size.x.toFixed(1) + ' m wide × ' + b.size.y.toFixed(1) + ' m tall × ' + b.size.z.toFixed(1) + ' m deep · kart is 4.4 m long' +
      (V.solid === 'solid' ? ' · hitbox: ' + b.parts + (b.parts === 1 ? ' hull, ' : ' hulls, ') + b.tris + ' triangles' : ' · drive-through, no hitbox');
  }

  // ---------- panels ----------
  const CAT = n => { const a = n.split('_'); return a[0] === 'rock' || a[0] === 'tree' || a[0] === 'plant' ? a[0] + '_' + a[1].replace(/[A-Z].*$/, '') : a[0]; };
  function fillList() {
    const q = $('search').value.trim().toLowerCase(), names = Assets.natureNames().filter(n => n.toLowerCase().includes(q));
    let html = '', last = '';
    for (const n of names) { const c = CAT(n); if (c !== last) { html += '<h5>' + c.replace('_', ' ') + '</h5>'; last = c; } html += '<div data-m="' + n + '" class="' + (V && V.model === n && !lineup ? 'on' : '') + '">' + n + '</div>'; }
    $('list').innerHTML = html;
    $('list').querySelectorAll('div[data-m]').forEach(d => d.onclick = () => { V = blank(d.dataset.m); lineup = false; renderEdit(); fillList(); rebuild(); focusModel(); });
  }
  const SL = [['h', 'Size (m tall)', 0.2, 40, 0.1], ['sx', 'Width ×', 0.2, 5, 0.05], ['sy', 'Height ×', 0.2, 5, 0.05], ['sz', 'Depth ×', 0.2, 5, 0.05],
    ['sink', 'Sink (m)', 0, 20, 0.1], ['tilt', 'Tilt (°)', -45, 45, 1], ['turn', 'Turn (°)', 0, 360, 5]];
  function chips(key, opts) { return '<div class="chips" data-k="' + key + '">' + opts.map(([v, t]) => '<button data-v="' + v + '" class="' + (V[key] === v ? 'on' : '') + '">' + t + '</button>').join('') + '</div>'; }
  function renderEdit() {
    let h = '<h3>' + (lineup ? 'Lineup' : V.model) + '</h3>';
    if (!lineup) {
      h += '<h4>Shape</h4>';
      for (const [k, t, a, b, s] of SL) h += '<div class="row"><span>' + t + '</span><input type="range" data-k="' + k + '" min="' + a + '" max="' + b + '" step="' + s + '" value="' + V[k] + '"><b id="o_' + k + '">' + (+V[k]).toFixed(s < 1 ? 2 : 0) + '</b></div>';
      h += '<h4>Colour</h4>' + chips('tint', Object.keys(TINTS).map(k => [k, k]));
      h += '<h4>In the game</h4>' + chips('solid', [['solid', 'Solid (you hit it)'], ['pass', 'Drive through']]);
      h += '<h4>Hitbox shape</h4>' + chips('hull', [['whole', 'One hull'], ['parts', 'One per part']]) + '<div class="note">"One per part" follows the model\'s pieces (e.g. a palm\'s trunk and leaves) so it wraps closer.</div>';
      h += '<div style="margin-top:6px"><label><input type="checkbox" id="showHull"' + (hullOn ? ' checked' : '') + '> Show hitbox <kbd>H</kbd></label></div>';
      h += '<h4>Save</h4><input id="name" placeholder="name, e.g. mesa" value="' + (V.name || '') + '"> <button class="btn main" id="save">Save</button> <button class="btn" id="reset">Reset</button>';
    }
    h += '<h4>Saved variants (' + saved.length + ')</h4><div id="saved">' + saved.map((v, i) => '<div><span data-i="' + i + '">' + (v.name || '(unnamed)') + '<small>' + v.model + '</small></span><button data-d="' + i + '" title="delete">✕</button></div>').join('') + '</div>';
    h += '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap"><button class="btn" id="lineup">' + (lineup ? 'Back to editing' : 'Lineup: show all saved') + '</button><button class="btn" id="copy">Copy all</button></div>';
    h += '<div class="note">Copy all, then paste it to Claude to put these variants in the game.</div>';
    $('edit').innerHTML = h;
    $('edit').querySelectorAll('input[type=range]').forEach(r => r.oninput = () => { const k = r.dataset.k, s = +r.step; V[k] = +r.value; $('o_' + k).textContent = V[k].toFixed(s < 1 ? 2 : 0); rebuild(); });
    $('edit').querySelectorAll('.chips').forEach(c => c.querySelectorAll('button').forEach(b => b.onclick = () => { V[c.dataset.k] = b.dataset.v; renderEdit(); rebuild(); }));
    const sh = $('showHull'); if (sh) sh.onchange = () => { hullOn = sh.checked; rebuild(); };
    if ($('save')) $('save').onclick = () => {
      const name = $('name').value.trim() || V.model; V.name = name; const i = saved.findIndex(s => s.name === name), copy = Object.assign({}, V);
      if (i >= 0) saved[i] = copy; else saved.push(copy); store(); renderEdit(); rebuild();
    };
    if ($('reset')) $('reset').onclick = () => { V = blank(V.model); renderEdit(); rebuild(); };
    $('edit').querySelectorAll('#saved span').forEach(s => s.onclick = () => { V = Object.assign({}, saved[+s.dataset.i]); lineup = false; renderEdit(); fillList(); rebuild(); focusModel(); });
    $('edit').querySelectorAll('#saved button').forEach(b => b.onclick = () => { saved.splice(+b.dataset.d, 1); store(); renderEdit(); if (lineup) rebuild(); });
    $('lineup').onclick = () => { lineup = !lineup; renderEdit(); fillList(); rebuild(); if (!lineup) focusModel(); };
    $('copy').onclick = () => {
      const text = 'Workshop variants: ' + JSON.stringify(saved);
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => { $('copy').textContent = 'Copied!'; setTimeout(() => $('copy').textContent = 'Copy all', 1500); }, () => prompt('Copy this:', text));
    };
    $('edit').querySelectorAll('input').forEach(i => i.addEventListener('keydown', e => e.stopPropagation()));
  }
  function focusModel() { const z = lastSize || new THREE.Vector3(4, 4, 4), s = Math.max(z.x, z.y, z.z, 4); cam.target.set(0, z.y * 0.45, 0); cam.dist = Math.max(14, s * 1.9); }

  // ---------- scene ----------
  function setup() {
    renderer = new THREE.WebGLRenderer({ canvas: $('view'), antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene = new THREE.Scene(); scene.background = new THREE.Color(0xd9c8a4); scene.fog = new THREE.Fog(0xe9d6b0, 120, 500);
    camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
    scene.add(new THREE.HemisphereLight(0xfff1d6, 0xb98f5c, 1.05));
    const sun = new THREE.DirectionalLight(0xfff0cf, 2.8); sun.position.set(40, 70, 30); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = sc.bottom = -80; sc.right = sc.top = 80; sc.far = 300; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; scene.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshLambertMaterial({ color: 0xd8b67e })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    // a strip of road (14 m wide, like the game) and the kart, for scale
    const road = new THREE.Mesh(new THREE.PlaneGeometry(600, 14), new THREE.MeshLambertMaterial({ color: 0x86745f })); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.02, -14); road.receiveShadow = true; scene.add(road);
    for (const z of [-7.3, -20.7]) { const k = new THREE.Mesh(new THREE.PlaneGeometry(600, 1.4), new THREE.MeshLambertMaterial({ color: 0xd62828 })); k.rotation.x = -Math.PI / 2; k.position.set(0, 0.03, z); scene.add(k); }
    const src = Assets.car('race') || Assets.car(Assets.carNames()[0]);
    kartObj = src.clone(true); const bx = new THREE.Box3().setFromObject(kartObj), len = Math.max(bx.max.x - bx.min.x, bx.max.z - bx.min.z), s = 4.4 / len;
    kartObj.scale.setScalar(s); kartObj.rotation.y = Math.PI / 2; kartObj.position.set(-3, -bx.min.y * s, -11); kartObj.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(kartObj);
    addEventListener('resize', resize); resize();
    // orbit: drag to turn, right-drag to pan, wheel to zoom
    const cv = $('view'); let drag = null;
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, b: e.button }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointerup', () => drag = null);
    cv.addEventListener('pointermove', e => {
      if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      if (drag.b === 2 || e.shiftKey) { const r = new THREE.Vector3(Math.cos(cam.az), 0, -Math.sin(cam.az)), k = cam.dist * 0.0016; cam.target.addScaledVector(r, -dx * k); cam.target.y = Math.max(0, cam.target.y + dy * k); }
      else { cam.az -= dx * 0.006; cam.el = Math.max(0.03, Math.min(1.45, cam.el + dy * 0.005)); }
    });
    cv.addEventListener('wheel', e => { e.preventDefault(); cam.dist = Math.max(3, Math.min(600, cam.dist * Math.exp(e.deltaY * 0.001))); }, { passive: false });
    addEventListener('keydown', e => { if (e.code === 'KeyH') { hullOn = !hullOn; renderEdit(); rebuild(); } });
  }
  function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  function frame() {
    const ce = Math.cos(cam.el);
    camera.position.set(cam.target.x + Math.sin(cam.az) * ce * cam.dist, cam.target.y + Math.sin(cam.el) * cam.dist, cam.target.z + Math.cos(cam.az) * ce * cam.dist);
    camera.lookAt(cam.target); renderer.render(scene, camera); requestAnimationFrame(frame);
  }

  async function boot() {
    await RAPIER.init(); world = new RAPIER.World({ x: 0, y: -9.8, z: 0 });
    await Assets.load(); setup(); loadSaved();
    V = saved.length ? Object.assign({}, saved[0]) : blank('rock_largeA');
    $('search').oninput = fillList; $('search').addEventListener('keydown', e => e.stopPropagation());
    fillList(); renderEdit(); rebuild(); focusModel();
    $('loading').style.display = 'none'; requestAnimationFrame(frame);
    window.__ws = { get V() { return V; }, saved, rebuild, buildVariant };
  }
  boot().catch(e => { $('loading').textContent = 'Could not load: ' + e.message; console.error(e); });
})();
