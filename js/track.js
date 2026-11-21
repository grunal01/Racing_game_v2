// ===== Track: one loop, two straights and two banked 180° bends =====
// The track is a list of samples, one per metre along the centre line. Each sample knows its position, which way is "out"
// (away from the infield), and how steeply the road is banked there. Everything else (meshes, the car's ground) is built from that.
const Track = (function () {
  const D = { L: 220, R: 55, W: 14, KERB: 1.4, BANK: 22, RAMP: 34 };   // straight length, bend radius, road width, kerb width (m), bank (degrees), bank ramp length (m)
  const BASE = 0.06, SKIRT = 0.38;                                      // road sits a hair above the ground; banking falls away outside at this slope
  let P = Object.assign({}, D), S = [], LEN = 0, group = null;
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // sections in driving order; zone letters label the jungle designs that line each one
  function sections() {
    const { L, R } = P;
    return [
      { zone: 'A', kind: 'straight', len: L, at: s => ({ x: -L / 2 + s, z: -R, hx: 1, hz: 0, ox: 0, oz: -1 }) },
      { zone: 'B', kind: 'bend', len: Math.PI * R, at: s => { const a = -Math.PI / 2 + s / R; return { x: L / 2 + R * Math.cos(a), z: R * Math.sin(a), hx: -Math.sin(a), hz: Math.cos(a), ox: Math.cos(a), oz: Math.sin(a) }; } },
      { zone: 'C', kind: 'straight', len: L, at: s => ({ x: L / 2 - s, z: R, hx: -1, hz: 0, ox: 0, oz: 1 }) },
      { zone: 'D', kind: 'bend', len: Math.PI * R, at: s => { const a = Math.PI / 2 + s / R; return { x: -L / 2 + R * Math.cos(a), z: R * Math.sin(a), hx: -Math.sin(a), hz: Math.cos(a), ox: Math.cos(a), oz: Math.sin(a) }; } }
    ];
  }

  function sample() {
    S = []; let s0 = 0; const secs = sections(), bends = [];
    for (const sec of secs) { if (sec.kind === 'bend') bends.push([s0, s0 + sec.len]); s0 += sec.len; }
    LEN = s0; s0 = 0;
    for (const sec of secs) {
      const n = Math.round(sec.len);
      for (let k = 0; k < n; k++) {
        const s = s0 + k * sec.len / n, q = sec.at(k * sec.len / n);
        // bank: ramps in over the last part of the straight and the first part of the bend, and back out again
        let b = 0;
        for (const [a, e] of bends) { const into = Math.min(s - a, e - s); b = Math.max(b, sstep(-P.RAMP * 0.35, P.RAMP * 0.65, into)); }
        S.push(Object.assign(q, { s, zone: sec.zone, kind: sec.kind, b: b * P.BANK * Math.PI / 180 }));
      }
      s0 += sec.len;
    }
  }

  const EDGE = () => P.W / 2 + P.KERB;
  // height of the road surface at lateral offset u (metres towards the outside) where the bank is b
  const roadY = (u, b) => BASE + (u + EDGE()) * Math.tan(b);

  // the ground under any point: { y, nx, ny, nz, onRoad, kerb, u, i }
  function surface(x, z, hint) {
    let i = hint === undefined || hint < 0 ? -1 : hint, best = Infinity;
    if (i < 0) { for (let k = 0; k < S.length; k += 4) { const d = (S[k].x - x) ** 2 + (S[k].z - z) ** 2; if (d < best) { best = d; i = k; } } }
    for (let pass = 0; pass < 2; pass++) {   // walk to the nearest sample from the hint
      const c = i; best = Infinity;
      for (let k = -12; k <= 24; k++) { const j = (c + k + S.length) % S.length, d = (S[j].x - x) ** 2 + (S[j].z - z) ** 2; if (d < best) { best = d; i = j; } }
    }
    // blend between the nearest sample and its neighbour on the side the point lies, so height and tilt change smoothly (no steps)
    const m0 = S[i], along = (x - m0.x) * m0.hx + (z - m0.z) * m0.hz, j = (i + (along >= 0 ? 1 : -1) + S.length) % S.length, m1 = S[j];
    const seg = Math.hypot(m1.x - m0.x, m1.z - m0.z) || 1, t = Math.min(1, Math.abs(along) / seg);
    const cx = m0.x + (m1.x - m0.x) * t, cz = m0.z + (m1.z - m0.z) * t, b = m0.b + (m1.b - m0.b) * t;
    let ox = m0.ox + (m1.ox - m0.ox) * t, oz = m0.oz + (m1.oz - m0.oz) * t; const ol = Math.hypot(ox, oz) || 1; ox /= ol; oz /= ol;
    const u = (x - cx) * ox + (z - cz) * oz, E = EDGE();
    const out = { i, u, onRoad: false, kerb: false, y: 0, nx: 0, ny: 1, nz: 0, zone: m0.zone, b };
    if (Math.abs(u) <= E) {
      out.y = roadY(u, b); out.onRoad = true; out.kerb = Math.abs(u) > P.W / 2;
      out.nx = -ox * Math.sin(b); out.ny = Math.cos(b); out.nz = -oz * Math.sin(b);
    } else if (u > E) {
      const top = roadY(E, b), y = top - (u - E) * SKIRT;
      if (y > 0) { const a = Math.atan(SKIRT); out.y = y; out.nx = ox * Math.sin(a); out.ny = Math.cos(a); out.nz = oz * Math.sin(a); }
    }
    return out;
  }

  // ---- meshes ----
  function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
  function roadTex() {
    return canvasTex(512, 256, (g, w, h) => {
      g.fillStyle = '#5a5650'; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 6000; k++) { const v = 70 + Math.random() * 40; g.fillStyle = `rgba(${v},${v - 3},${v - 8},0.5)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      g.fillStyle = 'rgba(0,0,0,0.12)'; for (const v of [0.3, 0.7]) g.fillRect(0, h * v - 18, w, 36);   // worn racing lines
      g.fillStyle = '#f2efe6'; g.fillRect(0, h * 0.035, w, 6); g.fillRect(0, h * 0.965 - 6, w, 6);       // edge lines
      g.fillRect(0, h / 2 - 3, w * 0.45, 6);                                                             // centre dash
    });
  }
  // a strip of the road surface between lateral offsets u0 and u1, with an optional colour per metre (for kerb stripes)
  function strip(u0, u1, mat, colorAt, uv) {
    const pos = [], col = [], tex = [], idx = [];
    const n = S.length;
    for (let k = 0; k <= n; k++) {
      const m = S[k % n], s = k;
      for (const u of [u0, u1]) { pos.push(m.x + m.ox * u, roadY(u, m.b), m.z + m.oz * u); tex.push(s / 24, u === u0 ? 0 : 1); if (colorAt) { const c = colorAt(k); col.push(c.r, c.g, c.b); } }
      if (k < n) { const a = k * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(tex, 2));
    if (colorAt) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, mat); mesh.receiveShadow = true; return mesh;
  }
  function skirt(mat) {   // grass bank that falls away outside the raised outer edge
    const pos = [], idx = [], n = S.length, E = EDGE();
    for (let k = 0; k <= n; k++) {
      const m = S[k % n], top = roadY(E, m.b), w = top / SKIRT + 0.5;
      pos.push(m.x + m.ox * E, top - 0.02, m.z + m.oz * E, m.x + m.ox * (E + w), -0.05, m.z + m.oz * (E + w));
      if (k < n) { const a = k * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, mat); mesh.receiveShadow = true; return mesh;
  }
  function startLine() {
    const g = new THREE.Group(), m = S[4], white = new THREE.MeshLambertMaterial({ color: 0xffffff }), black = new THREE.MeshLambertMaterial({ color: 0x1c1c1c });
    for (let a = 0; a < 14; a++) for (let b = 0; b < 2; b++) {
      const t = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), (a + b) % 2 ? white : black); t.rotation.x = -Math.PI / 2;
      t.position.set(m.x + b - 0.5, BASE + 0.02, m.z + m.oz * (a - 6.5)); g.add(t);
    }
    const post = new THREE.MeshLambertMaterial({ color: 0x2a2a2a }), banner = new THREE.MeshLambertMaterial({ color: 0xf4c430 });
    for (const sd of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8, 0.6), post); p.position.set(m.x, 4, m.z + m.oz * sd * (EDGE() + 1.2)); p.castShadow = true; g.add(p); }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1, 1.6, EDGE() * 2 + 3), banner); bar.position.set(m.x, 8, m.z); bar.castShadow = true; g.add(bar);
    return g;
  }

  function build(scene, opts) {
    P = Object.assign({}, D, opts || {});
    if (group) { scene.remove(group); group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    sample();
    group = new THREE.Group();
    const roadMat = new THREE.MeshLambertMaterial({ map: roadTex() });
    group.add(strip(-P.W / 2, P.W / 2, roadMat));
    const red = new THREE.Color(0xd62828), wht = new THREE.Color(0xf5f5f5), kerbMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const stripe = k => (Math.floor(k / 4) % 2 ? red : wht);
    group.add(strip(-EDGE(), -P.W / 2, kerbMat, stripe), strip(P.W / 2, EDGE(), kerbMat, stripe));
    group.add(skirt(new THREE.MeshLambertMaterial({ color: 0x4f7a34 })));
    group.add(startLine());
    scene.add(group);
    return { S, LEN, P };
  }
  return { build, surface, defaults: D, get S() { return S; }, get LEN() { return LEN; }, get P() { return P; }, EDGE };
})();
