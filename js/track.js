// ===== Track: the R3 test circuit, built from a list of pieces =====
// Wide, open and fast: no tight corners (the tightest is 100 m radius). Sectors (zone letters label the scenery designs):
// A = start straight (obstacle alley, jump) + big banked left sweeper, B = straight through a tunnel + a wide left U-turn,
// C = long flowing esses (right, then left), D = straight + a huge banked left carousel.
// The two long straights are worked out at build time so the loop always closes exactly.
// The track is a list of samples, one per metre along the centre line. Each sample knows its position, heading, its left
// vector (o), road half-width, height, signed bank (tilt) and slope. The ground around it is a terrain grid that follows
// the road and rolls gently further out. Everything else (meshes, the car's ground, collision) is built from that.
const Track = (function () {
  const D = { W: 14, KERB: 1.4, BANK: 10, HILLS: 1, JUMP: 2.5, JUMPA: 14 };   // road width, kerb width (m), sweeper bank (carousel gets double), hills (x), jump height (m), jump lip angle (degrees)
  const BASE = 0.06, ALLEY = 15, CELL = 4;                           // road sits a hair above the ground; alley half-width; terrain grid spacing (m)
  let P = Object.assign({}, D), S = [], LEN = 0, group = null, look = { road: '#5a5650', skirt: 0x4f7a34, groundMat: null }, T = null, marks = {};
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;

  // pieces in driving order. turn in degrees, + = left. bank in degrees (the outside of the turn is raised).
  // h = height (m) at the END of the piece, before the hills multiplier. X1 / X2 are solved so the loop closes.
  function pieces() {
    const B = P.BANK;
    return [
      { zone: 'A', kind: 'straight', len: 'X1', h: 0, tag: 'start' },
      { zone: 'A', kind: 'bend', r: 170, turn: 90, bank: B, h: 4 },          // big left sweeper, climbing
      { zone: 'B', kind: 'straight', len: 'X2', h: 4, tag: 'tunnel' },        // through the hill
      { zone: 'B', kind: 'bend', r: 100, turn: 150, bank: 0, h: 1.5 },       // wide left U-turn, dropping
      { zone: 'B', kind: 'straight', len: 60, h: 1 },
      { zone: 'C', kind: 'bend', r: 150, turn: -70, bank: 0, h: 0.5 },       // long flowing esses: right...
      { zone: 'C', kind: 'straight', len: 80, h: 2.5 },
      { zone: 'C', kind: 'bend', r: 150, turn: 40, bank: 0, h: 1 },          // ...then left
      { zone: 'C', kind: 'straight', len: 60, h: 1.5 },
      { zone: 'D', kind: 'straight', len: 300, h: 3 },
      { zone: 'D', kind: 'bend', r: 130, turn: 150, bank: 2 * B, h: 0 }      // huge banked left carousel, back down to the start
    ];
  }
  const pieceLen = (p, X) => p.kind === 'straight' ? (typeof p.len === 'string' ? X[p.len] : p.len) : Math.abs(p.turn) * Math.PI / 180 * p.r;

  // walk the pieces: positions every `ds` metres
  function walk(list, X, ds, each) {
    let x = 0, z = 0, th = Math.PI / 2, s = 0;
    for (const p of list) {
      const len = pieceLen(p, X), k = p.kind === 'bend' ? Math.sign(p.turn) / p.r : 0, n = Math.max(1, Math.round(len / ds)), d = len / n;
      for (let i = 0; i < n; i++) { if (each) each(p, x, z, th, s, i * d, len); x += Math.sin(th) * d; z += Math.cos(th) * d; th += k * d; s += d; }
    }
    return { x, z, th, s };
  }

  function sample() {
    const list = pieces();
    // solve the two straights: X1 heads +x (east), X2 heads -z, so the end gap is fixed by moving along each
    const g = walk(list, { X1: 0, X2: 0 }, 0.25), X = { X1: -g.x, X2: g.z };
    // piece boundaries, for heights and banks
    const bounds = []; let s0 = 0; for (const p of list) { const len = pieceLen(p, X); bounds.push({ p, a: s0, e: s0 + len, len }); s0 += len; }
    LEN = s0;
    S = []; const raw = [];
    walk(list, X, 1, (p, x, z, th, s, local, len) => raw.push({ p, x, z, th, s, local, len }));
    const end = walk(list, X, 1); const ex = end.x / raw.length, ez = end.z / raw.length;   // spread any tiny closing error along the lap
    // height: each piece eases from the previous piece's end height to its own (zero slope at the joins)
    const hEnd = bounds.map(b => b.p.h), hAt = (bi, local, len) => lerp(hEnd[(bi + bounds.length - 1) % bounds.length], hEnd[bi], sstep(0, len, local)) * P.HILLS;
    // jump: a kicker on the start straight that rises to a lip, then the road falls away for the landing
    // the kicker curves up to the lip angle (a parabola, so its slope at the lip is 2 x height / length)
    const J0 = 300, KICK = Math.max(4, 2 * P.JUMP / Math.tan(Math.max(1, P.JUMPA) * Math.PI / 180)), LAND = 110;
    const jumpH = l => { const t = l - J0; if (t < 0 || t > KICK + LAND) return 0; return t <= KICK ? P.JUMP * (t / KICK) ** 2 : P.JUMP * (1 - sstep(KICK, KICK + LAND, t)); };
    // obstacle alley: the start straight widens to ALLEY each side between these points
    const AL0 = 40, AL1 = 230, TAPER = 25;
    marks = { start: 4, alley: [AL0, AL1], jump: J0 + KICK, tunnel: null };
    raw.forEach((r, i) => {
      const bi = bounds.findIndex(b => b.p === r.p), p = r.p;
      let h = hAt(bi, r.local, r.len); if (bi === 0) h += jumpH(r.local);
      let half = P.W / 2; if (bi === 0) half = lerp(P.W / 2, ALLEY, sstep(AL0 - TAPER, AL0, r.local) * (1 - sstep(AL1, AL1 + TAPER, r.local)));
      // bank: ramps in before a banked bend and back out after (scaled to the bend's length)
      let t = 0;
      for (const b of bounds) if (b.p.kind === 'bend' && b.p.bank) {
        const R = Math.min(70, b.len * 0.45);
        for (const w of [-LEN, 0, LEN]) { const into = Math.min(r.s + w - b.a, b.e - r.s - w); const v = sstep(-R * 0.35, R * 0.65, into) * b.p.bank; if (Math.abs(v) > Math.abs(t)) t = -Math.sign(b.p.turn) * v; }
      }
      const hx = Math.sin(r.th), hz = Math.cos(r.th);
      S.push({ i, s: r.s, x: r.x - ex * i, z: r.z - ez * i, hx, hz, ox: hz, oz: -hx, h, half, E: half + P.KERB, t: t * Math.PI / 180, b: Math.abs(t) * Math.PI / 180,
        zone: p.zone, kind: p.kind, tag: p.tag || '', local: r.local });
    });
    const N = S.length;
    for (let i = 0; i < N; i++) { const a = S[(i + N - 1) % N], c = S[(i + 1) % N]; S[i].slope = (c.h - a.h) / 2; }
    // depth and bumps from each sector's surface (look.layers, set from surfaces.js): the ground (bed) sinks below the road's
    // top by `depth` in the middle of the road, easing in over the first and last 18 m of the sector and towards the kerbs
    const first = {}, last = {}; S.forEach((m, i) => { if (first[m.zone] === undefined) first[m.zone] = i; last[m.zone] = i; });
    S.forEach((m, i) => {
      const L = (look.layers || [])['ABCD'.indexOf(m.zone)] || {}, into = Math.min(i - first[m.zone], last[m.zone] - i), ramp = sstep(0, 18, into);
      m.sink = (L.depth || 0) * ramp; m.bump = (L.bumps || 0) * ramp; m.layer = L.kind || ''; m.lcol = L.color;
    });
    // the tunnel runs through the middle of the straight into the hairpin
    const tun = S.filter(m => m.tag === 'tunnel'); if (tun.length > 180) { const a = tun[Math.floor((tun.length - 110) / 2)].i; marks.tunnel = [a, a + 110]; }
  }

  // height of the road surface at lateral offset u (metres to the left) on sample m
  const roadY = (m, u) => m.h + BASE + m.E * Math.abs(Math.tan(m.t)) + u * Math.tan(m.t);
  // gentle lumps along and across the road (ruts, drifts, lumpy sand); smooth, roughly 3-8 m between bumps
  const lumps = (s, u) => 0.5 * Math.sin(0.9 * s + 1.7 * Math.sin(0.21 * u)) + 0.3 * Math.sin(0.37 * s + 0.8 * u) + 0.2 * Math.sin(1.9 * s - 0.5 * u);
  const edgeTaper = (m, u) => 1 - sstep(m.half * 0.55, m.E, Math.abs(u));
  // the solid ground the wheels touch: the road's top, minus the sector's depth, plus its bumps (both fade out at the kerbs)
  const bedY = (m, u) => roadY(m, u) - ((m.sink || 0) - (m.bump || 0) * (m.layer === 'gravel' ? lumps(2.4 * m.s, 2 * u) : lumps(m.s, u))) * edgeTaper(m, u);   // gravel: a finer washboard
  // the visible top of a water / snow / mud layer (snow adds drifts on top)
  const layerTop = (m, u) => m.layer === 'gravel' ? bedY(m, u) + 0.015 : roadY(m, u);   // water, snow, mud: a flat top at road level; gravel: a skin on the bumpy ground
  const EDGE = i => (i === undefined ? P.W / 2 + P.KERB : S[i].E);

  // ---------- terrain: a grid that hugs the road and rolls gently further out ----------
  function noise(x, z) {   // smooth, cheap rolling hills (sum of sines at odd angles)
    return 2.3 + 1.1 * Math.sin(x * 0.011 + 1.3) * Math.sin(z * 0.013 + 0.4) + 0.7 * Math.sin((x + z) * 0.021 + 2.1) + 0.45 * Math.sin((x - 2 * z) * 0.037);
  }
  function buildTerrain() {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const m of S) { x0 = Math.min(x0, m.x); x1 = Math.max(x1, m.x); z0 = Math.min(z0, m.z); z1 = Math.max(z1, m.z); }
    const M = 260; x0 = Math.floor((x0 - M) / CELL) * CELL; z0 = Math.floor((z0 - M) / CELL) * CELL; x1 += M; z1 += M;
    const nx = Math.ceil((x1 - x0) / CELL) + 1, nz = Math.ceil((z1 - z0) / CELL) + 1, n = nx * nz;
    const best = new Float32Array(n).fill(1e9), who = new Int32Array(n).fill(-1);
    // stamp every road sample onto the grid points near it: each point remembers its nearest sample
    const R = 70, rc = Math.ceil(R / CELL);
    for (const m of S) {
      const ci = Math.round((m.x - x0) / CELL), cj = Math.round((m.z - z0) / CELL);
      for (let j = Math.max(0, cj - rc); j <= Math.min(nz - 1, cj + rc); j++) for (let i = Math.max(0, ci - rc); i <= Math.min(nx - 1, ci + rc); i++) {
        const k = j * nx + i, dx = x0 + i * CELL - m.x, dz = z0 + j * CELL - m.z, d = dx * dx + dz * dz;
        if (d < best[k]) { best[k] = d; who[k] = m.i; }
      }
    }
    const H = new Float32Array(n), C = new Float32Array(n), SP = look.snowpack || 0, SINK = Math.min(0.5, SP);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i, x = x0 + i * CELL, z = z0 + j * CELL;
      const edgeFade = Math.min(1, Math.min(i, j, nx - 1 - i, nz - 1 - j) / 15);   // flatten out at the far edges of the grid
      let nat = noise(x, z) * edgeFade, h = nat, pack = SP, packIn = 1;
      if (who[k] >= 0) {
        const m = S[who[k]], u = (x - m.x) * m.ox + (z - m.z) * m.oz, au = Math.abs(u), E = m.E;
        nat = m.h * (1 - sstep(E, 65, au)) + noise(x, z) * sstep(E + 10, 60, au) * edgeFade;
        if (au <= E) h = roadY(m, u) - 0.6 - (m.sink || 0) - (m.bump || 0);   // under the road, kept well below it (and below any dip)
        else { const ey = roadY(m, Math.sign(u) * E) - 0.22; h = lerp(ey, nat, sstep(E + 2, E + 34, au)); }   // beside it: level with the edge, then easing out
        pack = SP * sstep(E, E + 5, au); packIn = sstep(E + 5, E + 9, au);   // snowpack: a smooth bank rising from the road edge; soft beyond the bank
        if (au <= E) pack = 0;
      }
      H[k] = h + pack; C[k] = h + pack - SINK * packIn * (SP > 0 ? 1 : 0);
    }
    T = { x0, z0, nx, nz, H, C };
  }
  function terrainY(x, z, solid) {
    if (!T) return 0;
    const fx = (x - T.x0) / CELL, fz = (z - T.z0) / CELL, i = Math.max(0, Math.min(T.nx - 2, Math.floor(fx))), j = Math.max(0, Math.min(T.nz - 2, Math.floor(fz)));
    const tx = Math.max(0, Math.min(1, fx - i)), tz = Math.max(0, Math.min(1, fz - j)), H = solid ? T.C : T.H, k = j * T.nx + i;
    return lerp(lerp(H[k], H[k + 1], tx), lerp(H[k + T.nx], H[k + T.nx + 1], tx), tz);
  }

  // the ground under any point: { y, nx, ny, nz, onRoad, kerb, u, i, zone, b }
  function surface(x, z, hint) {
    let i = hint === undefined || hint < 0 ? -1 : hint, best = Infinity;
    if (i < 0) { for (let k = 0; k < S.length; k += 4) { const d = (S[k].x - x) ** 2 + (S[k].z - z) ** 2; if (d < best) { best = d; i = k; } } }
    for (let pass = 0; pass < 2; pass++) {   // walk to the nearest sample from the hint
      const c = i; best = Infinity;
      for (let k = -12; k <= 24; k++) { const j = (c + k + S.length) % S.length, d = (S[j].x - x) ** 2 + (S[j].z - z) ** 2; if (d < best) { best = d; i = j; } }
    }
    // blend between the nearest sample and its neighbour on the side the point lies, so height and tilt change smoothly
    const m0 = S[i], along = (x - m0.x) * m0.hx + (z - m0.z) * m0.hz, j = (i + (along >= 0 ? 1 : -1) + S.length) % S.length, m1 = S[j];
    const seg = Math.hypot(m1.x - m0.x, m1.z - m0.z) || 1, f = Math.min(1, Math.abs(along) / seg);
    const m = { x: lerp(m0.x, m1.x, f), z: lerp(m0.z, m1.z, f), h: lerp(m0.h, m1.h, f), E: lerp(m0.E, m1.E, f), half: lerp(m0.half, m1.half, f), t: lerp(m0.t, m1.t, f), slope: lerp(m0.slope, m1.slope, f),
      s: lerp(m0.s, m1.s, f), sink: lerp(m0.sink || 0, m1.sink || 0, f), bump: lerp(m0.bump || 0, m1.bump || 0, f), layer: m0.layer };
    let ox = lerp(m0.ox, m1.ox, f), oz = lerp(m0.oz, m1.oz, f); const ol = Math.hypot(ox, oz) || 1; ox /= ol; oz /= ol;
    const u = (x - m.x) * ox + (z - m.z) * oz;
    const out = { i, u, onRoad: false, kerb: false, y: 0, nx: 0, ny: 1, nz: 0, zone: m0.zone, b: Math.abs(m.t), sector: m0.zone, tag: m0.tag };
    if (Math.abs(u) <= m.E) {
      out.y = bedY(m, u); out.top = m.layer ? Math.max(out.y, layerTop(m, u)) : out.y; out.depth = out.top - out.y; out.onRoad = true; out.kerb = Math.abs(u) > m.E - P.KERB;
      const tt = Math.tan(m.t); let nx = -ox * tt - m0.hx * m.slope, nz = -oz * tt - m0.hz * m.slope; const l = Math.hypot(nx, 1, nz);
      out.nx = nx / l; out.ny = 1 / l; out.nz = nz / l;
    } else {
      out.y = terrainY(x, z, true); out.top = terrainY(x, z); out.depth = out.top - out.y;   // off-road: solid ground, and the top of any snowpack
      const e = 1, gx = (terrainY(x + e, z, true) - terrainY(x - e, z, true)) / (2 * e), gz = (terrainY(x, z + e, true) - terrainY(x, z - e, true)) / (2 * e), l = Math.hypot(gx, 1, gz);
      out.nx = -gx / l; out.ny = 1 / l; out.nz = -gz / l;
    }
    return out;
  }
  // how far a point is beyond the kerb of the nearest bit of road (negative = on the road). Inside the tunnel's hill counts as on the road.
  function clearOf(x, z) {
    const g = surface(x, z, -1), m = S[g.i];
    if (marks.tunnel && g.i >= marks.tunnel[0] - 6 && g.i <= marks.tunnel[1] + 6 && Math.abs(g.u) < m.E + 36) return -1;
    return Math.abs(g.u) - m.E;
  }
  // height of the ground (road or terrain) anywhere, for placing scenery
  function groundY(x, z) { return terrainY(x, z); }

  // ---------- meshes ----------
  function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
  function roadTex() {
    return canvasTex(512, 256, (g, w, h) => {
      // with sector colours the texture is a light neutral that the surface colour tints; otherwise it's the world's road colour
      const tinted = !!look.sectorColors;
      g.fillStyle = tinted ? '#e6e4e0' : look.road; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 6000; k++) { const v = (tinted ? 170 : 70) + Math.random() * (tinted ? 70 : 40); g.fillStyle = `rgba(${v},${v - 3},${v - 8},0.5)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      g.fillStyle = 'rgba(0,0,0,0.12)'; for (const v of [0.3, 0.7]) g.fillRect(0, h * v - 18, w, 36);   // worn racing lines
      g.fillStyle = '#f2efe6'; g.fillRect(0, h * 0.035, w, 6); g.fillRect(0, h * 0.965 - 6, w, 6);       // edge lines
      g.fillRect(0, h / 2 - 3, w * 0.45, 6);                                                             // centre dash
    });
  }
  // a strip of road between lateral offsets given as functions of the sample (so it follows the alley's width)
  // a strip along the whole track between lateral offsets uA(m)..uB(m), split into `segs` pieces across, at heights yFn(m, u)
  function strip(uA, uB, mat, colorAt, segs, yFn, only) {
    segs = segs || 1; yFn = yFn || bedY;
    const pos = [], col = [], tex = [], idx = [], n = S.length, row = segs + 1;
    let rows = 0;
    for (let k = 0; k <= n; k++) {
      const m = S[k % n];
      if (only && !only(m)) { rows = 0; continue; }
      for (let j = 0; j <= segs; j++) { const u = uA(m) + (uB(m) - uA(m)) * j / segs; pos.push(m.x + m.ox * u, yFn(m, u), m.z + m.oz * u); tex.push(k / 24, j / segs); if (colorAt) { const c = colorAt(k, m); col.push(c.r, c.g, c.b); } }
      const base = pos.length / 3 - row;
      if (rows > 0) for (let j = 0; j < segs; j++) { const a = base - row + j; idx.push(a, a + row, a + 1, a + 1, a + row, a + row + 1); }
      rows++;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(tex, 2));
    if (colorAt) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, mat); mesh.receiveShadow = true; return mesh;
  }
  // water, snow, mud and slush layers on top of the sunken road
  let waterTex = null;
  function layers() {
    const out = [];
    const kinds = { water: () => { waterTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); for (let k = 0; k < 90; k++) { g.strokeStyle = `rgba(140,170,185,${0.15 + Math.random() * 0.25})`; g.lineWidth = 1 + Math.random() * 3; g.beginPath(); const y = Math.random() * h; g.moveTo(0, y); for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * 0.05 + k) * 4); g.stroke(); } });
        return new THREE.MeshPhongMaterial({ map: waterTex, transparent: true, opacity: 0.62, shininess: 90, specular: 0x9fc4d2, depthWrite: false }); },
      snow: () => new THREE.MeshLambertMaterial({ color: 0xf2f7fb }),
      mud: () => new THREE.MeshPhongMaterial({ shininess: 70, specular: 0x5a4a3a, transparent: true, opacity: 0.93 }),
      slush: () => new THREE.MeshPhongMaterial({ shininess: 60, specular: 0x8899aa, transparent: true, opacity: 0.8 }),
      gravel: () => { const t = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#8f8a80'; g.fillRect(0, 0, w, h);
          for (let k = 0; k < 1400; k++) { const r = 1.5 + Math.random() * 4.5, x = Math.random() * w, y = Math.random() * h, v = 95 + Math.random() * 90, tint = Math.random() * 18;
            g.fillStyle = `rgb(${v + tint},${v + tint * 0.6},${v})`; g.beginPath(); g.ellipse(x, y, r, r * (0.6 + Math.random() * 0.4), Math.random() * 3, 0, 6.3); g.fill();
            g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x + r * 0.3, y + r * 0.35, r * 0.8, r * 0.4, 0, 0, 6.3); g.fill(); } });
        t.repeat.set(7, 3.5); return new THREE.MeshLambertMaterial({ map: t, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); } };
    for (const kind of Object.keys(kinds)) {
      const has = m => m.layer === kind && (m.sink > 0.01 || kind === 'gravel');
      if (!S.some(has)) continue;
      const mat = kinds[kind](); if (kind === 'gravel') {} else if (kind !== 'snow' && kind !== 'water') mat.color = new THREE.Color(S.find(m => m.layer === kind).lcol || 0x888888); else if (kind === 'water') mat.color = new THREE.Color(S.find(m => m.layer === kind).lcol || 0x4a8ea3);
      const mesh = strip(m => -m.half - 0.3, m => m.half + 0.3, mat, null, kind === 'water' ? 4 : kind === 'gravel' ? 14 : 12, (m, u) => layerTop(m, u) + (kind === 'water' ? -0.02 : 0.005), has);
      mesh.renderOrder = kind === 'water' ? 2 : 0; out.push(mesh);
    }
    return out;
  }
  const tick = dt => { if (waterTex) { waterTex.offset.x += dt * 0.05; waterTex.offset.y += dt * 0.02; } };
  const SHOULDER = 6;
  function shoulder(side, forPhysics) {
    const pos = [], uv = [], idx = [], n = S.length;
    for (let k = 0; k <= n; k++) {
      const m = S[k % n], e = side * m.E, f = side * (m.E + SHOULDER);
      const ax = m.x + m.ox * e, az = m.z + m.oz * e, bx = m.x + m.ox * f, bz = m.z + m.oz * f;
      const ay = roadY(m, e) - 0.01, by = look.snowpack ? terrainY(bx, bz) : Math.min(terrainY(bx, bz), ay) + 0.02;   // with a snowpack the shoulder is the bank rising up
      pos.push(ax, ay, az, bx, by, bz); uv.push(ax / 3000 + 0.5, 0.5 - az / 3000, bx / 3000 + 0.5, 0.5 - bz / 3000);
      if (k < n) { const a = k * 2; if (side > 0) idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); else idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    if (forPhysics) return { vertices: new Float32Array(pos), indices: new Uint32Array(idx) };
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, look.groundMat || new THREE.MeshLambertMaterial({ color: look.skirt })); mesh.receiveShadow = true; return mesh;
  }
  function terrainMesh() {
    const { x0, z0, nx, nz, H } = T, pos = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2), idx = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i, x = x0 + i * CELL, z = z0 + j * CELL; pos.set([x, H[k], z], k * 3); uv.set([x / 3000 + 0.5, 0.5 - z / 3000], k * 2); }
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, look.groundMat || new THREE.MeshLambertMaterial({ color: look.skirt })); mesh.receiveShadow = true; return mesh;
  }
  // the tunnel: an arch over the road inside a long hill, with portal faces at each end
  function tunnelGeo() {
    if (!marks.tunnel) return null;
    const [a, e] = marks.tunnel, inner = [], outer = [], A = 18;
    for (let k = 0; k <= A; k++) { const th = Math.PI * k / A; inner.push([Math.cos(th), Math.sin(th)]); }
    const prof = m => {   // 2D profile (u, y above the road's lower edge): inner arch left to right, outer hill right to left
      const r = m.E + 1.2, W = m.E + 34, top = 13;
      const ins = inner.map(([c, s]) => [-c * r, s * Math.min(r, 8.5)]).reverse();
      const outs = []; for (let k = 0; k <= 16; k++) { const u = W - 2 * W * k / 16, q = 1 - (u / W) ** 2; outs.push([u, top * q * (0.85 + 0.15 * q)]); }
      return { ins, outs };
    };
    const pos = [], idx = [], put = (m, u, y) => { pos.push(m.x + m.ox * u, m.h + BASE + y, m.z + m.oz * u); return pos.length / 3 - 1; };
    const rows = [];
    for (let i = a; i <= e; i++) { const m = S[i], p = prof(m); rows.push({ m, ins: p.ins.map(([u, y]) => put(m, u, y)), outs: p.outs.map(([u, y]) => put(m, u, y)) }); }
    for (let r = 0; r < rows.length - 1; r++) for (const key of ['ins', 'outs']) {
      const A0 = rows[r][key], B0 = rows[r + 1][key];
      for (let k = 0; k < A0.length - 1; k++) { if (key === 'ins') idx.push(A0[k], B0[k], A0[k + 1], A0[k + 1], B0[k], B0[k + 1]); else idx.push(A0[k], A0[k + 1], B0[k], A0[k + 1], B0[k + 1], B0[k]); }
    }
    // portal faces: the ring between the hill outline and the arch, at both ends
    for (const [row, flip] of [[rows[0], true], [rows[rows.length - 1], false]]) {
      const p = prof(row.m), contour = p.outs.concat([[p.ins[0][0], 0]]).map(([u, y]) => new THREE.Vector2(u, y)), hole = p.ins.map(([u, y]) => new THREE.Vector2(u, y));
      const pts = contour.concat(hole), tris = THREE.ShapeUtils.triangulateShape(contour, [hole]), base = pos.length / 3;
      for (const v of pts) put(row.m, v.x, v.y);
      for (const t of tris) idx.push(...(flip ? [base + t[0], base + t[2], base + t[1]] : [base + t[0], base + t[1], base + t[2]]));
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  function startLine() {
    const g = new THREE.Group(), m = S[marks.start], white = new THREE.MeshLambertMaterial({ color: 0xffffff }), black = new THREE.MeshLambertMaterial({ color: 0x1c1c1c });
    for (let a = 0; a < 14; a++) for (let b = 0; b < 2; b++) {
      const t = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), (a + b) % 2 ? white : black); t.rotation.x = -Math.PI / 2; t.rotation.z = Math.atan2(m.hx, m.hz);
      const u = a - 6.5, l = b - 0.5; t.position.set(m.x + m.hx * l + m.ox * u, roadY(m, u) + 0.02, m.z + m.hz * l + m.oz * u); g.add(t);
    }
    const post = new THREE.MeshLambertMaterial({ color: 0x2a2a2a }), banner = new THREE.MeshLambertMaterial({ color: 0xf4c430 });
    for (const sd of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8, 0.6), post); p.position.set(m.x + m.ox * sd * (m.E + 1.2), m.h + 4, m.z + m.oz * sd * (m.E + 1.2)); p.castShadow = true; g.add(p); }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(m.E * 2 + 3, 1.6, 1), banner); bar.rotation.y = Math.atan2(-m.oz, m.ox); bar.position.set(m.x, m.h + 8, m.z); bar.castShadow = true; g.add(bar);
    return g;
  }

  function build(scene, opts) {
    P = Object.assign({}, D, opts || {});
    if (group) { scene.remove(group); group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    sample(); buildTerrain();
    group = new THREE.Group();
    // the road is coloured by each sector's surface, blending over ~30 m where one surface meets the next
    let cols = null;
    if (look.sectorColors) {
      const base = S.map(m => new THREE.Color(look.sectorColors['ABCD'.indexOf(m.zone)] || 0x888888)), n = S.length, W = 15;
      cols = S.map((m, i) => { const c = new THREE.Color(0, 0, 0); for (let k = -W; k <= W; k++) c.add(base[(i + k + n) % n]); return c.multiplyScalar(1 / (2 * W + 1)); });
    }
    const roadMat = new THREE.MeshLambertMaterial({ map: roadTex(), vertexColors: !!cols });
    group.add(strip(m => -m.half, m => m.half, roadMat, cols ? k => cols[k % S.length] : null, 12));
    group.add(...layers());
    const red = new THREE.Color(0xd62828), wht = new THREE.Color(0xf5f5f5), kerbMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const stripe = k => (Math.floor(k / 4) % 2 ? red : wht);
    group.add(strip(m => -m.E, m => -m.half, kerbMat, stripe), strip(m => m.half, m => m.E, kerbMat, stripe));
    group.add(terrainMesh(), shoulder(1), shoulder(-1));
    const tg = tunnelGeo(); if (tg) { const tm = new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ color: look.tunnel || 0x8a7a66, flatShading: true, side: THREE.DoubleSide })); tm.castShadow = tm.receiveShadow = true; group.add(tm); }
    group.add(startLine());
    scene.add(group);
    return { S, LEN, P };
  }
  // triangles for the physics engine: road + kerbs, the terrain, and the tunnel
  function collisionMeshes() {
    const out = [], n = S.length;
    { const g = strip(m => -m.E, m => m.E, null, null, 14).geometry;
      out.push({ vertices: new Float32Array(g.attributes.position.array), indices: new Uint32Array(g.index.array) }); g.dispose(); }
    { const { x0, z0, nx, nz, C } = T, pos = new Float32Array(nx * nz * 3), idx = [];
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; pos.set([x0 + i * CELL, C[k], z0 + j * CELL], k * 3); }
      for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx.push(a, c, b, b, c, d); }
      out.push({ vertices: pos, indices: new Uint32Array(idx) }); }
    out.push(shoulder(1, true), shoulder(-1, true));
    const tg = tunnelGeo(); if (tg) out.push({ vertices: new Float32Array(tg.attributes.position.array), indices: new Uint32Array(tg.index.array) });
    return out;
  }
  return { setLook: l => { look = Object.assign({}, look, l); }, build, surface, groundY, collisionMeshes, clearOf, tick, bedY, defaults: D, get S() { return S; }, get LEN() { return LEN; }, get P() { return P; }, get marks() { return marks; }, EDGE, roadY };
})();
