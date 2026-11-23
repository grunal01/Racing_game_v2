// ===== Effects: what the wheels throw up, and the tracks they leave =====
// Particles: each surface family has its own look - dust plumes (dry ground), mud clumps, water spray, snow powder,
// ice sparkles, tyre smoke (sliding on asphalt), grass bits. Loose ground throws stuff whenever you drive on it;
// hard ground only when you slide.
// Tracks: ruts on loose ground (always), skid marks on hard ground (only when sliding). They stay until the oldest are
// recycled (a few hundred metres per wheel).
const Effects = (function () {
  // ---------- particles ----------
  const MAXP = 2400;
  let scene = null, points = null, P = null, next = 0;
  const vert = `attribute float size; attribute float alpha; attribute vec3 pcol; varying float vA; varying vec3 vC;
    void main() { vA = alpha; vC = pcol; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * 700.0 / max(1.0, -mv.z); gl_Position = projectionMatrix * mv; }`;
  const frag = `varying float vA; varying vec3 vC;
    void main() { float d = length(gl_PointCoord - 0.5); float a = vA * smoothstep(0.5, 0.15, d); if (a < 0.01) discard; gl_FragColor = vec4(vC, a); }`;
  function init(sc) {
    scene = sc;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXP * 3), 3));
    g.setAttribute('pcol', new THREE.BufferAttribute(new Float32Array(MAXP * 3), 3));
    g.setAttribute('size', new THREE.BufferAttribute(new Float32Array(MAXP), 1));
    g.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(MAXP), 1));
    points = new THREE.Points(g, new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false }));
    points.frustumCulled = false; scene.add(points);
    P = { x: new Float32Array(MAXP), y: new Float32Array(MAXP), z: new Float32Array(MAXP), vx: new Float32Array(MAXP), vy: new Float32Array(MAXP), vz: new Float32Array(MAXP),
      life: new Float32Array(MAXP), max: new Float32Array(MAXP), s0: new Float32Array(MAXP), s1: new Float32Array(MAXP), grav: new Float32Array(MAXP), drag: new Float32Array(MAXP), a0: new Float32Array(MAXP),
      r: new Float32Array(MAXP), g: new Float32Array(MAXP), b: new Float32Array(MAXP) };
    initTracks();
  }
  const tc = new THREE.Color();
  function emit(x, y, z, vx, vy, vz, life, s0, s1, grav, drag, color, a0) {
    const i = next; next = (next + 1) % MAXP; tc.set(color);
    P.x[i] = x; P.y[i] = y; P.z[i] = z; P.vx[i] = vx; P.vy[i] = vy; P.vz[i] = vz; P.life[i] = life; P.max[i] = life; P.s0[i] = s0; P.s1[i] = s1; P.grav[i] = grav; P.drag[i] = drag; P.a0[i] = a0;
    P.r[i] = tc.r; P.g[i] = tc.g; P.b[i] = tc.b;
  }
  function stepParticles(dt) {
    const g = points.geometry, pos = g.attributes.position.array, col = g.attributes.pcol.array, size = g.attributes.size.array, al = g.attributes.alpha.array;
    for (let i = 0; i < MAXP; i++) {
      if (P.life[i] <= 0) { al[i] = 0; continue; }
      P.life[i] -= dt; const t = 1 - Math.max(0, P.life[i]) / P.max[i], k = Math.max(0, 1 - P.drag[i] * dt);
      P.vx[i] *= k; P.vz[i] *= k; P.vy[i] = P.vy[i] * k - P.grav[i] * dt;
      P.x[i] += P.vx[i] * dt; P.y[i] += P.vy[i] * dt; P.z[i] += P.vz[i] * dt;
      pos[i * 3] = P.x[i]; pos[i * 3 + 1] = P.y[i]; pos[i * 3 + 2] = P.z[i];
      col[i * 3] = P.r[i]; col[i * 3 + 1] = P.g[i]; col[i * 3 + 2] = P.b[i];
      size[i] = P.s0[i] + (P.s1[i] - P.s0[i]) * t; al[i] = P.a0[i] * (1 - t) * Math.min(1, t * 8 + 0.2);
    }
    for (const n of ['position', 'pcol', 'size', 'alpha']) g.attributes[n].needsUpdate = true;
  }

  // which look each surface gets
  const FAMILY = {
    hardpan: 'dust', packedDirt: 'dust', dirt: 'dust', gravel: 'gravel', softSand: 'sand', dunes: 'sand', meadow: 'grass', jungleFloor: 'grass', wetGrass: 'grass',
    mud: 'mud', wetClay: 'mud', water: 'water', packedSnow: 'snow', deepSnow: 'snow', snowField: 'snow', slush: 'slush', ice: 'ice', asphalt: 'tarmac'
  };
  const LOOSE = { dust: true, gravel: true, sand: true, mud: true, water: true, snow: true, slush: true, grass: false, ice: false, tarmac: false };
  const lighten = (hex, k) => new THREE.Color(hex).lerp(new THREE.Color(0xffffff), k).getHex();

  // ---------- tracks: one ribbon of quads per rear wheel ----------
  const SEG = 1400, tracks = [];
  let trackMat = null;
  function initTracks() {
    trackMat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    for (let w = 0; w < 2; w++) {
      const g = new THREE.BufferGeometry(), idx = [];
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SEG * 4 * 3), 3));
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(SEG * 4 * 4), 4));
      g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(SEG * 4 * 3).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
      for (let k = 0; k < SEG; k++) { const a = k * 4; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }   // faces up
      g.setIndex(idx);
      const mesh = new THREE.Mesh(g, trackMat); mesh.frustumCulled = false; mesh.receiveShadow = true; scene.add(mesh);
      tracks.push({ mesh, next: 0, last: null });
    }
  }
  function lay(tr, x, y, z, w, color, alpha) {
    if (!tr.last) { tr.last = { x, y, z }; return; }
    const L = tr.last, dx = x - L.x, dz = z - L.z, d = Math.hypot(dx, dz);
    if (d < 0.5) return;
    if (d > 4) { tr.last = { x, y, z }; return; }   // a jump or a reset: start a new track
    const sx = -dz / d * w / 2, sz = dx / d * w / 2, k = tr.next; tr.next = (tr.next + 1) % SEG;
    const pos = tr.mesh.geometry.attributes.position.array, col = tr.mesh.geometry.attributes.color.array; tc.set(color);
    const verts = [[L.x - sx, L.y, L.z - sz], [L.x + sx, L.y, L.z + sz], [x - sx, y, z - sz], [x + sx, y, z + sz]];
    verts.forEach((v, j) => { pos.set(v, (k * 4 + j) * 3); col.set([tc.r, tc.g, tc.b, alpha], (k * 4 + j) * 4); });
    tr.mesh.geometry.attributes.position.needsUpdate = true; tr.mesh.geometry.attributes.color.needsUpdate = true;
    tr.last = { x, y, z };
  }

  // ---------- each frame ----------
  const wp = new THREE.Vector3();
  function update(car, dt) {
    if (!points || !car || !car.mesh) return;
    dt = Math.min(dt, 0.05);
    stepParticles(dt);
    const sf = car.surf; if (!sf) return;
    const fam = FAMILY[sf.id] || 'dust', loose = LOOSE[fam], speed = Math.hypot(car.vx, car.vz), slide = Math.abs(Math.sin(car.slipR || 0)) * speed;
    const rear = car.wheels.filter(w => !w.front).slice(0, 2), fx = Math.sin(car.iyaw), fz = Math.cos(car.iyaw);
    const sliding = slide > 4, marking = !car.air && (loose ? speed > 2 : sliding);
    rear.forEach((w, i) => {
      wp.copy(w.at).applyQuaternion(car.mesh.quaternion).add(car.mesh.position);
      const gs = Track.surface(wp.x, wp.z, car.hint), gy = gs.y, top = gs.top == null ? gy : gs.top, tr = tracks[i];   // ground, and the top of any water/snow/mud layer
      // tracks
      if (marking) {
        const col = fam === 'tarmac' ? 0x1b1b1b : fam === 'ice' ? 0xffffff : fam === 'snow' ? 0x9fb1bf : new THREE.Color(sf.color).multiplyScalar(fam === 'mud' ? 0.45 : 0.62).getHex();
        const a = fam === 'tarmac' ? Math.min(0.7, slide / 18) : fam === 'ice' ? 0.45 : fam === 'water' ? 0.3 : fam === 'snow' ? 0.8 : 0.75;
        lay(tr, wp.x, (fam === 'snow' || fam === 'mud' || fam === 'slush' ? top : gy) + 0.04, wp.z, Math.max(0.55, w.r * 1.8), col, a);
      } else tr.last = null;
      if (car.air) return;
      // particles: how many this frame
      const rate = ((loose ? speed * 1.6 : 0) + (sliding ? slide * (fam === 'tarmac' ? 2 : 1.4) : 0)) * (sf.spray == null ? 1 : sf.spray);   // per-surface spray amount (surfaces.js)
      let n = rate * dt; while (n > 0) {
        if (n < 1 && Math.random() > n) break; n -= 1;
        const rx = (Math.random() - 0.5), rz = (Math.random() - 0.5), y = top + 0.15;
        switch (fam) {
          case 'mud': emit(wp.x, y, wp.z, -fx * speed * 0.15 + rx * 4, 3 + Math.random() * 4, -fz * speed * 0.15 + rz * 4, 0.9, 0.35, 0.3, 16, 0.5, new THREE.Color(sf.color).multiplyScalar(0.8).getHex(), 0.95); break;
          case 'water': emit(wp.x, y, wp.z, -fx * speed * 0.06 + rx * 3, 1.2 + Math.random() * 2.2, -fz * speed * 0.06 + rz * 3, 0.55, 0.35, 0.9, 11, 0.8, 0xdcf0f7, 0.55); break;
          case 'snow': case 'slush': emit(wp.x, y, wp.z, -fx * speed * 0.08 + rx * 3, 1 + Math.random() * 2.5, -fz * speed * 0.08 + rz * 3, 1.1, 0.7, 2.6, fam === 'slush' ? 6 : 1.2, 1.2, fam === 'slush' ? 0xc5d0d6 : 0xffffff, 0.6); break;
          case 'ice': if (Math.random() < 0.4) emit(wp.x, y, wp.z, rx * 3, 1 + Math.random() * 2, rz * 3, 0.4, 0.22, 0.12, 4, 1, 0xffffff, 0.95); break;
          case 'tarmac': emit(wp.x, y, wp.z, rx * 1.5, 0.6 + Math.random(), rz * 1.5, 1.6, 1.0, 4.5, -0.3, 1.5, 0xe2e2e2, 0.28); break;
          case 'grass': emit(wp.x, y, wp.z, -fx * speed * 0.1 + rx * 3, 2 + Math.random() * 2, -fz * speed * 0.1 + rz * 3, 0.6, 0.22, 0.2, 12, 0.5, new THREE.Color(sf.color).multiplyScalar(0.9).getHex(), 0.9); break;
          case 'gravel': emit(wp.x, y, wp.z, -fx * speed * 0.12 + rx * 4, 2 + Math.random() * 3, -fz * speed * 0.12 + rz * 4, 0.6, 0.18, 0.15, 14, 0.3, 0x8a8478, 0.95);
            if (Math.random() < 0.4) emit(wp.x, y, wp.z, rx * 2, 0.6, rz * 2, 1.2, 1, 3.5, -0.2, 1.3, lighten(sf.color, 0.35), 0.25); break;
          case 'sand': emit(wp.x, y, wp.z, -fx * speed * 0.06 + rx * 2.5, 0.8 + Math.random() * 1.5, -fz * speed * 0.06 + rz * 2.5, 1.6, 1.4, 6, -0.15, 1.1, lighten(sf.color, 0.45), 0.55); break;
          default: emit(wp.x, y, wp.z, -fx * speed * 0.05 + rx * 2, 0.6 + Math.random(), -fz * speed * 0.05 + rz * 2, 1.3, 1.2, 5, -0.2, 1.3, lighten(sf.color, 0.45), 0.5);
        }
      }
    });
  }
  // a cloud of dust when a wall breaks
  function dustBurst(x, y, z, color, vx, vz) {
    if (!points) return;
    for (let i = 0; i < 70; i++) emit(x + (Math.random() - 0.5) * 4, y + Math.random() * 2.5, z + (Math.random() - 0.5) * 4, vx * 0.25 + (Math.random() - 0.5) * 9, Math.random() * 4, vz * 0.25 + (Math.random() - 0.5) * 9, 1.4 + Math.random(), 1.5, 6, -0.3, 1.6, lighten(color, 0.35), 0.45);
  }
  // wipe tracks and particles (new track or map)
  function clear() {
    if (!points) return; P.life.fill(0);
    for (const tr of tracks) { tr.mesh.geometry.attributes.color.array.fill(0); tr.mesh.geometry.attributes.color.needsUpdate = true; tr.last = null; tr.next = 0; }
  }
  return { init, update, clear, dustBurst, get _debug() { return { tracks, alive: P ? P.life.filter(l => l > 0).length : 0 }; } };
})();
