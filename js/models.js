// ===== 20 simple low-poly racer models (10 biological mounts, 10 machines) =====
// Each model: static parts grouped by material slot (paint, second, dark, glass, light),
// plus animated legs / wheels / wings. +x is forward, y is up.
const Models = (function () {
  const cache = {};
  function prep(g) { return g.index ? g.toNonIndexed() : g; }
  function merge(geos) {
    if (!geos.length) return null;
    let n = 0; for (const g of geos) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
    for (const g of geos) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; g.dispose(); }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.computeBoundingSphere();
    return out;
  }
  function place(g, x, y, z, rx, ry, rz, sx, sy, sz) {
    if (sx) g.scale(sx, sy, sz);
    if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); if (rz) g.rotateZ(rz);
    g.translate(x, y, z); return prep(g);
  }
  // shape helpers: return [slot, geometry]
  // rounded boxes give everything softer, chunkier edges
  const box = (w, h, d) => THREE.RoundedBoxGeometry && Math.min(w, h, d) > 0.09 ? new THREE.RoundedBoxGeometry(w, h, d, 2, Math.min(0.14, Math.min(w, h, d) * 0.28)) : new THREE.BoxGeometry(w, h, d);
  const B = (slot, w, h, d, x, y, z, rx, ry, rz) => [slot, place(box(w, h, d), x, y, z, rx, ry, rz)];
  const S = (slot, r, x, y, z, sx, sy, sz) => [slot, place(new THREE.SphereGeometry(r, 14, 10), x, y, z, 0, 0, 0, sx || 1, sy || 1, sz || 1)];
  const Cy = (slot, rt, rb, h, x, y, z, rx, ry, rz, seg) => [slot, place(new THREE.CylinderGeometry(rt, rb, h, seg || 12), x, y, z, rx, ry, rz)];
  const Co = (slot, r, h, x, y, z, rx, ry, rz, seg) => [slot, place(new THREE.ConeGeometry(r, h, seg || 7), x, y, z, rx, ry, rz)];
  const PI = Math.PI;
  const leg = (x, z, len, th, hip, slot, phase) => ({ x, z, len, th, hip: hip === undefined ? len : hip, slot: slot || 'paint', phase: phase || 0 });
  const wheel = (x, z, r, w, front) => ({ x, z, r, w, front });

  const DEFS = {
    // ---------------- biological ----------------
    "Horse": { palette: [0x7b4a2a, 0x5a3a24, 0xd9c3a0, 0x2b2420, 0xf2eee8], second: 0x2b1d14,
      parts: [B('paint', 2.6, 1.0, 1.0, 0, 2.0, 0), B('paint', 0.55, 1.3, 0.5, 1.25, 2.65, 0, 0, 0, -0.55), B('paint', 0.95, 0.45, 0.45, 1.75, 3.15, 0, 0, 0, -0.25),
        B('second', 0.16, 1.1, 0.22, 1.05, 2.95, 0, 0, 0, -0.55), Cy('second', 0.07, 0.16, 1.1, -1.45, 1.95, 0, 0, 0, 0.7), B('light', 0.9, 0.18, 1.06, 0, 2.56, 0), B('dark', 0.12, 0.25, 0.12, 1.55, 3.45, 0.15), B('dark', 0.12, 0.25, 0.12, 1.55, 3.45, -0.15)],
      legs: [leg(0.95, 0.33, 1.5, 0.26), leg(0.95, -0.33, 1.5, 0.26, undefined, 'paint', PI), leg(-0.95, 0.33, 1.5, 0.26, undefined, 'paint', PI), leg(-0.95, -0.33, 1.5, 0.26)] },
    "Rhino": { palette: [0x8a8d90, 0x7a7068, 0x9a9488], second: 0x5a5d60,
      parts: [S('paint', 1, 0, 1.55, 0, 1.75, 1.0, 1.1), B('paint', 1.1, 0.85, 0.85, 1.7, 1.45, 0), Co('light', 0.2, 0.9, 2.3, 2.05, 0, 0, 0, -0.35), Co('light', 0.14, 0.45, 1.85, 2.0, 0, 0, 0, -0.2),
        Co('paint', 0.14, 0.35, 1.45, 2.05, 0.3), Co('paint', 0.14, 0.35, 1.45, 2.05, -0.3), Cy('second', 0.05, 0.08, 0.6, -1.75, 1.6, 0, 0, 0, 0.9)],
      legs: [leg(1.0, 0.55, 1.0, 0.42), leg(1.0, -0.55, 1.0, 0.42, undefined, 'paint', PI), leg(-1.0, 0.55, 1.0, 0.42, undefined, 'paint', PI), leg(-1.0, -0.55, 1.0, 0.42)] },
    "Kangaroo": { palette: [0xb07a4a, 0xc08a5a, 0x9a6a40], second: 0xe8d2b0, hop: true,
      parts: [S('paint', 1, 0, 1.9, 0, 0.95, 1.15, 0.72), S('second', 0.6, 0.35, 1.75, 0, 0.8, 0.9, 0.7), S('paint', 0.45, 0.55, 3.0, 0, 1.3, 1, 0.9),
        Co('paint', 0.14, 0.55, 0.45, 3.5, 0.17), Co('paint', 0.14, 0.55, 0.45, 3.5, -0.17), Cy('paint', 0.1, 0.35, 2.1, -1.1, 0.9, 0, 0, 0, 1.25), B('paint', 0.35, 0.6, 0.2, 0.65, 2.1, 0.3), B('paint', 0.35, 0.6, 0.2, 0.65, 2.1, -0.3)],
      legs: [leg(-0.2, 0.42, 1.1, 0.36, 1.2), leg(-0.2, -0.42, 1.1, 0.36, 1.2)] },
    "Snail": { palette: [0x9aa07a, 0x8a9a8a, 0xb0a890], second: 0xc0763a,
      parts: [B('paint', 3.3, 0.55, 1.3, 0, 0.28, 0), S('second', 1.25, -0.35, 1.65, 0, 1, 1, 0.72), S('light', 0.55, -0.35, 1.65, 0.62, 1, 1, 0.3),
        S('paint', 0.45, 1.55, 0.75, 0), Cy('paint', 0.06, 0.06, 0.9, 1.75, 1.3, 0.22, 0, 0, -0.25), Cy('paint', 0.06, 0.06, 0.9, 1.75, 1.3, -0.22, 0, 0, -0.25),
        S('dark', 0.13, 1.88, 1.75, 0.24), S('dark', 0.13, 1.88, 1.75, -0.24)], legs: [] },
    "Giant tortoise": { palette: [0x7a8a5a, 0x6a7a4a, 0x8a8a6a], second: 0x4a6a3a,
      parts: [S('second', 1.45, 0, 1.25, 0, 1.3, 0.72, 1.05), B('dark', 3.3, 0.18, 2.6, 0, 0.75, 0), S('paint', 0.42, 1.95, 0.95, 0, 1.2, 0.9, 0.9), Co('paint', 0.18, 0.5, -1.85, 0.8, 0, 0, 0, PI / 2)],
      legs: [leg(1.0, 0.85, 0.8, 0.46), leg(1.0, -0.85, 0.8, 0.46, undefined, 'paint', PI), leg(-1.0, 0.85, 0.8, 0.46, undefined, 'paint', PI), leg(-1.0, -0.85, 0.8, 0.46)] },
    "Camel": { palette: [0xc9a46a, 0xb8904f, 0xd8b87a], second: 0x8a6a3a,
      parts: [S('paint', 1, 0, 2.3, 0, 1.45, 0.7, 0.62), S('paint', 0.55, -0.45, 3.0, 0, 1, 1, 0.9), S('paint', 0.5, 0.45, 2.9, 0, 1, 1, 0.9),
        B('paint', 0.42, 1.4, 0.42, 1.45, 2.85, 0, 0, 0, -0.6), B('paint', 0.85, 0.42, 0.42, 1.95, 3.45, 0), B('second', 1.0, 0.15, 1.3, 0, 3.05, 0)],
      legs: [leg(1.0, 0.3, 1.9, 0.2), leg(1.0, -0.3, 1.9, 0.2, undefined, 'paint', PI), leg(-1.0, 0.3, 1.9, 0.2, undefined, 'paint', PI), leg(-1.0, -0.3, 1.9, 0.2)] },
    "Giant frog": { palette: [0x4caf50, 0x6abf4a, 0x2e9a6a, 0xd4b13a], second: 0xd8e8a0, hop: true,
      parts: [S('paint', 1.2, 0, 1.05, 0, 1.35, 0.8, 1.2), S('second', 0.9, 0.4, 0.8, 0, 1.2, 0.5, 1.1), S('light', 0.32, 0.85, 1.85, 0.52), S('light', 0.32, 0.85, 1.85, -0.52),
        S('dark', 0.15, 1.1, 1.9, 0.55), S('dark', 0.15, 1.1, 1.9, -0.55), B('paint', 1.2, 0.45, 0.5, -0.85, 0.45, 1.15), B('paint', 1.2, 0.45, 0.5, -0.85, 0.45, -1.15),
        B('paint', 0.3, 0.7, 0.3, 0.9, 0.35, 0.7), B('paint', 0.3, 0.7, 0.3, 0.9, 0.35, -0.7)], legs: [] },
    "Ostrich": { palette: [0x2b2420, 0x3a3230, 0x5a4a3a], second: 0xf2b8a8,
      parts: [S('paint', 1, 0, 2.45, 0, 1.15, 0.82, 0.82), S('light', 0.55, -1.0, 2.6, 0, 1, 0.8, 1), Cy('second', 0.11, 0.15, 1.9, 0.95, 3.35, 0, 0, 0, -0.3),
        S('second', 0.3, 1.25, 4.25, 0), Co('light', 0.12, 0.45, 1.6, 4.2, 0, 0, 0, -PI / 2), S('dark', 0.06, 1.38, 4.35, 0.18)],
      legs: [leg(0, 0.35, 2.0, 0.15, 2.0, 'second'), leg(0, -0.35, 2.0, 0.15, 2.0, 'second', PI)] },
    "Giant beetle": { palette: [0x1f6f8b, 0x2e8b57, 0x6a3d9a, 0x8b2e2e], second: 0x111418,
      parts: [S('paint', 1.3, -0.1, 1.05, 0, 1.45, 0.62, 1.0), B('second', 2.8, 0.06, 0.06, -0.1, 1.85, 0), S('second', 0.55, 1.7, 0.85, 0), Co('second', 0.16, 1.1, 2.25, 1.35, 0, 0, 0, -1.1)],
      legs: [leg(0.8, 0.8, 0.9, 0.14, 0.9, 'second'), leg(0, 0.85, 0.9, 0.14, 0.9, 'second', PI), leg(-0.8, 0.8, 0.9, 0.14, 0.9, 'second'),
        leg(0.8, -0.8, 0.9, 0.14, 0.9, 'second', PI), leg(0, -0.85, 0.9, 0.14, 0.9, 'second'), leg(-0.8, -0.8, 0.9, 0.14, 0.9, 'second', PI)] },
    "Dragon": { palette: [0xb22222, 0x2e8b57, 0x4b0082, 0x222222], second: 0xe0a040,
      parts: [S('paint', 1, 0, 1.85, 0, 1.8, 0.82, 0.82), Cy('paint', 0.3, 0.42, 1.4, 1.5, 2.55, 0, 0, 0, -0.7), B('paint', 1.0, 0.55, 0.6, 2.15, 3.05, 0),
        Co('second', 0.1, 0.5, 1.9, 3.45, 0.2, 0, 0, -0.5), Co('second', 0.1, 0.5, 1.9, 3.45, -0.2, 0, 0, -0.5), Co('paint', 0.4, 2.6, -2.5, 1.65, 0, 0, 0, PI / 2 + 0.15),
        B('second', 1.6, 0.18, 0.12, -0.2, 2.6, 0)],
      legs: [leg(0.9, 0.5, 1.0, 0.32), leg(0.9, -0.5, 1.0, 0.32, undefined, 'paint', PI), leg(-0.9, 0.5, 1.0, 0.32, undefined, 'paint', PI), leg(-0.9, -0.5, 1.0, 0.32)],
      wings: true },
    // ---------------- mechanical ----------------
    "Sports car": { palette: [0xd62828, 0x1d4ed8, 0xf4c430, 0x111111, 0xffffff], second: 0x111111,
      parts: [B('paint', 4.2, 0.55, 2.0, 0, 0.62, 0), B('paint', 1.5, 0.28, 1.9, 1.5, 0.95, 0, 0, 0, -0.16), B('glass', 1.7, 0.5, 1.65, -0.3, 1.12, 0), B('paint', 1.3, 0.08, 1.6, -0.35, 1.38, 0),
        B('second', 0.45, 0.08, 2.0, -1.95, 1.28, 0), B('second', 0.08, 0.35, 0.08, -1.95, 1.08, 0.7), B('second', 0.08, 0.35, 0.08, -1.95, 1.08, -0.7), B('light', 0.06, 0.15, 0.45, 2.11, 0.72, 0.65), B('light', 0.06, 0.15, 0.45, 2.11, 0.72, -0.65)],
      wheels: [wheel(1.3, 1.0, 0.45, 0.4, true), wheel(1.3, -1.0, 0.45, 0.4, true), wheel(-1.3, 1.0, 0.47, 0.45), wheel(-1.3, -1.0, 0.47, 0.45)] },
    "Dune buggy": { palette: [0xff8c1a, 0x3aa655, 0x2b6cb0, 0xe63946], second: 0x222222,
      parts: [B('paint', 3.2, 0.4, 1.6, 0, 0.95, 0), B('paint', 1.0, 0.3, 1.5, 1.3, 1.2, 0, 0, 0, -0.3), B('glass', 0.8, 0.5, 0.9, -0.3, 1.35, 0),
        B('second', 0.12, 1.1, 0.12, 0.4, 1.7, 0.7), B('second', 0.12, 1.1, 0.12, 0.4, 1.7, -0.7), B('second', 0.12, 1.1, 0.12, -1.0, 1.7, 0.7), B('second', 0.12, 1.1, 0.12, -1.0, 1.7, -0.7),
        B('second', 1.55, 0.12, 0.12, -0.3, 2.25, 0.7), B('second', 1.55, 0.12, 0.12, -0.3, 2.25, -0.7), B('second', 0.12, 0.12, 1.5, 0.4, 2.25, 0), B('second', 0.12, 0.12, 1.5, -1.0, 2.25, 0)],
      wheels: [wheel(1.25, 1.1, 0.7, 0.55, true), wheel(1.25, -1.1, 0.7, 0.55, true), wheel(-1.2, 1.1, 0.75, 0.6), wheel(-1.2, -1.1, 0.75, 0.6)] },
    "Tank": { palette: [0x556b2f, 0x6b6b4a, 0x8a7a5a], second: 0x2a2a26,
      parts: [B('paint', 4.4, 1.0, 2.4, 0, 1.0, 0), B('paint', 1.3, 0.5, 2.3, 2.3, 0.85, 0, 0, 0, -0.5), B('paint', 1.9, 0.8, 1.7, -0.3, 1.9, 0), Cy('second', 0.16, 0.16, 2.8, 1.75, 2.0, 0, 0, 0, PI / 2),
        B('second', 4.8, 0.9, 0.62, 0, 0.5, 1.35), B('second', 4.8, 0.9, 0.62, 0, 0.5, -1.35), Cy('second', 0.3, 0.3, 0.3, -0.6, 2.45, 0.4)], wheels: [] },
    "Shopping trolley": { palette: [0xc0c4c8, 0xd0d4d8], second: 0xd62828,
      parts: [B('paint', 2.4, 0.08, 1.5, 0, 0.9, 0), B('paint', 2.4, 1.1, 0.06, 0, 1.45, 0.75), B('paint', 2.4, 1.1, 0.06, 0, 1.45, -0.75), B('paint', 0.06, 1.1, 1.5, 1.2, 1.45, 0), B('paint', 0.06, 1.1, 1.5, -1.2, 1.45, 0),
        B('paint', 2.4, 0.06, 0.06, 0, 1.75, 0.75), B('paint', 2.4, 0.06, 0.06, 0, 1.75, -0.75), Cy('second', 0.07, 0.07, 1.7, -1.55, 2.1, 0, PI / 2), B('paint', 0.06, 0.6, 0.06, -1.35, 1.9, 0.7), B('paint', 0.06, 0.6, 0.06, -1.35, 1.9, -0.7),
        B('second', 0.9, 0.6, 0.06, -0.7, 1.4, 0.78)],
      wheels: [wheel(1.0, 0.65, 0.22, 0.15, true), wheel(1.0, -0.65, 0.22, 0.15, true), wheel(-1.0, 0.65, 0.22, 0.15), wheel(-1.0, -0.65, 0.22, 0.15)] },
    "Ice cream van": { palette: [0xffc0d9, 0xbde0fe, 0xfff1a8, 0xc8f7c5], second: 0xd9a45a,
      parts: [B('paint', 3.4, 2.2, 2.1, -0.4, 1.6, 0), B('paint', 1.0, 1.4, 2.1, 1.75, 1.2, 0), B('glass', 0.06, 0.6, 1.8, 2.26, 1.55, 0), B('glass', 1.6, 0.8, 0.06, -0.4, 1.9, 1.06),
        Co('second', 0.42, 1.2, -0.4, 3.35, 0, PI), S('light', 0.48, -0.4, 4.0, 0), B('light', 3.4, 0.25, 2.12, -0.4, 2.55, 0)],
      wheels: [wheel(1.4, 1.05, 0.5, 0.35, true), wheel(1.4, -1.05, 0.5, 0.35, true), wheel(-1.4, 1.05, 0.5, 0.35), wheel(-1.4, -1.05, 0.5, 0.35)] },
    "Monster truck": { palette: [0x1d4ed8, 0xd62828, 0x2e8b57, 0x111111], second: 0x222222,
      parts: [B('paint', 3.8, 1.0, 2.2, 0, 2.4, 0), B('paint', 1.6, 0.9, 2.0, 0.2, 3.35, 0), B('glass', 0.06, 0.7, 1.8, 1.01, 3.35, 0), B('second', 3.0, 0.4, 1.4, 0, 1.6, 0),
        B('light', 0.1, 0.3, 1.8, 0.3, 3.9, 0)],
      wheels: [wheel(1.45, 1.45, 1.2, 0.95, true), wheel(1.45, -1.45, 1.2, 0.95, true), wheel(-1.45, 1.45, 1.2, 0.95), wheel(-1.45, -1.45, 1.2, 0.95)] },
    "Hovercraft": { palette: [0x00a6a6, 0xf77f00, 0x6a4c93], second: 0x222222, hover: true,
      parts: [B('paint', 4.0, 0.8, 2.2, 0, 1.1, 0), B('second', 4.4, 0.5, 2.6, 0, 0.5, 0), B('glass', 1.4, 0.7, 1.5, 0.6, 1.8, 0), Cy('second', 1.0, 1.0, 0.25, -1.7, 2.1, 0, 0, 0, PI / 2, 14),
        B('paint', 0.5, 1.0, 0.1, -1.75, 2.1, 0)], wheels: [] },
    "Motorbike": { palette: [0xe63946, 0x111111, 0x1d4ed8, 0xf4c430], second: 0x2b2d42,
      parts: [B('paint', 2.3, 0.45, 0.45, 0, 1.0, 0), B('paint', 0.9, 0.4, 0.55, 0.45, 1.35, 0), B('second', 0.8, 0.2, 0.5, -0.4, 1.35, 0), B('second', 0.5, 0.95, 0.6, -0.25, 2.0, 0),
        S('paint', 0.32, 0.0, 2.65, 0), B('second', 0.15, 0.7, 0.12, 0.25, 1.8, 0.28, 0, 0, -0.6), B('second', 0.15, 0.7, 0.12, 0.25, 1.8, -0.28, 0, 0, -0.6)],
      wheels: [wheel(1.05, 0, 0.55, 0.3, true), wheel(-1.05, 0, 0.55, 0.32)] },
    "Bulldozer": { palette: [0xf4c430, 0xff8c1a], second: 0x8a8d90,
      parts: [B('paint', 3.0, 1.4, 2.2, -0.3, 1.35, 0), B('glass', 1.2, 1.0, 1.6, -0.7, 2.55, 0), B('paint', 1.3, 0.1, 1.7, -0.7, 3.1, 0), B('second', 0.3, 1.5, 3.0, 1.65, 0.95, 0),
        B('second', 1.0, 0.15, 0.15, 1.1, 1.3, 0.8), B('second', 1.0, 0.15, 0.15, 1.1, 1.3, -0.8), B('dark', 3.6, 0.9, 0.6, -0.3, 0.45, 1.2), B('dark', 3.6, 0.9, 0.6, -0.3, 0.45, -1.2), Cy('dark', 0.1, 0.1, 0.9, -1.4, 2.4, 0.6)], wheels: [] },
    "Jet car": { palette: [0xe5e5e5, 0x111111, 0xd62828, 0x1d4ed8], second: 0x3a3a3a,
      parts: [Cy('paint', 0.55, 0.7, 4.4, 0, 1.0, 0, 0, 0, PI / 2, 10), Co('paint', 0.55, 1.2, 2.75, 1.0, 0, 0, 0, -PI / 2, 10), S('glass', 0.5, 0.6, 1.5, 0, 1.6, 0.7, 0.9),
        B('second', 1.3, 0.1, 3.6, -0.7, 0.95, 0), B('second', 0.9, 1.1, 0.1, -1.8, 1.6, 0), Cy('dark', 0.55, 0.65, 0.7, -2.45, 1.0, 0, 0, 0, PI / 2, 10), Cy('light', 0.42, 0.42, 0.1, -2.82, 1.0, 0, 0, 0, PI / 2, 10)],
      wheels: [wheel(1.4, 0.7, 0.35, 0.25, true), wheel(1.4, -0.7, 0.35, 0.25, true), wheel(-1.3, 0.9, 0.38, 0.3), wheel(-1.3, -0.9, 0.38, 0.3)] }
  };

  // ---------------- extra detail: eyes on mounts; lights, exhausts and plates on machines ----------------
  const eyes = (x, y, z, r) => [S('light', r, x, y, z), S('light', r, x, y, -z), S('dark', r * 0.55, x + r * 0.6, y, z), S('dark', r * 0.55, x + r * 0.6, y, -z)];
  const DETAIL = {
    "Horse": [...eyes(1.95, 3.25, 0.2, 0.08), B('dark', 0.25, 0.12, 0.3, 1.0, 0.06, 0.33), B('dark', 0.25, 0.12, 0.3, -1.0, 0.06, -0.33), B('second', 0.6, 0.05, 0.6, 2.2, 3.05, 0)],
    "Rhino": [...eyes(1.95, 1.65, 0.38, 0.09), B('second', 0.9, 0.5, 0.06, 0, 1.5, 1.05), B('second', 0.9, 0.5, 0.06, 0, 1.5, -1.05)],
    "Kangaroo": [...eyes(0.95, 3.15, 0.25, 0.08), S('dark', 0.09, 1.08, 2.95, 0)],
    "Giant tortoise": [...eyes(2.25, 1.05, 0.2, 0.08), S('light', 0.35, 0, 2.15, 0, 1, 0.3, 1), S('light', 0.3, 0.75, 1.75, 0.6, 1, 0.3, 1), S('light', 0.3, -0.75, 1.75, -0.6, 1, 0.3, 1)],
    "Camel": [...eyes(2.25, 3.55, 0.2, 0.07), B('light', 0.25, 0.08, 1.35, -0.2, 3.13, 0), Cy('second', 0.04, 0.06, 0.7, -1.3, 2.2, 0, 0, 0, 0.6)],
    "Giant beetle": [...eyes(2.15, 0.95, 0.3, 0.1), B('light', 0.06, 0.06, 1.8, 0.4, 1.68, 0)],
    "Dragon": [...eyes(2.6, 3.2, 0.27, 0.09), Co('second', 0.12, 0.35, -0.6, 2.75, 0, 0, 0, 0.3), Co('second', 0.12, 0.35, -1.2, 2.65, 0, 0, 0, 0.4), Co('second', 0.12, 0.35, 0, 2.7, 0, 0, 0, 0.2)],
    "Snail": [B('light', 0.06, 0.06, 1.0, 1.8, 0.55, 0)],
    "Sports car": [Cy('dark', 0.1, 0.1, 0.3, -2.15, 0.55, 0.5, 0, 0, PI / 2), Cy('dark', 0.1, 0.1, 0.3, -2.15, 0.55, -0.5, 0, 0, PI / 2), B('light', 0.04, 0.22, 0.6, -2.11, 0.75, 0)],
    "Dune buggy": [S('light', 0.18, 1.6, 1.35, 0.45), S('light', 0.18, 1.6, 1.35, -0.45), Cy('dark', 0.08, 0.08, 0.9, -1.4, 1.3, 0.5, 0, 0, 0.6)],
    "Tank": [S('light', 0.14, 2.25, 1.35, 0.85), S('light', 0.14, 2.25, 1.35, -0.85), B('dark', 0.6, 0.3, 0.6, -1.6, 1.6, 0.6), Cy('dark', 0.04, 0.04, 1.6, -1.3, 2.9, -0.5)],
    "Ice cream van": [S('light', 0.16, 2.26, 0.95, 0.75), S('light', 0.16, 2.26, 0.95, -0.75), B('second', 0.06, 0.25, 0.6, 2.27, 0.6, 0), B('dark', 1.2, 0.08, 0.5, -0.4, 1.3, 1.25)],
    "Monster truck": [S('light', 0.2, 1.92, 2.45, 0.7), S('light', 0.2, 1.92, 2.45, -0.7), Cy('dark', 0.12, 0.12, 1.2, -0.6, 3.6, 0.9), Cy('dark', 0.12, 0.12, 1.2, -0.6, 3.6, -0.9)],
    "Hovercraft": [S('light', 0.15, 2.0, 1.1, 0.7), S('light', 0.15, 2.0, 1.1, -0.7), B('light', 4.02, 0.12, 2.22, 0, 1.3, 0)],
    "Motorbike": [S('light', 0.14, 1.25, 1.35, 0), Cy('dark', 0.08, 0.08, 0.9, -0.9, 0.85, 0.28, 0, 0, PI / 2)],
    "Bulldozer": [S('light', 0.15, 0.1, 3.0, 0.55), S('light', 0.15, 0.1, 3.0, -0.55), B('second', 0.12, 0.12, 2.0, -0.4, 2.0, 0)],
    "Jet car": [B('dark', 0.05, 0.4, 0.05, 1.6, 1.6, 0), Cy('light', 0.25, 0.25, 0.05, 2.0, 1.25, 0.45, PI / 2), Cy('light', 0.25, 0.25, 0.05, 2.0, 1.25, -0.45, PI / 2)],
    "Shopping trolley": [B('light', 0.5, 0.3, 0.05, 1.21, 1.6, 0)],
    "Giant frog": [S('dark', 0.05, 1.3, 1.35, 0.2), S('dark', 0.05, 1.3, 1.35, -0.2)],
    "Ostrich": []
  };
  for (const k in DETAIL) DEFS[k].parts.push(...DETAIL[k]);
  const MECH = ["Sports car", "Dune buggy", "Tank", "Shopping trolley", "Monster truck", "Hovercraft", "Motorbike", "Bulldozer", "Jet car"];
  for (const k of MECH) DEFS[k].parts = DEFS[k].parts.filter(([slot]) => slot !== 'light');
  const NAMES = Object.keys(DEFS);
  function get(name) {
    if (!DEFS[name]) name = "Sports car";
    if (cache[name]) return cache[name];
    const d = DEFS[name], slots = {};
    for (const [slot, g] of d.parts) (slots[slot] = slots[slot] || []).push(g);
    const geos = {}; for (const k in slots) geos[k] = merge(slots[k]);
    const legs = (d.legs || []).map(l => {
      const g = box(l.th, l.len, l.th); g.translate(0, -l.len / 2, 0);
      return Object.assign({}, l, { geo: prep(g) });
    });
    const wheels = (d.wheels || []).map(w => {
      const tire = new THREE.CylinderGeometry(w.r, w.r, w.w, 18); tire.rotateX(PI / 2);
      const rim = new THREE.BoxGeometry(w.r * 1.4, w.r * 0.35, w.w + 0.02);
      return Object.assign({}, w, { tire, rim });
    });
    let wing = null;
    if (d.wings) { const g = new THREE.BoxGeometry(1.8, 0.08, 2.4); g.translate(0, 0, 1.2); wing = prep(g); }
    cache[name] = { name, geos, legs, wheels, wing, palette: d.palette, second: d.second, hop: !!d.hop, hover: !!d.hover };
    return cache[name];
  }

  // ---------------- per-vehicle stats, passives, abilities ----------------
  // hp: base health · spd: top speed · hdl: handling · arm: armour · ram: ramming damage · off: off-road · jump: jump/air
  const BODY = {
    "Horse":          { type: "bio",  hp: 80,  spd: 1.15, hdl: 1.20, arm: 0.80, ram: 0.80, off: 1.10, jump: 1.45, mass: 1.0,
      passive: ["sure_footed", "Sure-footed", "Lands from any height without losing speed, and jumps further."], ability: ["Leap", "Jump on command over gaps, props and smaller racers."] },
    "Rhino":          { type: "bio",  hp: 110, spd: 0.92, hdl: 0.85, arm: 1.30, ram: 1.50, off: 1.10, jump: 0.80, mass: 2.0,
      passive: ["thick_skull", "Thick skull", "Deals double ram damage and takes half damage from rams."], ability: ["Charge", "A 2-second surge where rams deal triple damage."] },
    "Kangaroo":       { type: "bio",  hp: 75,  spd: 1.05, hdl: 1.10, arm: 0.80, ram: 0.80, off: 1.20, jump: 1.50, mass: 0.9,
      passive: ["bounding", "Bounding", "Hazards like quicksand, mud and lava barely slow it, and hurt half as much."], ability: ["Big hop", "A huge bound straight up and forward."] },
    "Snail":          { type: "bio",  hp: 100, spd: 0.80, hdl: 1.00, arm: 1.40, ram: 0.90, off: 1.00, jump: 0.80, mass: 1.2,
      passive: ["sticky", "Sticky foot", "Hills never slow it down and it never slides on ice."], ability: ["Slime trail", "Racers behind you spin out on your trail."] },
    "Giant tortoise": { type: "bio",  hp: 120, spd: 0.80, hdl: 0.80, arm: 1.60, ram: 1.00, off: 1.00, jump: 0.70, mass: 1.8,
      passive: ["shell", "Shell", "Takes 40% less damage from everything."], ability: ["Retract", "Hide in your shell: no damage for 2 seconds, but you stop."] },
    "Camel":          { type: "bio",  hp: 95,  spd: 1.00, hdl: 0.95, arm: 1.00, ram: 0.90, off: 1.15, jump: 1.00, mass: 1.2,
      passive: ["desert_born", "Desert-born", "Full speed on sand and scorching ground, and lava can't burn it."], ability: ["Second wind", "Once per race, heal 30% of your health."] },
    "Giant frog":     { type: "bio",  hp: 80,  spd: 1.00, hdl: 1.15, arm: 0.85, ram: 0.90, off: 1.10, jump: 1.50, mass: 1.0,
      passive: ["amphibian", "Amphibian", "Full speed in water, and big jumps."], ability: ["Tongue grab", "Yank the racer ahead back towards you and slingshot past."] },
    "Ostrich":        { type: "bio",  hp: 70,  spd: 1.25, hdl: 0.80, arm: 0.80, ram: 0.80, off: 1.10, jump: 1.10, mass: 0.9,
      passive: ["long_stride", "Long stride", "+12% top speed while running straight."], ability: ["Sprint", "A huge burst of speed, but no steering while it lasts."] },
    "Giant beetle":   { type: "bio",  hp: 105, spd: 0.92, hdl: 1.00, arm: 1.40, ram: 1.10, off: 1.20, jump: 0.90, mass: 1.5,
      passive: ["carapace", "Carapace", "Rocks, props and walls never hurt it or slow it down."], ability: ["Burrow", "Go underground for 3 seconds, passing under hazards and chasms."] },
    "Dragon":         { type: "bio",  hp: 115, spd: 1.12, hdl: 1.10, arm: 1.20, ram: 1.30, off: 1.10, jump: 1.60, mass: 1.6,
      passive: ["glide", "Wings", "Glides: hold accelerate in the air to sink slowly and steer (gliding is slower than running). Lava can't burn it."], ability: ["Fire breath", "Scorch the racers in front of you."] },
    "Sports car":     { type: "mech", hp: 120, spd: 1.25, hdl: 1.20, arm: 1.00, ram: 0.80, off: 0.70, jump: 1.00, mass: 1.0,
      passive: ["aero", "Aerodynamic", "+15% top speed on the road, but poor off-road."], ability: ["Nitro", "A big speed boost on the road."] },
    "Dune buggy":     { type: "mech", hp: 125, spd: 1.05, hdl: 1.15, arm: 1.00, ram: 0.90, off: 1.30, jump: 1.20, mass: 1.0,
      passive: ["rally", "Rally suspension", "Full speed on sand and rough ground, and landings never slow it down."], ability: ["Rally jump", "Pop into the air on command."] },
    "Tank":           { type: "mech", hp: 190, spd: 0.78, hdl: 0.75, arm: 1.70, ram: 1.50, off: 1.10, jump: 0.60, mass: 3.0,
      passive: ["treads", "Heavy treads", "Takes half damage from collisions and shoves lighter racers aside."], ability: ["Cannon", "Fire a shell that heavily damages the first racer it hits."] },
    "Shopping trolley": { type: "mech", hp: 90, spd: 0.85, hdl: 1.10, arm: 0.70, ram: 0.60, off: 0.90, jump: 1.00, mass: 0.7,
      passive: ["lucky", "Lucky find", "Every upgrade you get is one tier higher."], ability: ["Shopping spree", "Hoover up every coin nearby."] },
    "Ice cream van":  { type: "mech", hp: 150, spd: 0.92, hdl: 0.85, arm: 1.20, ram: 1.00, off: 0.90, jump: 0.80, mass: 1.8,
      passive: ["sweet_deals", "Sweet deals", "+50% gold, and every coin counts double."], ability: ["Jingle", "Nearby rivals slow down to listen."] },
    "Monster truck":  { type: "mech", hp: 170, spd: 0.95, hdl: 0.85, arm: 1.30, ram: 1.30, off: 1.20, jump: 1.10, mass: 2.5,
      passive: ["crush", "Crush", "Drives straight through rocks and props, and rams deal +50% damage."], ability: ["Stomp", "Slam down and damage everything around you."] },
    "Hovercraft":     { type: "mech", hp: 130, spd: 1.02, hdl: 0.90, arm: 1.00, ram: 0.90, off: 1.00, jump: 1.00, mass: 1.0,
      passive: ["hover", "Air cushion", "Never slowed or slipping on water, ice, quicksand, mud or snow."], ability: ["Lift off", "Hop over the next obstacle."] },
    "Motorbike":      { type: "mech", hp: 100, spd: 1.22, hdl: 1.35, arm: 0.80, ram: 0.70, off: 0.90, jump: 1.10, mass: 0.7,
      passive: ["weave", "Weave", "Smaller and nimbler: takes half damage from collisions."], ability: ["Wheelie dash", "A quick burst of speed."] },
    "Bulldozer":      { type: "mech", hp: 175, spd: 0.82, hdl: 0.80, arm: 1.50, ram: 1.40, off: 1.10, jump: 0.70, mass: 3.0,
      passive: ["plough", "Plough", "Smashes through rocks and props, and pushes racers aside without slowing."], ability: ["Bulldoze", "Shove everything ahead out of your way."] },
    "Jet car":        { type: "mech", hp: 120, spd: 1.20, hdl: 1.00, arm: 1.00, ram: 0.90, off: 0.90, jump: 1.30, mass: 1.0,
      passive: ["glide", "Jet wings", "Glides: hold accelerate in the air to sink slowly and steer (gliding is slower than driving). Boost pads last twice as long."], ability: ["Afterburner", "Short powered flight. Overuse overheats you."] }
  };
  return { get, NAMES, BODY };
})();

// ===== Stats (v14): one scale for everything. 1000 = median, nothing is capped. =====
const Stats = (function () {
  const FAMS = {
    driving: { label: "Driving", color: "#e8b04a", stats: ["Speed", "Accel", "Handling", "Boost"] },
    terrain: { label: "All-terrain", color: "#8fd18a", stats: ["Off-road", "Grip", "Jump", "Flight"] },
    defence: { label: "Defence", color: "#6fb7ff", stats: ["Health", "Armour", "Magic resist", "Shield", "Regen"] },
    weapons: { label: "Weapons", color: "#ff7a6b", stats: ["Physical", "Magic", "Crit", "Pen", "Lifesteal"] },
    hunting: { label: "Hunting", color: "#c9a0ff", stats: ["Gold", "Bounty", "Luck"] } };
  const FAM_KEYS = Object.keys(FAMS);
  const x = v => "x" + (v / 1000).toFixed(2);
  const INFO = {
    "Speed": ["Speed", "Top speed on the road.", v => Math.round(v / 10) + " km/h top speed"],
    "Accel": ["Acceleration", "How quickly you reach top speed and recover after a hit.", v => x(v) + " acceleration"],
    "Handling": ["Handling", "How sharply you turn. The faster you go, the more of it you need to avoid walls.", v => x(v) + " turn rate"],
    "Boost": ["Boost", "How hard and how long boost pads push you.", v => x(v) + " boost strength and length"],
    "Off-road": ["Slow resist", "Cuts how much hazards and rough ground slow you.", v => "slowed " + Math.round(200000 / (1000 + v)) + "% as much as the median"],
    "Grip": ["Stability", "Cuts how far you are pushed when rammed, and stops spin-outs.", v => "pushed " + Math.round(200000 / (1000 + v)) + "% as far as the median"],
    "Jump": ["Jump", "How high your Jump ability and ramps throw you.", v => x(v) + " jump height"],
    "Flight": ["Flight", "Only with the Wings upgrade: glide speed and distance. Heavier rides glide less far (distance x Flight / Health).", v => "glide " + Math.round(v / 20) + " km/h"],
    "Health": ["Health", "Your hit points, your size and your weight: 1000 health = normal size, 10,000 = ten times bigger. Heavier rides push lighter ones aside.", v => Math.round(v) + " HP, size " + x(v)],
    "Armour": ["Armour", "Cuts physical damage: rams, crashes, bullets, rockets, mines and caltrops.", v => "takes " + Math.round(200000 / (1000 + v)) + "% of physical damage"],
    "Magic resist": ["Magic resist", "Cuts magic damage: lava, boss fire, burns, acid, poison and the taser.", v => "takes " + Math.round(200000 / (1000 + v)) + "% of magic damage"],
    "Shield": ["Shield", "A barrier that soaks up all damage before your health does. It refills after 3 s without being hit. Machines start with more.", v => Math.round(v / 5) + " shield points"],
    "Regen": ["Regen", "Health restored every second during a race.", v => "heals " + (0.2 * v / 1000).toFixed(2) + "% of max health per second"],
    "Physical": ["Physical power", "Multiplies the physical damage you deal: rams, bullets, rockets, mines, caltrops, sawblades.", v => x(v) + " physical damage"],
    "Magic": ["Magic power", "Multiplies the magic damage you deal: fire, acid, poison, the taser and exhaust.", v => x(v) + " magic damage"],
    "Crit": ["Crit", "Chance that a hit you deal (a ram or a weapon) does double damage. Past 100% the extra becomes more crit damage.", v => (v / 100).toFixed(0) + "% crit chance"],
    "Pen": ["Penetration", "Shrinks the target's Armour or Magic resist before it applies: 2000 halves it, 1000 does nothing.", v => "target resist x" + (1000 / Math.max(1, v)).toFixed(2)],
    "Lifesteal": ["Lifesteal", "Heals you for a share of the damage you deal (1000 = 10%). Every ride starts at 0.", v => "heals " + (v / 100).toFixed(1) + "% of damage dealt"],
    "Gold": ["Gold find", "Multiplies all the gold you earn.", v => x(v) + " gold"],
    "Bounty": ["Bounty", "Extra ram damage to your bounty target, your hunters and bosses, and a bigger bounty payout.", v => x(v) + " damage to marked racers and bounty gold"],
    "Luck": ["Luck", "Pushes the tier of every upgrade you are offered up (or down, below 1000).", v => (v >= 1000 ? "+" : "") + ((v - 1000) / 1000).toFixed(2) + " tiers on average"] };
  const RIDES = {"Horse": {"Speed": 1080, "Accel": 1500, "Handling": 1250, "Boost": 910, "Off-road": 950, "Grip": 1290, "Jump": 1390, "Flight": 510, "Health": 760, "Armour": 510, "Regen": 950, "Crit": 950, "Pen": 1000, "Lifesteal": 1000, "Gold": 1000, "Bounty": 1000, "Luck": 1000, "Magic resist": 950, "Physical": 1000, "Magic": 1000, "Shield": 800}, "Rhino": {"Speed": 1070, "Accel": 680, "Handling": 680, "Boost": 980, "Off-road": 980, "Grip": 980, "Jump": 630, "Flight": 530, "Health": 1500, "Armour": 1500, "Regen": 1110, "Crit": 1030, "Pen": 1020, "Lifesteal": 1000, "Gold": 1020, "Bounty": 1020, "Luck": 1020, "Magic resist": 1210, "Physical": 1020, "Magic": 1020, "Shield": 800}, "Kangaroo": {"Speed": 1070, "Accel": 1500, "Handling": 1190, "Boost": 910, "Off-road": 960, "Grip": 960, "Jump": 1490, "Flight": 810, "Health": 660, "Armour": 510, "Regen": 1000, "Crit": 1000, "Pen": 1000, "Lifesteal": 1000, "Gold": 1000, "Bounty": 990, "Luck": 990, "Magic resist": 960, "Physical": 1000, "Magic": 1000, "Shield": 800}, "Snail": {"Speed": 1000, "Accel": 500, "Handling": 970, "Boost": 970, "Off-road": 970, "Grip": 1460, "Jump": 500, "Flight": 500, "Health": 1370, "Armour": 1270, "Regen": 1470, "Crit": 970, "Pen": 970, "Lifesteal": 1000, "Gold": 870, "Bounty": 880, "Luck": 920, "Magic resist": 1470, "Physical": 970, "Magic": 970, "Shield": 800}, "Giant tortoise": {"Speed": 1010, "Accel": 500, "Handling": 690, "Boost": 1120, "Off-road": 1070, "Grip": 1030, "Jump": 500, "Flight": 500, "Health": 1470, "Armour": 1470, "Regen": 1320, "Crit": 1030, "Pen": 990, "Lifesteal": 1000, "Gold": 1030, "Bounty": 1030, "Luck": 1040, "Magic resist": 1220, "Physical": 990, "Magic": 990, "Shield": 800}, "Camel": {"Speed": 1060, "Accel": 720, "Handling": 860, "Boost": 910, "Off-road": 1500, "Grip": 910, "Jump": 960, "Flight": 520, "Health": 1150, "Armour": 960, "Regen": 1300, "Crit": 960, "Pen": 1010, "Lifesteal": 1000, "Gold": 960, "Bounty": 960, "Luck": 960, "Magic resist": 1300, "Physical": 1000, "Magic": 1000, "Shield": 800}, "Giant frog": {"Speed": 1050, "Accel": 1500, "Handling": 1180, "Boost": 890, "Off-road": 1380, "Grip": 930, "Jump": 1470, "Flight": 740, "Health": 740, "Armour": 540, "Regen": 940, "Crit": 940, "Pen": 980, "Lifesteal": 1000, "Gold": 940, "Bounty": 940, "Luck": 940, "Magic resist": 940, "Physical": 980, "Magic": 980, "Shield": 800}, "Ostrich": {"Speed": 1100, "Accel": 1500, "Handling": 1150, "Boost": 970, "Off-road": 1020, "Grip": 1020, "Jump": 1050, "Flight": 620, "Health": 670, "Armour": 520, "Regen": 1050, "Crit": 1050, "Pen": 1020, "Lifesteal": 1000, "Gold": 1060, "Bounty": 1060, "Luck": 1060, "Magic resist": 1060, "Physical": 1010, "Magic": 1010, "Shield": 800}, "Giant beetle": {"Speed": 1040, "Accel": 940, "Handling": 980, "Boost": 940, "Off-road": 940, "Grip": 950, "Jump": 700, "Flight": 900, "Health": 1130, "Armour": 1480, "Regen": 950, "Crit": 1280, "Pen": 990, "Lifesteal": 1000, "Gold": 950, "Bounty": 950, "Luck": 950, "Magic resist": 950, "Physical": 990, "Magic": 990, "Shield": 800}, "Dragon": {"Speed": 1050, "Accel": 1010, "Handling": 800, "Boost": 950, "Off-road": 950, "Grip": 950, "Jump": 1350, "Flight": 1490, "Health": 1200, "Armour": 950, "Regen": 950, "Crit": 700, "Pen": 1000, "Lifesteal": 1000, "Gold": 600, "Bounty": 950, "Luck": 600, "Magic resist": 1500, "Physical": 1000, "Magic": 1000, "Shield": 800}, "Sports car": {"Speed": 1100, "Accel": 1500, "Handling": 1310, "Boost": 1310, "Off-road": 570, "Grip": 720, "Jump": 1060, "Flight": 530, "Health": 920, "Armour": 820, "Regen": 1020, "Crit": 1020, "Pen": 1010, "Lifesteal": 1000, "Gold": 1010, "Bounty": 1010, "Luck": 1010, "Magic resist": 1060, "Physical": 1010, "Magic": 1010, "Shield": 1200}, "Dune buggy": {"Speed": 1070, "Accel": 790, "Handling": 870, "Boost": 920, "Off-road": 1500, "Grip": 1300, "Jump": 1300, "Flight": 570, "Health": 960, "Armour": 960, "Regen": 960, "Crit": 960, "Pen": 1000, "Lifesteal": 1000, "Gold": 960, "Bounty": 960, "Luck": 960, "Magic resist": 960, "Physical": 1000, "Magic": 1000, "Shield": 1200}, "Tank": {"Speed": 1020, "Accel": 500, "Handling": 540, "Boost": 690, "Off-road": 1320, "Grip": 1320, "Jump": 500, "Flight": 500, "Health": 1470, "Armour": 1470, "Regen": 1270, "Crit": 1030, "Pen": 990, "Lifesteal": 1000, "Gold": 1040, "Bounty": 1040, "Luck": 1040, "Magic resist": 1280, "Physical": 990, "Magic": 990, "Shield": 1200}, "Shopping trolley": {"Speed": 1040, "Accel": 970, "Handling": 940, "Boost": 940, "Off-road": 940, "Grip": 950, "Jump": 950, "Flight": 500, "Health": 800, "Armour": 650, "Regen": 980, "Crit": 1280, "Pen": 980, "Lifesteal": 1000, "Gold": 1380, "Bounty": 1280, "Luck": 1480, "Magic resist": 980, "Physical": 980, "Magic": 980, "Shield": 1200}, "Ice cream van": {"Speed": 1040, "Accel": 800, "Handling": 710, "Boost": 960, "Off-road": 1000, "Grip": 1000, "Jump": 610, "Flight": 510, "Health": 1340, "Armour": 1090, "Regen": 1290, "Crit": 990, "Pen": 990, "Lifesteal": 1000, "Gold": 1490, "Bounty": 990, "Luck": 1190, "Magic resist": 1000, "Physical": 1000, "Magic": 1000, "Shield": 1200}, "Monster truck": {"Speed": 1050, "Accel": 670, "Handling": 710, "Boost": 960, "Off-road": 1400, "Grip": 1150, "Jump": 1300, "Flight": 510, "Health": 1500, "Armour": 960, "Regen": 960, "Crit": 960, "Pen": 1010, "Lifesteal": 1000, "Gold": 960, "Bounty": 960, "Luck": 960, "Magic resist": 960, "Physical": 1010, "Magic": 1010, "Shield": 1200}, "Hovercraft": {"Speed": 1070, "Accel": 950, "Handling": 870, "Boost": 960, "Off-road": 1400, "Grip": 620, "Jump": 920, "Flight": 910, "Health": 960, "Armour": 960, "Regen": 960, "Crit": 1010, "Pen": 1010, "Lifesteal": 1000, "Gold": 1000, "Bounty": 1000, "Luck": 1000, "Magic resist": 1400, "Physical": 1000, "Magic": 1000, "Shield": 1200}, "Motorbike": {"Speed": 1090, "Accel": 1500, "Handling": 1460, "Boost": 1310, "Off-road": 870, "Grip": 970, "Jump": 970, "Flight": 530, "Health": 770, "Armour": 530, "Regen": 970, "Crit": 1010, "Pen": 1010, "Lifesteal": 1000, "Gold": 1010, "Bounty": 1010, "Luck": 1010, "Magic resist": 960, "Physical": 1010, "Magic": 1010, "Shield": 1200}, "Bulldozer": {"Speed": 1020, "Accel": 500, "Handling": 590, "Boost": 1080, "Off-road": 1330, "Grip": 1040, "Jump": 500, "Flight": 500, "Health": 1470, "Armour": 1470, "Regen": 1040, "Crit": 1040, "Pen": 990, "Lifesteal": 1000, "Gold": 1040, "Bounty": 1040, "Luck": 1040, "Magic resist": 1330, "Physical": 990, "Magic": 990, "Shield": 1200}, "Jet car": {"Speed": 1100, "Accel": 1380, "Handling": 1000, "Boost": 1490, "Off-road": 570, "Grip": 570, "Jump": 1000, "Flight": 1490, "Health": 870, "Armour": 670, "Regen": 1000, "Crit": 970, "Pen": 1000, "Lifesteal": 1000, "Gold": 970, "Bounty": 960, "Luck": 960, "Magic resist": 1000, "Physical": 1000, "Magic": 1000, "Shield": 1200}};
  for (const k in RIDES) RIDES[k].Lifesteal = 0;   // v16: Lifesteal starts at 0 for every ride and comes only from upgrades
  const DENS = { "Rhino": 1.3, "Giant tortoise": 1.1, "Snail": 1.0, "Tank": 1.6, "Bulldozer": 1.6, "Motorbike": 0.9, "Shopping trolley": 0.9 };
  const ALL = FAM_KEYS.flatMap(f => FAMS[f].stats);
  const DRV = new Set(["Speed", "Accel", "Handling", "Off-road"]), TOUGH = new Set(["Health", "Armour", "Magic resist", "Shield"]);
  const famOf = s => FAM_KEYS.find(f => FAMS[f].stats.includes(s));
  // turns the numbers into what the race uses
  function derive(st, model) {
    const B = Models.BODY[model] || {}, size = st.Health / 1000;
    return { top: st.Speed / 36, acc: st.Accel / 1000, steer: st.Handling / 1000, boostK: st.Boost / 1000, 
      jump: Math.sqrt(st.Jump / 1000), flight: st.Flight / 1000, glide: st.Flight / 72, flightRange: st.Flight / Math.max(1, st.Health), maxHp: st.Health, shMax: (st.Shield || 0) / 5, size, arm: st.Armour, mr: st["Magic resist"],
      regen: st.Regen / 1000, crit: st.Crit / 10000, penS: Math.max(1, st.Pen), ls: st.Lifesteal / 10000, physP: st.Physical / 1000, magP: st.Magic / 1000, slowF: 2000 / (1000 + st["Off-road"]), stabF: 2000 / (1000 + st.Grip),
      bountyK: st.Bounty / 1000, mass: size };
  }
  // a rival of this body after the pack has grown by G = {drv, tough, other}; sk = this driver's skill
  function rival(model, G, sk) {
    const b = RIDES[model] || RIDES["Sports car"], o = {};
    for (const k of ALL) o[k] = b[k] * (DRV.has(k) ? G.drv * (k === "Speed" || k === "Off-road" ? 1 : 1) * (k === "Speed" ? sk : 1) : TOUGH.has(k) ? G.tough : G.other);
    return o;
  }
  const effect = t => t >= 10 ? "x" + (1.5 + 0.25 * Math.floor((t - 10) / 2)).toFixed(2).replace(/0$/, "") : "+" + 50 * t;
  function applyTier(st, stat, t) { if (t >= 10 && st[stat] < 1) st[stat] += 500; else if (t >= 10) st[stat] *= 1.5 + 0.25 * Math.floor((t - 10) / 2); else st[stat] += 50 * t; st[stat] = Math.round(st[stat]); }
  const tierCol = t => t >= 10 ? "#ffd700" : "hsl(" + (200 - t * 18) + ",70%,65%)";
  // the clickable stat sheet used by the ride-select screen and the garage
  function panel(st, open, handler, G) {
    let h = '<div class="sFams">';
    for (const f of FAM_KEYS) {
      const F = FAMS[f], avg = Math.round(F.stats.reduce((a, s) => a + st[s], 0) / F.stats.length);
      h += '<div class="sFam' + (open === f ? ' on' : '') + '" style="--c:' + F.color + '" onclick="' + handler + '(\'' + f + '\')"><b>' + F.label + '</b><span>' + avg + '</span></div>';
    }
    h += '</div>';
    if (!open) return h + '<div class="sHint">Click a group to see its stats. 1000 is the median for every stat.</div>';
    const F = FAMS[open], mx = Math.max(2000, ...F.stats.map(s => st[s])) * 1.05;
    h += '<div class="sBody" style="--c:' + F.color + '">';
    for (const s of F.stats) {
      if (UNUSED.has(s)) { h += '<div class="sRow" style="opacity:.45"><div class="sTop"><b>' + INFO[s][0] + '</b><em>' + Math.round(st[s]) + '</em></div><div class="sWhat">Not in the game yet: kept for weapons later.</div></div>'; continue; }
      const I = INFO[s], v = st[s], rv = G ? 1000 * (DRV.has(s) ? G.drv : TOUGH.has(s) ? G.tough : G.other) : 1000;
      h += '<div class="sRow"><div class="sTop"><b>' + I[0] + '</b><em>' + Math.round(v) + '</em></div>' +
        '<div class="sBar"><div style="width:' + Math.min(100, v / mx * 100).toFixed(1) + '%"></div><i style="left:' + Math.min(100, rv / mx * 100).toFixed(1) + '%" title="' + (G ? 'average rival' : 'median') + ' ' + Math.round(rv) + '"></i></div>' +
        '<div class="sWhat"><span class="sNow">' + I[2](v) + '</span> &middot; ' + I[1] + '</div></div>';
    }
    return h + '<div class="sHint">The white tick is ' + (G ? 'the average rival right now' : 'the median (1000)') + '.</div></div>';
  }
  for (const k in RIDES) if (Models.BODY[k]) { Models.BODY[k].size = RIDES[k].Health / 1000;  }
  // one ability per ride, on one key
  const ABIL = { "Horse": "Jump", "Kangaroo": "Jump", "Giant frog": "Jump", "Dune buggy": "Jump", "Shopping trolley": "Jump",
    "Rhino": "Smash", "Tank": "Smash", "Bulldozer": "Smash", "Monster truck": "Smash", "Snail": "Slime trail", "Giant tortoise": "Shell spin", "Ice cream van": "Jingle",
    "Ostrich": "Speed boost", "Sports car": "Speed boost", "Motorbike": "Speed boost", "Jet car": "Speed boost",
    "Camel": "Terrain boost", "Giant beetle": "Terrain boost", "Hovercraft": "Terrain boost", "Dragon": "Terrain boost" };
  const ABILITY = {
    "Jump": { cd: 4, dur: 0, color: "#7bd88f", desc: "Hop into the air. Clears road blocks and pits if you reach the far side; height grows with Jump." },
    "Smash": { cd: 6, dur: 2, color: "#ff6b5b", desc: "For 2 s you break any road block you hit, and rams deal double damage." },
    "Shield": { cd: 8, dur: 2, color: "#c49bff", desc: "For 2 s you take no damage, ignore slows and can't be pushed." },
    "Slime trail": { cd: 7, dur: 3, color: "#9be86a", desc: "For 3 s you leave slime behind you: rivals who drive through are slowed 40% and may spin out." },
    "Shell spin": { cd: 8, dur: 3, color: "#c49bff", desc: "For 3 s you spin in your shell: +20% top speed, slows can't touch you and you can't be pushed. Half of any damage you take bounces back at whoever dealt it, and anything you touch takes damage and is knocked aside. Steering is harder." },
    "Jingle": { cd: 7, dur: 0, color: "#ff9ad5", desc: "Play the jingle: every rival within 35 m is slowed 35% for 2.5 s." },
    "Speed boost": { cd: 6, dur: 3, color: "#ffd23f", desc: "+30% top speed for 3 s." },
    "Terrain boost": { cd: 8, dur: 4, color: "#5fd6c8", desc: "For 4 s hazards and rough ground don't slow you." } };
  const UNUSED = new Set();   // v16: weapons use Physical, Magic, Pen and Lifesteal
  const ACTIVE = ALL.filter(k => !UNUSED.has(k));
  INFO.Wings = ["Wings", "Lets any ride glide after a ramp or drop: hold accelerate in the air.", () => "glide unlocked"];
  return { ABIL, ABILITY, UNUSED, ACTIVE, FAMS, FAM_KEYS, INFO, RIDES, ALL, famOf, derive, rival, effect, applyTier, tierCol, panel };
})();

// ===== 3D race module v5: winding tracks =====
// The track is a free 2D centreline (it can bend around mountains), with height by distance along it.
// Pits are obstacles to steer around; ramps give lift; gullies line the road.
// startRace(P, onDone) -> onDone(rank, total, results)
const Race = (function () {
  const ROAD_W = 40, ACCEL = 22, BRAKE = 40, DRAG = 8, GRAV = 40, TUN_H = 45, V100 = 27.78;
  const STEPS = 170, SEG = 22, CAR_R = 1.45;

  const ZT = {
    quicksand: { color: 0x9a7a45, slow: 0.6, label: "QUICKSAND", dust: 0xc9a46a },
    mud:       { color: 0x5a4028, slow: 0.45, label: "MUD", dust: 0x6b4a2e },
    water:     { color: 0x2f7fc0, slow: 0.5, label: "DEEP WATER", alpha: 0.85, dust: 0xdff3ff, splash: true },
    ice:       { color: 0xcdeefa, slow: 0.3, label: "ICE", dust: 0xeaf8ff },
    snow:      { color: 0xffffff, slow: 0.4, label: "SNOWDRIFT", dust: 0xffffff },
    rubble:    { color: 0x7a3a20, slow: 0.35, label: "LOOSE ROCK", dust: 0x9a5a3a },
    lava:      { color: 0xff6a1a, slow: 0.55, dps: 50, label: "LAVA", glow: true, dust: 0xffa040 }
  };
  const W = {
    "Desert":        { ground: 0xdcbc80, sky: [0x3f86d6, 0xcfe6f5], fog: 0xe6d3aa, road: 0x6e6256, rock: 0x8a7a6c, tall: 0x3f8f4a, tallKind: "cactus",
                       hs: 0.9, bumps: 5, gully: 5, off: "SAND", small: "quicksand", hazard: "quicksand", storm: "SANDSTORM", stormCol: 0xe8c88a, landmark: "desert", sun: 1.25, mount: 0xc9a46a },
    "Jungle":        { ground: 0x4f7a3a, sky: [0x4f8fb8, 0xc3e3cf], fog: 0x9cbf98, road: 0x6b5a45, rock: 0x6c6a5a, tall: 0x2f6b2f, tallKind: "tree",
                       hs: 0.8, bumps: 3, gully: 4, off: "UNDERGROWTH", small: "mud", hazard: "mud", landmark: "jungle", sun: 1.1, mount: 0x3f6b30 },
    "Flooded city":  { ground: 0x2b6a86, sky: [0x5d7d99, 0xc8d3dc], fog: 0xb4c1cc, road: 0x55585e, rock: 0x7a7f86, tall: 0x8d9399, tallKind: "building",
                       hs: 0.3, bumps: 0, gully: 0, off: "WATER", small: "water", hazard: "water", landmark: "city", sun: 1.0, mount: 0x6f767d },
    "Frozen tundra": { ground: 0xe8f0f6, sky: [0x6fa3d6, 0xeaf3fb], fog: 0xe4eef6, road: 0x6f7780, rock: 0x8fa2b4, tall: 0x2e5a45, tallKind: "pine",
                       hs: 1.0, bumps: 4, gully: 5, off: "ICE", small: "ice", hazard: "ice", storm: "BLIZZARD", stormCol: 0xffffff, landmark: "tundra", sun: 1.0, mount: 0xb8c8d6 },
    "Canyon":        { ground: 0xb08060, sky: [0x5c9bd6, 0xf3dcc0], fog: 0xe0bfa0, road: 0x5e4a40, rock: 0x8a5a40, tall: 0x7a4a32, tallKind: "pillar",
                       hs: 1.3, bumps: 6, gully: 8, off: "ROUGH GROUND", small: "rubble", hazard: "rubble", landmark: "canyon", sun: 1.25, mount: 0x9a6448 },
    "Volcanic field":{ ground: 0x7a564a, sky: [0x7a3030, 0xf0a070], fog: 0xc98a68, road: 0x4d423e, rock: 0x3e3230, tall: 0xff7a2a, tallKind: "vent",
                       hs: 1.1, bumps: 5, gully: 6, off: "QUICKSAND", small: "lava", hazard: "lava", storm: "ASH STORM", stormCol: 0x9a8a84, landmark: "volcano", sun: 1.35, mount: 0x4a3530 }
  };

  let renderer, scene, camera, sun, hemi, wrap, info, big, mini, mctx, hpBar, hpText, flashEl, speedEl, running = false, raceId = 0;
  let composer = null, renderPass, bloomPass, fxaaPass, envRT = null;
  let quality = 'high';
  try { quality = localStorage.getItem('rr_quality') || 'high'; } catch (e) {}
  const HQ = () => quality === 'high';
  // per-world time of day: sun colour/strength/direction, sky light, exposure
  const TOD = {
    "Desert":        { sun: 0xffd9a0, si: 2.4, dir: [0.55, 0.45, 0.35], hs: 0xfff1d6, hi: 0.85, exp: 1.05 },
    "Jungle":        { sun: 0xfff0c0, si: 2.0, dir: [-0.4, 0.7, 0.3], hs: 0xe6fff0, hi: 0.95, exp: 1.05 },
    "Flooded city":  { sun: 0xcfe0ff, si: 1.4, dir: [0.3, 0.35, -0.6], hs: 0xd8e4f0, hi: 1.05, exp: 1.1 },
    "Frozen tundra": { sun: 0xf4f8ff, si: 2.0, dir: [-0.3, 0.55, -0.5], hs: 0xeaf4ff, hi: 1.0, exp: 1.0 },
    "Canyon":        { sun: 0xffe2c0, si: 2.1, dir: [0.6, 0.42, 0.25], hs: 0xf2eee8, hi: 0.95, exp: 1.0 },
    "Volcanic field":{ sun: 0xff9a5a, si: 2.2, dir: [-0.6, 0.22, 0.45], hs: 0xffc8a8, hi: 0.9, exp: 1.15 }
  };
  const GradeShader = {
    uniforms: { tDiffuse: { value: null }, sat: { value: 1.18 }, contrast: { value: 1.06 }, vig: { value: 0.32 }, tint: { value: new THREE.Vector3(1.03, 1.0, 0.97) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; uniform float sat; uniform float contrast; uniform float vig; uniform vec3 tint; varying vec2 vUv;' +
      'void main(){ vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(0.2126,0.7152,0.0722)); vec3 col = mix(vec3(l), c.rgb, sat);' +
      'col = (col - 0.5*l) * contrast + 0.5*l; col *= tint; float d = distance(vUv, vec2(0.5)); col *= 1.0 - vig * smoothstep(0.35, 0.85, d); gl_FragColor = vec4(col, c.a); }'
  };
  const keys = {};
  window.addEventListener('keydown', e => { keys[e.code] = true; if (running && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault(); });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  const down = (...c) => c.some(k => keys[k]);

  function init() {
    wrap = document.getElementById('raceWrap'); info = document.getElementById('raceInfo'); big = document.getElementById('raceBig');
    mini = document.getElementById('raceMini'); mctx = mini.getContext('2d');
    hpBar = document.getElementById('raceHPFill'); hpText = document.getElementById('raceHPText'); flashEl = document.getElementById('raceFlash');
    renderer = new THREE.WebGLRenderer({ antialias: !HQ() });
    renderer.setPixelRatio(HQ() ? Math.min(window.devicePixelRatio, 1.5) : 1);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
    wrap.insertBefore(renderer.domElement, wrap.firstChild);
    camera = new THREE.PerspectiveCamera(60, 1, 0.5, 4000);
    speedEl = document.getElementById('raceSpeed');
    if (HQ() && window.POST) {
      composer = new POST.EffectComposer(renderer);
      renderPass = new POST.RenderPass(new THREE.Scene(), camera); composer.addPass(renderPass);
      bloomPass = new POST.UnrealBloomPass(new THREE.Vector2(512, 512), 0.6, 0.45, 1.0); composer.addPass(bloomPass);
      composer.addPass(new POST.ShaderPass(GradeShader));
      composer.addPass(new POST.OutputPass());
      fxaaPass = new POST.ShaderPass(POST.FXAAShader); composer.addPass(fxaaPass);
    }
    window.addEventListener('resize', resize);
  }
  function resize() {
    if (!renderer) return;
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (composer) { composer.setSize(w, h); const pr = renderer.getPixelRatio(); fxaaPass.material.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr)); }
  }
  function disposeScene() {
    if (!scene) return;
    scene.traverse(o => { if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); });
  }
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const V2 = (x, y) => new THREE.Vector2(x, y);
  const ease = t => t * t * (3 - 2 * t);

  function startRace(P, onDone) {
    if (!renderer) init();
    disposeScene();
    const L = W[P.world] || W["Desert"];
    const matCache = {};
    const toonGrad = (function () { const d = new Uint8Array([90, 150, 210, 255]); const t = new THREE.DataTexture(d, 4, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
    const mk = c => HQ() ? new THREE.MeshToonMaterial({ color: c, gradientMap: toonGrad }) : new THREE.MeshLambertMaterial({ color: c });
    const lam = c => matCache[c] || (matCache[c] = mk(c));
    const GLOW = (c, k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(HQ() ? k : 1) });
    const tod = TOD[P.world] || TOD["Desert"];
    const sunDir = new THREE.Vector3(...tod.dir).normalize();
    renderer.toneMappingExposure = tod.exp;
    const timeU = { value: 0 };
    // a shared seed makes every player's track identical
    const R = P.seed ? (function (a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })(P.seed) : Math.random;
    const pick = a => a[Math.floor(R() * a.length)];

    // ---------- textures ----------
    function canvasTex(w, h, draw, rx, ry) {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      if (rx) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); }
      return t;
    }
    function noise(g, w, h, lo, hi, dots) {
      const id = g.createImageData(w, h);
      for (let i = 0; i < w * h; i++) { const v = lo + Math.random() * (hi - lo); id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
      g.putImageData(id, 0, 0);
      for (let k = 0; k < dots; k++) { const v = lo + Math.random() * (hi - lo); g.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 4, 0, 7); g.fill(); }
    }
    const roadTex = canvasTex(256, 512, (g, w, h) => {
      noise(g, w, h, 120, 165, 500);
      g.fillStyle = 'rgba(255,255,255,0.92)'; g.fillRect(0, h * 0.045, w, 7); g.fillRect(0, h * 0.955 - 7, w, 7);
      for (const v of [0.25, 0.5, 0.75]) g.fillRect(w * 0.15, h * v - 3, w * 0.5, 6);
      g.fillStyle = 'rgba(0,0,0,0.12)'; for (const v of [0.15, 0.37, 0.63, 0.85]) g.fillRect(0, h * v - 14, w, 28);
    });
    roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
    const groundTex = canvasTex(256, 256, (g, w, h) => noise(g, w, h, 195, 255, 900), 1, 1);
    const lavaTex = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#b8320a'; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 140; k++) { const x = Math.random() * w, y = Math.random() * h, r = 6 + Math.random() * 26;
        const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, Math.random() < 0.5 ? '#ffe27a' : '#ff9a2a'); gr.addColorStop(1, 'rgba(255,90,20,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
      g.strokeStyle = 'rgba(40,10,5,0.6)'; g.lineWidth = 3;
      for (let k = 0; k < 18; k++) { g.beginPath(); g.moveTo(Math.random() * w, Math.random() * h); for (let q = 0; q < 4; q++) g.lineTo(Math.random() * w, Math.random() * h); g.stroke(); }
    }, 1, 1);
    const waterN = (function () {
      const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'), id = g.createImageData(S, S);
      const hgt = (x, y) => Math.sin(x * 0.18) * Math.cos(y * 0.15) + 0.5 * Math.sin((x + y) * 0.31) + 0.3 * Math.cos(x * 0.47 - y * 0.29);
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const dx = hgt(x + 1, y) - hgt(x - 1, y), dy = hgt(x, y + 1) - hgt(x, y - 1), i = (y * S + x) * 4;
        id.data[i] = 128 + dx * 60; id.data[i + 1] = 128 + dy * 60; id.data[i + 2] = 255; id.data[i + 3] = 255;
      }
      g.putImageData(id, 0, 0);
      const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
    })();
    const blobTex = canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const puff = canvasTex(64, 64, (g, w, h) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });

    // ---------- scene, sky, light ----------
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(L.fog, 180, 750);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 24, 12), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(L.sky[0]) }, bottom: { value: new THREE.Color(L.sky[1]) }, sunDir: { value: sunDir }, sunCol: { value: new THREE.Color(tod.sun) } },
      vertexShader: 'varying vec3 vd; void main(){ vd = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 sunCol; varying vec3 vd;' +
        'void main(){ float t = pow(clamp(vd.y*1.6,0.0,1.0),0.6); vec3 col = mix(bottom, top, t); float s = max(dot(normalize(vd), sunDir), 0.0);' +
        'col += sunCol * (pow(s, 900.0) * 4.0 + pow(s, 12.0) * 0.35); gl_FragColor = vec4(col,1.0); }'
    }));
    scene.add(sky);
    scene.background = new THREE.Color(L.sky[1]);
    // reflections of this world's sky, used by water and glass
    {
      if (envRT) envRT.dispose();
      const es = new THREE.Scene(); es.add(new THREE.Mesh(sky.geometry, sky.material));
      const pm = new THREE.PMREMGenerator(renderer); envRT = pm.fromScene(es, 0, 1, 5000); pm.dispose();
      scene.environment = envRT.texture;
    }
    hemi = new THREE.HemisphereLight(tod.hs, new THREE.Color(L.ground).multiplyScalar(0.8), tod.hi); scene.add(hemi);
    sun = new THREE.DirectionalLight(tod.sun, tod.si * 0.55 * L.sun);
    sun.castShadow = true; sun.shadow.mapSize.set(HQ() ? 3072 : 1536, HQ() ? 3072 : 1536); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
    Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, far: 400 });
    scene.add(sun, sun.target);

    // ================= TRACK: a winding centreline =================
    // Heading changes gradually in sections: straights, long bends, S-bends, and big arcs around a mountain.
    let C, T, N, TH, bends;
    function genCentreline() {
      const th = [], bendList = [];
      let theta = 0;
      const push = v => { if (th.length < STEPS) th.push(v); };
      for (let k = 0; k < 26; k++) push(0);   // a long straight start, so the five starting roads can converge
      while (th.length < STEPS - 5) {
        const r = R(), t0 = theta, start = th.length;
        let len, turn, kind;
        if (r < 0.2) { kind = 'straight'; len = 5 + Math.floor(R() * 7); turn = 0; }
        else if (r < 0.55) { kind = 'bend'; len = 10 + Math.floor(R() * 12); turn = (0.6 + R() * 1.2) * (R() < 0.5 ? -1 : 1); }
        else if (r < 0.75) { kind = 'sbend'; len = 14 + Math.floor(R() * 10); turn = (0.5 + R() * 0.6) * (R() < 0.5 ? -1 : 1); }
        else { kind = 'mountain'; len = 18 + Math.floor(R() * 10); turn = (2.0 + R() * 0.9) * (R() < 0.5 ? -1 : 1); }
        // keep the overall course heading forward so it never loops back on itself
        if (Math.abs(t0 + turn) > 2.2) turn = -turn;
        turn = Math.max(-2.2, Math.min(2.2, t0 + turn)) - t0;
        if (Math.abs(turn) / len > 0.165) len = Math.ceil(Math.abs(turn) / 0.165);
        for (let k = 0; k < len; k++) {
          const t = k / len;
          push(kind === 'sbend' ? t0 + turn * Math.sin(Math.PI * 2 * t) * 0.5 * (1 - Math.abs(Math.cos(Math.PI * t)) * 0.0) : t0 + turn * ease(t));
        }
        theta = kind === 'sbend' ? t0 : t0 + turn;
        if (kind === 'mountain' || (kind === 'bend' && Math.abs(turn) > 1.1)) bendList.push({ i0: start, i1: Math.min(STEPS - 1, start + len), turn });
      }
      while (th.length < STEPS) th.push(theta);
      const c = [V2(0, 0)];
      for (let i = 0; i < STEPS; i++) c.push(V2(c[i].x + Math.cos(th[i]) * SEG, c[i].y + Math.sin(th[i]) * SEG));
      return { c, th, bendList };
    }
    for (let tries = 0; tries < 40; tries++) {
      const g = genCentreline();
      let ok = true;
      for (let i = 0; i <= STEPS && ok; i += 2) for (let j = i + 14; j <= STEPS; j += 2) if (g.c[i].distanceTo(g.c[j]) < 230) { ok = false; break; }
      C = g.c; TH = g.th; bends = g.bendList;
      if (ok) break;
    }
    T = []; N = [];
    for (let i = 0; i <= STEPS; i++) {
      const a = C[Math.max(0, i - 1)], b = C[Math.min(STEPS, i + 1)], t = b.clone().sub(a).normalize();
      T.push(t); N.push(V2(-t.y, t.x));
    }
    const LENGTH = STEPS * SEG;

    // ---------- heights by distance along the track ----------
    const HS = L.hs, H = [], drops = [];
    (function () {
      let h = 40;
      const push = v => { if (H.length <= STEPS) H.push(v); };
      for (let k = 0; k < 26; k++) push(h);
      const types = ['climb', 'descent', 'rolling', 'valley', 'drop', 'drop', 'climb', 'descent', 'flat'];
      while (H.length < STEPS - 5) {
        const len = 8 + Math.floor(R() * 12), type = pick(types), h0 = h;
        if (type === 'climb' || type === 'descent') {
          let dh = (22 + R() * 30) * HS * (type === 'climb' ? 1 : -1);
          if (h0 + dh > 100 || h0 + dh < 6) dh = -dh;
          for (let k = 0; k < len; k++) push(h0 + dh * ease(k / len));
          h = h0 + dh;
        } else if (type === 'rolling') {
          const A = (3 + R() * 4) * HS;
          for (let k = 0; k < len; k++) push(h0 + A * Math.sin(k / len * Math.PI * 4));
        } else if (type === 'valley') {
          const D = (10 + R() * 14) * HS * (h0 < 22 ? -1 : 1);
          for (let k = 0; k < len; k++) push(h0 - D * Math.sin(Math.PI * k / len));
        } else if (type === 'drop') {
          let dr = (6 + R() * 8) * Math.max(0.5, HS); if (h0 - dr < 6) { dr = -dr * 0.5; }
          const at = Math.floor(len * 0.5);
          for (let k = 0; k < len; k++) { if (k === at + 1 && dr > 0) drops.push(H.length); push(k <= at ? h0 : h0 - dr); }
          h = h0 - dr;
        } else for (let k = 0; k < len; k++) push(h0);
      }
      while (H.length <= STEPS) push(h);
    })();
    const Hs = s => { const f = Math.max(0, Math.min(STEPS, s)), i = Math.min(STEPS - 1, Math.floor(f)), t = f - i; return H[i] + (H[i + 1] - H[i]) * t; };

    // ---------- forks: main is the centreline; A cuts the inside of the bend through hazards; B swings outside with pits ----------
    // v16: five starting roads (20 racers each) converge into the main road about a fifth of the way in
    const MERGE = 34, ENTRY_SP = 60, ENTRY_OFF = [-2, -1, 0, 1, 2];
    const entryOff = i => i >= MERGE ? 0 : 1 - ease(Math.max(0, Math.min(1, (i - 10) / (MERGE - 10))));   // 1 = fully apart, 0 = merged
    const forkStarts = [42, 72, 100, 126, 146];
    const forks = forkStarts.map(i0 => {
      const i1 = i0 + 22;
      let turn = 0; for (let i = i0; i < i1; i++) turn += TH[i + 1] - TH[i];
      const inner = Math.abs(turn) > 0.15 ? Math.sign(turn) : (R() < 0.5 ? -1 : 1);
      return { i0, i1, inner, aType: L.hazard, hasB: R() < 0.55 };
    });
    const offsetPath = (f, amp) => {
      const pts = [];
      for (let i = 0; i <= STEPS; i++) {
        let off = 0;
        if (i > f.i0 && i < f.i1) off = amp * Math.sqrt(Math.sin(Math.PI * (i - f.i0) / (f.i1 - f.i0)));
        pts.push(C[i].clone().add(N[i].clone().multiplyScalar(off)));
      }
      return pts;
    };
    const main = C;
    const paths = [{ pts: main, kind: 'main', i0: 0, i1: STEPS }];
    for (const f of forks) {
      f.A = { pts: offsetPath(f, f.inner * 72), kind: 'shortcut', i0: f.i0, i1: f.i1, type: f.aType };
      paths.push(f.A);
      if (f.hasB) { f.B = { pts: offsetPath(f, -f.inner * 92), kind: 'shortcut', i0: f.i0, i1: f.i1, type: 'blocks' }; paths.push(f.B); }
    }
    const entries = ENTRY_OFF.map(k => {
      if (k === 0) return paths[0];
      const pts = []; for (let i = 0; i <= STEPS; i++) pts.push(C[i].clone().add(N[i].clone().multiplyScalar(k * ENTRY_SP * entryOff(i))));
      let sep = 0; while (sep < MERGE && ENTRY_SP * entryOff(sep) >= ROAD_W) sep++;   // kerbs stop where the roads start to overlap
      const e = { pts, kind: 'entry', i0: 0, i1: MERGE, lane: Math.abs(k), sep }; paths.push(e); return e;
    });
    const END = main[STEPS];

    // ---------- spatial grid of road segments, so "where is the nearest road?" is fast anywhere ----------
    const CELL = 50, segGrid = new Map();
    const ck = (x, z) => Math.floor(x / CELL) + ',' + Math.floor(z / CELL);
    for (const path of paths) for (let i = path.i0; i < path.i1; i++) {
      const a = path.pts[i], b = path.pts[i + 1];
      const x0 = Math.floor(Math.min(a.x, b.x) / CELL), x1 = Math.floor(Math.max(a.x, b.x) / CELL);
      const z0 = Math.floor(Math.min(a.y, b.y) / CELL), z1 = Math.floor(Math.max(a.y, b.y) / CELL);
      for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { const k = x + ',' + z; if (!segGrid.has(k)) segGrid.set(k, []); segGrid.get(k).push([path, i]); }
    }
    function segDist(p, a, b) {
      const abx = b.x - a.x, aby = b.y - a.y, l2 = abx * abx + aby * aby;
      let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const dx = a.x + abx * t - p.x, dy = a.y + aby * t - p.y;
      return [Math.sqrt(dx * dx + dy * dy), t];
    }
    function nearestRoad(p, rad) {
      rad = rad === undefined ? 1 : rad;
      const cx = Math.floor(p.x / CELL), cz = Math.floor(p.y / CELL);
      let best = Infinity, bp = null, bs = 0;
      for (let x = cx - rad; x <= cx + rad; x++) for (let z = cz - rad; z <= cz + rad; z++) {
        const list = segGrid.get(x + ',' + z); if (!list) continue;
        for (const [path, i] of list) { const [d, t] = segDist(p, path.pts[i], path.pts[i + 1]); if (d < best) { best = d; bp = path; bs = i + t; } }
      }
      if (bp) return { dist: best, path: bp, s: bs };
      // far from any road: coarse search along the centreline
      for (let i = 0; i < STEPS; i += 3) { const [d, t] = segDist(p, C[i], C[Math.min(STEPS, i + 3)]); if (d < best) { best = d; bs = i + t * 3; } }
      return { dist: best, path: null, s: bs };
    }
    // terrain: gullies right beside the road, bumpy land further out
    const gPh = R() * 10;
    function groundAt(p, nr) {
      nr = nr || nearestRoad(p, 2);
      let g = groundBase(p, nr);
      const q = specialAt(nr.s);
      if (q && nr.path && nr.path.kind === 'main') {
        const e = env(q, nr.s), d = nr.dist, wide = q.fork ? 0.22 : 1;   // inside a fork the gorge / ridge stays narrow so side routes are untouched
        if (q.kind === 'bridge') g -= q.depth * e * (1 - smooth(ROAD_W / 2 + 30 * wide, ROAD_W / 2 + 95 * wide, d));
        else g += q.hill * e * smooth(ROAD_W / 2 + 1.5, ROAD_W / 2 + 6, d) * (1 - smooth(ROAD_W / 2 + 45 * wide, ROAD_W / 2 + 125 * wide, d));
      }
      // pits are real craters in the ground
      for (const pt of pits) {
        const rx = p.x - pt.c.x, ry = p.y - pt.c.y; if (rx * rx + ry * ry > pt.r * pt.r * 3.2) continue;
        const al = (rx * pt.dir.x + ry * pt.dir.y) / (pt.len / 2), ac = (rx * -pt.dir.y + ry * pt.dir.x) / (pt.w / 2), ed = Math.sqrt(al * al + ac * ac);
        g = g + (pt.h - g) * (1 - smooth(1.0, 1.6, ed));
        if (ed < 1) g -= 7 * (1 - ed * ed);
      }
      return g;
    }
    function groundBase(p, nr) {
      const h = Hs(nr.s), d = nr.dist;
      if (L.bumps === 0) return h - 1.4 * smooth(ROAD_W / 2 + 1, ROAD_W / 2 + 14, d);
      const depth = L.gully * Math.pow(0.5 + 0.5 * Math.sin(nr.s * 0.23 + gPh), 1.5);
      const trench = smooth(ROAD_W / 2 + 1, ROAD_W / 2 + 7, d) * (1 - smooth(ROAD_W / 2 + 15, ROAD_W / 2 + 30, d));
      const bump = L.bumps * (Math.sin(p.x * 0.025 + p.y * 0.018) * Math.cos(p.y * 0.03 - p.x * 0.01) + 0.4 * Math.sin(p.y * 0.06 + p.x * 0.04));
      return h - depth * trench + bump * smooth(ROAD_W / 2 + 22, ROAD_W / 2 + 90, d) + Math.max(0, d - 200) * 0.08;
    }
    const heightAt = p => groundAt(p);

    // ---------- bounding box ----------
    let bx0 = Infinity, bx1 = -Infinity, bz0 = Infinity, bz1 = -Infinity;
    for (const path of paths) for (const q of path.pts) { bx0 = Math.min(bx0, q.x); bx1 = Math.max(bx1, q.x); bz0 = Math.min(bz0, q.y); bz1 = Math.max(bz1, q.y); }
    const bcx = (bx0 + bx1) / 2, bcz = (bz0 + bz1) / 2, brad = Math.hypot(bx1 - bx0, bz1 - bz0) / 2;

    // ================= TUNNELS AND ELEVATED BRIDGES (main road) =================
    const specials = [];
    for (const kind of ['tunnel', 'bridge', 'tunnel', 'bridge']) {
      for (let tries = 0; tries < 60; tries++) {
        const len = 6 + Math.floor(R() * 4), s0 = MERGE + 3 + Math.floor(R() * (STEPS - MERGE - 13 - len)), s1 = s0 + len;
        // either clear of every fork, or tucked inside one where the side routes have already split away
        const fk = forks.find(f => s1 > f.i0 - 3 && s0 < f.i1 + 3);
        const ok = !fk || (s0 >= fk.i0 + 4 && s1 <= fk.i1 - 4);
        const clash = !ok || drops.some(d => d > s0 - 3 && d < s1 + 3) || specials.some(q => s1 > q.s0 - 7 && s0 < q.s1 + 7);
        if (!clash) { specials.push({ kind, s0, s1, fork: !!fk, depth: (45 + R() * 20), hill: R() * 0 }); break; }
      }
    }
    function specialAt(s) { for (const q of specials) if (s > q.s0 - 1.5 && s < q.s1 + 1.5) return q; return null; }
    const env = (q, s) => smooth(q.s0 - 1.5, q.s0 + 0.5, s) * (1 - smooth(q.s1 - 0.5, q.s1 + 1.5, s));
    const inSpecial = (i, pad) => specials.some(q => i > q.s0 - pad && i < q.s1 + pad);

    // ================= PITS: off the road only, themed per world =================
    const pits = [];
    for (let n = 0; n < 24; n++) {
      const i = 14 + Math.floor(R() * (STEPS - 20)), side = R() < 0.5 ? -1 : 1;
      const long = L.landmark === 'tundra' || L.landmark === 'canyon';
      const w = 9 + R() * 8, len = long ? 22 + R() * 16 : 12 + R() * 10;
      const p = C[i].clone().add(N[i].clone().multiplyScalar(side * (ROAD_W / 2 + 26 + R() * 70)));
      const nr = nearestRoad(p, 2);
      if (nr.dist < ROAD_W / 2 + Math.max(len, w) / 2 + 10 || specialAt(nr.s) || pits.some(q => q.c.distanceTo(p) < q.r + Math.max(len, w) / 2 + 8)) continue;
      const dir = long ? T[i].clone().rotateAround(V2(0, 0), (R() - 0.5) * 0.8) : T[i].clone();
      pits.push({ c: p, dir, len, w, h: groundBase(p, nr), r: Math.max(len, w) / 2 });
    }

    // ================= GROUND =================
    // a detailed strip of terrain follows the track (gullies need the detail); a coarse plane covers the rest
    const SUB = 4, RIB = 160;
    const ext = [];   // how far the strip reaches on each side at each index (less on the inside of tight bends)
    for (let i = 0; i <= STEPS; i++) {
      const k = (TH[Math.min(STEPS - 1, i)] - TH[Math.max(0, i - 1)]) / SEG, rad = Math.abs(k) > 1e-4 ? 1 / Math.abs(k) : 1e9;
      const inner = Math.min(RIB, rad * 0.8);
      ext.push(k > 0 ? [RIB, inner] : k < 0 ? [inner, RIB] : [RIB, RIB]); // [right(-N), left(+N)]
    }
    const lerpN = s => { const i = Math.min(STEPS - 1, Math.floor(s)), t = s - i; return N[i].clone().lerp(N[i + 1], t).normalize(); };
    const lerpC = s => { const i = Math.min(STEPS - 1, Math.floor(s)), t = s - i; return C[i].clone().lerp(C[i + 1], t); };
    const gc = new THREE.Color(L.ground);
    // steep ground turns to rock; the flooded city's ground is rippling water
    const rockCol = new THREE.Color(L.rock).lerp(new THREE.Color(L.ground), 0.35);
    function slopeTint(geo) {
      const nrm = geo.attributes.normal, col = geo.attributes.color;
      for (let v = 0; v < col.count; v++) {
        const t = smooth(0.95, 0.72, Math.abs(nrm.getY(v))) * 0.85;
        if (t <= 0) continue;
        col.setXYZ(v, col.getX(v) + (rockCol.r - col.getX(v)) * t, col.getY(v) + (rockCol.g - col.getY(v)) * t, col.getZ(v) + (rockCol.b - col.getZ(v)) * t);
      }
      col.needsUpdate = true;
    }
    function groundMat(map, dbl) {
      if (L.bumps === 0) {
        const wn = waterN.clone(); wn.needsUpdate = true; wn.repeat.copy(map.repeat).multiplyScalar(0.6); waterMaps.push(wn);
        return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.06, metalness: 0.35, envMapIntensity: 1.1, normalMap: wn, normalScale: new THREE.Vector2(0.45, 0.45), side: dbl ? THREE.DoubleSide : THREE.FrontSide });
      }
      return new THREE.MeshLambertMaterial({ vertexColors: true, map, side: dbl ? THREE.DoubleSide : THREE.FrontSide });
    }
    const waterMaps = [];
    const shadeAt = (x, z, rel) => 0.88 + 0.1 * Math.sin(x * 0.05 + z * 0.07) + 0.06 * Math.sin(x * 0.17 - z * 0.13) + rel * 0.012;
    {
      const rows = STEPS * SUB + 1, LAT = 4, cols = Math.ceil(RIB * 2 / LAT) + 1;
      const pos = new Float32Array(rows * cols * 3), col = new Float32Array(rows * cols * 3), uv = new Float32Array(rows * cols * 2);
      for (let r = 0; r < rows; r++) {
        const sv = r / SUB, i = Math.min(STEPS, Math.floor(sv)), c0 = lerpC(sv), n0 = lerpN(sv), [eR, eL] = ext[i];
        for (let k = 0; k < cols; k++) {
          let lat = -RIB + k * LAT; lat = lat < 0 ? Math.max(lat, -eR) : Math.min(lat, eL);
          const p = c0.clone().add(n0.clone().multiplyScalar(lat)), nr = nearestRoad(p, 2), h = groundAt(p, nr), v = r * cols + k;
          pos[v * 3] = p.x; pos[v * 3 + 1] = h - 0.12; pos[v * 3 + 2] = p.y;
          const sh = shadeAt(p.x, p.y, h - Hs(nr.s));
          col[v * 3] = gc.r * sh; col[v * 3 + 1] = gc.g * sh; col[v * 3 + 2] = gc.b * sh;
          uv[v * 2] = lat / 14; uv[v * 2 + 1] = sv * SEG / 14;
        }
      }
      const idx = [];
      for (let r = 0; r < rows - 1; r++) for (let k = 0; k < cols - 1; k++) { const a = r * cols + k, b = a + 1, c = a + cols, d = c + 1; idx.push(a, b, c, b, d, c); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      g.setIndex(idx); g.computeVertexNormals(); slopeTint(g);
      const strip = new THREE.Mesh(g, groundMat(groundTex, true));
      strip.receiveShadow = true; strip.userData.ground = true; scene.add(strip);
    }
    // where is a point relative to the strip? (signed sideways distance from the centreline)
    function stripCover(p) {
      let best = Infinity, bs = 0, lat = 0;
      const cx = Math.floor(p.x / CELL), cz = Math.floor(p.y / CELL);
      for (let x = cx - 4; x <= cx + 4; x++) for (let z = cz - 4; z <= cz + 4; z++) {
        const list = segGrid.get(x + ',' + z); if (!list) continue;
        for (const [path, i] of list) { if (path !== paths[0]) continue; const [d, t] = segDist(p, C[i], C[i + 1]); if (d < best) { best = d; bs = i + t; } }
      }
      if (best === Infinity) return false;
      const i = Math.min(STEPS - 1, Math.floor(bs)), q = lerpC(bs), n = lerpN(bs);
      lat = (p.x - q.x) * n.x + (p.y - q.y) * n.y;
      if (bs <= 0.01 || bs >= STEPS - 0.01) return false;
      const [eR, eL] = ext[i];
      return lat < 0 ? -lat < eR - 12 : lat < eL - 12;
    }
    {
      const gw = bx1 - bx0 + 1200, gd = bz1 - bz0 + 1200;
      const nx = Math.min(200, Math.ceil(gw / 14)), nz = Math.min(200, Math.ceil(gd / 14));
      const gg = new THREE.PlaneGeometry(gw, gd, nx, nz);
      gg.rotateX(-Math.PI / 2);
      const gpos = gg.attributes.position, cols = [], tmp = V2(0, 0);
      for (let v = 0; v < gpos.count; v++) {
        const x = gpos.getX(v) + bcx, z = gpos.getZ(v) + bcz;
        tmp.set(x, z);
        const nr = nearestRoad(tmp, 2), h = groundAt(tmp, nr);
        gpos.setY(v, h - 0.2 - (stripCover(tmp) ? 9 : 0));
        const sh = shadeAt(x, z, h - Hs(nr.s));
        cols.push(gc.r * sh, gc.g * sh, gc.b * sh);
      }
      gg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      gg.computeVertexNormals(); slopeTint(gg);
      const gt = groundTex.clone(); gt.needsUpdate = true; gt.repeat.set(gw / 14, gd / 14);
      const ground = new THREE.Mesh(gg, groundMat(gt, false));
      ground.position.set(bcx, 0, bcz); ground.receiveShadow = true; ground.userData.ground = true;
      scene.add(ground);
    }

    // ================= PARTICLES =================
    const PN = 2600, pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(PN * 3), pCol = new Float32Array(PN * 3), pVel = new Float32Array(PN * 3), pLife = new Float32Array(PN), pGrav = new Float32Array(PN);
    for (let i = 0; i < PN; i++) pPos[i * 3 + 1] = -9999;
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
    const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 1.1, map: puff, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }));
    pts.frustumCulled = false; pts.userData.dyn = true; scene.add(pts);
    let pNext = 0;
    const tc = new THREE.Color();
    function emit(x, y, z, vx, vy, vz, color, life, grav, bright) {
      const i = pNext; pNext = (pNext + 1) % PN;
      pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z; pVel[i * 3] = vx; pVel[i * 3 + 1] = vy; pVel[i * 3 + 2] = vz;
      tc.set(color); const bk = bright || 1; pCol[i * 3] = tc.r * bk; pCol[i * 3 + 1] = tc.g * bk; pCol[i * 3 + 2] = tc.b * bk;
      pLife[i] = life; pGrav[i] = grav === undefined ? 1 : grav;
    }
    function burst(x, y, z, n, color, speed, life, grav, bright) { for (let k = 0; k < n; k++) emit(x, y, z, (R() - 0.5) * speed, R() * speed * 0.8, (R() - 0.5) * speed, color, life * (0.5 + R()), grav, bright); }
    function updateParticles(dt) {
      for (let i = 0; i < PN; i++) {
        if (pLife[i] <= 0) continue;
        pLife[i] -= dt;
        if (pLife[i] <= 0) { pPos[i * 3 + 1] = -9999; continue; }
        pVel[i * 3 + 1] -= 9 * pGrav[i] * dt;
        pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
        pVel[i * 3] *= 0.98; pVel[i * 3 + 2] *= 0.98;
      }
      pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
    }

    // ================= HAZARDS, PITS, RAMPS, PADS =================
    const zones = [], ramps = [], pads = [];
    const lavaMat = new THREE.MeshBasicMaterial({ map: lavaTex, color: new THREE.Color(1, 1, 1).multiplyScalar(HQ() ? 1.8 : 1) });
    function addZone(type, p, r) {
      const zt = ZT[type];
      zones.push({ type, zt, p, r });
      const g = new THREE.RingGeometry(0, r, 30, 3); g.rotateX(-Math.PI / 2);
      const zp = g.attributes.position;
      for (let v = 0; v < zp.count; v++) zp.setY(v, heightAt(V2(p.x + zp.getX(v), p.y + zp.getZ(v))) + 0.24);
      const m = zt.glow ? lavaMat : new THREE.MeshLambertMaterial({ color: zt.color, transparent: !!zt.alpha, opacity: zt.alpha || 1 });
      const mesh = new THREE.Mesh(g, m); mesh.position.set(p.x, 0, p.y); mesh.receiveShadow = !zt.glow; scene.add(mesh);
    }
    // pit visuals, themed per world: sinkholes, tar pits, whirlpools, ice crevasses, ravines, lava vents
    function drawPit(pt) {
      const ang = Math.atan2(pt.dir.y, pt.dir.x), h = pt.h;
      const ell = (sc, y, mat) => { const g = new THREE.CircleGeometry(1, 32); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, mat); m.scale.set(pt.len / 2 * sc, 1, pt.w / 2 * sc); m.position.set(pt.c.x, y, pt.c.y); m.rotation.y = -ang; scene.add(m); return m; };
      const around = (n, rr, fn) => { for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + R() * 0.3, x = Math.cos(a) * pt.len / 2 * rr, z = Math.sin(a) * pt.w / 2 * rr;
        fn(V2(pt.c.x + pt.dir.x * x - pt.dir.y * z, pt.c.y + pt.dir.y * x + pt.dir.x * z)); } };
      const T_ = L.landmark;
      if (T_ === 'volcano') { ell(0.9, h - 4.5, lavaMat); ell(0.55, h - 4.4, GLOW(0xffe27a, 2.5)); around(9, 1.12, q => { const c = new THREE.Mesh(new THREE.ConeGeometry(1 + R(), 2.5 + R() * 2, 6), lam(0x2a1f1c)); c.position.set(q.x, heightAt(q) + 1, q.y); scene.add(c); }); return; }
      const holeCol = { desert: 0x2a1d10, jungle: 0x0b0b0b, city: 0x0a2340, tundra: 0x0d2a40, canyon: 0x1a0e08 }[T_] || 0x0a0806;
      ell(0.96, h - 6.6, new THREE.MeshBasicMaterial({ color: holeCol }));
      ell(0.6, h - 6.5, new THREE.MeshBasicMaterial({ color: 0x000000 }));
      if (T_ === 'desert') { const t = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 6, 32), lam(0xd8b878)); t.rotation.x = Math.PI / 2; t.scale.set(pt.len / 2 * 1.05, pt.w / 2 * 1.05, 6); t.position.set(pt.c.x, h + 0.1, pt.c.y); t.rotation.z = ang; scene.add(t);
        around(5, 1.15, q => rock(q, 0.6 + R())); }
      else if (T_ === 'jungle') { const tar = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.08, metalness: 0.4 }); ell(0.85, h - 3.2, tar);
        for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.4 + R() * 0.4, 8, 6), tar); b.position.set(pt.c.x + (R() - 0.5) * pt.len * 0.5, h - 3.1, pt.c.y + (R() - 0.5) * pt.w * 0.5); scene.add(b); }
        around(10, 1.2, q => { const f = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.2, 5), lam(0x2f6b2f)); f.position.set(q.x, heightAt(q) + 1.1, q.y); scene.add(f); }); }
      else if (T_ === 'city') { const t = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 40), lam(0x8d9399)); t.rotation.x = Math.PI / 2; t.scale.set(pt.len / 2, pt.w / 2, 8); t.position.set(pt.c.x, h + 0.15, pt.c.y); scene.add(t);
        for (let k = 1; k <= 3; k++) { const sw = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 4, 40, Math.PI * 1.3), lam(0xdff3ff)); sw.rotation.x = Math.PI / 2; sw.rotation.z = k * 2.1; sw.scale.set(pt.len / 2 * k / 4, pt.w / 2 * k / 4, 4); sw.position.set(pt.c.x, h - 1.5 * k, pt.c.y); sw.userData.dyn = true; scene.add(sw); swirls.push(sw); } }
      else if (T_ === 'tundra') around(16, 1.05, q => { const c = new THREE.Mesh(new THREE.ConeGeometry(0.6 + R() * 0.8, 2 + R() * 3, 5), new THREE.MeshLambertMaterial({ color: 0xbfe6f7, transparent: true, opacity: 0.9 })); c.position.set(q.x, heightAt(q) + 0.8, q.y); c.rotation.set((R() - 0.5) * 0.6, R() * 3, (R() - 0.5) * 0.6); scene.add(c); });
      else if (T_ === 'canyon') around(14, 1.12, q => rock(q, 0.8 + R() * 1.4));
    }
    const swirls = [];
    function addRamp(p, dir, h, width) {
      width = width || ROAD_W * 0.92;
      ramps.push({ p, dir, w: width });
      const ang = Math.atan2(dir.y, dir.x);
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(9, 0.6, width), lam(0xffb703));
      ramp.position.set(p.x, h + 0.6, p.y); ramp.rotation.order = 'YZX'; ramp.rotation.y = -ang; ramp.rotation.z = 0.22;
      ramp.castShadow = true; ramp.receiveShadow = true; scene.add(ramp);
      const ns = Math.floor(width / 8);
      for (let s = -ns; s <= ns; s++) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(9.1, 0.65, 1), lam(0x222222));
        stripe.position.set(p.x - dir.y * s * 3.6, h + 0.62, p.y + dir.x * s * 3.6); stripe.rotation.copy(ramp.rotation); scene.add(stripe);
      }
    }
    function addPad(p, dir) {
      const h = Hs(nearestRoad(p).s), ang = Math.atan2(dir.y, dir.x);
      pads.push({ p, dir });
      const m = new THREE.Mesh(new THREE.BoxGeometry(8, 0.12, 7), GLOW(0x00d4ff, 2.2));
      m.position.set(p.x, h + 0.14, p.y); m.rotation.y = -ang; scene.add(m);
      for (let k = -1; k <= 1; k++) {
        const ch = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.4, 3), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        ch.rotation.order = 'YXZ'; ch.rotation.y = -ang; ch.rotation.x = -Math.PI / 2; ch.scale.set(1, 1, 0.12);
        ch.position.set(p.x + dir.x * k * 2.4, h + 0.25, p.y + dir.y * k * 2.4); scene.add(ch);
      }
    }
    const at = (path, s, lat) => { const i = Math.min(STEPS - 1, Math.floor(s)), t = s - i; const p = path.pts[i].clone().lerp(path.pts[i + 1], t); return p.add(N[i].clone().multiplyScalar(lat || 0)); };
    const inFork = (i, pad) => i < MERGE + pad || forks.some(f => i > f.i0 - pad && i < f.i1 + pad);   // the merge zone is kept clear too
    const nearDrop = (i, pad) => drops.some(d => Math.abs(d - i) < pad);
    const featureAt = []; // indices with ramps/roadblocks so features don't overlap
    const roadblockRoutes = [];

    // route A: the world's hazard, scattered so you weave through it
    for (const f of forks) {
      for (let s = f.i0 + 2; s < f.i1 - 2; s += 0.8) addZone(f.aType, at(f.A, s, (R() - 0.5) * ROAD_W * 0.8), f.aType === 'ice' ? 22 : 11 + R() * 6);
      if (f.B) roadblockRoutes.push(f.B);
    }
    // kicker ramps on the main road for lift (never in front of a pit)
    const kickers = [];
    for (let n = 0; n < 8; n++) {
      let i, tries = 0;
      do { i = 16 + Math.floor(R() * (STEPS - 24)); } while ((inFork(i, 2) || inSpecial(i, 3) || nearDrop(i, 3) || featureAt.some(k => Math.abs(k - i) < 5) || kickers.some(k => Math.abs(k - i) < 8)) && ++tries < 80);
      kickers.push(i); featureAt.push(i);
      const wide = R() < 0.35, lat = wide ? 0 : (R() < 0.5 ? -1 : 1) * (ROAD_W / 2 - 9);
      addRamp(at({ pts: main }, i, lat), T[i], Hs(i), wide ? ROAD_W * 0.92 : 14);
    }
    // small hazards on the main road
    for (let n = 0; n < 14; n++) {
      let i, tries = 0; do { i = 14 + Math.floor(R() * (STEPS - 20)); } while ((inFork(i, 2) || inSpecial(i, 2) || featureAt.some(k => Math.abs(k - i) < 3)) && ++tries < 60);
      addZone(L.small, at({ pts: main }, i, (R() - 0.5) * ROAD_W * 0.6), 7 + R() * 4);
    }
    // boost pads
    for (let n = 0; n < 8; n++) {
      let i, tries = 0; do { i = 14 + Math.floor(R() * (STEPS - 20)); } while ((inFork(i, 1) || inSpecial(i, 2) || nearDrop(i, 3) || featureAt.some(k => Math.abs(k - i) < 4)) && ++tries < 60);
      addPad(at({ pts: main }, i, (R() - 0.5) * ROAD_W * 0.6), T[i]);
    }
    for (const f of forks) addPad(at(f.A, f.i0 + 3), T[f.i0 + 3]);
    const storm = L.storm ? { from: STEPS * (0.4 + R() * 0.2) } : null;
    if (storm) storm.to = storm.from + 20;

    // ================= ROADS =================
    const roadMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(L.road).multiplyScalar(1.75), map: roadTex });
    const scMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(L.road).multiplyScalar(2.2).lerp(new THREE.Color(0xffd27a), 0.18), map: roadTex });
    const kerbA = lam(0xd62828), kerbB = lam(0xf5f5f5), shoulderMat = lam(new THREE.Color(L.ground).multiplyScalar(0.7).getHex());
    // smooth ribbons that follow every bend (no gaps on the outside of curves)
    function ribbon(path, latA, latB, yOff, mats, every) {
      if (latA > latB) { const t = latA; latA = latB; latB = t; }
      const geos = mats.map(() => ({ pos: [], uv: [] }));
      const P_ = s => { const i = Math.min(STEPS - 1, Math.floor(s)), t = s - i; return path.pts[i].clone().lerp(path.pts[i + 1], t); };
      for (let s0 = path.i0; s0 < path.i1 - 1e-6; s0 += 1 / SUB) {
        const s1 = Math.min(path.i1, s0 + 1 / SUB), pa = P_(s0), pb = P_(s1), na = lerpN(s0), nb = lerpN(s1), ha = Hs(s0) + yOff, hb = Hs(s1) + yOff;
        const g = geos[every ? Math.floor(s0 * every) % mats.length : 0];
        const A1 = pa.clone().add(na.clone().multiplyScalar(latA)), A2 = pa.clone().add(na.clone().multiplyScalar(latB));
        const B1 = pb.clone().add(nb.clone().multiplyScalar(latA)), B2 = pb.clone().add(nb.clone().multiplyScalar(latB));
        const vs = [[A1, ha, 0, s0], [A2, ha, 1, s0], [B1, hb, 0, s1], [A2, ha, 1, s0], [B2, hb, 1, s1], [B1, hb, 0, s1]];
        for (const [q, h, v, sv] of vs) { g.pos.push(q.x, h, q.y); g.uv.push(sv, v); }
      }
      geos.forEach((g, k) => {
        if (!g.pos.length) return;
        const bg = new THREE.BufferGeometry();
        bg.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3)); bg.setAttribute('uv', new THREE.Float32BufferAttribute(g.uv, 2)); bg.computeVertexNormals();
        const m = new THREE.Mesh(bg, mats[k]); m.receiveShadow = true; scene.add(m);
      });
    }
    for (const path of paths) {
      const ent = path.kind === 'entry';   // starting roads sit just under the main road, so where they overlap the main road wins
      const lift = path.kind === 'main' ? 0.1 : ent ? (path.lane === 1 ? 0.06 : 0.03) : 0.13;
      ribbon(path, -ROAD_W / 2, ROAD_W / 2, lift, [path.kind === 'shortcut' ? scMat : roadMat]);
      // main road: no kerbs in the stretch where the starting roads pour into it
      const kps = ent ? [{ pts: path.pts, i0: 0, i1: path.sep }] : path.kind === 'main' ? [{ pts: path.pts, i0: 0, i1: entries[1].sep }, { pts: path.pts, i0: MERGE, i1: STEPS }] : [path];
      for (const kp of kps) if (kp.i1 > kp.i0) for (const sd of [-1, 1]) {
        ribbon(kp, sd * (ROAD_W / 2 - 0.9), sd * ROAD_W / 2, lift + 0.12, [kerbA, kerbB], 1);
        ribbon(kp, sd * ROAD_W / 2, sd * (ROAD_W / 2 + 3), lift - 0.06, [shoulderMat]);
      }
    }
    // signs at each fork: yellow = hazard shortcut, red = pit route
    for (const f of forks) {
      const i = f.i0 + 1, h = H[i];
      [[f.A, f.inner], [f.B, -f.inner]].forEach(([r, side]) => {
        if (!r) return;
        const p = C[i].clone().add(N[i].clone().multiplyScalar(side * (ROAD_W / 2 + 3)));
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 0.4), lam(0x333333)); post.position.set(p.x, h + 3, p.y); scene.add(post);
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.4, 6), new THREE.MeshBasicMaterial({ color: r.type === 'blocks' ? 0xe63946 : 0xffb703 }));
        board.position.set(p.x, h + 6, p.y); board.rotation.y = -Math.atan2(T[i].y, T[i].x); scene.add(board);
      });
    }
    // chevron boards on the outside of sharp bends
    for (let i = 18; i < STEPS - 3; i += 2) {
      if (inSpecial(i, 1.5)) continue;
      const k = TH[i + 1] - TH[i];
      if (Math.abs(k) < 0.08) continue;
      const side = -Math.sign(k), p = C[i].clone().add(N[i].clone().multiplyScalar(side * (ROAD_W / 2 + 3.5))), h = H[i];
      const g = new THREE.Group();
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.8, 3.2), lam(0x111111)); board.position.y = 1.9; g.add(board);
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.6, 3), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
      arrow.rotation.order = 'YXZ'; arrow.rotation.x = side * Math.PI / 2; arrow.scale.set(1, 1, 0.15); arrow.position.set(-0.15, 1.9, 0); g.add(arrow);
      const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 0.15), lam(0x333333)); leg1.position.set(0, 0.6, 1.1); g.add(leg1);
      const leg2 = leg1.clone(); leg2.position.z = -1.1; g.add(leg2);
      g.position.set(p.x, h, p.y); g.rotation.y = -Math.atan2(T[i].y, T[i].x) + Math.PI; scene.add(g);
    }
    // lamp posts along the main road
    const postMat = lam(0x3a3a3a), lampMat = GLOW(0xfff2c8, 2.4);
    for (let i = 18; i < STEPS - 4; i += 5) {
      if (inSpecial(i, 1.5)) continue;
      const side = (i / 5) % 2 ? 1 : -1, p = C[i].clone().add(N[i].clone().multiplyScalar(side * (ROAD_W / 2 + 2.2))), h = H[i];
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 8, 6), postMat); pole.position.set(p.x, h + 4, p.y); scene.add(pole);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 3), postMat), aq = C[i].clone().add(N[i].clone().multiplyScalar(side * (ROAD_W / 2 + 0.8)));
      arm.position.set(aq.x, h + 8, aq.y); arm.rotation.y = -Math.atan2(N[i].y, N[i].x) + Math.PI / 2; scene.add(arm);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.5), lampMat), lq = C[i].clone().add(N[i].clone().multiplyScalar(side * (ROAD_W / 2 - 0.6)));
      lamp.position.set(lq.x, h + 7.85, lq.y); scene.add(lamp);
    }
    // drop-off warning boards
    for (const di of drops) {
      const i = di - 1;
      for (const s of [-1, 1]) {
        const q = C[i].clone().add(N[i].clone().multiplyScalar(s * (ROAD_W / 2 + 3)));
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.5, 5), new THREE.MeshBasicMaterial({ color: 0xffb703 }));
        b.position.set(q.x, H[i] + 2.5, q.y); b.rotation.y = -Math.atan2(T[i].y, T[i].x); scene.add(b);
      }
    }
    // finish arch with chequered line and flags
    {
      const fin = new THREE.Group(), fh = H[STEPS];
      for (let k = 0; k < 10; k++) for (let r = 0; r < 2; r++) {
        const sq = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.56, ROAD_W / 10), lam((k + r) % 2 ? 0x111111 : 0xffffff));
        sq.position.set(r * 1.5 - 0.75, 0.02, -ROAD_W / 2 + ROAD_W / 20 + k * ROAD_W / 10); fin.add(sq);
      }
      for (const s of [-1, 1]) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(1.2, 11, 1.2), lam(0xffffff)); p.position.set(0, 5.5, s * (ROAD_W / 2 + 1.5)); p.castShadow = true; fin.add(p);
        for (let k = 0; k < 3; k++) { const flag = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 2.2), lam([0xe63946, 0xffd23f, 0x1d4ed8][k])); flag.position.set(-3 - k * 4, 6, s * (ROAD_W / 2 + 4)); fin.add(flag);
          const fp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 7, 0.12), postMat); fp.position.set(-3 - k * 4, 3.5, s * (ROAD_W / 2 + 4) - 1.1); fin.add(fp); }
      }
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, ROAD_W + 4), new THREE.MeshBasicMaterial({ color: 0xe63946 })); bar.position.y = 11; fin.add(bar);
      fin.position.set(END.x, fh, END.y); fin.rotation.y = -Math.atan2(T[STEPS].y, T[STEPS].x); scene.add(fin);
    }

    // ================= OBSTACLES & PROPS (bucketed in a 2D grid) =================
    const OCELL = 30, obsGrid = new Map();
    function addObstacle(o) { o.alive = true; const k = Math.floor(o.p.x / OCELL) + ',' + Math.floor(o.p.y / OCELL); if (!obsGrid.has(k)) obsGrid.set(k, []); obsGrid.get(k).push(o); return o; }
    function nearObstacles(p, out) {
      out.length = 0; const cx = Math.floor(p.x / OCELL), cz = Math.floor(p.y / OCELL);
      for (let x = cx - 1; x <= cx + 1; x++) for (let z = cz - 1; z <= cz + 1; z++) { const l = obsGrid.get(x + ',' + z); if (l) for (const o of l) if (o.alive && !(o.until && raceTime > o.until)) out.push(o); }
      return out;
    }
    const flying = [];
    const tooClose = p => ramps.some(r => r.p.distanceTo(p) < 16) || pits.some(c => c.c.distanceTo(p) < c.r + 6) || pads.some(q => q.p.distanceTo(p) < 8);
    function rock(p, r) {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), lam(L.rock));
      m.position.set(p.x, heightAt(p) + r * 0.5, p.y); m.rotation.set(R() * 3, R() * 3, 0); m.castShadow = true; scene.add(m);
      addObstacle({ p, r: r * 0.9, mesh: m, breakable: false });
    }
    function tall(p, scale, solidOnly) {
      scale = scale || 1;
      const g = new THREE.Group(), k = L.tallKind, mat = lam(L.tall);
      let r = 0.8, breakable = false;
      if (k === 'cactus') {
        const h = (3 + R() * 2.5) * scale;
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.45 * scale, 0.55 * scale, h, 8), mat); t.position.y = h / 2; t.castShadow = true; g.add(t);
        for (const s of [-1, 1]) if (R() < 0.7) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * scale, 0.3 * scale, 1.6 * scale, 6), mat); a.position.set(s * 0.9 * scale, h * 0.55, 0); a.castShadow = true; g.add(a);
          const e = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * scale, 0.3 * scale, 0.9 * scale, 6), mat); e.rotation.z = Math.PI / 2; e.position.set(s * 0.5 * scale, h * 0.55 - 0.8 * scale, 0); g.add(e); }
        breakable = true;
      } else if (k === 'tree' || k === 'pine') {
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * scale, 0.5 * scale, 3 * scale, 6), lam(0x5a3d26)); t.position.y = 1.5 * scale; t.castShadow = true; g.add(t);
        if (k === 'tree') {
          for (let q = 0; q < 3; q++) { const top = new THREE.Mesh(new THREE.IcosahedronGeometry((1.6 + R() * 0.9) * scale, 0), mat); top.position.set((R() - 0.5) * 1.6 * scale, (4 + R()) * scale, (R() - 0.5) * 1.6 * scale); top.castShadow = true; g.add(top); }
        } else {
          for (let q = 0; q < 3; q++) { const top = new THREE.Mesh(new THREE.ConeGeometry((2.1 - q * 0.5) * scale, 2.6 * scale, 7), mat); top.position.y = (3.6 + q * 1.4) * scale; top.castShadow = true; g.add(top); }
        }
        r = 0.7 * scale; breakable = scale < 1.3;
      } else if (k === 'building') {
        const h = (4 + R() * 9) * scale, w = 2.4 * scale;
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat); b.position.y = h / 2; b.castShadow = true; g.add(b);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.1, 0.3, w * 1.1), lam(0x5f6670)); roof.position.y = h; g.add(roof);
        r = 1.6 * scale;
      } else if (k === 'pillar') {
        const h = (5 + R() * 7) * scale;
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.9 * scale, 1.4 * scale, h, 7), mat); b.position.y = h / 2; b.castShadow = true; g.add(b);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.3 * scale, 1.0 * scale, 0.8 * scale, 7), lam(L.rock)); cap.position.y = h; g.add(cap);
        r = 1.4 * scale;
      } else {
        const c = new THREE.Mesh(new THREE.ConeGeometry(1.3 * scale, 2 * scale, 8), lam(0x2a1f1c)); c.position.y = scale; c.castShadow = true; g.add(c);
        const gl = new THREE.Mesh(new THREE.SphereGeometry(0.6 * scale, 8, 6), GLOW(L.tall, 2.6)); gl.position.y = 2 * scale; g.add(gl);
        r = 1.2 * scale; breakable = true;
      }
      g.position.set(p.x, heightAt(p), p.y);
      if (breakable && !solidOnly) g.userData.dyn = true;
      scene.add(g);
      addObstacle({ p, r, mesh: g, breakable: breakable && !solidOnly });
    }
    for (const path of paths) for (let i = Math.max(16, path.i0 + 1); i < Math.min(STEPS - 3, path.i1 - 1); i++) {
      if (path.kind === 'main' && inSpecial(i, 1.5)) continue;
      const n = 2 + Math.floor(R() * 3);
      for (let k = 0; k < n; k++) {
        const onRoad = false;
        const off = onRoad ? (R() - 0.5) * ROAD_W * 0.7 : (R() < 0.5 ? -1 : 1) * (ROAD_W * 0.65 + R() * 50);
        const p = path.pts[i].clone().lerp(path.pts[i + 1], R()).add(N[i].clone().multiplyScalar(off));
        if (tooClose(p)) continue;
        if (!onRoad && nearestRoad(p).dist < ROAD_W * 0.6) continue;
        if (R() < 0.45) rock(p, 1 + R() * 2.2); else tall(p);
      }
    }
    pits.forEach(drawPit);

    // ================= ROADBLOCKS =================
    // wooden crates & barrels: anyone smashes them · yellow/black striped barriers: only HEAVY rides shove them · grey walls: nobody moves them
    const pushables = [];
    const woodMat = lam(0x9a6a3a), woodDark = lam(0x6b4422), stripeY = lam(0xffc61a), stripeK = lam(0x1c1c1c), concrete = lam(0x8e9196), reflR = lam(0xd62828), reflW = lam(0xf2f2f2);
    function crateOld(p, ang) {
      const g = new THREE.Group(), sz = 1.8 + R() * 0.6;
      if (R() < 0.6) { const b = new THREE.Mesh(new THREE.BoxGeometry(sz, sz, sz), woodMat); b.position.y = sz / 2; b.castShadow = true; g.add(b);
        for (const yy of [0.15, sz - 0.15]) { const band = new THREE.Mesh(new THREE.BoxGeometry(sz + 0.05, 0.22, sz + 0.05), woodDark); band.position.y = yy; g.add(band); } }
      else { const col = pick([0xc0392b, 0x2e86de, 0x2a9d8f]), b = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.6, 12), lam(col)); b.position.y = 0.8; b.castShadow = true; g.add(b);
        for (const yy of [0.35, 1.25]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.83, 0.83, 0.12, 12), lam(0x333333)); r.position.y = yy; g.add(r); } }
      g.position.set(p.x, heightAt(p), p.y); g.rotation.y = ang + (R() - 0.5) * 0.6; g.userData.dyn = true; scene.add(g);
      addObstacle({ p, r: 1.2, mesh: g, breakable: true });
    }
    function stripedOld(p, ang) {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.7, 4.2), stripeY); b.position.y = 0.85; b.castShadow = true; g.add(b);
      for (let k = -1; k <= 1; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.72, 0.55), stripeK); st.position.set(0, 0.85, k * 1.35); st.rotation.x = 0.0; g.add(st); }
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 3.8), stripeK); top.position.y = 1.85; g.add(top);
      const y = heightAt(p); g.position.set(p.x, y, p.y); g.rotation.y = ang; g.userData.dyn = true; scene.add(g);
      pushables.push({ p: p.clone(), vel: V2(0, 0), r: 2.1, mesh: g, rot: ang, spin: 0, alive: true, y });
    }
    function wallBlock(p, dir) {
      const ang = -Math.atan2(dir.y, dir.x), g = new THREE.Group(), y = heightAt(p);
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.8, 6.2), concrete); b.position.y = 1.4; b.castShadow = true; g.add(b);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 6.4), lam(0x6f7378)); cap.position.y = 2.9; g.add(cap);
      for (let k = -2; k <= 2; k++) { const rf = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.45, 0.9), k % 2 ? reflW : reflR); rf.position.set(0, 2.2, k * 1.2); g.add(rf); }
      g.position.set(p.x, y, p.y); g.rotation.y = ang; scene.add(g);
      const n = V2(-dir.y, dir.x);
      for (const o of [-2.2, 0, 2.2]) addObstacle({ p: p.clone().add(n.clone().multiplyScalar(o)), r: 1.15, mesh: null, breakable: false, wall: true });
    }
    // a line of blocks across the road, always with a gap you can get through
    // big themed road blocks: Jump rides hop them, Smash rides break them, Wings glide over, giants roll over, the rest go around
    const BLOCK_TOUGH = [400, 1200, 3600][Math.max(0, Math.min(2, (P.chapter || 1) - 1))];
    const canPass = P.playerAbility === 'Jump' || P.playerAbility === 'Smash' || P.wings;
    const blockLook = {
      desert: [0xd2a66a, 0xb98a50], jungle: [0x6b4a2e, 0x4f7a3a], city: [0x9aa0a6, 0xd7dade], tundra: [0xbfe6f7, 0xe8f6fc], canyon: [0x8a5a40, 0x6e4632], volcano: [0x26201f, 0xff6a1a] }[L.landmark] || [0x8e9196, 0xb0b3b6];
    const blockEdgeMat = new THREE.LineBasicMaterial({ color: canPass ? 0x5dff8a : 0xff4a4a });
    const blocks = [];
    function bigBlock(p, dir, w, scrap) {
      w = w || 10 + R() * 4;
      const ang = -Math.atan2(dir.y, dir.x), y = heightAt(p), H = 5, D = 3.4, g = new THREE.Group();
      let geo;
      if (L.landmark === 'jungle') { geo = new THREE.CylinderGeometry(D / 2, D / 2, w, 12); geo.rotateX(Math.PI / 2); geo.translate(0, D / 2 + 0.6, 0); geo.scale(1, 1.4, 1); }
      else if (L.landmark === 'canyon' || L.landmark === 'volcano') { geo = new THREE.DodecahedronGeometry(1, 0); geo.scale(D * 0.75, H * 0.55, w / 2); geo.translate(0, H * 0.5, 0); }
      else geo = new THREE.BoxGeometry(D, H, w).translate(0, H / 2, 0);
      const m = new THREE.Mesh(geo, lam(scrap ? 0x6f6a62 : blockLook[0])); m.castShadow = true; m.receiveShadow = true; g.add(m);
      const band = new THREE.Mesh(new THREE.BoxGeometry(D + 0.08, 0.5, w + 0.08), L.landmark === 'volcano' ? GLOW(blockLook[1], 1.8) : lam(blockLook[1])); band.position.y = H * 0.72; g.add(band);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(D + 0.3, H + 0.3, w + 0.3)), blockEdgeMat); edges.position.y = H / 2; g.add(edges);
      g.position.set(p.x, y, p.y); g.rotation.y = ang; g.userData.dyn = true; scene.add(g);
      const blk = { mesh: g, alive: true, tough: scrap ? BLOCK_TOUGH * 0.5 : BLOCK_TOUGH, top: y + H, parts: [] };
      const n = V2(-dir.y, dir.x), k = Math.max(2, Math.round(w / 4.2));
      for (let i = 0; i < k; i++) blk.parts.push(addObstacle({ p: p.clone().add(n.clone().multiplyScalar((i / (k - 1) - 0.5) * (w - 3))), r: 2.1, mesh: null, breakable: false, blk }));
      blocks.push(blk); return blk;
    }
    function breakBlock(blk, c) {
      if (!blk.alive) return; blk.alive = false; for (const o of blk.parts) o.alive = false;
      flying.push({ mesh: blk.mesh, vx: c.vel.x * 0.5, vy: 7, vz: c.vel.y * 0.5, spin: (R() - 0.5) * 3, t: 1.8 });
      if (nearPlayer(c)) { burst(blk.mesh.position.x, blk.top - 2, blk.mesh.position.z, 34, blockLook[0], 13, 0.9); if (c.isPlayer) { shake = Math.min(1, shake + 0.5); toast('SMASHED!', '#ff6b5b'); } }
    }
    // a line of blocks across the road, always with a gap you can get through
    function roadblock(path, s, gapSide) {
      const i = Math.min(STEPS - 1, Math.floor(s)), dir = T[i];
      const gapC = gapSide === undefined ? (R() - 0.5) * ROAD_W * 0.5 : gapSide * ROAD_W * 0.26, gapW = 11 + R() * 3;
      let lat = -ROAD_W / 2 + 1;
      while (lat < ROAD_W / 2 - 4) {
        const w = 10 + R() * 4, mid = lat + w / 2;
        if (Math.abs(mid - gapC) < gapW / 2 + w / 2) { lat = gapC + gapW / 2; continue; }
        if (lat + w > ROAD_W / 2 + 1) break;
        bigBlock(at(path, s, mid), dir, w); lat += w + 0.5;
      }
    }
    for (let n = 0; n < 9; n++) {
      let i, tries = 0;
      do { i = 18 + Math.floor(R() * (STEPS - 26)); } while ((inFork(i, 2) || inSpecial(i, 2) || nearDrop(i, 2) || featureAt.some(k => Math.abs(k - i) < 4)) && ++tries < 80);
      featureAt.push(i); roadblock({ pts: main }, i + 0.5);
    }
    function crate() {} function striped() {}
    for (const B of roadblockRoutes) { let side = 1; for (let s = B.i0 + 3; s < B.i1 - 2; s += 2.6) { roadblock(B, s, side); side = -side; } }

    // ================= TUNNEL AND BRIDGE STRUCTURES =================
    function wallStrip(s0, s1, lat, y0, y1, mat) {
      const pos = [], uv = [];
      for (let sv = s0; sv < s1 - 1e-6; sv += 1 / SUB) {
        const sb = Math.min(s1, sv + 1 / SUB), a = lerpC(sv).add(lerpN(sv).multiplyScalar(lat)), b = lerpC(sb).add(lerpN(sb).multiplyScalar(lat)), ha = Hs(sv), hb = Hs(sb);
        pos.push(a.x, ha + y0, a.y, b.x, hb + y0, b.y, a.x, ha + y1, a.y, a.x, ha + y1, a.y, b.x, hb + y0, b.y, b.x, hb + y1, b.y);
        uv.push(sv, 0, sb, 0, sv, 1, sv, 1, sb, 0, sb, 1);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
      const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; scene.add(m);
    }
    const dbl = c => { const m = mk(c); m.side = THREE.DoubleSide; return m; };
    const tunnelMat = dbl({ desert: 0xb8955e, jungle: 0x6c6a5a, city: 0x6f767d, tundra: 0x8fa2b4, canyon: 0x8a5a40, volcano: 0x3e3230 }[L.landmark]), roofMat = dbl(0x55524c), deckMat = dbl(0x8a8d90), railMat = dbl(0xd0d3d6);
    for (const q of specials) {
      if (q.kind === 'tunnel') {
        for (const sd of [-1, 1]) wallStrip(q.s0, q.s1, sd * (ROAD_W / 2 + 0.6), -0.3, TUN_H, tunnelMat);
        { // the ridge the tunnel cuts through: sloping flanks from the roof down to the ground, with closed ends
          const hillMat = dbl(new THREE.Color(L.ground).multiplyScalar(0.92).getHex()), pos = [], W0 = ROAD_W / 2 + 0.7, W1 = ROAD_W / 2 + 85, top = TUN_H + 4;
          const P3 = (sv, lat, y) => { const p = lerpC(sv).add(lerpN(sv).multiplyScalar(lat)); return [p.x, y === null ? groundAt(p) - 1.5 : Hs(sv) + y, p.y]; };
          const quad = (a, b, c, d) => pos.push(...a, ...b, ...c, ...c, ...b, ...d);
          for (let sv = q.s0; sv < q.s1 - 1e-6; sv += 0.5) {
            const sb = Math.min(q.s1, sv + 0.5);
            for (const sd of [-1, 1]) quad(P3(sv, sd * W0, top), P3(sb, sd * W0, top), P3(sv, sd * W1, null), P3(sb, sd * W1, null));
            quad(P3(sv, -W0, top), P3(sb, -W0, top), P3(sv, W0, top), P3(sb, W0, top));
          }
          for (const sv of [q.s0, q.s1]) for (const sd of [-1, 1]) pos.push(...P3(sv, sd * W0, top), ...P3(sv, sd * W0, -1), ...P3(sv, sd * W1, null));
          const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
          const m = new THREE.Mesh(g, hillMat); m.receiveShadow = true; scene.add(m);
        }
        ribbon({ pts: main, i0: q.s0, i1: q.s1 }, -ROAD_W / 2 - 0.8, ROAD_W / 2 + 0.8, TUN_H, [roofMat]);
        for (let sv = q.s0 + 0.25; sv < q.s1; sv += 0.5) for (const lat of [-ROAD_W / 4, ROAD_W / 4]) {
          const p = at({ pts: main }, sv, lat), lamp = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 2.6), GLOW(0xfff2c8, 2.6)); lamp.position.set(p.x, Hs(sv) + TUN_H - 0.3, p.y); lamp.rotation.y = -Math.atan2(T[Math.floor(sv)].y, T[Math.floor(sv)].x); scene.add(lamp);
          // a strip light low on each wall keeps the road lit under the high roof
          const w = at({ pts: main }, sv, Math.sign(lat) * (ROAD_W / 2 + 0.3)), wl = new THREE.Mesh(new THREE.BoxGeometry(5, 0.5, 0.3), GLOW(0xffd9a0, 2.2)); wl.position.set(w.x, Hs(sv) + 6.5, w.y); wl.rotation.y = lamp.rotation.y; scene.add(wl);
        }
        for (const sv of [q.s0, q.s1]) { // portal arches
          const i = Math.min(STEPS - 1, Math.floor(sv)), ang = -Math.atan2(T[i].y, T[i].x), h = Hs(sv), g = new THREE.Group();
          for (const sd of [-1, 1]) { const pl = new THREE.Mesh(new THREE.BoxGeometry(3, TUN_H + 6, 4), lam(0x5a5650)); pl.position.set(0, (TUN_H + 6) / 2, sd * (ROAD_W / 2 + 2.4)); g.add(pl); }
          const lin = new THREE.Mesh(new THREE.BoxGeometry(3, 4, ROAD_W + 9), lam(0x5a5650)); lin.position.y = TUN_H + 3; g.add(lin);
          const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.8, ROAD_W + 9.2), stripeY); stripe.position.y = TUN_H + 0.6; g.add(stripe);
          const p = at({ pts: main }, sv, 0); g.position.set(p.x, h, p.y); g.rotation.y = ang; scene.add(g);
        }
      } else {
        for (const sd of [-1, 1]) {
          wallStrip(q.s0 - 1, q.s1 + 1, sd * (ROAD_W / 2 + 0.4), 0, 1.3, railMat);
          wallStrip(q.s0 - 1, q.s1 + 1, sd * (ROAD_W / 2 + 0.8), -2.4, 0.15, deckMat);
        }
        ribbon({ pts: main, i0: Math.max(0, q.s0 - 1), i1: Math.min(STEPS, q.s1 + 1) }, -ROAD_W / 2 - 0.8, ROAD_W / 2 + 0.8, -2.4, [deckMat]);
        for (let sv = q.s0 - 0.5; sv <= q.s1 + 0.5; sv += 1.2) for (const lat of [-ROAD_W / 2 + 6, ROAD_W / 2 - 6]) {
          const p = at({ pts: main }, sv, lat), top = Hs(sv) - 2.4, bot = groundAt(p) - 1;
          if (top - bot < 2) continue;
          const pl = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.0, top - bot, 10), concrete); pl.position.set(p.x, (top + bot) / 2, p.y); pl.castShadow = true; scene.add(pl);
        }
        for (let sv = q.s0 - 1; sv <= q.s1 + 1; sv += 0.5) for (const sd of [-1, 1]) {
          const p = at({ pts: main }, sv, sd * (ROAD_W / 2 + 0.4)), post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 0.3), lam(0x9a9da0)); post.position.set(p.x, Hs(sv) + 0.8, p.y); scene.add(post);
        }
        // something to look down at: a river, ice or lava far below
        const below = { desert: null, jungle: 0x2f7fc0, city: 0x2b6a86, tundra: 0xcdeefa, canyon: 0x3a8fa0, volcano: 'lava' }[L.landmark];
        if (below) ribbon({ pts: main, i0: Math.max(0, q.s0 - 1), i1: Math.min(STEPS, q.s1 + 1) }, q.fork ? -28 : -55, q.fork ? 28 : 55, -q.depth + 1.5, [below === 'lava' ? lavaMat : new THREE.MeshLambertMaterial({ color: below, transparent: true, opacity: 0.85, side: THREE.DoubleSide })]);
      }
    }

    // ---- landmarks ----
    function spotAway(minD, maxD) {
      for (let t = 0; t < 40; t++) {
        const i = 4 + Math.floor(R() * (STEPS - 8)), p = C[i].clone().add(N[i].clone().multiplyScalar((R() < 0.5 ? -1 : 1) * (minD + R() * (maxD - minD))));
        if (nearestRoad(p, 2).dist > minD * 0.8) return p;
      }
      return null;
    }
    function place(mesh, p, r) { mesh.position.x = p.x; mesh.position.z = p.y; mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh); if (r) addObstacle({ p, r, mesh, breakable: false }); }
    function archOver(i, color) {
      const a = C[i], side = N[i], h = H[i];
      for (const s of [-1, 1]) { const p = a.clone().add(side.clone().multiplyScalar(s * (ROAD_W / 2 + 3))); const pil = new THREE.Mesh(new THREE.BoxGeometry(3.4, 44, 3.4), lam(color)); pil.position.y = h + 22; place(pil, p, 2); }
      const top = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.4, ROAD_W + 11), lam(color));
      top.position.set(a.x, h + 45.5, a.y); top.rotation.y = -Math.atan2(T[i].y, T[i].x); top.castShadow = true; scene.add(top);
    }
    // a mountain in the middle of every big bend - the road wraps around it
    for (const b of bends) {
      const mid = Math.floor((b.i0 + b.i1) / 2), ang = Math.abs(b.turn), len = b.i1 - b.i0, rad = len * SEG / ang;
      const ctr = C[mid].clone().add(N[mid].clone().multiplyScalar(Math.sign(b.turn) * rad));
      const clear = nearestRoad(ctr, 3).dist;
      const base = Math.min(rad, clear) - ROAD_W / 2 - 40;
      if (base < 30) continue;
      const h0 = Hs(mid), height = base * (L.landmark === 'canyon' ? 0.9 : 1.3);
      const geo = L.landmark === 'canyon' ? new THREE.CylinderGeometry(base * 0.75, base, height, 9) : new THREE.ConeGeometry(base, height, 9);
      const m = new THREE.Mesh(geo, lam(L.mount)); m.position.set(ctr.x, h0 - 6 + height / 2, ctr.y); m.rotation.y = R() * 6; m.castShadow = true; scene.add(m);
      addObstacle({ p: ctr.clone(), r: base * 0.92, mesh: null, breakable: false });
      if (L.landmark === 'tundra' || L.landmark === 'desert' && R() < 0.3) { const cap = new THREE.Mesh(new THREE.ConeGeometry(base * 0.42, height * 0.42, 9), lam(0xffffff)); cap.position.set(ctr.x, h0 - 6 + height * 0.79, ctr.y); cap.rotation.y = m.rotation.y; scene.add(cap); }
      if (L.landmark === 'volcano') { const glow = new THREE.Mesh(new THREE.CylinderGeometry(base * 0.15, base * 0.2, 3, 9), GLOW(0xff7a2a, 2.6)); glow.position.set(ctr.x, h0 - 6 + height - 1, ctr.y); scene.add(glow); }
      if (L.landmark === 'jungle') for (let q = 0; q < 12; q++) { const a2 = R() * 6.28, rr = base * (0.5 + R() * 0.45); tallRaw(V2(ctr.x + Math.cos(a2) * rr, ctr.y + Math.sin(a2) * rr), h0 - 6 + height * (1 - rr / base), 2 + R()); }
      if (L.landmark === 'city') for (let q = 0; q < 6; q++) { const a2 = R() * 6.28, rr = base * R() * 0.5, hh = 20 + R() * 50; const bld = new THREE.Mesh(new THREE.BoxGeometry(10, hh, 10), lam(0x8d9399)); bld.position.set(ctr.x + Math.cos(a2) * rr, h0 - 6 + height * (1 - rr / base) + hh / 2 - 4, ctr.y + Math.sin(a2) * rr); scene.add(bld); }
    }
    function tallRaw(p, y, scale) { // decorative tree on a mountainside (not an obstacle)
      const t = new THREE.Mesh(new THREE.ConeGeometry(2 * scale, 6 * scale, 7), lam(L.tall)); t.position.set(p.x, y + 3 * scale, p.y); scene.add(t);
    }
    const LM = L.landmark;
    const archIdx = [14, 60, 100, 160].filter(i => !inFork(i, 1) && !inSpecial(i, 2));
    if (LM === 'desert') {
      for (let n = 0; n < 7; n++) { const p = spotAway(110, 340); if (!p) continue; const s = 30 + R() * 40;
        const m = new THREE.Mesh(new THREE.ConeGeometry(s, s * 1.1, 4), lam(0xe0bd74)); m.position.y = heightAt(p) + s * 0.5; m.rotation.y = R(); place(m, p); }
      for (let n = 0; n < 10; n++) { const p = spotAway(30, 120); if (!p) continue; // bleached bones
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 4, 6), lam(0xf2ead8)); b.rotation.z = Math.PI / 2; b.position.y = heightAt(p) + 0.3; b.rotation.y = R() * 3; place(b, p);
        for (let q = 0; q < 4; q++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.1, 4, 8, Math.PI), lam(0xf2ead8)); rib.position.set(p.x - 1.2 + q * 0.8, heightAt(p) + 0.3, p.y); rib.rotation.y = Math.PI / 2; scene.add(rib); } }
      archIdx.forEach(i => archOver(i, 0xc49a5a));
    } else if (LM === 'jungle') {
      for (let n = 0; n < 5; n++) { const p = spotAway(80, 240); if (!p) continue; const h0 = heightAt(p);
        for (let k = 0; k < 5; k++) { const s = 32 - k * 5.5; const st = new THREE.Mesh(new THREE.BoxGeometry(s, 5, s), lam(k % 2 ? 0x8a8668 : 0x7d7a62)); st.position.y = h0 + 2.5 + k * 5; place(st, p); } }
      for (let i = 16; i < STEPS - 3; i++) { if (R() < 0.55) continue;
        for (const s of [-1, 1]) { const p = C[i].clone().add(N[i].clone().multiplyScalar(s * (ROAD_W / 2 + 32 + R() * 10))); if (nearestRoad(p).dist > ROAD_W * 0.8) tall(p, 1.5 + R() * 0.9, true); } }
      archIdx.forEach(i => archOver(i, 0x5d6b4a));
    } else if (LM === 'city') {
      for (let n = 0; n < 90; n++) { const p = spotAway(30, 280); if (!p) continue; const h = 15 + R() * 60, w = 9 + R() * 12, gy = heightAt(p);
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), lam(R() < 0.5 ? 0x8d9399 : 0x6f767d)); m.position.y = gy + h / 2 - 3; m.rotation.y = R() * 0.3; place(m, p, w * 0.7);
        for (let f = 6; f < h - 4; f += 6) if (R() < 0.7) { const win = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 1.4, w * 0.6), GLOW(R() < 0.7 ? 0xf6e7a1 : 0x9ad1ff, 1.5)); win.position.set(p.x, gy + f - 3, p.y); win.rotation.y = m.rotation.y; scene.add(win); } }
      archIdx.forEach(i => archOver(i, 0x5f6670));
    } else if (LM === 'tundra') {
      for (let n = 0; n < 40; n++) { const p = spotAway(30, 280); if (!p) continue; const h = 12 + R() * 34;
        const m = new THREE.Mesh(new THREE.ConeGeometry(3 + R() * 5, h, 5), new THREE.MeshLambertMaterial({ color: 0x9fd8f0, transparent: true, opacity: 0.88 })); m.position.y = heightAt(p) + h / 2; place(m, p, 3.5); }
      archIdx.forEach(i => archOver(i, 0xbfe6f7));
    } else if (LM === 'canyon') {
      for (let i = 0; i < STEPS; i += 2) for (const s of [-1, 1]) {
        let off = 2 * ENTRY_SP * entryOff(i); for (const f of forks) if (i > f.i0 && i < f.i1) off = Math.max(off, s === f.inner ? 72 : f.B ? 92 : 0);
        const p = C[i].clone().add(N[i].clone().multiplyScalar(s * (off + ROAD_W / 2 + 45 + R() * 25))), h = 35 + R() * 45, w = 30 + R() * 20;
        if (nearestRoad(p, 2).dist < ROAD_W / 2 + 30) continue;
        const m = new THREE.Mesh(new THREE.BoxGeometry(SEG * 2.4, h, w), lam(R() < 0.5 ? 0x9a6448 : 0xaa7656)); m.position.y = H[i] + h / 2 - 2; m.rotation.y = -Math.atan2(T[i].y, T[i].x); place(m, p);
      }
      archIdx.forEach(i => archOver(i, 0x8a5a40));
    } else if (LM === 'volcano') {
      const p = V2(bcx + (R() - 0.5) * 200, bcz + (R() < 0.5 ? -1 : 1) * (brad + 380));
      const v = new THREE.Mesh(new THREE.ConeGeometry(220, 200, 18, 1, true), lam(0x4a3530)); v.position.set(p.x, Hs(STEPS / 2) + 70, p.y); scene.add(v);
      const glow = new THREE.Mesh(new THREE.CylinderGeometry(34, 44, 8, 18), GLOW(0xff7a2a, 2.6)); glow.position.set(p.x, Hs(STEPS / 2) + 170, p.y); scene.add(glow);
      for (let n = 0; n < 18; n++) { const q = spotAway(ROAD_W + 6, 150); if (q) addZone('lava', q, 9 + R() * 16); }
      archIdx.forEach(i => archOver(i, 0x2a1e1c));
    }

    // ================= SCATTER DETAIL, CROWDS, CLOUDS, MOUNTAINS (instanced) =================
    const tcol = new THREE.Color();
    function scatter(geo, basic, count, colors, sMin, sMax, flat, yOff, gap, wind) {
      const mat = basic ? new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(HQ() ? 2.2 : 1) }) : mk(0xffffff);
      if (wind && HQ()) mat.onBeforeCompile = sh => {
        sh.uniforms.uTime = timeU;
        sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>',
          '#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat wph = instanceMatrix[3].x * 0.15 + instanceMatrix[3].z * 0.11;\nfloat wk = max(position.y + 0.4, 0.0);\n' +
          'transformed.x += sin(uTime * 1.8 + wph) * 0.22 * wk; transformed.z += cos(uTime * 1.3 + wph) * 0.12 * wk;\n#endif');
      };
      const im = new THREE.InstancedMesh(geo, mat, count);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), eu = new THREE.Euler();
      let n = 0, tries = 0;
      while (n < count && tries++ < count * 5) {
        const i = Math.floor(R() * STEPS), p = C[i].clone().lerp(C[i + 1], R()).add(N[i].clone().multiplyScalar((R() - 0.5) * 2 * (ROAD_W / 2 + 200)));
        const nr = nearestRoad(p, 2);
        if (nr.dist < ROAD_W / 2 + (gap === undefined ? 3 : gap)) continue;
        const sz = sMin + R() * (sMax - sMin);
        eu.set(0, R() * 6.28, 0); q.setFromEuler(eu); sc.set(sz, sz * flat * (0.7 + R() * 0.6), sz);
        ps.set(p.x, groundAt(p, nr) + yOff * sz, p.y); m4.compose(ps, q, sc);
        im.setMatrixAt(n, m4); im.setColorAt(n, tcol.set(pick(colors))); n++;
      }
      im.count = n; im.userData.dyn = true; im.receiveShadow = !basic; scene.add(im);
    }
    const ico = r => new THREE.IcosahedronGeometry(r, 0), dod = r => new THREE.DodecahedronGeometry(r, 0);
    ({
      desert: () => { scatter(ico(0.7), false, 1600, [0x8f8a4a, 0x7a7040, 0xa09a5a], 0.6, 1.6, 0.8, 0.3, 3, true); scatter(dod(0.35), false, 2200, [0xb59a70, 0x9c8460, 0xc9b08a], 0.6, 1.8, 0.5, 0.1); },
      jungle: () => { scatter(new THREE.ConeGeometry(0.6, 1.6, 5), false, 2800, [0x3f8a3a, 0x2f6b2f, 0x5aa04a], 0.8, 2.2, 1, 0.5, 3, true); scatter(ico(0.3), false, 1100, [0xff5d8f, 0xffd23f, 0xffffff, 0xc77dff], 0.6, 1.2, 1, 0.4, 3, true); },
      city: () => { scatter(new THREE.BoxGeometry(1, 0.4, 1), false, 1000, [0x6b5a4a, 0x8a8a8a, 0x4a4a4a], 0.8, 3, 1, 0.1, 2); scatter(new THREE.CylinderGeometry(0.5, 0.5, 1, 8), false, 450, [0xc0392b, 0x2e86de, 0xf1c40f], 0.8, 1.3, 1, 0.3, 2); },
      tundra: () => { scatter(ico(0.8), false, 1800, [0xffffff, 0xf0f6fa, 0xe4eef6], 0.7, 2.2, 0.45, 0.1); scatter(dod(0.4), false, 1000, [0x8fa2b4, 0x6f8294], 0.6, 1.6, 0.6, 0.1); },
      canyon: () => { scatter(ico(0.6), false, 1200, [0x7a7a40, 0x8a8a50, 0x6a6a38], 0.6, 1.5, 0.8, 0.3, 3, true); scatter(dod(0.4), false, 2400, [0x9a6448, 0x7a4a32, 0xaa7656], 0.6, 1.8, 0.6, 0.1); },
      volcano: () => { scatter(dod(0.4), false, 2400, [0x2a2220, 0x3a302c, 0x4a3a34], 0.6, 2, 0.6, 0.1); scatter(ico(0.3), true, 800, [0xff7a2a, 0xffb347, 0xff5a14], 0.6, 1.4, 0.6, 0.1); }
    })[LM]();
    // swaying grass blades near the road
    if (HQ()) {
      const blade = new THREE.ConeGeometry(0.12, 1.1, 3); blade.translate(0, 0.55, 0);
      const GR = { desert: [0xc9b46a, 0xb8a05a, 0xa89048], jungle: [0x4caf50, 0x3f8a3a, 0x6abf4a], canyon: [0xa89048, 0x8a8a50], tundra: [0xdfe9ef, 0xc9d6de], volcano: [0x5a4a3a, 0x6a5040] }[LM];
      if (GR) scatter(blade, false, LM === 'jungle' ? 9000 : 6000, GR, 0.7, 1.6, 1, 0, 1.5, true);
    }
    // spectators at the start and the finish
    (function () {
      const body = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 1.1, 0.5), new THREE.MeshLambertMaterial({ color: 0xffffff }), 520);
      const head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshLambertMaterial({ color: 0xffffff }), 520);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), ps = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), eu = new THREE.Euler();
      const skins = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac], shirts = [0xe63946, 0x1d4ed8, 0xffd23f, 0x2a9d8f, 0xf4a261, 0x9b5de5, 0xffffff];
      let n = 0;
      for (const [i0, i1] of [[3, 15], [STEPS - 6, STEPS]]) for (let k = 0; k < 130 && n < 520; k++) for (const s of [-1, 1]) {
        const i = i0 + Math.floor(R() * (i1 - i0)), d = ROAD_W / 2 + 5 + R() * 9;
        const p = C[i].clone().lerp(C[Math.min(STEPS, i + 1)], R()).add(N[i].clone().multiplyScalar(s * d)), y = groundAt(p) + (d - ROAD_W / 2 - 5) * 0.25;
        eu.set(0, -Math.atan2(N[i].y, N[i].x) * s, 0); q.setFromEuler(eu);
        ps.set(p.x, y + 0.55, p.y); m4.compose(ps, q, one); body.setMatrixAt(n, m4); body.setColorAt(n, tcol.set(pick(shirts)));
        ps.set(p.x, y + 1.4, p.y); m4.compose(ps, q, one); head.setMatrixAt(n, m4); head.setColorAt(n, tcol.set(pick(skins)));
        n++;
      }
      body.count = head.count = n; body.userData.dyn = head.userData.dyn = true; scene.add(body, head);
    })();
    // clouds
    (function () {
      const cm = new THREE.MeshBasicMaterial({ color: LM === 'volcano' ? 0x5a4a48 : 0xffffff, fog: false, transparent: true, opacity: 0.92 });
      const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), cm, 220);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
      let n = 0;
      for (let c = 0; c < 55; c++) {
        const cx = bcx + (R() - 0.5) * (brad * 2 + 1400), cz = bcz + (R() - 0.5) * (brad * 2 + 1400), cy = 220 + R() * 100;
        for (let k = 0; k < 4; k++) { const sz = 18 + R() * 26; ps.set(cx + (R() - 0.5) * 60, cy + R() * 10, cz + (R() - 0.5) * 40); sc.set(sz * 1.4, sz * 0.45, sz); m4.compose(ps, q, sc); im.setMatrixAt(n++, m4); }
      }
      im.userData.dyn = true; scene.add(im);
    })();
    // distant mountain ring
    (function () {
      const col = new THREE.Color(L.fog).lerp(new THREE.Color(L.ground), 0.35).multiplyScalar(0.85);
      const im = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7), new THREE.MeshBasicMaterial({ color: col, fog: false }), 80);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
      for (let n = 0; n < 80; n++) {
        const a = n / 80 * Math.PI * 2, rr = brad + 900 + R() * 300, h = 140 + R() * 260, r = 140 + R() * 200;
        ps.set(bcx + Math.cos(a) * rr, Hs(STEPS / 2) + h / 2 - 40, bcz + Math.sin(a) * rr); sc.set(r, h, r); m4.compose(ps, q, sc); im.setMatrixAt(n, m4);
        im.setColorAt(n, tcol.copy(col).multiplyScalar(0.85 + R() * 0.25));
      }
      im.userData.dyn = true; scene.add(im);
    })();
    // start gantry with countdown lights
    const lightMats = [];
    (function () {
      const i = 11, a = C[i], h = H[i];
      const g = new THREE.Group(); g.userData.dyn = true;
      const span = ENTRY_SP * 2 * entryOff(i) + ROAD_W / 2 + 2;   // one gantry across all five starting roads, with posts between them
      for (const lane of ENTRY_OFF.concat([-2.5, -1.5, -0.5, 0.5, 1.5, 2.5])) {
        if (lane % 1 === 0) continue;
        const z = Math.max(-span, Math.min(span, lane * ENTRY_SP * entryOff(i)));
        const p = new THREE.Mesh(new THREE.BoxGeometry(1.4, 13, 1.4), lam(0x2b2d42)); p.position.set(0, 6.5, z); p.castShadow = true; g.add(p);
        addObstacle({ p: a.clone().add(N[i].clone().multiplyScalar(z)), r: 1.2, mesh: null, breakable: false });
      }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.6, span * 2 + 2), lam(0x2b2d42)); beam.position.y = 13; g.add(beam);
      for (let k = 0; k < 5; k++) { const m = new THREE.MeshBasicMaterial({ color: 0x331111 }); lightMats.push(m);
        for (const lane of ENTRY_OFF) { const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 8), m); bulb.position.set(-0.9, 13, lane * ENTRY_SP * entryOff(i) + (k - 2) * 3); g.add(bulb); } }
      g.position.set(a.x, h, a.y); g.rotation.y = -Math.atan2(T[i].y, T[i].x); scene.add(g);
    })();
    // coins: over ramps and drops, along the risky routes, and in lines on the road
    const coinSpots = [];
    for (const di of drops) { const i = di - 1; for (let k = 1; k <= 6; k++) { const q = C[i].clone().add(T[i].clone().multiplyScalar(6 + k * 5)); coinSpots.push([q.x, H[i] - k * k * 0.25 + 3, q.y]); } }
    for (const r of ramps) for (let k = 1; k <= 6; k++) { const q = r.p.clone().add(r.dir.clone().multiplyScalar(4 + k * 5)); coinSpots.push([q.x, Hs(nearestRoad(r.p).s) + 2 + 5 * Math.sin(Math.PI * k / 7), q.y]); }
    for (const f of forks) for (const route of [f.A, f.B]) if (route) for (let s = f.i0 + 4; s < f.i1 - 3; s += 3) { const q = at(route, s, (R() - 0.5) * ROAD_W * 0.6); coinSpots.push([q.x, Hs(s) + 1.4, q.y]); }
    for (let n = 0; n < 12; n++) { const i = 16 + Math.floor(R() * (STEPS - 22)), lat = (R() - 0.5) * ROAD_W * 0.8;
      for (let k = 0; k < 5; k++) { const q = at({ pts: main }, i + k * 0.18, lat); if (pits.some(c => c.c.distanceTo(q) < c.r + 2)) continue; coinSpots.push([q.x, Hs(i + k * 0.18) + 1.4, q.y]); } }
    const coinGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.16, 14); coinGeo.rotateX(Math.PI / 2);
    const coinMesh = new THREE.InstancedMesh(coinGeo, GLOW(0xffd23f, 1.6), Math.max(1, coinSpots.length));
    const coins = coinSpots.map(([x, y, z], i) => ({ x, y, z, i, got: false }));
    const cm4 = new THREE.Matrix4(), cq = new THREE.Quaternion(), cv = new THREE.Vector3(), cs = new THREE.Vector3(), ce = new THREE.Euler();
    function setCoin(c, ang) { ce.set(0, ang, 0); cq.setFromEuler(ce); cv.set(c.x, c.y, c.z); cs.setScalar(c.got ? 0 : 1); cm4.compose(cv, cq, cs); coinMesh.setMatrixAt(c.i, cm4); }
    coins.forEach(c => setCoin(c, R() * 6));
    coinMesh.count = coins.length; coinMesh.userData.dyn = true; coinMesh.frustumCulled = false; scene.add(coinMesh);

    // ================= MERGE STATIC SCENERY (performance) =================
    function mergeGeos(geos) {
      let n = 0; for (const g of geos) n += g.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
      for (const g of geos) {
        if (!g.attributes.normal) g.computeVertexNormals();
        pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
        if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
        o += g.attributes.position.count; g.dispose();
      }
      const out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      out.computeBoundingSphere(); return out;
    }
    const prep = (geo, m4) => { const g = geo.index ? geo.toNonIndexed() : geo.clone(); if (m4) g.applyMatrix4(m4); return g; };
    (function mergeStatics() {
      scene.updateMatrixWorld(true);
      const groups = new Map(), remove = [];
      scene.traverse(o => {
        if (!o.isMesh || o.userData.ground || o === sky || o.isInstancedMesh) return;
        for (let p = o; p; p = p.parent) if (p.userData && p.userData.dyn) return;
        const m = o.material; if (Array.isArray(m) || !m.color) return;
        const key = m.type + '|' + m.color.getHex() + '|' + (m.transparent ? m.opacity : 1) + '|' + (m.map ? m.map.uuid : '');
        let g = groups.get(key); if (!g) { g = { mat: m, geos: [], cast: false }; groups.set(key, g); }
        g.geos.push(prep(o.geometry, o.matrixWorld)); g.cast = g.cast || o.castShadow; remove.push(o);
      });
      const keep = new Set([...groups.values()].map(g => g.mat));
      for (const o of remove) { o.parent.remove(o); o.geometry.dispose(); if (!keep.has(o.material)) o.material.dispose(); }
      for (const g of groups.values()) { const mesh = new THREE.Mesh(mergeGeos(g.geos), g.mat); mesh.castShadow = g.cast; mesh.receiveShadow = true; scene.add(mesh); }
    })();

    // ================= RACERS (20 models) =================
    const glassMat = HQ() ? new THREE.MeshStandardMaterial({ color: 0x1c2c3c, roughness: 0.1, metalness: 0.6 }) : new THREE.MeshLambertMaterial({ color: 0x223344 }), darkMat = mk(0x1e1e1e);
    const tireMat = mk(0x161616), rimMat = mk(0xcfcfcf);
    const lightMat = mk(0xf2ead8);
    const secCache = {}, secMat = hex => secCache[hex] || (secCache[hex] = mk(hex));
    const outlineMat = new THREE.MeshBasicMaterial({ color: 0x15110e, side: THREE.BackSide });
    outlineMat.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize(normal) * 0.055;'); };
    function makeCar(modelName, color, isPlayer, size0) {
      const Mo = Models.get(modelName), size = size0 || (Models.BODY[modelName] || {}).size || 1;
      const g = new THREE.Group(); g.userData.dyn = true; g.userData.size = size;
      const body = new THREE.Group(); body.rotation.order = 'YZX'; body.scale.setScalar(size); g.add(body);
      const rig = new THREE.Group(); body.add(rig);
      const paint = mk(color);
      const detail = new THREE.Group(); rig.add(detail);
      const slot = { paint, second: secMat(Mo.second), dark: darkMat, glass: glassMat, light: lightMat };
      for (const k in Mo.geos) {
        const mesh = new THREE.Mesh(Mo.geos[k], slot[k]);
        if (k === 'paint' || k === 'second') { mesh.castShadow = k === 'paint'; rig.add(mesh); if (HQ()) detail.add(new THREE.Mesh(Mo.geos[k], outlineMat)); } else detail.add(mesh);
      }
      const legs = Mo.legs.map(l => { const pv = new THREE.Group(); pv.position.set(l.x, l.hip, l.z); pv.add(new THREE.Mesh(l.geo, slot[l.slot])); detail.add(pv); return { pivot: pv, phase: l.phase }; });
      const wheels = Mo.wheels.map(w => { const pv = new THREE.Group(); pv.position.set(w.x, w.r, w.z); pv.add(new THREE.Mesh(w.tire, tireMat), new THREE.Mesh(w.rim, rimMat)); detail.add(pv); return { pivot: pv, front: w.front, r: w.r }; });
      const wings = [];
      if (Mo.wing) for (const sd of [1, -1]) { const pv = new THREE.Group(); pv.position.set(-0.2, 2.5, sd * 0.35); pv.rotation.y = sd > 0 ? 0 : Math.PI; pv.add(new THREE.Mesh(Mo.wing, slot.second)); rig.add(pv); wings.push({ pivot: pv, sd }); }
      if (isPlayer) addMarker(g, 0xff2a2a, false);
      Object.assign(g.userData, { body, rig, wheels, legs, wings, paint, detail, model: Mo });
      scene.add(g); return g;
    }
    function addMarker(g, color, beam) {
      const marker = new THREE.Mesh(new THREE.OctahedronGeometry(beam ? 0.9 : 0.6, 0), new THREE.MeshBasicMaterial({ color }));
      marker.position.y = (beam ? 5.4 : 4.6) * (g.userData.size || 1); marker.scale.y = 1.6; g.add(marker); g.userData.marker = marker;
      if (beam) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 60, 6, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false })); b.position.y = 35; g.add(b); g.userData.beam = b; }
    }
    function setStats(c, st, model) {
      Object.assign(c, Stats.derive(st, model)); c.st = st; c.model = model; c.sh = c.shMax; c.shT = -9;
      c.r = CAR_R * c.size; c.ability = Stats.ABIL[model]; c.abCd = c.abCd || 0; c.abT = 0; c.shieldT = 0;
    }
    function applyBody(c, model, sk) {
      const b = Models.BODY[model] || Models.BODY["Sports car"];
      c.pass = null; setStats(c, Stats.rival(model, P.rivalG, sk), model); c.hp = c.maxHp; c.abCd = 2 + R() * 6;
    }
    function remodel(c, model, color) { scene.remove(c.mesh); applyBody(c, model, c.sk); c.mesh = makeCar(model, color, false, c.size); }
    const cars = [];
    const pModel = Models.get(P.playerModel);
    const player = { isPlayer: true, name: 'You', airTime: 0, coins: 0, shortcuts: 0, pass: null, wings: !!P.wings };
    setStats(player, P.stats, P.playerModel); player.hp = Math.min(player.maxHp, P.playerHP);
    player.mesh = makeCar(P.playerModel, pModel.palette[0], true, player.size);
    if (player.wings && !pModel.wing) {   // the Wings upgrade bolts a pair of wings onto any ride
      const wg = new THREE.BoxGeometry(0.15, 0.08, 3.2).translate(0, 0, 1.7), wm = mk(0xf2ead8);
      for (const sd of [1, -1]) { const pv = new THREE.Group(); pv.position.set(-0.2, 1.9, sd * 0.4); pv.rotation.y = sd > 0 ? 0 : Math.PI; pv.add(new THREE.Mesh(wg, wm)); player.mesh.userData.rig.add(pv); player.mesh.userData.wings.push({ pivot: pv, sd }); }
    }
    { const sh = new THREE.Mesh(new THREE.SphereGeometry(2.6, 20, 14), new THREE.MeshBasicMaterial({ color: 0xc49bff, transparent: true, opacity: 0.28, depthWrite: false })); sh.position.y = 1.4; sh.visible = false; player.mesh.userData.body.add(sh); player.mesh.userData.shield = sh; }
    for (let i = 0; i < P.nRivals; i++) {
      const sk = 0.88 + R() * 0.24, model = pick(Models.NAMES), Mo = Models.get(model);
      const routes = forks.map(f => { const r = R(); return f.B ? (r < 0.5 ? 0 : r < 0.78 ? 1 : 2) : (r < 0.58 ? 0 : 1); });
      const rc = { isPlayer: false, sk, laneOff: (R() - 0.5) * ROAD_W * 0.7, routes };
      applyBody(rc, model, sk); rc.mesh = makeCar(model, pick(Mo.palette), false, rc.size); cars.push(rc);
    }
    cars.sort((a, b) => b.top - a.top);
    const slot = Math.max(0, Math.min(cars.length, P.gridSlot));
    cars.splice(slot, 0, player);
    let target = null;
    const hunters = [];
    const rivalsOnly = cars.filter(c => !c.isPlayer);
    if (rivalsOnly.length) {
      const ts = P.targetStr || 1;
      target = rivalsOnly[Math.floor(R() * Math.min(rivalsOnly.length, Math.max(3, rivalsOnly.length * 0.6)))];
      target.isTarget = true; target.name = P.targetName || 'Target';
      const tm = P.targetModel || target.model;
      remodel(target, tm, new THREE.Color(pick(Models.get(tm).palette)).lerp(new THREE.Color(0xffd166), 0.55).getHex());
      target.top *= Math.pow(ts, 0.25); target.off *= Math.pow(ts, 0.25); target.hp = target.maxHp = target.maxHp * ts;
      addMarker(target.mesh, 0xffc300, true);
      const names = P.hunterNames || [], models = P.hunterModels || [];
      const pool = cars.slice(slot + 1, slot + 16).filter(c => !c.isTarget).concat(rivalsOnly.filter(c => !c.isTarget));
      for (let k = 0; k < names.length && k < pool.length; k++) {
        const h = pool[k]; if (h.isHunter) continue;
        h.isHunter = true; h.name = names[k];
        const hm = models[k] || h.model;
        remodel(h, hm, P.hunterKnown ? new THREE.Color(pick(Models.get(hm).palette)).lerp(new THREE.Color(0x9d4edd), 0.55).getHex() : pick(Models.get(hm).palette));
        h.top *= 1.06;
        if (P.hunterKnown) addMarker(h.mesh, 0xc77dff, true);
        hunters.push(h);
      }
    }
    // ================= BOSS: a giant racer that starts ahead. If it finishes before you, your run ends. =================
    let boss = null, bossDmg = 0, bossBeatYou = false, bossT = 0;
    if (P.boss) {
      const B = P.boss;
      boss = { isPlayer: false, isBoss: true, kind: B.kind, sk: 1, laneOff: 0, routes: forks.map(() => 0), name: B.name, pass: 'boss' };
      setStats(boss, B.stats, B.model); boss.hp = boss.maxHp; boss.size = B.size; boss.r = CAR_R * B.size * 0.85; boss.mass = 60;
      boss.mesh = makeCar(B.model, B.color, false, B.size); addMarker(boss.mesh, 0xff3355, true);
      cars.push(boss);
    }
    // ================= WEAPONS (v16) =================
    const Wp = Weapons.attach({ scene, cars, player, order: () => order, hurt, emit, burst, R, time: () => raceTime, down, nearPlayer: c => nearPlayer(c), ROAD_W });
    for (const c of cars) Wp.setup(c, c.isPlayer ? P.weapons : c.isBoss ? P.boss.weapons : Weapons.aiLoadout(P.rivalPicks || 0, R));
    // soft contact shadows under every nearby racer (one draw call for all of them)
    const blobs = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: blobTex, color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), cars.length);
    blobs.userData.dyn = true; blobs.frustumCulled = false; scene.add(blobs);
    const bm4 = new THREE.Matrix4(), bq = new THREE.Quaternion(), bv = new THREE.Vector3(), bs3 = new THREE.Vector3(), be = new THREE.Euler();
    const PER_ROW = 4, LANES = entries.length;
    cars.forEach((c, i) => {
      // round-robin over the five starting roads, so each road gets a mix of the grid
      const lane = i % LANES, j = Math.floor(i / LANES), row = Math.floor(j / PER_ROW), col = j % PER_ROW;
      c.entry = lane;
      c.s = 9 - row * 7.5 / SEG; c.si = Math.floor(c.s);
      c.pos = at(entries[lane], Math.max(0, c.s), (col - (PER_ROW - 1) / 2) * 8.5 + (row % 2) * 2);
      c.rot = Math.atan2(T[0].y, T[0].x); c.speed = 0; c.vel = V2(0, 0); c.y = H[0]; c.vy = 0; c.air = false;
      c.finished = false; c.crashed = false; c.falling = false; c.destroyed = false; c.damage = 0; c.zone = null; c.pitch = 0; c.steerIn = 0;
      c.lastHitBy = null; c.lastHitTime = -9; c.boostT = 0;
    });
    if (boss) { boss.entry = 2; boss.s = 8.2; boss.si = Math.floor(boss.s); boss.pos = at({ pts: main }, boss.s, 0); boss.rot = Math.atan2(T[boss.si].y, T[boss.si].x); boss.y = Hs(boss.s); }

    // ================= PHYSICS =================
    let hunterKills = 0, raceTime = 0, shake = 0, flash = 0, playerKills = 0, bountyClaimed = false, toastMsg = '', toastCol = '#fff', toastT = 0;
    function toast(msg, col) { toastMsg = msg; toastCol = col; toastT = 3.5; }
    // progress along the track: local search near the last known spot
    function track(c) {
      let best = Infinity, bs = c.s;
      for (let i = Math.max(0, c.si - 3); i <= Math.min(STEPS - 1, c.si + 4); i++) { const [d, t] = segDist(c.pos, C[i], C[i + 1]); if (d < best) { best = d; bs = i + t; } }
      c.s = bs; c.si = Math.min(STEPS - 1, Math.floor(bs));
    }
    let dmgLive = 0;
    function dmgNum(c, amount, cls) {
      if (dmgLive > 14 || amount < 1) return;
      const v = new THREE.Vector3(c.pos.x, c.y + (c.yOff || 0) + 2.6 * (c.size || 1), c.pos.y).project(camera); if (v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) return;
      const el = document.createElement('span'); el.className = 'dmgN ' + cls; el.textContent = Math.round(amount) + (cls === 'crit' ? '!' : '');
      el.style.left = ((v.x + 1) / 2 * innerWidth + (R() - 0.5) * 30).toFixed(0) + 'px'; el.style.top = ((1 - v.y) / 2 * innerHeight).toFixed(0) + 'px';
      wrap.appendChild(el); dmgLive++; setTimeout(() => { el.remove(); dmgLive--; }, 750);
    }
    // kind: 'ram' / 'crash' are PHYSICAL (cut by Armour); 'hazard' / 'magic' are MAGIC (cut by Magic resist)
    // v16: damage = base x Power/1000 x 2000 / (1000 + Resist x 1000 / Penetration); returns the damage dealt
    // kind 'shot' = a weapon's physical damage; o.crit adds to the attacker's crit chance (sniper)
    function hurt(c, amount, by, kind, o) {
      if (c.destroyed || c.crashed || amount <= 0) return 0;
      if (c.spinT > 0 && kind !== 'hazard') {   // Shell spin: half the damage, the other half bounces back
        amount *= 0.5;
        if (by && by !== c && kind !== 'reflect' && !by.destroyed) hurt(by, amount, c, 'reflect');
      }
      const magic = kind === 'hazard' || kind === 'magic';
      let res = magic ? c.mr : c.arm, real = amount, crit = false;
      if (by) {
        res = res * 1000 / (by.penS || 1000);
        real *= magic ? (by.magP || 1) : (by.physP || 1);
        const cc = (by.crit || 0) + (o && o.crit || 0);
        if (cc > 0 && R() < cc) { crit = true; real *= 2 + Math.max(0, cc - 1); }
        if (by.isPlayer && (c.isTarget || c.isHunter || c.isBoss)) real *= by.bountyK;
      }
      real *= 2000 / (1000 + res);
      if (c.shieldT > 0) return 0;
      const total = real;
      c.shT = raceTime;   // the Shield stat refills after 3 s without being hit
      if (c.sh > 0) { const soak = Math.min(c.sh, real); c.sh -= soak; real -= soak; }
      c.hp -= real; c.damage += real;
      if (by) {
        c.lastHitBy = by; c.lastHitTime = raceTime;
        if (by.ls > 0 && !by.destroyed) by.hp = Math.min(by.maxHp, by.hp + total * by.ls);
        if (by.isPlayer) { if (c.isBoss) bossDmg += real; dmgNum(c, total, crit ? 'crit' : real <= 0 ? 'shd' : magic ? 'mag' : ''); }
      }
      if (c.isPlayer) { shake = Math.min(1.0, shake + real / (0.18 * c.maxHp)); flash = Math.min(0.6, flash + real / (0.3 * c.maxHp)); if (kind !== 'hazard' || total > 5) dmgNum(c, total, real <= 0 ? 'shd' : 'me'); }
      if (c.hp <= 0) destroy(c);
      return total;
    }
    function destroy(c) {
      c.hp = 0; c.destroyed = true; c.speed = 0; c.vel.multiplyScalar(0.3);
      const u = c.mesh.userData; u.paint.color.set(0x2a2522);
      burst(c.pos.x, c.y + 1, c.pos.y, 60, 0xff8a2a, 16, 0.9, 0.6);
      burst(c.pos.x, c.y + 1, c.pos.y, 40, 0x3a3330, 8, 2.2, -0.15);
      if (nearPlayer(c)) {
        burst(c.pos.x, c.y + 1.2, c.pos.y, 30, 0xffd27a, 10, 0.35, 0.2, HQ() ? 4 : 1);
        const dmat = [mk(u.paint.color.getHex()), darkMat];
        for (let k = 0; k < 9; k++) {
          const d = new THREE.Mesh(new THREE.BoxGeometry(0.3 + R() * 0.6, 0.2 + R() * 0.3, 0.3 + R() * 0.5), dmat[k % 2]);
          d.position.set(c.pos.x, c.y + 1, c.pos.y); scene.add(d);
          flying.push({ mesh: d, vx: c.vel.x * 0.3 + (R() - 0.5) * 16, vy: 6 + R() * 10, vz: c.vel.y * 0.3 + (R() - 0.5) * 16, spin: (R() - 0.5) * 14, t: 2.2 });
        }
      }
      u.body.rotation.x = 0.4 * (R() - 0.5);
      const byPlayer = !c.isPlayer && c.lastHitBy === player && raceTime - c.lastHitTime < 4;
      if (byPlayer) playerKills++;
      if (c.isTarget) { if (byPlayer) { bountyClaimed = true; toast('TARGET WRECKED! Bounty claimed', '#ffd166'); } else toast('Someone else wrecked your target. Bounty lost.', '#ff6b6b'); }
      if (c.isBoss) toast('THE ' + c.name.toUpperCase() + ' IS WRECKED!', '#ff5577');
      if (c.isHunter && !c.isPlayer) { if (byPlayer) hunterKills++; toast(byPlayer ? 'You wrecked a hunter!' : 'A hunter was wrecked.', '#c77dff'); }
      if (u.beam) u.beam.visible = false;
      if (u.marker && !c.isPlayer) u.marker.visible = false;
      addObstacle({ p: c.pos.clone(), r: 1.9 * Math.min(3, c.size || 1), mesh: null, breakable: false, wreck: c, until: raceTime + 15 });
    }
    function zoneAt(p) { for (const z of zones) { const dx = p.x - z.p.x; if (dx > z.r || dx < -z.r) continue; if (p.distanceTo(z.p) < z.r) return z; } return null; }
    function overPit(p) {
      for (const c of pits) {
        const rx = p.x - c.c.x, ry = p.y - c.c.y; if (rx * rx + ry * ry > c.r * c.r * 2.2) continue;
        const al = (rx * c.dir.x + ry * c.dir.y) / (c.len / 2), ac = (rx * -c.dir.y + ry * c.dir.x) / (c.w / 2);
        if (al * al + ac * ac < 0.85) return c;
      }
      return null;
    }
    const terrOf = { "Desert": 'sand', "Volcanic field": 'heat', "Canyon": 'rough', "Jungle": 'rough', "Flooded city": 'water', "Frozen tundra": 'ice' }[P.world];
    const near = [];
    function stepCar(c, dt, throttle, steer) {
      if (c.destroyed) { c.vel.multiplyScalar(Math.pow(0.1, dt)); c.pos.add(c.vel.clone().multiplyScalar(dt)); return; }
      if (c.regen && c.hp < c.maxHp) c.hp = Math.min(c.maxHp, c.hp + c.maxHp * 0.002 * c.regen * dt);
      if (c.sh < c.shMax && raceTime - (c.shT || -9) > 3) c.sh = Math.min(c.shMax, c.sh + c.shMax * 0.25 * dt);   // shield refills in 4 s
      if (c.abCd > 0) c.abCd -= dt; if (c.abT > 0) c.abT -= dt; if (c.shieldT > 0) c.shieldT -= dt;
      if (c.spinT > 0) c.spinT -= dt; if (c.rushT > 0) c.rushT -= dt;
      const nr = nearestRoad(c.pos);
      const onRoad = nr.dist < ROAD_W / 2;
      c.onRoad = onRoad;
      const z = c.air || c.isBoss ? null : zoneAt(c.pos);
      c.zone = z;
      const slowFree = c.shieldT > 0 || c.spinT > 0 || (c.ability === 'Terrain boost' && c.abT > 0) || c.isBoss;
      const offSlow = P.world === 'Volcanic field' ? 0.6 : 0.5;
      let maxSpeed = onRoad || slowFree ? c.top : c.top * (1 - Math.min(0.9, offSlow * c.slowF));
      if (c.ability === 'Speed boost' && c.abT > 0) maxSpeed *= 1.3;
      if (c.spinT > 0) maxSpeed *= 1.2;
      if (c.rushT > 0) maxSpeed *= 1.15;   // ram rush: a successful ram gives you a short burst
      // hills: along the road the gradient comes from the track; off-road, climbing out of a gully is slow
      const fx0 = Math.cos(c.rot), fy0 = Math.sin(c.rot);
      const ti = Math.min(STEPS - 1, Math.floor(c.s));
      const along = fx0 * T[ti].x + fy0 * T[ti].y;
      let slope = (Hs(c.s + 0.15) - Hs(c.s)) / (0.15 * SEG) * along;
      if (!onRoad && !c.air) { const ahead = groundAt(V2(c.pos.x + fx0 * 2.5, c.pos.y + fy0 * 2.5)); slope = Math.max(slope, (ahead - c.y) / 2.5); }
      if (!c.air) maxSpeed *= Math.max(onRoad ? 0.86 : 0.45, Math.min(1.2, 1 - slope * (onRoad ? 0.7 : 1.0)));   // hills slow you, but gently
      if (c.boostT > 0) { c.boostT -= dt; maxSpeed *= 1 + 0.4 * c.boostK; }
      if (c.isBoss) maxSpeed *= 0.5 + 0.5 * c.hp / c.maxHp;   // bosses slow down as they take damage
      if (c.wSlowT > 0 && c.shieldT <= 0 && !(c.spinT > 0)) maxSpeed *= 1 - c.wSlowA;   // weapon slows (nets, glue, ice, tar...)
      if (z && z.zt.slow && !slowFree) maxSpeed = Math.min(maxSpeed, c.top * (1 - Math.min(0.9, z.zt.slow * c.slowF)));
      const inStorm = storm && c.s > storm.from && c.s < storm.to;
      if (inStorm) maxSpeed *= 0.92;
      c.braking = throttle < 0 && c.speed > 1;
      c.steerIn = steer;
      if (!c.air && !c.falling) {
        c.speed -= GRAV * 0.18 * Math.max(-0.4, Math.min(0.6, slope)) * dt;
        if (throttle > 0) c.speed += ACCEL * c.acc * throttle * dt * (c.boostT > 0 ? 1.6 : 1);
        else if (throttle < 0) c.speed -= (c.speed > 0 ? BRAKE : ACCEL * 0.6) * -throttle * dt;
        else c.speed -= Math.sign(c.speed) * Math.min(Math.abs(c.speed), DRAG * dt);
        if (c.speed > maxSpeed) c.speed -= Math.min(c.speed - maxSpeed, Math.max(45, c.top) * dt);
        c.speed = Math.max(c.speed, -10);
        const sf = Math.min(1, Math.abs(c.speed) / 8) / Math.pow(Math.max(1, Math.abs(c.speed) / 20), 0.8);   // the faster you go, the more Handling you need
        c.rot += steer * 2.3 * c.steer * sf * dt * Math.sign(c.speed || 1) * (c.spinT > 0 ? 0.55 : 1);
      }
      const fx = Math.cos(c.rot), fy = Math.sin(c.rot);
      if (!c.air && !c.falling) {
        const k = Math.min(1, (onRoad ? 8 : 5) * dt * (c.knockT > 0 ? 0.15 : 1));   // no sliding anywhere, except just after a weapon shove
        c.vel.x += (fx * c.speed - c.vel.x) * k; c.vel.y += (fy * c.speed - c.vel.y) * k;
        if (z && z.zt.dps) hurt(c, z.zt.dps * dt * Math.max(0.5, Math.min(1.2, Math.abs(c.speed) / V100)), null, 'hazard');   // lava: magic damage, cut by Magic resist; scaled by speed so slow rides don't burn longer
        if (inStorm) { c.vel.x += N[ti].x * Math.sin(raceTime * 0.7) * 6 * dt; c.vel.y += N[ti].y * Math.sin(raceTime * 0.7) * 6 * dt; }
      }
      c.pos.x += c.vel.x * dt; c.pos.y += c.vel.y * dt;
      track(c);
      const sq = specialAt(c.s);
      if (sq && c.s > sq.s0 - 0.6 && c.s < sq.s1 + 0.6) {
        const q = lerpC(c.s), n = lerpN(c.s), lat = (c.pos.x - q.x) * n.x + (c.pos.y - q.y) * n.y, lim = Math.max(0, ROAD_W / 2 - c.r - 0.3);
        if (Math.abs(lat) > lim && Math.abs(lat) < ROAD_W / 2 + 25) {
          const corr = Math.sign(lat) * lim - lat; c.pos.x += n.x * corr; c.pos.y += n.y * corr;
          const vn = c.vel.x * n.x + c.vel.y * n.y; if (vn * Math.sign(lat) > 0) { c.vel.x -= n.x * vn * 1.3; c.vel.y -= n.y * vn * 1.3; c.speed *= 0.92; if (vn * Math.sign(lat) > 8) { hurt(c, 20 * Math.pow(vn / V100, 2), null, 'crash'); if (nearPlayer(c)) burst(c.pos.x, c.y + 0.8, c.pos.y, 10, 0xffd166, 8, 0.3, 0.8); } }
        }
        { const top = Hs(c.s) + Math.max(4, TUN_H - 2.6 * c.size); if (sq.kind === 'tunnel' && Math.abs(lat) < ROAD_W / 2 + 2 && c.y > top && c.s > sq.s0 && c.s < sq.s1) { c.y = top; if (c.vy > 0) c.vy = 0; } }
      }
      if (!c.air) for (const b of pushables) {
        if (!b.alive) continue;
        const dx = c.pos.x - b.p.x, dy = c.pos.y - b.p.y, rr = b.r + c.r + 1; if (dx * dx + dy * dy > rr * rr) continue;
        const d = Math.sqrt(dx * dx + dy * dy), min = b.r + c.r; if (d >= min || d < 0.001) continue;
        const nx = dx / d, ny = dy / d, into = c.vel.x * nx + c.vel.y * ny;
        if (c.mass >= 1.6) {   // heavy rides shove striped barriers aside
          const ov = min - d; b.p.x -= nx * ov; b.p.y -= ny * ov;
          if (into < 0) { b.vel.x += -nx * -into * 0.9 + c.vel.x * 0.1; b.vel.y += -ny * -into * 0.9 + c.vel.y * 0.1; b.spin += (R() - 0.5) * 3; c.speed *= 0.97; if (-into > 6 && nearPlayer(c)) burst(b.p.x, b.y + 1.2, b.p.y, 10, 0xffd166, 7, 0.3, 0.8); }
        } else {                                         // everyone else is stopped by them
          c.pos.x = b.p.x + nx * min; c.pos.y = b.p.y + ny * min;
          if (into < 0) { c.vel.x -= nx * into * 1.3; c.vel.y -= ny * into * 1.3; c.speed *= 0.65; if (-into > 8) hurt(c, 40 * Math.pow(into / V100, 2), null, 'crash'); }
        }
      }

      // vertical
      const gnr = nearestRoad(c.pos);
      const gh = gnr.dist < ROAD_W / 2 ? Hs(gnr.s) : groundAt(c.pos, gnr);
      c.gh = gh;
      const pit = c.isBoss ? null : overPit(c.pos);
      if (c.falling) {
        c.vy -= GRAV * dt; c.y += c.vy * dt; c.vel.multiplyScalar(0.97);
        if (c.y < c.fallFrom - 25) { c.crashed = true; c.mesh.visible = false; if (c.isTarget) toast('Your target fell into a pit. Bounty lost.', '#ff6b6b'); }
        return;
      }
      if (!c.air) {
        for (const q of pads) {
          const rx = c.pos.x - q.p.x, ry = c.pos.y - q.p.y; if (rx * rx + ry * ry > 64) continue;
          if (Math.abs(rx * q.dir.x + ry * q.dir.y) < 4 && Math.abs(rx * -q.dir.y + ry * q.dir.x) < 3.8 && !(c.boostT > 0.9)) {
            c.boostT = (c.model === 'Jet car' ? 2.8 : 1.4) * c.boostK; c.speed = Math.max(c.speed, c.top * (1 + 0.2 * c.boostK)); if (c.isPlayer) toast('BOOST!', '#00d4ff');
          }
        }
        for (const r of ramps) {
          const rx = c.pos.x - r.p.x, ry = c.pos.y - r.p.y; if (rx * rx + ry * ry > 900) continue;
          const al = rx * r.dir.x + ry * r.dir.y, ac = rx * -r.dir.y + ry * r.dir.x;
          if (Math.abs(al) < 4.5 && Math.abs(ac) < r.w / 2 + 0.5 && c.vel.dot(r.dir) > 6) {
            c.air = true; c.vy = Math.min(20, 5 + Math.abs(c.speed) * 0.33) * c.jump; c.y = gh + 0.6; c.lastClimb = undefined; break;
          }
        }
      }
      if (c.air) {
        if (c.wings && throttle > 0 && c.vy < 4) {
          const fr = Math.max(0.2, c.flightRange);   // heavier rides sink faster, so they glide less far
          c.vy = Math.max(c.vy - GRAV * 0.3 / fr * dt, -7 / fr);
          c.rot += steer * 1.7 * c.steer * dt;
          c.speed += (c.glide - c.speed) * Math.min(1, 1.2 * dt);
          const gk = Math.min(1, 2.2 * dt);
          c.vel.x += (Math.cos(c.rot) * c.speed - c.vel.x) * gk; c.vel.y += (Math.sin(c.rot) * c.speed - c.vel.y) * gk;
          c.gliding = true;
        } else {
          c.vy -= GRAV * dt; c.gliding = false;
          // everyone else gets a little steering in the air from Flight
          if (steer) { c.rot += steer * 0.5 * c.flight * dt; const ak = Math.min(1, 0.6 * c.flight * dt); c.vel.x += (Math.cos(c.rot) * c.speed - c.vel.x) * ak; c.vel.y += (Math.sin(c.rot) * c.speed - c.vel.y) * ak; }
        }
        c.y += c.vy * dt;
        if (c.isPlayer) c.airTime += dt;
        if (pit && c.y < pit.h - 1) { c.falling = true; c.air = false; c.fallFrom = pit.h; return; }
        if (!pit && c.y <= gh) {
          const hard = -c.vy;
          c.y = gh; c.vy = 0; c.air = false; c.lastClimb = undefined;
          if (hard > 8 && nearPlayer(c)) burst(c.pos.x, gh + 0.3, c.pos.y, 14, dustColor(c), 7, 0.6);
          if (hard > 15) c.speed *= Math.max(0.65, 1 - (hard - 15) * 0.02);
        }
      } else {
        if (pit) { c.falling = true; c.fallFrom = pit.h; c.vy = 0; return; }
        const prev = c.y;
        c.y = gh;
        const climb = (gh - prev) / Math.max(dt, 0.001), lc = c.lastClimb === undefined ? climb : c.lastClimb;
        // the ground falls away faster than gravity can pull you down: you leave it, keeping your upward/downward speed
        if (gh < prev - 0.35 || (gh < prev && Math.abs(c.speed) > 12 && climb < lc - GRAV * dt * 1.15)) { c.air = true; c.vy = Math.max(-25, lc * 0.95); c.y = prev; }
        else c.lastClimb = climb;
      }

      // obstacles
      nearObstacles(c.pos, near);
      for (const o of near) {
        if (o.wreck === c) continue;
        const dx = c.pos.x - o.p.x, dy = c.pos.y - o.p.y, d = Math.sqrt(dx * dx + dy * dy), min = o.r + c.r;
        if (d < min && d > 0.001 && (!c.air || (o.blk && c.y < o.blk.top - 0.3))) {
          const nx = dx / d, ny = dy / d, into = c.vel.x * nx + c.vel.y * ny;
          if (o.blk) {
            const hit = 60 * Math.pow(Math.min(0, into) / V100, 2) * c.size;
            if ((c.ability === 'Smash' && c.abT > 0) || c.size >= 3 || (into < -4 && hit >= o.blk.tough)) { breakBlock(o.blk, c); c.speed *= c.size >= 3 ? 0.97 : 0.8; continue; }
          }
          if (o.breakable && into < -4) { smash(o, c); if (c.size < 2) { c.speed *= 0.9; hurt(c, 5, null, 'crash'); } continue; }
          if (!o.blk && o.r < c.r * 0.6) {   // giants flatten anything much smaller than themselves
            if (!o.crushedT || raceTime - o.crushedT > 1) { o.crushedT = raceTime; if (nearPlayer(c)) burst(o.p.x, heightAt(o.p) + 1, o.p.y, 14, L.rock, 8, 0.6); }
            c.speed *= 0.995; continue;
          }
          c.pos.x = o.p.x + nx * min; c.pos.y = o.p.y + ny * min;
          if (into < 0) {
            c.vel.x -= nx * into * 1.3; c.vel.y -= ny * into * 1.3;
            {
              c.speed *= 0.7;
              if (-into > 8) { hurt(c, 40 * Math.pow(into / V100, 2), null, 'crash'); if (nearPlayer(c)) burst(c.pos.x - nx * c.r, c.y + 0.8, c.pos.y - ny * c.r, 16, 0xffd166, 10, 0.4, 0.8); }
            }
          }
        }
      }
    }
    function smash(o, c) {
      o.alive = false;
      if (o.mesh) flying.push({ mesh: o.mesh, vx: c.vel.x * 0.6 + (R() - 0.5) * 6, vy: 6 + R() * 5, vz: c.vel.y * 0.6 + (R() - 0.5) * 6, spin: (R() - 0.5) * 8, t: 1.6 });
      if (nearPlayer(c)) burst(o.p.x, heightAt(o.p) + 1.5, o.p.y, 20, L.tall, 9, 0.7);
    }
    const u_wheeled = c => c.mesh.userData.wheels.length > 0;
    function nearPlayer(c) { const dx = c.pos.x - player.pos.x, dy = c.pos.y - player.pos.y; return dx * dx + dy * dy < 160 * 160; }
    function dustColor(c) { return c.zone ? c.zone.zt.dust : new THREE.Color(L.ground).multiplyScalar(1.15).getHex(); }
    let order = [];
    function carCollisions() {
      let maxR = CAR_R; for (const c of order) if (c.r > maxR) maxR = c.r;
      for (let i = 0; i < order.length; i++) {
        const a = order[i];
        for (let j = i + 1; j < order.length; j++) {
          const b = order[j];
          if (b.pos.x - a.pos.x > maxR * 2) break;
          if (Math.abs(a.y + (a.yOff || 0) - b.y - (b.yOff || 0)) > 1.5 + (a.size + b.size) * 0.5 || a.crashed || b.crashed) continue;
          const dx = a.pos.x - b.pos.x, dy = a.pos.y - b.pos.y, len = Math.sqrt(dx * dx + dy * dy), min = a.r + b.r;
          if (len < min && len > 0.001) {
            const nx = dx / len, ny = dy / len, ov = min - len;
            const ma = a.shieldT > 0 || a.spinT > 0 ? 1e3 : a.mass, mb = b.shieldT > 0 || b.spinT > 0 ? 1e3 : b.mass;
            let wa = mb / (ma + mb) * a.stabF, wb = ma / (ma + mb) * b.stabF;
            const over = a.size >= 2 * b.size ? b : b.size >= 2 * a.size ? a : null;   // a ride twice the other's size runs it over
            if (over === b) wa = 0; else if (over === a) wb = 0;
            a.pos.x += nx * ov * wa; a.pos.y += ny * ov * wa; b.pos.x -= nx * ov * wb; b.pos.y -= ny * ov * wb;
            const rel = (a.vel.x - b.vel.x) * nx + (a.vel.y - b.vel.y) * ny;
            if (rel < 0) {
              a.vel.x -= nx * rel * wa; a.vel.y -= ny * rel * wa; b.vel.x += nx * rel * wb; b.vel.y += ny * rel * wb;
              if (-rel > 8 && raceTime > 8) {
                const dmg = 90 * Math.pow(rel / V100, 2);   // rams hit harder the faster the impact
                const ramOf = c => c.size * (c.ability === 'Smash' && c.abT > 0 ? 2 : 1) * (c.spinT > 0 ? 3 : 1) * Wp.ramMult(c);   // bigger rides hit harder; Smash x2, Shell spin x3; Spiked bumper adds
                // the rammer is whoever was driving into the other; they take only 35% of the knock themselves
                const va = -(a.vel.x * nx + a.vel.y * ny), vb = b.vel.x * nx + b.vel.y * ny, rammer = va >= vb ? a : b;
                const da = hurt(a, dmg * ramOf(b) * (rammer === a ? 0.35 : 1), b, 'ram'), db = hurt(b, dmg * ramOf(a) * (rammer === b ? 0.35 : 1), a, 'ram');
                Wp.onRam(a, b, da); Wp.onRam(b, a, db);   // ram passives: bumpers, thorns, glue coating...
                const hitDealt = rammer === a ? db : da;
                if (hitDealt > 5) { rammer.rushT = 1.5; rammer.sh = Math.min(rammer.shMax, (rammer.sh || 0) + hitDealt * 0.5); if (rammer.isPlayer) toast('RAM! +SHIELD', '#ffd166'); }   // ram reward: speed burst + shield
                for (const [x, y, sg] of [[a, b, -1], [b, a, 1]]) if (x.spinT > 0) Wp.knock(y, sg * nx, sg * ny, 24);   // shell spin bats rivals aside
                if (over && over.stabF > 0.75) { over.rot += (R() < 0.5 ? -1 : 1) * 1.2 * over.stabF; over.speed *= 0.4; }
                if (nearPlayer(a)) burst((a.pos.x + b.pos.x) / 2, a.y + 0.9, (a.pos.y + b.pos.y) / 2, 18, 0xffd166, 11, 0.4, 0.8);
              }
            }
          }
        }
      }
    }
    function useAbility(c) {
      if (c.abCd > 0 || c.destroyed || c.crashed || c.falling) return false;
      const A = Stats.ABILITY[c.ability]; if (!A) return false;
      if (c.ability === 'Jump') { if (c.air) return false; c.air = true; c.vy = 23 * c.jump; c.y += 0.6; c.lastClimb = undefined; if (nearPlayer(c)) burst(c.pos.x, c.y, c.pos.y, 12, dustColor(c), 7, 0.5); }
      if (c.ability === 'Shield') c.shieldT = A.dur;
      if (c.ability === 'Shell spin') c.spinT = A.dur;
      if (c.ability === 'Slime trail') c.slimeT = A.dur;
      if (c.ability === 'Jingle') Wp.jingle(c);
      c.abT = A.dur; c.abCd = A.cd;
      if (c.isPlayer) toast(c.ability.toUpperCase() + '!', A.color);
      return true;
    }
    // AI: follow its chosen route, swerve round obstacles, pits and cars; hunters go for you
    function routeFor(c) {
      if (c.si < MERGE && c.entry !== undefined) return entries[c.entry].pts;
      for (let k = 0; k < forks.length; k++) { const f = forks[k]; if (c.si >= f.i0 - 1 && c.si < f.i1) { const r = c.routes[k]; return r === 1 ? f.A.pts : r === 2 ? f.B.pts : main; } }
      return main;
    }
    function aiControl(c) {
      const pp = routeFor(c), li = Math.min(STEPS, c.si + 2);
      let tx = pp[li].x + N[li].x * c.laneOff, ty = pp[li].y + N[li].y * c.laneOff;
      const fx = Math.cos(c.rot), fy = Math.sin(c.rot);
      nearObstacles(V2(c.pos.x + fx * 12, c.pos.y + fy * 12), near);
      let blockAhead = false;
      for (const o of near) {
        const ox = o.p.x - c.pos.x, oy = o.p.y - c.pos.y, ahead = ox * fx + oy * fy;
        if (o.blk && ahead > 0 && ahead < 22 && Math.abs(ox * -fy + oy * fx) < o.r + c.r + 1) blockAhead = true;
        if (o.blk && (c.ability === 'Jump' || c.ability === 'Smash') && c.abCd <= 0) continue;
        if (ahead > 0 && ahead < 18) { const lat = ox * -fy + oy * fx; if (Math.abs(lat) < o.r + c.r + 1) { const s = lat > 0 ? -8 : 8; tx += -fy * s; ty += fx * s; } }
      }
      if (c.mass < 1.6) for (const b of pushables) {
        if (!b.alive) continue;
        const ox = b.p.x - c.pos.x, oy = b.p.y - c.pos.y, ahead = ox * fx + oy * fy; if (ahead < 0 || ahead > 20) continue;
        const lat = ox * -fy + oy * fx; if (Math.abs(lat) < b.r + c.r + 1) { const s = lat > 0 ? -8 : 8; tx += -fy * s; ty += fx * s; }
      }
      // abilities: jump or smash road blocks, boost on the straights, shield in a crowd, terrain boost when slowed
      if (c.abCd <= 0 && raceTime > 3) {
        const A = c.ability;
        if ((A === 'Jump' || A === 'Smash') && blockAhead && c.speed > c.top * 0.45) useAbility(c);
        else if (A === 'Speed boost' && Math.abs(c.steerIn || 0) < 0.2 && R() < 0.02) useAbility(c);
        else if (A === 'Terrain boost' && (c.zone || !c.onRoad)) useAbility(c);
        else if (A === 'Shield' && (c.zone && c.zone.zt.dps || c.hp < c.maxHp * 0.5) && R() < 0.05) useAbility(c);
        else if ((A === 'Shell spin' || A === 'Jingle' || A === 'Slime trail') && Wp.crowd(c, A === 'Slime trail' ? -1 : 0) >= (A === 'Jingle' ? 3 : 1) && R() < 0.04) useAbility(c);
      }
      if (!c.air) for (const q of pits) {
        const ox = q.c.x - c.pos.x, oy = q.c.y - c.pos.y; if (ox * ox + oy * oy > 2500) continue;
        const ahead = ox * fx + oy * fy; if (ahead < -2 || ahead > 40) continue;
        const lat = ox * -fy + oy * fx; if (Math.abs(lat) < q.w / 2 + 4) { const s = (lat > 0 ? -1 : 1) * (q.w / 2 + 6); tx += -fy * s; ty += fx * s; }
      }
      for (let k = c._oi + 1; k < order.length; k++) {
        const o = order[k], ox = o.pos.x - c.pos.x; if (ox > 14 + c.r) break;
        const oy = o.pos.y - c.pos.y, ahead = ox * fx + oy * fy; if (ahead <= 0) continue;
        const lat = ox * -fy + oy * fx; if (Math.abs(lat) < 0.5 + c.r + o.r && !c.isBoss) { const s = lat > 0 ? -5 : 5; tx += -fy * s; ty += fx * s; }
      }
      if (c.isHunter && !player.destroyed && !player.crashed && !player.finished && raceTime > 6) {
        const dx = player.pos.x - c.pos.x, dy = player.pos.y - c.pos.y;
        if (dx * dx + dy * dy < 75 * 75 && (dx * fx + dy * fy) > -15) { tx = player.pos.x + player.vel.x * 0.35; ty = player.pos.y + player.vel.y * 0.35; }
      }
      let diff = Math.atan2(ty - c.pos.y, tx - c.pos.x) - c.rot;
      while (diff > Math.PI) diff -= 2 * Math.PI; while (diff < -Math.PI) diff += 2 * Math.PI;
      return [Math.abs(diff) > 0.6 && c.speed > Math.max(20, c.top * 0.6) ? 0 : 1, Math.max(-1, Math.min(1, diff * 2.5))];
    }
    const esc = t => String(t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    const ordinal = n => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
    function standings() {
      const out = c => c.crashed || c.destroyed;
      return cars.slice().sort((a, b) => {
        if (out(a) !== out(b)) return out(a) ? 1 : -1;
        if (a.finished && b.finished) return a.finishTime - b.finishTime;
        if (a.finished !== b.finished) return a.finished ? -1 : 1;
        return b.s - a.s;
      });
    }

    // ================= MINIMAP (2D, follows the winding course) =================
    const mw = mini.width, mh = mini.height, msc = Math.min((mw - 12) / (bx1 - bx0 + 1), (mh - 12) / (bz1 - bz0 + 1));
    const mx = x => mw / 2 + (x - bcx) * msc, mz = z => mh / 2 + (z - bcz) * msc;
    const mapBg = document.createElement('canvas'); mapBg.width = mw; mapBg.height = mh;
    (function () {
      const g = mapBg.getContext('2d');
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, 0, mw, mh);
      for (const pth of paths) {
        g.strokeStyle = pth.kind !== 'shortcut' ? '#ddd' : pth.type === 'blocks' ? '#e63946' : '#ffb703'; g.lineWidth = pth.kind === 'main' ? 2.5 : 1.6;
        g.beginPath(); for (let i = pth.i0; i <= pth.i1; i++) { const q = pth.pts[i]; i === pth.i0 ? g.moveTo(mx(q.x), mz(q.y)) : g.lineTo(mx(q.x), mz(q.y)); } g.stroke();
      }
      for (const q of specials) { g.strokeStyle = q.kind === 'tunnel' ? '#555' : '#7fd3ff'; g.lineWidth = 4; g.beginPath();
        for (let i = q.s0; i <= q.s1; i++) { const c = C[i]; i === q.s0 ? g.moveTo(mx(c.x), mz(c.y)) : g.lineTo(mx(c.x), mz(c.y)); } g.stroke(); }
      g.fillStyle = '#000'; for (const p of pits) { g.beginPath(); g.arc(mx(p.c.x), mz(p.c.y), 1.6, 0, 7); g.fill(); }
      g.fillStyle = '#fff'; g.fillRect(mx(END.x) - 3, mz(END.y) - 3, 6, 6);
    })();
    function drawMini() {
      mctx.clearRect(0, 0, mw, mh); mctx.drawImage(mapBg, 0, 0);
      mctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (const c of cars) if (!c.isPlayer && !c.crashed && !c.destroyed) mctx.fillRect(mx(c.pos.x) - 1, mz(c.pos.y) - 1, 2, 2);
      if (target && !target.destroyed && !target.crashed) { mctx.fillStyle = '#ffc300'; mctx.beginPath(); mctx.arc(mx(target.pos.x), mz(target.pos.y), 3.2, 0, 7); mctx.fill(); }
      if (P.hunterKnown) for (const h of hunters) if (!h.destroyed && !h.crashed) { mctx.fillStyle = '#c77dff'; mctx.beginPath(); mctx.arc(mx(h.pos.x), mz(h.pos.y), 3, 0, 7); mctx.fill(); }
      for (const g of ghosts.values()) if (!g.dead) { mctx.fillStyle = '#37d67a'; mctx.beginPath(); mctx.arc(mx(g.pos.x), mz(g.pos.y), 3.3, 0, 7); mctx.fill(); }
      mctx.fillStyle = '#ff2a2a'; mctx.beginPath(); mctx.arc(mx(player.pos.x), mz(player.pos.y), 3.5, 0, 7); mctx.fill();
    }

    // ================= OTHER PLAYERS (live, from the room) =================
    const ghosts = new Map();
    function nameTag(text) {
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const g = cv.getContext('2d');
      g.fillStyle = 'rgba(20,16,12,0.75)'; g.beginPath(); g.roundRect ? g.roundRect(4, 8, 248, 48, 14) : g.rect(4, 8, 248, 48); g.fill();
      g.fillStyle = '#7CFFB2'; g.font = 'bold 30px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text.slice(0, 14), 128, 33);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); sp.scale.set(6, 1.5, 1); sp.position.y = 6.2; sp.renderOrder = 10;
      return sp;
    }
    function syncGhosts(dt) {
      if (!P.remote) return;
      const list = P.remote(), seen = new Set();
      for (const r of list) {
        const c = r.car; if (!c || typeof c.x !== 'number') continue;
        seen.add(r.peer);
        let g = ghosts.get(r.peer);
        if (!g || g.model !== c.m || Math.abs((g.sz || 1) - (c.sz || 1)) > 0.02) {
          if (g) scene.remove(g.mesh);
          const Mo = Models.get(c.m || 'Sports car');
          g = { mesh: makeCar(c.m || 'Sports car', Mo.palette[1] || Mo.palette[0], false, c.sz || 1), sz: c.sz || 1, model: c.m, name: r.name, pos: V2(c.x, c.z), y: c.y, rot: c.r, vx: 0, vz: 0, s: c.s || 0 };
          const tag = nameTag(r.name); tag.position.y = 6.2 * (g.mesh.userData.size || 1); g.mesh.add(tag); addMarker(g.mesh, 0x37d67a, false);
          ghosts.set(r.peer, g);
        }
        g.name = r.name; g.tx = c.x; g.tz = c.z; g.ty = c.y; g.tr = c.r; g.sp = c.sp || 0; g.s = c.s || 0; g.fin = c.f; g.dead = c.d; g.hp = c.hp;
      }
      for (const [peer, g] of ghosts) if (!seen.has(peer)) { scene.remove(g.mesh); ghosts.delete(peer); }
      for (const g of ghosts.values()) {
        // glide towards the latest reported spot, carrying on at its reported speed in between
        g.tx += Math.cos(g.tr) * g.sp * dt; g.tz += Math.sin(g.tr) * g.sp * dt;
        const k = Math.min(1, 8 * dt), ox = g.pos.x, oz = g.pos.y;
        g.pos.x += (g.tx - g.pos.x) * k; g.pos.y += (g.tz - g.pos.y) * k; g.y += (g.ty - g.y) * k;
        let dr = g.tr - g.rot; while (dr > Math.PI) dr -= 2 * Math.PI; while (dr < -Math.PI) dr += 2 * Math.PI; g.rot += dr * k;
        g.vx = (g.pos.x - ox) / Math.max(dt, 1e-3); g.vz = (g.pos.y - oz) / Math.max(dt, 1e-3);
        g.mesh.position.set(g.pos.x, g.y, g.pos.y); g.mesh.rotation.y = -g.rot;
        g.mesh.userData.paint.color.set(g.dead ? 0x2a2522 : Models.get(g.model || 'Sports car').palette[1] || 0xffffff);
        const u = g.mesh.userData; g.anim = (g.anim || 0) + g.sp * dt * 0.7;
        for (const w of u.wheels) w.pivot.rotation.z -= g.sp * dt / w.r;
        for (const l of u.legs) l.pivot.rotation.z = u.model.hop ? -Math.abs(Math.sin(g.anim * 0.5)) * 0.6 : Math.sin(g.anim + l.phase) * Math.min(0.7, g.sp / 10);
        if (u.marker) u.marker.rotation.y += dt * 3;
        // bumping into another player: you get pushed and hurt; they handle their own side on their screen
        if (!g.dead && !player.destroyed && !player.crashed && Math.abs(g.y - player.y) < 2.5) {
          const dx = player.pos.x - g.pos.x, dz = player.pos.y - g.pos.y, d = Math.hypot(dx, dz), min = player.r + CAR_R * (g.mesh.userData.size || 1);
          if (d < min && d > 0.01) {
            const nx = dx / d, nz = dz / d; player.pos.x += nx * (min - d); player.pos.y += nz * (min - d);
            const rel = (player.vel.x - g.vx) * nx + (player.vel.y - g.vz) * nz;
            if (rel < 0) { player.vel.x -= nx * rel; player.vel.y -= nz * rel; if (-rel > 8 && raceTime > 8) hurt(player, 60 * Math.pow(rel / V100, 2), null, 'ram'); }
          }
        }
      }
    }
    let sendT = 0;

    // ================= RUN =================
    let state = 'countdown', countdown = 4.5, finishCount = 0, doneTimer = 0, playerRank = 0, leaderTime = null;
    wrap.style.display = 'block'; resize();
    camera.position.set(player.pos.x - T[0].x * 16, player.y + 12, player.pos.y - T[0].y * 16);
    running = true;
    const myId = ++raceId;
    let last = performance.now();
    const fogNear = 180, fogFar = 750;
    const bossEl = document.getElementById('raceBoss'), bossFill = document.getElementById('raceBossFill'), bossText = document.getElementById('raceBossText'), spdEl = document.getElementById('raceSpd');
    if (bossEl) bossEl.style.display = boss ? 'block' : 'none';
    const abEl = document.getElementById('raceAb'); if (abEl) abEl.style.display = 'block';
    Wp.show(true);
    let sparkT = 3, camRoll = 0;
    function finishRun() {
      for (const g of ghosts.values()) scene.remove(g.mesh); ghosts.clear();
      running = false; wrap.style.display = 'none'; big.innerHTML = ''; flashEl.style.opacity = 0; Wp.dispose();
      const deadRivals = cars.filter(c => !c.isPlayer && (c.crashed || c.destroyed)).length;
      onDone(playerRank, cars.length, { hp: Math.max(0, player.hp), destroyed: player.destroyed, crashed: player.crashed, damage: Math.round(player.damage), deadRivals, playerKills, bountyClaimed,
        hunterKills, airTime: player.airTime, coins: player.coins, shortcuts: player.shortcuts,
        bossBeatYou, bossShare: boss ? Math.min(1, bossDmg / boss.maxHp) : 0, bossDead: !!(boss && boss.destroyed) });
      if (bossEl) bossEl.style.display = 'none';
      { const e = document.getElementById('raceAb'); if (e) e.style.display = 'none'; }
    }
    function frame(now) {
      if (!running || myId !== raceId) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const lit = state === 'countdown' ? (countdown > 3.4 ? 0 : countdown > 0.5 ? Math.min(5, Math.floor((3.4 - countdown) / 0.58) + 1) : 6) : 6;
      lightMats.forEach((m, k) => { m.color.setHex(lit === 6 ? 0x22ff55 : k < lit ? 0xff2020 : 0x331111); if (HQ() && (lit === 6 || k < lit)) m.color.multiplyScalar(3); });
      if (state === 'countdown') {
        countdown -= dt;
        big.innerHTML = countdown > 3 ? P.world.toUpperCase() + '<br><small>' + cars.length + ' racers · last place is eliminated' + (boss ? '<br><b style="color:#ff5577">BOSS: ' + boss.name.toUpperCase() + '</b> · it races with you · beat it to the line or wreck it' : '') + '<br>Your ability: <b>' + player.ability + '</b> (Space) · ' + Stats.ABILITY[player.ability].desc + '<br>' + (player.weapons.length ? 'Weapons: fire with <b>1, 2, 3</b> once they arm, 5 s after GO. A red outline shows what will be hit.' : 'You have no weapons yet: pick them up between races.') + '<br>Road blocks with a <b style="color:' + (canPass ? '#5dff8a' : '#ff4a4a') + '">' + (canPass ? 'green' : 'red') + '</b> outline: ' + (canPass ? 'you can get past them' : 'go around them') + '</small>'
          : countdown > 0.5 ? Math.ceil(countdown - 0.5) : 'GO!';
        if (countdown <= 0) state = 'racing';
      } else {
        if (state === 'racing' && raceTime > 0.6 && big.textContent === 'GO!') big.textContent = '';
        raceTime += dt;
        order = cars.filter(c => !c.crashed && !c.falling).sort((a, b) => a.pos.x - b.pos.x);
        order.forEach((c, i) => c._oi = i);
        for (const c of cars) {
          if (c.crashed) continue;
          let th = 0, st = 0;
          if (!c.finished && !c.destroyed) {
            if (c.isPlayer) {
              if (state === 'racing') {
                th = (down('KeyW', 'ArrowUp') ? 1 : 0) - (down('KeyS', 'ArrowDown') ? 1 : 0);
                st = (down('KeyD', 'ArrowRight') ? 1 : 0) - (down('KeyA', 'ArrowLeft') ? 1 : 0);
                if (down('Space', 'KeyE', 'ShiftLeft', 'ShiftRight')) useAbility(c);
              }
            } else if (c._oi !== undefined) [th, st] = aiControl(c);
          }
          { const n = Math.max(1, Math.min(c.isPlayer ? 8 : 3, Math.ceil(Math.abs(c.speed) * dt / 1.6))); for (let k = 0; k < n; k++) stepCar(c, dt / n, th, st); }
          if (!c.finished && !c.crashed && !c.destroyed && c.s > STEPS - 0.15 && c.pos.distanceTo(END) < ROAD_W) {
            c.finished = true; c.finishTime = raceTime; finishCount++;
            if (c.isBoss && state === 'racing' && !player.finished && !player.destroyed && !player.crashed) {
              bossBeatYou = true; state = 'dead'; doneTimer = 3.5; playerRank = cars.length;
              big.innerHTML = 'The ' + boss.name + ' beat you to the line!<br><small>Run over.</small>';
            }
            if (leaderTime === null) leaderTime = raceTime;
            if (c.isPlayer) {
              playerRank = finishCount; state = 'done'; doneTimer = 2.5;
              big.innerHTML = 'You finished ' + ordinal(playerRank) + ' of ' + cars.length + '<br><small>' + raceTime.toFixed(1) + ' s · ' + Math.round(player.hp) + ' / ' + Math.round(player.maxHp) + ' health left</small>';
            }
          }
        }
        carCollisions();
        Wp.update(dt, state);
        if (boss && !boss.destroyed && state === 'racing') {
          bossT += dt;
          if (boss.kind === 'wyrm') {   // flies above the road, dips to breathe fire on whoever is close
            boss.yOff = Math.max(0, 4 + 6.5 * Math.sin(raceTime * 0.42));
            if (boss.yOff < 2 && raceTime > 8) {
              for (const c of cars) { if (c === boss || c.destroyed || c.crashed) continue; const dx = c.pos.x - boss.pos.x, dy = c.pos.y - boss.pos.y; if (dx * dx + dy * dy < 18 * 18) hurt(c, 120 * dt, null, 'magic'); }
              if (nearPlayer(boss)) for (let k = 0; k < 4; k++) emit(boss.pos.x + (R() - 0.5) * 26, boss.y + R() * 2, boss.pos.y + (R() - 0.5) * 26, (R() - 0.5) * 4, 4 + R() * 5, (R() - 0.5) * 4, R() < 0.5 ? 0xff7a2a : 0xffd27a, 0.7, -0.1, HQ() ? 3 : 1);
            }
          } else if (boss.kind === 'golem' && bossT > 5 && boss.speed > 4) {   // sheds scrap across the road behind it
            bossT = 0; const bx = Math.cos(boss.rot), by = Math.sin(boss.rot);
            { const lat = (R() - 0.5) * ROAD_W * 0.6, p = V2(boss.pos.x - bx * (boss.r + 6) - by * lat, boss.pos.y - by * (boss.r + 6) + bx * lat); bigBlock(p, V2(bx, by), 9, true); }
          }
        }
        if (!player.crashed && !player.destroyed) {
          for (const cn of coins) {
            if (cn.got) continue;
            const dx = cn.x - player.pos.x, dz = cn.z - player.pos.y, pr = 1.6 + player.r; if (dx * dx + dz * dz > pr * pr) continue;
            const dy = cn.y - (player.y + 1.2 * player.size);
            if (Math.abs(dy) < 1.5 + 1.5 * player.size) { cn.got = true; player.coins++; setCoin(cn, 0); coinMesh.instanceMatrix.needsUpdate = true; burst(cn.x, cn.y, cn.z, 6, 0xffe27a, 5, 0.4, 0.3); }
          }
          for (const f of forks) {
            if (f.route === undefined && player.s > (f.i0 + f.i1) / 2) f.route = nearestRoad(player.pos).path;
            if (!f.counted && player.s > f.i1 && f.route) { f.counted = true; if (f.route.kind === 'shortcut') { player.shortcuts++; toast('SHORTCUT!', '#ffb703'); } }
          }
        }
        if (state === 'racing' && (player.crashed || player.destroyed)) {
          state = 'dead'; doneTimer = 3; playerRank = cars.length;
          big.innerHTML = player.crashed ? 'You fell into a pit!<br><small>Your ride is gone. Run over.</small>' : 'WRECKED!<br><small>Your health hit zero. Run over.</small>';
        }
        if (state === 'racing' && leaderTime !== null && raceTime - leaderTime > 50) {
          state = 'done'; doneTimer = 2.5; playerRank = standings().indexOf(player) + 1;
          big.innerHTML = 'Too slow!<br><small>The race was called. You placed ' + ordinal(playerRank) + '.</small>';
        }
        if (state === 'done' || state === 'dead') { doneTimer -= dt; if (doneTimer <= 0) return finishRun(); }
      }

      // particles
      for (const c of cars) {
        if (c.crashed || c.air || c.falling || !nearPlayer(c)) continue;
        const sp = Math.abs(c.speed);
        if (c.destroyed) { if (R() < 0.3) emit(c.pos.x, c.y + 1.2, c.pos.y, (R() - 0.5), 2 + R() * 2, (R() - 0.5), R() < 0.3 ? 0xff7a2a : 0x3a3330, 2, -0.2); continue; }
        if ((!c.onRoad || c.zone) && sp > 6 && R() < 0.9) {
          const bx = c.pos.x - Math.cos(c.rot) * 1.8, bz = c.pos.y - Math.sin(c.rot) * 1.8, z = c.zone;
          if (z && z.zt.splash) emit(bx, c.y + 0.4, bz, (R() - 0.5) * 4, 4 + R() * 4, (R() - 0.5) * 4, 0xe8f6ff, 0.7);
          else emit(bx, c.y + 0.3, bz, (R() - 0.5) * 3 - c.vel.x * 0.1, 1 + R() * 2, (R() - 0.5) * 3 - c.vel.y * 0.1, dustColor(c), 0.9, 0.3);
          if (z && z.zt.glow && R() < 0.5) emit(bx, c.y + 0.3, bz, (R() - 0.5) * 2, 3 + R() * 3, (R() - 0.5) * 2, 0xffcc33, 0.6);
        }
        if (c.onRoad && !c.air && u_wheeled(c)) {
          const slip = Math.abs(c.vel.x * Math.sin(c.rot) - c.vel.y * Math.cos(c.rot));
          if (slip > 6 && R() < 0.7) emit(c.pos.x - Math.cos(c.rot) * 1.5, c.y + 0.3, c.pos.y - Math.sin(c.rot) * 1.5, (R() - 0.5) * 2, 0.8 + R(), (R() - 0.5) * 2, 0xd8d4d0, 1.0, -0.05);
        }
        if (c.boostT > 0 && R() < 0.8) emit(c.pos.x - Math.cos(c.rot) * 2.2, c.y + 0.8, c.pos.y - Math.sin(c.rot) * 2.2, -c.vel.x * 0.15, 0.5, -c.vel.y * 0.15, 0x00d4ff, 0.4, 0);
        if (c.hp < c.maxHp * 0.35 && R() < 0.3) emit(c.pos.x + Math.cos(c.rot), c.y + 1.3, c.pos.y + Math.sin(c.rot), 0, 2.5, 0, 0x555050, 1.2, -0.2);
      }
      for (const z of zones) if (z.zt.glow && R() < 0.25) { const dx = z.p.x - player.pos.x, dy = z.p.y - player.pos.y; if (dx * dx + dy * dy < 140 * 140) emit(z.p.x + (R() - 0.5) * z.r, heightAt(z.p) + 0.5, z.p.y + (R() - 0.5) * z.r, 0, 3 + R() * 3, 0, 0xffa040, 1.5, -0.1); }
      const inStorm = storm && player.s > storm.from && player.s < storm.to;
      if (inStorm) for (let k = 0; k < 6; k++) emit(player.pos.x + (R() - 0.5) * 60, player.y + R() * 10, player.pos.y + (R() - 0.5) * 60, N[player.si].x * 18 * Math.sin(raceTime * 0.7), 0, N[player.si].y * 18 * Math.sin(raceTime * 0.7), L.stormCol, 1.4, 0.05);
      updateParticles(dt);
      syncGhosts(dt);
      for (const b of pushables) {
        if (!b.alive) continue;
        if (b.vel.lengthSq() > 0.01 || Math.abs(b.spin) > 0.01) {
          b.p.x += b.vel.x * dt; b.p.y += b.vel.y * dt; const k = Math.pow(0.12, dt); b.vel.multiplyScalar(k); b.spin *= k; b.rot += b.spin * dt;
          b.y = heightAt(b.p); b.mesh.position.set(b.p.x, b.y, b.p.y); b.mesh.rotation.y = b.rot;
          if (overPit(b.p)) { b.alive = false; flying.push({ mesh: b.mesh, vx: b.vel.x, vy: -2, vz: b.vel.y, spin: 1, t: 2 }); }
        }
      }
      for (const sw of swirls) sw.rotation.z += dt * 1.5;
      if (P.send && (sendT -= dt) <= 0) {
        sendT = 0.1;
        P.send({ x: +player.pos.x.toFixed(2), z: +player.pos.y.toFixed(2), y: +player.y.toFixed(2), r: +player.rot.toFixed(3), sp: +player.speed.toFixed(1),
          s: +player.s.toFixed(2), m: player.model, sz: +player.size.toFixed(2), hp: Math.round(player.hp), f: player.finished ? +player.finishTime.toFixed(2) : 0, d: player.destroyed || player.crashed ? 1 : 0 });
      }
      for (let i = flying.length - 1; i >= 0; i--) {
        const f = flying[i]; f.t -= dt; f.vy -= 20 * dt;
        f.mesh.position.x += f.vx * dt; f.mesh.position.y += f.vy * dt; f.mesh.position.z += f.vz * dt; f.mesh.rotation.x += f.spin * dt; f.mesh.rotation.z += f.spin * dt;
        if (f.t <= 0) { f.mesh.visible = false; flying.splice(i, 1); }
      }
      // coins spin near the player
      { let changed = false; for (const cn of coins) { if (cn.got) continue; const dx = cn.x - player.pos.x, dz = cn.z - player.pos.y; if (dx * dx + dz * dz < 6400) { setCoin(cn, raceTime * 3 + cn.i); changed = true; } } if (changed) coinMesh.instanceMatrix.needsUpdate = true; }

      // racer meshes and animation
      for (const c of cars) {
        if (c.crashed) continue;
        c.mesh.position.set(c.pos.x, c.y + (c.yOff || 0), c.pos.y);
        c.mesh.rotation.y = -c.rot;
        const u = c.mesh.userData;
        const dx = c.pos.x - player.pos.x, dy = c.pos.y - player.pos.y, close = dx * dx + dy * dy < 110 * 110;
        u.detail.visible = close;
        if (!nearPlayer(c)) continue;
        let pitch;
        if (c.air || c.falling) pitch = Math.atan2(c.vy, Math.max(5, Math.abs(c.speed))) * 0.7;
        else { const ah = heightAt(V2(c.pos.x + Math.cos(c.rot) * 2, c.pos.y + Math.sin(c.rot) * 2)); pitch = Math.max(-0.6, Math.min(0.6, Math.atan2(ah - c.y, 2))); }
        c.pitch += (pitch - c.pitch) * Math.min(1, 10 * dt);
        u.body.rotation.z = c.pitch;
        u.body.rotation.y = c.spinT > 0 ? u.body.rotation.y + 16 * dt : 0;   // Shell spin
        if (c.falling) u.body.rotation.x += 3 * dt;
        const sp = Math.abs(c.speed), mo = u.model;
        c.anim = (c.anim || 0) + sp * dt * 0.7;
        for (const w of u.wheels) { w.pivot.rotation.z -= c.speed * dt / w.r; if (w.front) w.pivot.rotation.y = c.steerIn * 0.4; }
        if (u.legs.length) { const amp = Math.min(1, sp / 8) * (c.air ? 0.2 : 0.7); for (const l of u.legs) l.pivot.rotation.z = mo.hop ? -Math.abs(Math.sin(c.anim * 0.5)) * amp : Math.sin(c.anim + l.phase) * amp; }
        if (mo.hop) u.rig.position.y = c.air ? 0 : Math.abs(Math.sin(c.anim * 0.5)) * Math.min(1, sp / 8) * 1.1;
        else if (mo.hover) u.rig.position.y = 0.35 + Math.sin(raceTime * 3 + c.pos.x) * 0.12;
        else if (u.legs.length) u.rig.position.y = Math.abs(Math.sin(c.anim)) * Math.min(1, sp / 8) * 0.15;
        else u.rig.position.y = (c.onRoad ? 0.025 : 0.1) * Math.sin(raceTime * 17 + c.pos.x) * Math.min(1, sp / 10);
        const leanIn = mo.legs.length || mo.name === 'Motorbike' || mo.wing;
        const lean = (leanIn ? -1 : 1) * c.steerIn * Math.min(1, sp / 25) * (mo.name === 'Motorbike' ? 0.4 : 0.1);
        c.roll = (c.roll || 0) + (lean - (c.roll || 0)) * Math.min(1, 6 * dt);
        u.rig.rotation.x = c.roll;
        for (const w of u.wings) w.pivot.rotation.x = -w.sd * (0.15 + Math.sin(raceTime * (c.air ? 9 : 4)) * (c.air ? 0.6 : 0.25));
        if (u.marker) { u.marker.rotation.y += dt * 3; }
      }

      scene.fog.near += ((inStorm ? 8 : fogNear) - scene.fog.near) * Math.min(1, 1.5 * dt);
      scene.fog.far += ((inStorm ? 100 : fogFar) - scene.fog.far) * Math.min(1, 1.5 * dt);
      // camera follows behind, looking a little ahead
      const fwd = new THREE.Vector3(Math.cos(player.rot), 0, Math.sin(player.rot));
      const p3 = new THREE.Vector3(player.pos.x, player.y, player.pos.y);
      const t = Math.min(1, Math.abs(player.speed) / 45);
      camera.far = 3000; camera.near = 0.3 * Math.max(1, player.size * 0.6);
      const csz = 0.75 + 0.28 * (player.size || 1);
      const camTarget = p3.clone().sub(fwd.clone().multiplyScalar((13 + 5 * t) * csz)).add(new THREE.Vector3(0, (6.5 + 3 * t) * csz, 0));
      if (!player.falling) camera.position.lerp(camTarget, Math.min(1, (4 + Math.abs(player.speed) / 10) * dt));
      const camGround = groundAt(V2(camera.position.x, camera.position.z));
      if (camera.position.y < camGround + 2) camera.position.y = camGround + 2;
      { const tq = specialAt(player.s); if (tq && tq.kind === 'tunnel' && player.s > tq.s0 - 0.3 && player.s < tq.s1 + 0.3 && lerpC(player.s).distanceTo(player.pos) < ROAD_W / 2 + 2) camera.position.y = Math.min(camera.position.y, Hs(player.s) + TUN_H - 1.5);
        // under a bridge deck: stay below it and tuck in close instead of rising through the deck
        if (tq && tq.kind === 'bridge' && player.y < Hs(player.s) - 5) {
          const lim = Hs(player.s) - 4.2;
          if (camera.position.y > lim) { camera.position.y = Math.max(player.y + 2.2, lim); camera.position.x += (p3.x - fwd.x * 7 - camera.position.x) * 0.5; camera.position.z += (p3.z - fwd.z * 7 - camera.position.z) * 0.5; }
        } }
      shake *= Math.pow(0.05, dt);
      camera.position.x += (R() - 0.5) * shake; camera.position.y += (R() - 0.5) * shake; camera.position.z += (R() - 0.5) * shake;
      camera.lookAt(p3.clone().add(fwd.clone().multiplyScalar(player.falling ? 0 : (8 + 6 * t) * csz)).add(new THREE.Vector3(0, 1.5 * player.size, 0)));
      camRoll += (-player.steerIn * 0.045 * Math.min(1, Math.abs(player.speed) / 25) - camRoll) * Math.min(1, 4 * dt); camera.rotateZ(camRoll);   // lean into corners
      camera.fov += ((60 + 12 * t + (player.boostT > 0 ? 9 : 0)) - camera.fov) * Math.min(1, 5 * dt); camera.updateProjectionMatrix();
      if (speedEl) speedEl.style.opacity = (player.boostT > 0 ? 0.6 : Math.max(0, Math.min(0.3, (Math.abs(player.speed) - 30) / 60))).toFixed(2);
      sky.position.copy(camera.position);
      sun.position.set(p3.x + sunDir.x * 180, p3.y + sunDir.y * 180, p3.z + sunDir.z * 180); sun.target.position.copy(p3);

      // HUD
      flash *= Math.pow(0.08, dt); flashEl.style.opacity = flash.toFixed(3);
      const hpPct = Math.max(0, player.hp / player.maxHp);
      hpBar.style.width = (hpPct * 100).toFixed(1) + '%';
      hpBar.style.background = hpPct > 0.6 ? '#4caf50' : hpPct > 0.3 ? '#ffb703' : '#e63946';
      hpText.textContent = 'HEALTH ' + Math.max(0, Math.round(player.hp)) + ' / ' + Math.round(player.maxHp) + (player.shMax > 0 ? '   ·   SHIELD ' + Math.round(player.sh) : '');
      { const sf = document.getElementById('raceSHFill'); if (sf) sf.style.width = (player.shMax > 0 ? 100 * player.sh / player.shMax : 0).toFixed(1) + '%'; }
      const pos = standings().indexOf(player) + 1;
      if (spdEl) spdEl.innerHTML = Math.round(Math.abs(player.speed) * 3.6) + '<small>km/h</small>';
      if (player.mesh.userData.shield) player.mesh.userData.shield.visible = player.shieldT > 0;
      if (abEl) { const A = Stats.ABILITY[player.ability], ready = player.abCd <= 0;
        abEl.style.borderColor = A.color; abEl.style.opacity = ready ? 1 : 0.55;
        abEl.innerHTML = '<b style="color:' + A.color + '">' + player.ability.toUpperCase() + '</b><small>' + (player.abT > 0 ? 'ACTIVE' : ready ? 'SPACE' : player.abCd.toFixed(1) + ' s') + '</small>'; }
      Wp.hud(state);
      if (boss) { const bp = Math.max(0, boss.hp / boss.maxHp); bossFill.style.width = (bp * 100).toFixed(1) + '%';
        const bd = Math.round((boss.s - player.s) * SEG);
        bossText.textContent = boss.name.toUpperCase() + '  ' + Math.round(Math.max(0, boss.hp)).toLocaleString() + ' / ' + Math.round(boss.maxHp).toLocaleString() + (boss.destroyed ? '  ·  WRECKED' : boss.finished ? '' : '  ·  ' + Math.abs(bd) + ' m ' + (bd > 0 ? 'ahead' : 'behind') + '  ·  you dealt ' + Math.round(bossDmg / boss.maxHp * 100) + '%'); }
      let warn = '';
      if (state !== 'countdown') {
        if (player.gliding) warn = 'GLIDING!'; else if (player.air) warn = player.wings ? 'AIRBORNE! Hold W to glide' : 'AIRBORNE!';
        else if (player.zone) warn = player.zone.zt.label + '!';
        else if (!player.onRoad) warn = L.off + '!';
        if (inStorm) warn = (warn ? warn + ' ' : '') + L.storm + '!';
        for (const q of pits) { const dx = q.c.x - player.pos.x, dy = q.c.y - player.pos.y; if (dx * dx + dy * dy < 900) { warn = (warn ? warn + ' ' : '') + 'PIT!'; break; } }
      }
      const alive = cars.filter(c => !c.crashed && !c.destroyed).length;
      const danger = pos > cars.length - P.elimCount;
      info.innerHTML = '<b>' + P.world + '</b> &nbsp;|&nbsp; <b style="color:' + (danger ? '#ff6b6b' : '#fff') + '">' + ordinal(pos) + '</b> of ' + cars.length +
        ' &nbsp;|&nbsp; ' + raceTime.toFixed(1) + ' s &nbsp;|&nbsp; ' +
        Math.min(100, Math.max(0, Math.round(player.s / STEPS * 100))) + '%' + (warn ? ' &nbsp;<span style="color:#ffd166">' + warn + '</span>' : '') +
        '<br><small>' + (danger ? '<span style="color:#ff6b6b">IN THE ELIMINATION ZONE</span> · ' : '') + 'last place is eliminated · ' + (cars.length - alive) + ' wrecked or fallen' + (playerKills ? ' · you wrecked ' + playerKills : '') + '</small>';
      let line3 = '';
      if (target) {
        const dist = Math.round((target.s - player.s) * SEG);
        line3 += '<span style="color:#ffd166">TARGET ' + target.name + ': ' + (bountyClaimed ? 'WRECKED - claimed!' : target.destroyed || target.crashed ? 'lost' :
          (Math.abs(dist) < 15 ? 'right here!' : Math.abs(dist) + ' m ' + (dist > 0 ? 'ahead' : 'behind')) + ' · health ' + Math.max(0, Math.round(target.hp))) + '</span>';
      }
      const liveH = hunters.filter(h => !h.destroyed && !h.crashed);
      if (hunters.length && P.hunterKnown) {
        let nh = null; for (const h of liveH) if (!nh || Math.abs(h.s - player.s) < Math.abs(nh.s - player.s)) nh = h;
        line3 += ' &nbsp; <span style="color:#c77dff">' + liveH.length + '/' + hunters.length + ' HUNTERS' + (nh ? ' · nearest ' + nh.name + ' ' + Math.abs(Math.round((nh.s - player.s) * SEG)) + ' m ' + (nh.s > player.s ? 'ahead' : 'behind') : '') + '</span>';
      } else if (liveH.some(h => Math.hypot(h.pos.x - player.pos.x, h.pos.y - player.pos.y) < 40) && raceTime > 6) line3 += ' &nbsp; <span style="color:#c77dff">' + (hunters.length > 1 ? hunters.length + ' hunters are' : 'Someone is') + ' coming for you...</span>';
      line3 += ' &nbsp; <span style="color:#ffd23f">coins ' + player.coins + '</span>' + (player.shortcuts ? ' &nbsp; <span style="color:#ffb703">shortcuts ' + player.shortcuts + '</span>' : '') + ' &nbsp; <span style="color:#9ad1ff">air ' + player.airTime.toFixed(1) + 's</span>';
      if (ghosts.size) {
        const me = { name: 'You', s: player.s, fin: player.finished ? player.finishTime : 0, dead: player.destroyed || player.crashed, you: true };
        const all = [me].concat([...ghosts.values()].map(g => ({ name: g.name, s: g.s, fin: g.fin, dead: g.dead })));
        all.sort((a, b) => (a.dead - b.dead) || ((b.fin ? 1 : 0) - (a.fin ? 1 : 0)) || (a.fin && b.fin ? a.fin - b.fin : b.s - a.s));
        line3 += '<br><span style="color:#7CFFB2">PLAYERS: ' + all.map((p, i) => (i + 1) + '. ' + (p.you ? '<b>You</b>' : esc(p.name)) + (p.dead ? ' (out)' : p.fin ? ' (finished)' : '')).join(' &nbsp; ') + '</span>';
      }
      if (toastT > 0) { toastT -= dt; line3 += '<br><b style="color:' + toastCol + '">' + toastMsg + '</b>'; }
      info.innerHTML += '<br>' + line3;
      drawMini();
      timeU.value += dt;
      lavaTex.offset.x += dt * 0.02; lavaTex.offset.y += dt * 0.013;
      for (const wm of waterMaps) { wm.offset.x += dt * 0.012; wm.offset.y += dt * 0.008; }
      cars.forEach((c, i) => {
        const dx = c.pos.x - player.pos.x, dz = c.pos.y - player.pos.y;
        if (c.crashed || c.falling || dx * dx + dz * dz > 120 * 120 || c.gh === undefined) { bs3.set(0, 0, 0); }
        else { const fade = Math.max(0, 1 - (c.y - c.gh) / 14), mo = c.mesh.userData.model; const sz = c.size || 1; bs3.set(4.2 * fade * sz, 1, (mo.wheels.length ? 2.6 : 2.2) * fade * sz); }
        be.set(0, -c.rot, 0); bq.setFromEuler(be); bv.set(c.pos.x, (c.gh || 0) + 0.22, c.pos.y); bm4.compose(bv, bq, bs3); blobs.setMatrixAt(i, bm4);
      });
      blobs.instanceMatrix.needsUpdate = true;
      if (composer) { renderPass.scene = scene; renderPass.camera = camera; composer.render(dt); } else renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    Race._debug = { Wp, blocks, useAbility, get boss() { return boss; }, hurt, skipCountdown: () => { countdown = 0; }, specials, pushables, cars, player, paths, pits, zones, forks, ramps, pads, drops, coins, C, T, N, H, Hs, bends, target, hunters, LENGTH, get state() { return state; }, get bounty() { return bountyClaimed; } };
  }
  function setQuality(q) { quality = q; try { localStorage.setItem('rr_quality', q); } catch (e) {} if (renderer) { renderer.domElement.remove(); renderer.dispose(); renderer = null; composer = null; } }
  return { startRace, setQuality, getQuality: () => quality };
})();
