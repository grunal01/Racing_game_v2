// ===== Scenery: four labelled designs per world (jungle, desert), one per section of the loop =====
// Each zone is one straight plus the corner after it: A flat corner, B 10°, C 20°, D 30° bank. Each is a separate idea so we can compare them side by side.
// Every zone has three live dials (tuning panel, Scenery): how much stuff, how close to the road, how big.
const Scenery = (function () {
  const JUNGLE = {
    A: { name: 'Rainforest wall', note: 'Tall dark trees and thick undergrowth packed tight to the road (Kenney Nature Kit)' },
    B: { name: 'Tropical', note: 'Palms, big leaves and flowers; open and bright (Kenney Nature Kit)' },
    C: { name: 'Ruins and rocks', note: 'Boulders, stone pillars, broken walls, logs and mushrooms (Kenney Nature Kit)' },
    D: { name: 'v17 canopy', note: 'The giant code-built trees from v17, with crowns over the road' }
  };
  const DESERT = {
    A: { name: 'Open dunes', note: 'Big empty sand dunes rolling away, the odd cactus and rock; long views, very sparse' },
    B: { name: 'Canyon', note: 'Tall red sandstone pillars and cliffs packed tight to the road, like a gorge' },
    C: { name: 'Cactus scrub', note: 'A field of tall cacti, dry bushes and stones, with a fence along the road; medium density' },
    D: { name: 'Oasis camp', note: 'A palm-ringed pool with tents and a campfire beside the road; one dense landmark, sparse elsewhere' }
  };
  let group = null, seed = 1, cur = { d: 1, n: 0, s: 1 }, world = 'desert';
  const ZONES_OF = { jungle: JUNGLE, desert: DESERT };
  const R = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const pick = a => a[Math.floor(R() * a.length)];

  // spots beside the road in one zone. side: 1 = left of the road, -1 = right. lat0..lat1 = metres beyond the kerb
  function spots(zone, n, side, lat0, lat1) {
    const S = Track.S.filter(m => m.zone === zone), out = [];
    n = Math.round(n * cur.d); lat0 = Math.max(-1, lat0 + cur.n); lat1 = Math.max(lat0 + 0.5, lat1 + cur.n);
    for (let t = 0, tries = 0; t < n && tries < n * 6; tries++) {
      const m = S[Math.floor(R() * S.length)];
      const clear = m.E + 1.5, lat = lat0 + R() * (lat1 - lat0);
      const u = side * (clear + lat), x = m.x + m.ox * u, z = m.z + m.oz * u;
      if (Track.clearOf(x, z) < Math.min(lat, 4) + 1.4) continue;   // keep off every other bit of road, and out of the tunnel's hill
      out.push({ x, z, m }); t++;
    }
    return out;
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  // instance a Kenney model at many spots. each item: { x, y, z, h (height in metres), ry, tilt }
  // tint: recolour a model (e.g. grey Kenney rocks to sandstone), keeping its light and dark parts
  const tintCache = {};
  function tinted(mat, tint) {
    if (!tint) return mat; const key = mat.uuid + tint; if (tintCache[key]) return tintCache[key];
    const c = mat.color, l = 0.3 * c.r + 0.59 * c.g + 0.11 * c.b, m = mat.clone(); m.color = new THREE.Color(tint).multiplyScalar(0.55 + 0.9 * l);
    return (tintCache[key] = m);
  }
  function instance(name, items, cast, tint) {
    const parts = Assets.parts(name); if (!parts.length || !items.length) return;
    for (const [geo, mat0, rel] of parts) {
      const mat = tinted(mat0, tint), im = new THREE.InstancedMesh(geo, mat, items.length);
      items.forEach((it, i) => { const k = it.h / parts.h; e.set(it.tilt || 0, it.ry || 0, (it.tilt2 || 0)); q.setFromEuler(e); v.set(it.x, (it.y || 0) + Track.groundY(it.x, it.z), it.z); sc.set(k * (it.sx || 1), k, k * (it.sx || 1)); m4.compose(v, q, sc).multiply(rel); im.setMatrixAt(i, m4); });
      im.castShadow = cast !== false; im.receiveShadow = true; group.add(im);
    }
  }
  const spread = (name, list, h0, h1, extra, tint) => instance(name, list.map(p => Object.assign({ x: p.x, z: p.z, h: (h0 + R() * (h1 - h0)) * cur.s, ry: R() * 6.28 }, extra || {})), true, tint);
  // several models share a list of spots at random
  function mix(names, list, h0, h1, extra, tint) { const by = {}; for (const p of list) { const n = pick(names); (by[n] = by[n] || []).push(p); } for (const n in by) spread(n, by[n], h0, h1, extra, tint); }
  function patches(zone, n, cols, r0, r1) {   // flat colour patches on the ground (sand, leaf litter, dirt)
    r0 *= cur.s; r1 *= cur.s; const list = spots(zone, n, R() < 0.5 ? 1 : -1, 0, 30).concat(spots(zone, n, -1, 0, 20));
    const im = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 9).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xffffff }), list.length), c = new THREE.Color();
    list.forEach((p, i) => { const r = r0 + R() * (r1 - r0); m4.compose(v.set(p.x, Track.groundY(p.x, p.z) + 0.05 + i * 0.0001, p.z), q.identity(), sc.set(r, 1, r * (0.6 + R() * 0.6))); im.setMatrixAt(i, m4); im.setColorAt(i, c.set(pick(cols))); });
    im.receiveShadow = true; group.add(im);
  }

  function sign(zone) {
    const S = Track.S.filter(m => m.zone === zone), m = S[Math.min(S.length - 1, 12)], z = ZONES_OF[world][zone], col = world === 'desert' ? ['#5a3519', '#f6c36a', '#f3e3c8'] : ['#16351f', '#f4c430', '#cfe8d2'];
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 384; const g = cv.getContext('2d');
    g.fillStyle = col[0]; g.fillRect(0, 0, 1024, 384); g.strokeStyle = col[1]; g.lineWidth = 14; g.strokeRect(7, 7, 1010, 370);
    g.fillStyle = col[1]; g.font = 'bold 190px system-ui, sans-serif'; g.fillText(zone, 50, 230);
    g.fillStyle = '#ffffff'; g.font = 'bold 84px system-ui, sans-serif'; g.fillText(z.name, 230, 175);
    g.font = '36px system-ui, sans-serif'; g.fillStyle = col[2];
    const words = z.note.split(' '); let line = '', y = 250; for (const w of words) { if (g.measureText(line + w).width > 740) { g.fillText(line, 232, y); line = ''; y += 46; } line += w + ' '; } g.fillText(line, 232, y);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(12, 4.5), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    const u = m.E + 4;
    for (const side of [1, -1]) {
      const sg = new THREE.Group(), b = board.clone(); b.position.y = 6.5; sg.add(b);
      for (const dx of [-5, 5]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 0.4), new THREE.MeshLambertMaterial({ color: 0x3a2a1c })); post.position.set(dx, 3, 0); post.castShadow = true; sg.add(post); }
      const uu = side * u, sx = m.x + m.ox * uu, sz = m.z + m.oz * uu;
      sg.position.set(sx, Track.groundY(sx, sz), sz);
      sg.rotation.y = Math.atan2(-m.hx, -m.hz);   // face the oncoming cars
      group.add(sg);
    }
  }

  function zoneA() {   // rainforest wall: dense, dark, tall
    const trees = ['tree_tall_dark', 'tree_detailed_dark', 'tree_fat_darkh', 'tree_thin_dark', 'tree_default_dark', 'tree_oak_dark', 'tree_tall'];
    mix(trees, spots('A', 260, 1, 4, 44).concat(spots('A', 200, -1, 5, 36)), 11, 19);
    mix(['plant_bushLarge', 'plant_bushDetailed', 'plant_bushLargeTriangle'], spots('A', 160, 1, -0.5, 10).concat(spots('A', 140, -1, 0, 10)), 1.6, 3.2);
    mix(['grass_leafsLarge', 'grass_leafs', 'plant_flatTall'], spots('A', 260, 1, -1, 6).concat(spots('A', 220, -1, -0.5, 6)), 0.9, 1.8);
    patches('A', 50, [0x2f4a22, 0x3a5426, 0x46371f], 3, 7);
  }
  function zoneB() {   // tropical: palms, big leaves, flowers, sand
    mix(['tree_palmTall', 'tree_palmBend', 'tree_palmDetailedTall', 'tree_palmDetailedShort', 'tree_palmShort'], spots('B', 90, 1, 0, 40).concat(spots('B', 50, -1, 2, 30)), 9, 15);
    mix(['grass_leafsLarge', 'plant_flatShort', 'plant_bushSmall', 'grass_large'], spots('B', 150, 1, -1, 16).concat(spots('B', 120, -1, 0, 14)), 1.1, 2.2);
    mix(['flower_redA', 'flower_yellowA', 'flower_purpleA'], spots('B', 160, 1, -1, 12).concat(spots('B', 140, -1, 0, 12)), 0.7, 1.2);
    patches('B', 40, [0xe3cf96, 0xd9c184, 0xcdb576], 3, 8);
  }
  function zoneC() {   // ruins and rocks
    mix(['rock_largeA', 'rock_largeB', 'rock_largeC', 'rock_largeD'], spots('C', 60, 1, 0, 34).concat(spots('C', 40, -1, 1, 26)), 2.5, 6);
    mix(['rock_tallA', 'rock_tallC', 'stone_tallB'], spots('C', 26, 1, 2, 30).concat(spots('C', 18, -1, 3, 24)), 6, 12);
    // broken walls: short rows of stacked cliff blocks
    for (const side of [1, -1]) for (const p of spots('C', 7, side, 4, 26)) {
      const dir = Math.atan2(p.m.hx, p.m.hz), len = 3 + Math.floor(R() * 4), blocks = [];
      for (let k = 0; k < len; k++) { const hgt = 1 + Math.floor(R() * 3); for (let y = 0; y < hgt; y++) blocks.push({ x: p.x + p.m.hx * k * 3.2, z: p.z + p.m.hz * k * 3.2, y: y * 3.2, h: 3.2, ry: -dir }); }
      instance('cliff_block_rock', blocks);
    }
    mix(['log', 'log_large', 'stump_old', 'stump_oldTall'], spots('C', 50, 1, -0.5, 14).concat(spots('C', 40, -1, 0, 12)), 1.2, 2.6);
    mix(['mushroom_redGroup', 'mushroom_tanTall'], spots('C', 60, 1, -0.5, 8).concat(spots('C', 50, -1, 0, 8)), 0.8, 1.6);
    mix(['tree_oak_dark', 'tree_detailed_dark'], spots('C', 40, 1, 8, 40).concat(spots('C', 20, -1, 8, 30)), 10, 15);
    patches('C', 40, [0x6b5a44, 0x7a6a52, 0x5a4a38], 3, 7);
  }
  function zoneD() {   // the v17 canopy, rebuilt in code: giant trunks, crowns that lean over the road, vines, ferns
    const trunks = [], crowns = [], vines = [], ferns = [], greens = [0x2f6b2f, 0x3f8a3a, 0x255a2a, 0x4a7f34, 0x1f4f28];
    const add = (im, list) => { list.forEach((a, i) => { e.set(0, a.ry || 0, 0); q.setFromEuler(e); m4.compose(v.set(a.x, a.y + Track.groundY(a.x, a.z), a.z), q, sc.set(a.sx, a.sy, a.sz)); im.setMatrixAt(i, m4); if (a.c !== undefined) im.setColorAt(i, new THREE.Color(a.c)); }); im.castShadow = true; im.receiveShadow = true; group.add(im); };
    for (const side of [1, -1]) for (const p of spots('D', side > 0 ? 70 : 45, side, 0, 14)) {
      const h = 22 + R() * 10, tw = 1 + R() * 0.5;
      trunks.push({ x: p.x, y: 0, z: p.z, sx: tw, sy: h, sz: tw, c: R() < 0.5 ? 0x5a4632 : 0x4a3a2a });
      const reach = 4 + R() * 10;
      for (let k = 0; k < 2; k++) {
        const off = k ? reach : reach * 0.3, cr = (k ? 7 : 9) + R() * 4, cx = p.x - p.m.ox * side * off, cz = p.z - p.m.oz * side * off, cy = h + (k ? -1 : 1) + R() * 3;
        crowns.push({ x: cx, y: cy, z: cz, sx: cr, sy: cr * 0.5, sz: cr * (0.8 + R() * 0.3), ry: R() * 6, c: pick(greens) });
        for (let w = 0; w < 3; w++) if (R() < 0.6) vines.push({ x: cx + (R() - 0.5) * cr, y: cy - cr * 0.35, z: cz + (R() - 0.5) * cr, sx: 1, sy: 4 + R() * 8, sz: 1, c: R() < 0.5 ? 0x3d6b2a : 0x2d5a24 });
      }
    }
    for (const side of [1, -1]) for (const p of spots('D', 260, side, -1, 14)) { const s = 1.4 + R() * 2.2; ferns.push({ x: p.x, y: -0.1, z: p.z, sx: s, sy: s * (0.35 + R() * 0.3), sz: s, ry: R() * 6, c: pick([0x3f8a3a, 0x4caf50, 0x2f6b2f, 0x5aa04a]) }); }
    const mat = () => new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
    const tg = new THREE.CylinderGeometry(0.75, 1.15, 1, 7); tg.translate(0, 0.5, 0);
    const vg = new THREE.CylinderGeometry(0.07, 0.05, 1, 4); vg.translate(0, -0.5, 0);
    const fg = new THREE.ConeGeometry(1, 1, 6, 1, true); fg.rotateX(Math.PI); fg.translate(0, 0.5, 0);
    const fm = mat(); fm.side = THREE.DoubleSide;
    add(new THREE.InstancedMesh(tg, mat(), trunks.length), trunks);
    add(new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), mat(), crowns.length), crowns);
    add(new THREE.InstancedMesh(vg, mat(), vines.length), vines);
    add(new THREE.InstancedMesh(fg, fm, ferns.length), ferns);
    patches('D', 40, [0x5a3d26, 0x3a5426], 3, 6);
  }

  // ---------------- desert ----------------
  const SANDSTONE = 0xc8683a, PALE = 0xd9b98c, KHAKI = 0x9c9455;
  const SAND = [0xe2c48e, 0xd8b67c, 0xcfa96c, 0xe8cf9e];
  function mounds(list, col, flat) {   // smooth sand dunes: squashed half-spheres
    list = list.filter(p => Track.clearOf(p.x, p.z) > p.w * cur.s * 1.05);   // a dune must not reach any road
    if (!list.length) return;
    const geo = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0xffffff }), list.length), c = new THREE.Color();
    list.forEach((p, i) => { const w = p.w * cur.s; e.set(0, R() * 6.28, 0); q.setFromEuler(e); m4.compose(v.set(p.x, Track.groundY(p.x, p.z) - 0.4, p.z), q, sc.set(w, w * (flat || 0.16) * (0.6 + R() * 0.8), w * (0.5 + R() * 0.5))); im.setMatrixAt(i, m4); im.setColorAt(i, c.set(pick(col))); });
    im.receiveShadow = true; im.castShadow = true; group.add(im);
  }
  function dZoneA() {   // open dunes: very sparse, big shapes far out
    mounds(spots('A', 30, 1, 35, 140).concat(spots('A', 12, -1, 30, 70)).map(p => Object.assign(p, { w: 12 + R() * 22 })), SAND);
    mounds(spots('A', 22, 1, 120, 320).map(p => Object.assign(p, { w: 40 + R() * 60 })), SAND, 0.12);   // horizon dunes
    mix(['cactus_short', 'cactus_tall'], spots('A', 10, 1, 2, 40).concat(spots('A', 6, -1, 2, 30)), 1.6, 4.5);
    mix(['rock_smallA', 'rock_smallC', 'rock_smallF', 'rock_largeE'], spots('A', 14, 1, 1, 50).concat(spots('A', 10, -1, 1, 30)), 0.6, 2.2, null, PALE);
    patches('A', 16, [0xe8d2a6, 0xcfab72], 5, 12);
  }
  function dZoneB() {   // canyon: tall red pillars right at the road, cliffs behind
    const tall = ['rock_tallA', 'rock_tallB', 'rock_tallC', 'rock_tallD', 'rock_tallE', 'rock_tallF', 'rock_tallG', 'rock_tallH', 'rock_tallI', 'rock_tallJ'];
    mix(tall, spots('B', 80, 1, 0, 9).concat(spots('B', 60, -1, 0.5, 8)), 12, 26, null, SANDSTONE);
    mix(['cliff_large_rock', 'cliff_rock', 'cliff_top_rock', 'cliff_half_rock'], spots('B', 50, 1, 8, 30).concat(spots('B', 34, -1, 7, 24)), 16, 32, null, SANDSTONE);
    mix(['rock_largeA', 'rock_largeB', 'rock_largeC', 'rock_largeD', 'rock_largeF'], spots('B', 50, 1, -0.5, 6).concat(spots('B', 40, -1, 0, 6)), 2.5, 6, null, SANDSTONE);
    mix(['rock_smallB', 'rock_smallD', 'rock_smallG'], spots('B', 60, 1, -1, 5).concat(spots('B', 50, -1, -0.5, 5)), 0.5, 1.2, null, SANDSTONE);
    patches('B', 40, [0xb8693f, 0xa95c36, 0xc47a4a], 3, 8);
  }
  function dZoneC() {   // cactus scrub: even medium density, fence along the outside
    mix(['cactus_tall'], spots('C', 90, 1, 1, 45).concat(spots('C', 70, -1, 1, 35)), 4, 8);
    mix(['cactus_short'], spots('C', 110, 1, 0, 40).concat(spots('C', 90, -1, 0, 30)), 1.4, 3);
    mix(['plant_bush', 'plant_bushTriangle', 'plant_bushSmall'], spots('C', 120, 1, -0.5, 40).concat(spots('C', 100, -1, 0, 30)), 0.8, 1.8, null, KHAKI);
    mix(['rock_smallA', 'rock_smallE', 'rock_smallH', 'rock_smallI'], spots('C', 90, 1, -0.5, 30).concat(spots('C', 70, -1, 0, 25)), 0.4, 1.3, null, PALE);
    mix(['log', 'stump_old'], spots('C', 14, 1, 2, 30), 1, 2, null, 0xb89a72);   // bleached dead wood
    // fence: posts just outside the road edge, following the road
    const S = Track.S.filter(m => m.zone === 'C'), posts = [];
    for (let k = 0; k < S.length; k += 4) { const m = S[k], u = m.E + 2.5 + cur.n; posts.push({ x: m.x + m.ox * u, z: m.z + m.oz * u, h: 1.4 * cur.s, ry: Math.atan2(m.hx, m.hz) + Math.PI / 2 }); }
    instance('fence_simple', posts, true, 0x8a6a48);
    patches('C', 40, [0xcfa96c, 0xc29a5e, 0xd8b67c], 3, 7);
  }
  function dZoneD() {   // oasis camp: one dense landmark on the outside of the straight, sparse elsewhere
    const S = Track.S.filter(m => m.zone === 'D' && m.kind === 'straight'), m = S[Math.floor(S.length * 0.55)], E = m.E;
    const off = E + 26 + cur.n, cx = m.x + m.ox * off, cz = m.z + m.oz * off, pr = 13 * cur.s;
    const ring = (n, r0, r1) => Array.from({ length: Math.round(n * cur.d) }, () => { const a = R() * 6.28, r = r0 + R() * (r1 - r0); return { x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r }; });
    const water = new THREE.Mesh(new THREE.CircleGeometry(pr, 40).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x3fa3b0, transparent: true, opacity: 0.9 }));
    water.position.set(cx, Track.groundY(cx, cz) + 0.08, cz); group.add(water);
    const wet = new THREE.Mesh(new THREE.CircleGeometry(pr * 1.5, 40).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x9c8a5a })); wet.position.set(cx, Track.groundY(cx, cz) + 0.04, cz); wet.receiveShadow = true; group.add(wet);
    mix(['tree_palmTall', 'tree_palmBend', 'tree_palmDetailedTall', 'tree_palm', 'tree_palmShort'], ring(26, pr * 1.05, pr * 2.1), 8, 15);
    mix(['plant_bushLarge', 'plant_bush', 'grass_large', 'grass_leafsLarge'], ring(50, pr * 1.0, pr * 1.9), 1, 2.4);
    mix(['flower_yellowA', 'flower_redA'], ring(24, pr * 1.0, pr * 1.6), 0.7, 1.1);
    const camp = ring(5, pr * 2.2, pr * 2.9);
    mix(['tent_detailedOpen', 'tent_smallClosed'], camp, 3, 4.5, null, 0xe6d3b0);
    instance('campfire_stones', [{ x: cx + pr * 2.0, z: cz, h: 0.5 }]); instance('campfire_logs', [{ x: cx + pr * 2.0, z: cz, h: 0.7 }]);
    instance('log_stack', ring(2, pr * 2.3, pr * 2.6).map(p => Object.assign(p, { h: 1.2, ry: R() * 6 })));
    // sparse elsewhere in the zone
    mix(['tree_palmShort', 'tree_palmBend'], spots('D', 10, 1, 6, 50).concat(spots('D', 6, -1, 4, 30)), 6, 11);
    mix(['cactus_short', 'cactus_tall'], spots('D', 14, 1, 2, 50).concat(spots('D', 10, -1, 2, 30)), 1.5, 5);
    mix(['rock_largeE', 'rock_smallC', 'rock_smallF'], spots('D', 18, 1, 1, 50).concat(spots('D', 12, -1, 1, 30)), 0.8, 3, null, PALE);
    mounds(spots('D', 14, 1, 70, 200).map(p => Object.assign(p, { w: 25 + R() * 40 })), SAND, 0.13);
    patches('D', 20, [0xe2c48e, 0xcfa96c], 4, 10);
  }

  // dials: { sceneA, nearA, sizeA, ... } from the tuning panel
  function build(scene, which, dials) {
    if (which) world = which;
    if (group) { scene.remove(group); group.traverse(o => { if (o.isInstancedMesh) o.dispose(); }); }
    group = new THREE.Group(); seed = 12345;
    const fns = world === 'desert' ? [dZoneA, dZoneB, dZoneC, dZoneD] : [zoneA, zoneB, zoneC, zoneD];
    'ABCD'.split('').forEach((z, k) => { const d = dials || {}; cur = { d: d['scene' + z] ?? 1, n: d['near' + z] ?? 0, s: d['size' + z] ?? 1 }; fns[k](); });
    cur = { d: 1, n: 0, s: 1 };
    for (const z of 'ABCD') sign(z);
    scene.add(group);
  }
  // the look of each world: sky, haze, light, ground and road colours
  const ENV = {
    jungle: { fog: 0xa9c9a4, near: 140, far: 620, top: 0x4f95d6, mid: 0xbfdcef, hemiSky: 0xd8ecff, hemiGround: 0x41592c, hemi: 1.0, sun: 0xfff0d6, sunI: 2.3,
      tunnel: 0x6b6656, ground: '#4f7a34', specks: ['rgba(40,70,25,0.35)', 'rgba(110,150,70,0.25)'], skirt: 0x4f7a34, road: '#5a5650' },
    desert: { fog: 0xe9d6b0, near: 180, far: 800, top: 0x4c8fd4, mid: 0xf2dfbd, hemiSky: 0xfff1d6, hemiGround: 0xb98f5c, hemi: 1.05, sun: 0xfff0cf, sunI: 3.0,
      tunnel: 0xb07a50, ground: '#d8b67e', specks: ['rgba(170,130,80,0.30)', 'rgba(245,225,180,0.35)'], skirt: 0xd2ad74, road: '#86745f' }
  };
  return { build, get ZONES() { return ZONES_OF[world]; }, get world() { return world; }, ENV, WORLDS: { jungle: 'Jungle', desert: 'Desert' } };
})();
