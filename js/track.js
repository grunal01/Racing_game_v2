// ===== Track: a rounded square, four straights and four 90° corners, each corner banked more than the last =====
// Corner A is flat, B is banked one step (10°), C two steps, D three, so you can feel what banking does to a slide.
// The track is a list of samples, one per metre along the centre line. Each sample knows its position, which way is "out"
// (away from the infield), and how steeply the road is banked there. Everything else (meshes, the car's ground) is built from that.
const Track = (function () {
  const D = { L: 120, R: 65, W: 14, KERB: 1.4, BANK: 10, RAMP: 70 };   // straight length, corner radius, road width, kerb width (m), extra bank per corner (degrees), bank ramp length (m)
  const BASE = 0.06, SKIRT = 0.38;                                      // road sits a hair above the ground; banking falls away outside at this slope
  let P = Object.assign({}, D), S = [], LEN = 0, group = null, look = { road: '#5a5650', skirt: 0x4f7a34 };
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // sections in driving order: each zone is one straight then the corner after it. zone letters label the jungle designs
  function sections() {
    const { L, R } = P, h = L / 2, C = [[h, -h], [h, h], [-h, h], [-h, -h]], out = [];
    ['A', 'B', 'C', 'D'].forEach((zone, k) => {
      const t = -Math.PI / 2 + k * Math.PI / 2, [cx, cz] = C[k], ox = Math.cos(t), oz = Math.sin(t), hx = -oz, hz = ox;
      const ex = cx + R * ox, ez = cz + R * oz;   // where the straight meets the corner
      out.push({ zone, kind: 'straight', len: L, at: s => ({ x: ex - hx * (L - s), z: ez - hz * (L - s), hx, hz, ox, oz }) });
      out.push({ zone, kind: 'bend', bank: k, len: Math.PI / 2 * R, at: s => { const a = t + s / R; return { x: cx + R * Math.cos(a), z: cz + R * Math.sin(a), hx: -Math.sin(a), hz: Math.cos(a), ox: Math.cos(a), oz: Math.sin(a) }; } });
    });
    return out;
  }

  function sample() {
    S = []; let s0 = 0; const secs = sections(), bends = [];
    for (const sec of secs) { if (sec.kind === 'bend') bends.push([s0, s0 + sec.len, sec.bank * P.BANK]); s0 += sec.len; }
    LEN = s0; s0 = 0;
    for (const sec of secs) {
      const n = Math.round(sec.len);
      for (let k = 0; k < n; k++) {
        const s = s0 + k * sec.len / n, q = sec.at(k * sec.len / n);
        // bank: ramps in over the end of the straight and the start of the corner, and back out again
        let b = 0;
        for (const [a, e, deg] of bends) for (const w of [-LEN, 0, LEN]) { const into = Math.min(s + w - a, e - s - w); b = Math.max(b, sstep(-P.RAMP * 0.35, P.RAMP * 0.65, into) * deg); }   // wraps across the start line, so there's no step where the loop joins
        S.push(Object.assign(q, { s, zone: sec.zone, kind: sec.kind, b: b * Math.PI / 180 }));
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
      g.fillStyle = look.road; g.fillRect(0, 0, w, h);
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
      t.position.set(m.x + m.hx * (b - 0.5) + m.ox * (a - 6.5), BASE + 0.02, m.z + m.hz * (b - 0.5) + m.oz * (a - 6.5)); g.add(t);
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
    group.add(skirt(new THREE.MeshLambertMaterial({ color: look.skirt })));
    group.add(startLine());
    scene.add(group);
    return { S, LEN, P };
  }
  // triangles for the physics engine: the whole road surface including kerbs, and the grass bank outside the banking
  function collisionMesh() {
    const n = S.length, E = EDGE(), pos = [], idx = [];
    for (let k = 0; k <= n; k++) {
      const m = S[k % n], top = roadY(E, m.b), w = top / SKIRT + 0.5;
      pos.push(m.x - m.ox * E, roadY(-E, m.b), m.z - m.oz * E,  m.x + m.ox * E, top, m.z + m.oz * E,  m.x + m.ox * (E + w), -0.05, m.z + m.oz * (E + w));
      if (k < n) { const a = k * 3, b = a + 3; idx.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2); }
    }
    return { vertices: new Float32Array(pos), indices: new Uint32Array(idx) };
  }
  return { setLook: l => { look = l; }, build, surface, collisionMesh, defaults: D, get S() { return S; }, get LEN() { return LEN; }, get P() { return P; }, EDGE };
})();
