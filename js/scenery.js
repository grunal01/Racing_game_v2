// ===== Scenery: four labelled jungle designs, one per section of the loop =====
// A = straight 1, B = bend 1, C = straight 2, D = bend 2. Each is a separate idea so we can compare them side by side.
const Scenery = (function () {
  const ZONES = {
    A: { name: 'Rainforest wall', note: 'Tall dark trees and thick undergrowth packed tight to the road (Kenney Nature Kit)' },
    B: { name: 'Tropical', note: 'Palms, big leaves and flowers; open and bright (Kenney Nature Kit)' },
    C: { name: 'Ruins and rocks', note: 'Boulders, stone pillars, broken walls, logs and mushrooms (Kenney Nature Kit)' },
    D: { name: 'v17 canopy', note: 'The giant code-built trees from v17, with crowns over the road' }
  };
  let group = null, seed = 1;
  const R = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const pick = a => a[Math.floor(R() * a.length)];

  // spots beside the road in one zone. side: 1 outside, -1 inside. lat0..lat1 = metres beyond the road's edge (or beyond the outer bank)
  function spots(zone, n, side, lat0, lat1) {
    const S = Track.S.filter(m => m.zone === zone), E = Track.EDGE(), out = [];
    for (let t = 0; t < n; t++) {
      const m = S[Math.floor(R() * S.length)];
      const clear = side > 0 ? E + (0.06 + 2 * E * Math.tan(m.b)) / 0.7 + 1.5 : E + 1;
      const u = side * (clear + lat0 + R() * (lat1 - lat0));
      out.push({ x: m.x + m.ox * u, z: m.z + m.oz * u, m });
    }
    return out;
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  // instance a Kenney model at many spots. each item: { x, y, z, h (height in metres), ry, tilt }
  function instance(name, items, cast) {
    const parts = Assets.parts(name); if (!parts.length || !items.length) return;
    for (const [geo, mat, rel] of parts) {
      const im = new THREE.InstancedMesh(geo, mat, items.length);
      items.forEach((it, i) => { const k = it.h / parts.h; e.set(it.tilt || 0, it.ry || 0, (it.tilt2 || 0)); q.setFromEuler(e); v.set(it.x, it.y || 0, it.z); sc.set(k * (it.sx || 1), k, k * (it.sx || 1)); m4.compose(v, q, sc).multiply(rel); im.setMatrixAt(i, m4); });
      im.castShadow = cast !== false; im.receiveShadow = true; group.add(im);
    }
  }
  const spread = (name, list, h0, h1, extra) => instance(name, list.map(p => Object.assign({ x: p.x, z: p.z, h: h0 + R() * (h1 - h0), ry: R() * 6.28 }, extra || {})));
  // several models share a list of spots at random
  function mix(names, list, h0, h1, extra) { const by = {}; for (const p of list) { const n = pick(names); (by[n] = by[n] || []).push(p); } for (const n in by) spread(n, by[n], h0, h1, extra); }
  function patches(zone, n, cols, r0, r1) {   // flat colour patches on the ground (sand, leaf litter, dirt)
    const list = spots(zone, n, R() < 0.5 ? 1 : -1, 0, 30).concat(spots(zone, n, -1, 0, 20));
    const im = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 9).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xffffff }), list.length), c = new THREE.Color();
    list.forEach((p, i) => { const r = r0 + R() * (r1 - r0); m4.compose(v.set(p.x, 0.03 + i * 0.0001, p.z), q.identity(), sc.set(r, 1, r * (0.6 + R() * 0.6))); im.setMatrixAt(i, m4); im.setColorAt(i, c.set(pick(cols))); });
    im.receiveShadow = true; group.add(im);
  }

  function sign(zone) {
    const S = Track.S.filter(m => m.zone === zone), m = S[Math.min(S.length - 1, 12)], z = ZONES[zone];
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 384; const g = cv.getContext('2d');
    g.fillStyle = '#16351f'; g.fillRect(0, 0, 1024, 384); g.strokeStyle = '#f4c430'; g.lineWidth = 14; g.strokeRect(7, 7, 1010, 370);
    g.fillStyle = '#f4c430'; g.font = 'bold 190px system-ui, sans-serif'; g.fillText(zone, 50, 230);
    g.fillStyle = '#ffffff'; g.font = 'bold 84px system-ui, sans-serif'; g.fillText(z.name, 230, 175);
    g.font = '36px system-ui, sans-serif'; g.fillStyle = '#cfe8d2';
    const words = z.note.split(' '); let line = '', y = 250; for (const w of words) { if (g.measureText(line + w).width > 740) { g.fillText(line, 232, y); line = ''; y += 46; } line += w + ' '; } g.fillText(line, 232, y);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(12, 4.5), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    const E = Track.EDGE(), u = E + (0.06 + 2 * E * Math.tan(m.b)) / 0.7 + 4;
    for (const side of [1, -1]) {
      const sg = new THREE.Group(), b = board.clone(); b.position.y = 6.5; sg.add(b);
      for (const dx of [-5, 5]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 0.4), new THREE.MeshLambertMaterial({ color: 0x3a2a1c })); post.position.set(dx, 3, 0); post.castShadow = true; sg.add(post); }
      const uu = side * (side > 0 ? u : E + 4);
      sg.position.set(m.x + m.ox * uu, 0, m.z + m.oz * uu);
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
    const add = (im, list) => { list.forEach((a, i) => { e.set(0, a.ry || 0, 0); q.setFromEuler(e); m4.compose(v.set(a.x, a.y, a.z), q, sc.set(a.sx, a.sy, a.sz)); im.setMatrixAt(i, m4); if (a.c !== undefined) im.setColorAt(i, new THREE.Color(a.c)); }); im.castShadow = true; im.receiveShadow = true; group.add(im); };
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

  function build(scene) {
    if (group) { scene.remove(group); group.traverse(o => { if (o.isInstancedMesh) o.dispose(); }); }
    group = new THREE.Group(); seed = 12345;
    zoneA(); zoneB(); zoneC(); zoneD();
    for (const z of 'ABCD') sign(z);
    scene.add(group);
  }
  return { build, ZONES };
})();
