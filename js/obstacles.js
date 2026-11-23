// ===== Obstacles: the things to hit in the obstacle alley (the wide part of the start straight) =====
// Solid objects: a wall at a shallow angle (glancing hits), a wall at a steep angle, a rock to hit head-on, and a tree.
// Breakable walls: all or nothing. Hit one faster than "break speed" (only the speed INTO the wall counts) and it bursts
// into flying blocks; slower and it acts as a solid wall.
// How a hit feels (arcade, applied after the physics step): the kart's speed is split into the part going into the object
// and the part going along it. The "into" part is removed, plus a small bounce back on the first touch; the "along" part
// loses a little (more the more head-on the hit was). So a glancing hit scrapes along, a head-on hit crunches to a stop.
// Every hit reports its impact speed. H shows the hitboxes; walls rebuild each lap or with O.
const Obstacles = (function () {
  // positions along the start straight: s = metres from the start line, u = metres left of the centre line, a = angle to the road (degrees)
  const LAYOUT = [
    { kind: 'wall', s: 72, u: 8.5, a: -12, len: 16, h: 2.2, t: 0.8, label: 'shallow wall' },
    { kind: 'wall', s: 102, u: -7, a: 55, len: 9, h: 2.2, t: 0.8, label: 'steep wall' },
    { kind: 'rock', s: 127, u: 5, size: 3.4, label: 'rock' },
    { kind: 'tree', s: 148, u: -6, size: 9, label: 'tree' },
    { kind: 'break', s: 178, u: -8, len: 10, h: 2.4, label: 'breakable wall' },
    { kind: 'break', s: 198, u: 6, len: 10, h: 2.4, label: 'breakable wall' },
    { kind: 'break', s: 218, u: -1, len: 12, h: 2.4, label: 'breakable wall' }
  ];
  // per map: wall colour, block colours, rock tint, tree model and tint
  const LOOK = {
    country: { wall: 0x9a9890, block: [0x8d8a83, 0xa3a097, 0x7c7a74], rock: 0x8c8a86, tree: 'tree_oak_dark', treeTint: null },
    jungle:  { wall: 0x6f7560, block: [0x6b705b, 0x7d8468, 0x5d6250], rock: 0x6e6f64, tree: 'tree_palmTall', treeTint: null },
    tundra:  { wall: 0xb9c7d2, block: [0xc4d2dc, 0xaebfcb, 0xd6e1e8], rock: 0x9eafbd, tree: 'tree_tall_dark', treeTint: 0x8fa9a0 },
    desert:  { wall: 0xc08a5c, block: [0xc8683a, 0xb85e34, 0xd27a4a], rock: 0xc8683a, tree: 'cactus_tall', treeTint: null }
  };
  const CAR = 0x0001, DEBRIS = 0x0004;
  let scene = null, group = null, items = [], debris = [], byHandle = new Map(), showBoxes = false, boxGroup = null, lastHit = new Set(), map = 'desert', onHit = null;
  const W = () => Phys.world;

  function tinted(mat, tint) { if (tint == null) return mat; const c = mat.color, l = 0.3 * c.r + 0.59 * c.g + 0.11 * c.b, m = mat.clone(); m.color = new THREE.Color(tint).multiplyScalar(0.55 + 0.9 * l); return m; }
  function frame(o) {   // world position and yaw for a layout entry
    const m = Track.S[Math.round(o.s)], x = m.x + m.ox * o.u, z = m.z + m.oz * o.u, yaw = Math.atan2(m.hx, m.hz) + (o.a || 0) * Math.PI / 180;
    return { x, z, y: Track.roadY(m, o.u), yaw, q: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw) };
  }
  const rq = q => ({ x: q.x, y: q.y, z: q.z, w: q.w });

  // a Kenney model as a mesh group sized to `height`, plus hull points (optionally only those below `below` metres, e.g. a trunk)
  function model(name, height, tint, below) {
    const parts = Assets.parts(name), k = height / parts.h, g = new THREE.Group(), pts = [], p = new THREE.Vector3(), M = new THREE.Matrix4().makeScale(k, k, k);
    let minY = Infinity;
    for (const [geo, mat, rel] of parts) {
      const mesh = new THREE.Mesh(geo, tinted(mat, tint)); mesh.matrixAutoUpdate = false; mesh.matrix.multiplyMatrices(M, rel); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh);
      const pos = geo.attributes.position, MM = new THREE.Matrix4().multiplyMatrices(M, rel);
      for (let i = 0; i < pos.count; i++) { p.fromBufferAttribute(pos, i).applyMatrix4(MM); minY = Math.min(minY, p.y); pts.push(p.x, p.y, p.z); }
    }
    const keep = []; for (let i = 0; i < pts.length; i += 3) { pts[i + 1] -= minY; if (below == null || pts[i + 1] <= below) keep.push(pts[i], pts[i + 1], pts[i + 2]); }
    g.children.forEach(c => c.matrix.premultiply(new THREE.Matrix4().makeTranslation(0, -minY, 0)));
    return { g, pts: new Float32Array(keep) };
  }

  function addFixed(o, desc, meshes) {
    const f = frame(o), body = W().createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(f.x, f.y, f.z).setRotation(rq(f.q)));
    const col = W().createCollider(desc.setFriction(0.2), body);
    for (const mm of meshes) { mm.position.set(f.x, f.y, f.z); mm.quaternion.copy(f.q); group.add(mm); }
    const it = Object.assign({}, o, { body, col, meshes, f, broken: false });
    items.push(it); byHandle.set(col.handle, it); return it;
  }

  function build(sc, mapName) {
    scene = sc; map = mapName || map; clear();
    group = new THREE.Group(); scene.add(group);
    const L = LOOK[map] || LOOK.desert;
    for (const o of LAYOUT) {
      if (o.kind === 'wall') {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(o.t, o.h, o.len), new THREE.MeshLambertMaterial({ color: L.wall })); mesh.geometry.translate(0, o.h / 2, 0); mesh.castShadow = mesh.receiveShadow = true;
        addFixed(o, RAPIER.ColliderDesc.cuboid(o.t / 2, o.h / 2, o.len / 2).setTranslation(0, o.h / 2, 0), [mesh]);
      } else if (o.kind === 'rock') {
        const md = model('rock_tallF', o.size, L.rock); addFixed(o, RAPIER.ColliderDesc.convexHull(md.pts), [md.g]);
      } else if (o.kind === 'tree') {
        const md = model(L.tree, o.size, L.treeTint, 3);   // the hitbox is the trunk (the part the kart can reach)
        addFixed(o, RAPIER.ColliderDesc.convexHull(md.pts), [md.g]);
      } else if (o.kind === 'break') {
        // a stack of blocks (they become flying debris when it breaks), one solid box collider while it stands
        const bw = 1.25, bh = o.h / 2, nb = Math.round(o.len / bw), meshes = [];
        for (let r = 0; r < 2; r++) for (let i = 0; i < nb; i++) {
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.0, bh - 0.04, bw - 0.05), new THREE.MeshLambertMaterial({ color: L.block[(i * 7 + r * 3) % L.block.length] }));
          mesh.geometry.translate(0, bh / 2 + r * bh, -o.len / 2 + bw / 2 + i * bw + (r ? bw * 0.25 : 0) * 0); mesh.castShadow = mesh.receiveShadow = true; meshes.push(mesh);
        }
        const o2 = Object.assign({}, o, { a: 90, t: 1.0 });   // across the road
        addFixed(o2, RAPIER.ColliderDesc.cuboid(0.5, o.h / 2, o.len / 2).setTranslation(0, o.h / 2, 0), meshes);
      }
    }
    if (showBoxes) drawBoxes();
  }
  function clear() {
    for (const it of items) { if (it.body) W().removeRigidBody(it.body); }
    for (const d of debris) W().removeRigidBody(d.body);
    items = []; debris = []; byHandle.clear(); lastHit.clear();
    if (group) { scene.remove(group); group = null; }
    if (boxGroup) { scene.remove(boxGroup); boxGroup = null; }
  }
  const reset = () => { if (scene) build(scene, map); };

  // break a wall: its blocks fly off in the direction the kart was going
  function burst(it, vx, vz) {
    W().removeRigidBody(it.body); it.body = null; it.broken = true; byHandle.delete(it.col.handle);
    const e = new THREE.Euler(), q = new THREE.Quaternion(), v = new THREE.Vector3();
    for (const mesh of it.meshes) {
      mesh.updateMatrixWorld(true); mesh.geometry.computeBoundingBox();
      const c = mesh.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(mesh.matrixWorld), sz = mesh.geometry.boundingBox.getSize(new THREE.Vector3());
      mesh.geometry.center(); mesh.position.copy(c);
      const body = W().createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(c.x, c.y, c.z).setRotation(rq(mesh.quaternion)).setLinearDamping(0.1).setAngularDamping(0.3)
        .setLinvel(vx * (0.45 + Math.random() * 0.4) + (Math.random() - 0.5) * 6, 2 + Math.random() * 5, vz * (0.45 + Math.random() * 0.4) + (Math.random() - 0.5) * 6)
        .setAngvel({ x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8, z: (Math.random() - 0.5) * 8 }));
      W().createCollider(RAPIER.ColliderDesc.cuboid(sz.x / 2, sz.y / 2, sz.z / 2).setDensity(500).setFriction(0.7).setRestitution(0.15).setCollisionGroups((DEBRIS << 16) | (0xffff & ~CAR)), body);
      debris.push({ body, mesh });
    }
    if (showBoxes) drawBoxes();
  }

  // called by the car after each physics step: vPre / wPre = the kart's velocity just before the step
  function afterStep(c, T, vPre, wPre) {
    if (!c.col) return false;
    const rb = c.rb, now = new Set(); let hitInfo = null;
    W().contactPairsWith(c.col, other => {
      const it = byHandle.get(other.handle); if (!it || it.broken) return;
      let n = null;
      W().contactPair(c.col, other, (man, flipped) => { if (man.numContacts() > 0) { const nn = man.normal(); n = flipped ? { x: nn.x, z: nn.z } : { x: -nn.x, z: -nn.z }; } });
      if (!n) return;
      // n should point from the object towards the kart, flat
      const p = rb.translation(), ot = it.f; let nx = n.x, nz = n.z; const l = Math.hypot(nx, nz); if (l < 1e-4) return; nx /= l; nz /= l;
      if ((p.x - ot.x) * nx + (p.z - ot.z) * nz < 0 && it.kind !== 'wall' && it.kind !== 'break') { nx = -nx; nz = -nz; }
      now.add(it);
      const into = -(vPre.x * nx + vPre.z * nz); if (into <= 0.05) return;
      const first = !lastHit.has(it), sp = Math.hypot(vPre.x, vPre.z) || 1, f = Math.min(1, into / sp);
      if (it.kind === 'break' && first && into * 3.6 >= T.breakKmh) {
        burst(it, vPre.x, vPre.z);
        const keep = 1 - T.breakLoss; rb.setLinvel({ x: vPre.x * keep, y: rb.linvel().y, z: vPre.z * keep }, true); rb.setAngvel(wPre, true);
        hitInfo = { kmh: into * 3.6, it, broke: true }; return;
      }
      // remove the speed into the object; keep the speed along it (less of it the more head-on); bounce a little on first touch
      const tx = vPre.x + nx * into, tz = vPre.z + nz * into, keep = first ? 1 - T.scrape * f : 1 - 0.3 * dt0, back = first ? into * T.bounce : 0;
      rb.setLinvel({ x: tx * keep + nx * back, y: rb.linvel().y, z: tz * keep + nz * back }, true);
      rb.setAngvel({ x: wPre.x, y: wPre.y * (first ? 1 - 0.7 * f : 1), z: wPre.z }, true);
      if (first && into > 1.5) hitInfo = { kmh: into * 3.6, it, broke: false, glancing: f < 0.5 };
    });
    lastHit = now;
    if (hitInfo && onHit) onHit(hitInfo, T);
    return now.size > 0;
  }
  const dt0 = 1 / 120;

  // keep debris meshes on their bodies; keep hitbox outlines current
  const tq = new THREE.Quaternion();
  function draw(car) {
    for (const d of debris) { const t = d.body.translation(), r = d.body.rotation(); d.mesh.position.set(t.x, t.y, t.z); d.mesh.quaternion.set(r.x, r.y, r.z, r.w); }
    if (showBoxes && boxGroup && car && car.col) {
      const cb = boxGroup.userData.car; if (cb) { const t = car.col.translation(), r = car.col.rotation(); cb.position.set(t.x, t.y, t.z); cb.quaternion.set(r.x, r.y, r.z, r.w); }
      for (const d of boxGroup.userData.deb || []) { const t = d.col.translation(), r = d.col.rotation(); d.line.position.set(t.x, t.y, t.z); d.line.quaternion.set(r.x, r.y, r.z, r.w); }
    }
  }
  // hitbox outlines (H): every obstacle, the kart's body box, and debris
  const lineMat = new THREE.LineBasicMaterial({ color: 0x40e0ff, depthTest: false, transparent: true, opacity: 0.9 });
  function outline(col) {
    let geo;
    if (col.shape.type === RAPIER.ShapeType.Cuboid) { const h = col.halfExtents(); geo = new THREE.BoxGeometry(h.x * 2, h.y * 2, h.z * 2); }
    else { const v = col.vertices(), ix = col.indices(); if (!v || !ix) return null; geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(v), 3)); geo.setIndex(Array.from(ix)); }
    const line = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), lineMat); line.renderOrder = 10;
    const t = col.translation(), r = col.rotation(); line.position.set(t.x, t.y, t.z); line.quaternion.set(r.x, r.y, r.z, r.w);
    return line;
  }
  function drawBoxes(car) {
    if (boxGroup) scene.remove(boxGroup);
    boxGroup = new THREE.Group(); boxGroup.userData.deb = [];
    for (const it of items) if (!it.broken) { const l = outline(it.col); if (l) boxGroup.add(l); }
    for (const d of debris) { const col = d.body.collider(0), l = outline(col); if (l) { boxGroup.add(l); boxGroup.userData.deb.push({ col, line: l }); } }
    const cc = (car || window.__game && window.__game.car); if (cc && cc.col) { const l = outline(cc.col); boxGroup.add(l); boxGroup.userData.car = l; }
    scene.add(boxGroup);
  }
  function toggleBoxes() { showBoxes = !showBoxes; if (showBoxes) drawBoxes(); else if (boxGroup) { scene.remove(boxGroup); boxGroup = null; } return showBoxes; }
  return { build, reset, afterStep, draw, toggleBoxes, set onHit(f) { onHit = f; }, get items() { return items; }, get debris() { return debris; }, LAYOUT, CAR, DEBRIS };
})();
