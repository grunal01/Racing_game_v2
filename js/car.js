// ===== Car: a Kenney model as an arcade kart (R1.8), on Rapier suspension =====
// Rapier (the physics engine) only does the springs: each wheel is a suspension ray, so bumps, banking and landings feel real.
// Everything on the road plane is an arcade rule, Mario Kart style: the engine pushes the whole kart forward (no rear-wheel drive),
// steering turns where the kart points, and its direction of travel catches up with its nose at the grip rate. Low grip = it slides
// through bends, but steering always works in a slide, so you can hold your line. Tap the brake while turning for a bigger slide.
// S brakes; once stopped it reverses.
const Car = (function () {
  // every number here can be changed live in the tuning panel (Tab)
  const DEF = {
    topSpeed: 50, accel: 15, brake: 26, reverse: 8,
    turnRate: 1.8, turnFall: 100, steerSpeed: 5,
    grip: 3.2, slideMax: 40, slideHold: 0.35, slideScrub: 0.12, offGrip: 0.6, offTop: 0.62,
    driftEase: 0.5, driftMinSpeed: 12, driftKick: 0.2, driftTurn: 1.4, driftGrip: 1.4, driftBrake: 0.3, regrip: 0.8,
    suspStiff: 60, suspDamp: 4, suspTravel: 0.3, gravity: 20, comY: -0.4,
    camDist: 9.5, camHeight: 3.6, camLag: 7, camLook: 6, fov: 62, fovBoost: 14
  };
  const MASS = 1000, REST = 0.32;
  const angDiff = (x, y) => { let d = x - y; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

  function create(scene, modelName) {
    const c = {
      x: 0, y: 0, z: 0, yaw: 0, vx: 0, vz: 0, speed: 0, steer: 0, hint: -1, ground: null, air: false,
      drifting: false, driftT: 0, driftDir: 0, rearMul: 1, slipR: 0, slip: 0, latA: 0, lonA: 0,
      mesh: new THREE.Group(), body: new THREE.Group(), wheels: [], model: null, rb: null, veh: null,
      prev: { p: new THREE.Vector3(), q: new THREE.Quaternion() }, cur: { p: new THREE.Vector3(), q: new THREE.Quaternion() },
      ix: 0, iy: 0, iz: 0, iyaw: 0, prevBrake: false
    };
    c.mesh.add(c.body); scene.add(c.mesh);
    setModel(c, modelName);
    return c;
  }

  // swap the visible model; all cars share one length so handling stays comparable. The physics wheels follow the model's wheels.
  function setModel(c, name) {
    if (c.model) c.body.remove(c.model);
    const src = Assets.car(name); if (!src) return;
    const m = src.clone(true), box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3());
    const k = 4.4 / Math.max(size.z, 0.01); m.scale.setScalar(k); m.position.y = -box.min.y * k;
    m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    c.body.add(m); c.model = m; c.name = name; c.scale = k;
    c.mesh.updateMatrixWorld(true);
    // where the wheels are, in car space (metres), and how big they are
    c.wheels = []; const inv = new THREE.Matrix4().copy(c.body.matrixWorld).invert();
    m.traverse(o => {
      if (!/^wheel-/.test(o.name)) return;
      o.rotation.order = 'YXZ';
      const wb = new THREE.Box3().setFromObject(o), ctr = wb.getCenter(new THREE.Vector3()).applyMatrix4(inv), r = (wb.max.y - wb.min.y) / 2 / (c.mesh.scale.y || 1);
      c.wheels.push({ o, front: /front/.test(o.name), baseY: o.rotation.y, baseX: o.rotation.x, basePosY: o.position.y, sgn: Math.cos(o.rotation.y) >= 0 ? 1 : -1, at: ctr, r: Math.max(0.2, r) });
    });
    // fallback for any model without named wheels: four corners
    if (c.wheels.length < 4) c.wheels = [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([sx, sz]) => ({ o: null, front: sz > 0, at: new THREE.Vector3(sx * size.x * k * 0.38, 0.38, sz * 4.4 * 0.32), r: 0.38 }));
    c.dims = { hx: size.x * k / 2, hz: 2.2, h: size.y * k };
    if (Phys.ready) buildBody(c);
  }

  function buildBody(c) {
    const W = Phys.world;
    const state = c.rb ? { p: c.rb.translation(), q: c.rb.rotation(), v: c.rb.linvel(), w: c.rb.angvel() } : null;
    if (c.veh) { W.removeVehicleController(c.veh); c.veh = null; }
    if (c.rb) { W.removeRigidBody(c.rb); c.rb = null; }
    const d = c.dims, hy = Math.min(0.45, d.h * 0.3), wheelTop = Math.max(...c.wheels.map(w => w.at.y));
    // mass sits low and the yaw inertia is generous, so the car is stable but can still rotate into a drift
    const Ix = MASS / 12 * ((2 * hy) ** 2 + 4.4 ** 2), Iy = MASS / 12 * ((2 * d.hx) ** 2 + 4.4 ** 2) * 1.2, Iz = MASS / 12 * ((2 * hy) ** 2 + (2 * d.hx) ** 2);
    const desc = RAPIER.RigidBodyDesc.dynamic().setCanSleep(false).setTranslation(0, 2, 0)
      .setAdditionalMassProperties(MASS, { x: 0, y: (lastTune || DEF).comY, z: 0 }, { x: Ix, y: Iy, z: Iz }, { x: 0, y: 0, z: 0, w: 1 }).setAngularDamping(0.4);
    c.rb = W.createRigidBody(desc);
    // the body sits clear above the wheels and slides if it ever touches, so a squashed suspension never acts as a brake
    W.createCollider(RAPIER.ColliderDesc.cuboid(d.hx * 0.92, hy, d.hz * 0.95).setTranslation(0, wheelTop + hy + 0.12, 0).setDensity(0).setFriction(0).setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min), c.rb);
    const veh = W.createVehicleController(c.rb);
    veh.indexUpAxis = 1; veh.setIndexForwardAxis = 2;
    for (const w of c.wheels) veh.addWheel({ x: w.at.x, y: w.at.y + REST, z: w.at.z }, { x: 0, y: -1, z: 0 }, { x: -1, y: 0, z: 0 }, REST, w.r);
    c.veh = veh; c._comY = (lastTune || DEF).comY; applyTuning(c, lastTune || DEF);
    if (state) { c.rb.setTranslation(state.p, true); c.rb.setRotation(state.q, true); c.rb.setLinvel(state.v, true); c.rb.setAngvel(state.w, true); }
  }
  let lastTune = null, lastSig = '';
  function applyTuning(c, T) {
    const v = c.veh; if (!v) return;
    for (let i = 0; i < c.wheels.length; i++) {
      v.setWheelSuspensionStiffness(i, T.suspStiff); v.setWheelSuspensionCompression(i, T.suspDamp); v.setWheelSuspensionRelaxation(i, T.suspDamp * 1.2);
      v.setWheelMaxSuspensionTravel(i, T.suspTravel); v.setWheelMaxSuspensionForce(i, 1e6);
    }
    lastTune = T; lastSig = T.suspStiff + ',' + T.suspDamp + ',' + T.suspTravel;
  }

  function place(c, x, z, yaw) {
    if (!c.rb) buildBody(c);
    const g = Track.surface(x, z, -1), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    c.rb.setTranslation({ x, y: g.y + 0.5, z }, true); c.rb.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
    c.rb.setLinvel({ x: 0, y: 0, z: 0 }, true); c.rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
    Object.assign(c, { hint: g.i, ground: g, drifting: false, driftT: 0, steer: 0, speed: 0, vx: 0, vz: 0, kick: 0, prevBrake: false, airT: 0, regripT: 0 });
    readState(c); c.prev.p.copy(c.cur.p); c.prev.q.copy(c.cur.q);
  }
  // give a velocity along the heading (used by tests and resets)
  function setSpeed(c, v) { const f = forward(c); c.rb.setLinvel({ x: f.x * v, y: 0, z: f.z * v }, true); }

  const tq = new THREE.Quaternion(), tv = new THREE.Vector3();
  function forward(c) { const r = c.rb.rotation(); return new THREE.Vector3(0, 0, 1).applyQuaternion(tq.set(r.x, r.y, r.z, r.w)); }
  function readState(c) {
    const p = c.rb.translation(), r = c.rb.rotation();
    c.cur.p.set(p.x, p.y, p.z); c.cur.q.set(r.x, r.y, r.z, r.w);
    const f = tv.set(0, 0, 1).applyQuaternion(c.cur.q); c.yaw = Math.atan2(f.x, f.z);
    c.x = p.x; c.y = p.y; c.z = p.z;
  }

  // one fixed physics step. input: { throttle, brake, steer (-1 left .. 1 right) }
  function step(c, T, inp, dt) {
    if (lastSig !== T.suspStiff + ',' + T.suspDamp + ',' + T.suspTravel) applyTuning(c, T);
    if (c._comY !== T.comY) { lastTune = T; buildBody(c); }
    Phys.setGravity(T.gravity);
    const v = c.veh, rb = c.rb, r = rb.rotation();
    tq.set(r.x, r.y, r.z, r.w);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(tq), f3 = new THREE.Vector3(0, 0, 1).applyQuaternion(tq);
    const fl = Math.hypot(f3.x, f3.z) || 1, fx = f3.x / fl, fz = f3.z / fl;   // flat forward direction
    const g = Track.surface(c.x, c.z, c.hint); c.hint = g.i; c.ground = g;
    const off = !g.onRoad, top = T.topSpeed * (off ? T.offTop : 1);
    let contacts = 0; for (let i = 0; i < c.wheels.length; i++) if (v.wheelIsInContact(i)) contacts++;
    c.air = contacts === 0; c.airT = c.air ? (c.airT || 0) + dt : 0;
    const grounded = contacts >= 1;

    // the wheels are only springs: no tyre forces from the physics engine (the front wheels still turn, for looks)
    const rate = T.steerSpeed * dt; c.steer += Math.max(-rate, Math.min(rate, inp.steer - c.steer));
    for (let i = 0; i < c.wheels.length; i++) {
      v.setWheelSteering(i, c.wheels[i].front ? -c.steer * 0.45 : 0); v.setWheelEngineForce(i, 0); v.setWheelBrake(i, 0);
      v.setWheelFrictionSlip(i, 0); v.setWheelSideFrictionStiffness(i, 0);
    }

    let lv = rb.linvel();
    let sp = Math.hypot(lv.x, lv.z), u = lv.x * fx + lv.z * fz;
    const heading = Math.atan2(fx, fz), travel0 = sp > 0.5 ? Math.atan2(lv.x, lv.z) : heading;
    const slide = u > 0.5 ? angDiff(travel0, heading) : 0;

    // ---- brake slide: tap the brake while turning hard at speed ----
    const tapped = inp.brake && !c.prevBrake; c.prevBrake = inp.brake;
    if (!c.drifting && grounded && u > T.driftMinSpeed && Math.abs(inp.steer) >= T.driftEase && tapped) { c.drifting = true; c.driftDir = Math.sign(inp.steer); c.driftT = 0; c.kick = T.driftKick; }
    if (c.drifting) {
      c.driftT += dt; const into = c.steer * c.driftDir;
      if ((into < 0.2 && Math.abs(slide) < 0.1 && c.driftT > 0.25) || u < T.driftMinSpeed * 0.6 || c.airT > 0.25) { c.drifting = false; c.regripT = T.regrip; }
    }

    // ---- rotation: steering turns where the kart points ----
    const au = Math.abs(u);
    let yawT = -c.steer * T.turnRate * Math.min(1, au / 6) / (1 + au / T.turnFall) * (u < -0.5 ? -1 : 1);
    if (c.drifting) { const into = Math.max(-1, Math.min(1, c.steer * c.driftDir)); yawT = -c.driftDir * T.driftTurn * (0.45 + 0.55 * into); }
    if (c.kick > 0) { yawT -= c.driftDir * c.kick * 8; c.kick = Math.max(0, c.kick - dt * 8 * T.driftKick); }
    const w = rb.angvel(), yawNow = w.x * up.x + w.y * up.y + w.z * up.z;
    const steerAuthority = grounded ? 1 : 0.15;   // a little control in the air
    const dy = (yawT - yawNow) * Math.min(1, 14 * dt) * steerAuthority;
    // also calm any roll or pitch wobble a little, so the kart sits flat on its springs
    rb.setAngvel({ x: (w.x + up.x * dy) * (1 - 2 * dt), y: w.y + up.y * dy, z: (w.z + up.z * dy) * (1 - 2 * dt) }, true);

    if (grounded) {
      // ---- speed: the engine pushes the whole kart forward; brakes; drag ----
      let acc = 0;
      if (inp.throttle) acc += T.accel * 1.25 * Math.max(0, 1 - (Math.max(0, u) / top) ** 3);
      if (inp.brake) acc += u > 1 ? -T.brake * (c.drifting ? T.driftBrake : 1) : -T.reverse * Math.max(0, 1 - Math.max(0, -u) / 14);
      if (!inp.throttle && !inp.brake) acc -= 0.3 * u;
      acc -= 0.0012 * u * Math.abs(u) * (off ? 4 : 1);
      let uu = u + acc * dt;
      // ---- sliding: the direction of travel catches up with the nose at the grip rate ----
      const back = uu < 0, hd = back ? heading + Math.PI : heading;
      let tr = sp > 0.5 ? Math.atan2(lv.x, lv.z) : hd, d = angDiff(hd, tr);
      const maxS = (c.drifting ? Math.max(T.slideMax, 45) : T.slideMax) * Math.PI / 180;
      if (Math.abs(d) > maxS) { tr = hd - Math.sign(d) * maxS; d = Math.sign(d) * maxS; }
      const into = c.drifting ? c.steer * c.driftDir : 0;
      let base = T.grip;
      // just out of a brake slide: grip comes back over a moment instead of snapping on
      if (c.regripT > 0) { c.regripT = Math.max(0, c.regripT - dt); const k = T.regrip > 0 ? c.regripT / T.regrip : 0; base = T.grip + (T.driftGrip - T.grip) * k * k; }
      // the further sideways, the weaker the grip, so a big slide carries further before it hooks up again
      const hold = 1 - T.slideHold * Math.min(1, Math.abs(d) / maxS);
      const follow = (c.drifting ? T.driftGrip * (1 + 2 * Math.max(0, -into)) : base * hold) * (off ? T.offGrip : 1);
      tr += d * Math.min(1, follow * dt);
      // keep the full speed through a slide (not just the forward part), minus a little scrub
      const mag = back ? Math.abs(uu) : Math.max(0, sp + acc * dt);
      const speed = mag * (1 - T.slideScrub * Math.abs(Math.sin(d)) * 2 * dt);
      // keep the vertical speed from the springs; set the flat velocity
      rb.setLinvel({ x: Math.sin(tr) * speed, y: lv.y, z: Math.cos(tr) * speed }, true);
      // gravity would slide the kart sideways down a bank: cancel the sideways part (hills still pull along the road)
      const gy = -T.gravity, gn = g.ny * gy, px = -g.nx * gn, pz = -g.nz * gn, lx = Math.cos(heading), lz = -Math.sin(heading), side = px * lx + pz * lz;
      rb.applyImpulse({ x: -lx * side * MASS * dt, y: 0, z: -lz * side * MASS * dt }, true);
      c.lonA = acc;
    }

    v.updateVehicle(dt);
    Phys.step();
    readState(c);
    const lv2 = rb.linvel(); c.vx = lv2.x; c.vz = lv2.z;
    c.speed = lv2.x * fx + lv2.z * fz;
    const sp2 = Math.hypot(lv2.x, lv2.z);
    c.slipR = c.speed > 0.5 ? angDiff(Math.atan2(lv2.x, lv2.z), heading) : 0;
    c.slip = Math.abs(Math.sin(c.slipR)) * sp2; c.latA = c.speed * yawNow;
    if (!c.drifting) c.driftT = Math.abs(c.slipR) > 0.12 ? (c.driftT || 0) + dt : 0;
  }

  function savePrev(c) { c.prev.p.copy(c.cur.p); c.prev.q.copy(c.cur.q); }

  // visuals, every drawn frame: the body follows the physics (blended between steps), wheels follow suspension, spin and steering
  const iq = new THREE.Quaternion(), ip = new THREE.Vector3(), fv = new THREE.Vector3();
  function draw(c, dt, a) {
    ip.lerpVectors(c.prev.p, c.cur.p, a); iq.slerpQuaternions(c.prev.q, c.cur.q, a);
    c.mesh.position.copy(ip); c.mesh.quaternion.copy(iq);
    fv.set(0, 0, 1).applyQuaternion(iq); c.ix = ip.x; c.iy = ip.y; c.iz = ip.z; c.iyaw = Math.atan2(fv.x, fv.z);
    const v = c.veh; if (!v) return;
    for (let i = 0; i < c.wheels.length; i++) {
      const w = c.wheels[i]; if (!w.o) continue;
      const len = v.wheelSuspensionLength(i); if (len !== null && len !== undefined) w.o.position.y = w.basePosY + (REST - len) / c.scale;
      w.o.rotation.x = w.baseX + (v.wheelRotation(i) || 0) * w.sgn;
      if (w.front) w.o.rotation.y = w.baseY + (v.wheelSteering(i) || 0);
    }
  }
  return { create, setModel, place, setSpeed, step, savePrev, draw, buildBody, DEF };
})();
