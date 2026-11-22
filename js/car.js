// ===== Car: a Kenney model on Rapier's raycast vehicle =====
// The chassis is a rigid body. Each wheel is a spring that casts a ray at the ground (Rapier's DynamicRayCastVehicleController),
// so suspension, bumps, banking and tyre grip come from the physics engine. The wheels sit where the Kenney model's wheels are.
// On top, a few arcade helpers: downforce at speed, an assist that keeps the car upright, and the drift.
// Drift: at speed, turn hard and tap the brake. The rear tyres lose most of their side grip, so the rear swings out while the
// engine keeps pushing. Steering into it holds it; straightening up gives the grip back. S brakes; once stopped it reverses.
const Car = (function () {
  // every number here can be changed live in the tuning panel (Tab)
  const DEF = {
    topSpeed: 52, accel: 14, brake: 26, reverse: 8,
    steerLock: 0.5, steerFall: 32, steerSpeed: 4,
    tyreGrip: 3.2, sideGrip: 1.4, rearGrip: 1.0, downforce: 0.6, offGrip: 0.55, offTop: 0.62,
    suspStiff: 70, suspDamp: 4, suspTravel: 0.3, gravity: 20, upright: 6, yawDamp: 0.6, comY: -0.5,
    driftEase: 0.6, driftMinSpeed: 15, driftRearGrip: 0.12, driftHoldBank: 0.85, driftKick: 0.5, driftTurn: 1.6, driftGrip: 1.6, driftMax: 45, driftScrub: 0.18, driftBrake: 0.25, driftRecover: 0.3,
    camDist: 9.5, camHeight: 3.6, camLag: 7, camLook: 6, fov: 62, fovBoost: 14
  };
  const MASS = 1000, REST = 0.32;

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
    Object.assign(c, { hint: g.i, ground: g, drifting: false, driftT: 0, rearMul: 1, steer: 0, prevBrake: false, speed: 0, vx: 0, vz: 0 });
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
    const v = c.veh, rb = c.rb, lv = rb.linvel(), av = rb.angvel(), r = rb.rotation();
    tq.set(r.x, r.y, r.z, r.w);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(tq), right = new THREE.Vector3(-1, 0, 0).applyQuaternion(tq), up = new THREE.Vector3(0, 1, 0).applyQuaternion(tq);
    const u = lv.x * fwd.x + lv.y * fwd.y + lv.z * fwd.z, lat = lv.x * right.x + lv.y * right.y + lv.z * right.z, sp = Math.hypot(lv.x, lv.z);
    const g = Track.surface(c.x, c.z, c.hint); c.hint = g.i; c.ground = g;
    const off = !g.onRoad, top = T.topSpeed * (off ? T.offTop : 1);
    let contacts = 0; for (let i = 0; i < c.wheels.length; i++) if (v.wheelIsInContact(i)) contacts++;
    c.air = contacts === 0; c.airT = c.air ? (c.airT || 0) + dt : 0;

    // steering: a steady ramp toward the input, less lock at speed
    const rate = T.steerSpeed * dt; c.steer += Math.max(-rate, Math.min(rate, inp.steer - c.steer));
    const steerAngle = -c.steer * T.steerLock / (1 + Math.max(0, u) / T.steerFall);

    // slide angle between where the car points and where it travels
    const slide = sp > 2 && u > 0 ? Math.atan2(lat, u) : 0;

    // ---- drift: hard steer + brake tap at speed ----
    // Outside a drift the Rapier tyres do everything. In a drift their side grip drops right down and an arcade rule steers the
    // slide: steering into it tightens it, easing off widens it, counter-steering straightens it; most of the speed is kept.
    const tapped = inp.brake && !c.prevBrake; c.prevBrake = inp.brake;
    if (!c.drifting && !c.air && u > T.driftMinSpeed && Math.abs(inp.steer) >= T.driftEase && tapped) {
      c.drifting = true; c.driftDir = Math.sign(inp.steer); c.driftT = 0;
      const kick = -c.driftDir * T.driftKick; rb.setAngvel({ x: av.x + up.x * kick, y: av.y + up.y * kick, z: av.z + up.z * kick }, true);
    }
    if (c.drifting) {
      c.driftT += dt;
      const into = c.steer * c.driftDir;
      if ((into < 0.2 && Math.abs(slide) < 0.1 && c.driftT > 0.25) || u < T.driftMinSpeed * 0.6 || c.airT > 0.2) c.drifting = false;
    }
    if (c.drifting && !c.air) {
      const into = Math.max(-1, Math.min(1, c.steer * c.driftDir)), w = rb.angvel();
      // rotation: aim for a turn rate set by how hard you steer into the drift
      const yawNow = w.x * up.x + w.y * up.y + w.z * up.z, yawT = -c.driftDir * T.driftTurn * (0.45 + 0.55 * into), dy = (yawT - yawNow) * Math.min(1, 12 * dt);
      rb.setAngvel({ x: w.x + up.x * dy, y: w.y + up.y * dy, z: w.z + up.z * dy }, true);
      // travel: the direction of travel catches up with the nose slowly (faster when counter-steering), speed is mostly kept
      const v2 = rb.linvel(), hs = Math.hypot(v2.x, v2.z);
      if (hs > 1) {
        const heading = Math.atan2(fwd.x, fwd.z); let travel = Math.atan2(v2.x, v2.z), d = heading - travel;
        while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
        const maxS = T.driftMax * Math.PI / 180; if (Math.abs(d) > maxS) { travel = heading - Math.sign(d) * maxS; d = Math.sign(d) * maxS; }
        travel += d * Math.min(1, T.driftGrip * (1 + 2 * Math.max(0, -into)) * dt);
        const keep = hs * (1 - T.driftScrub * Math.abs(Math.sin(d)) * 2 * dt);
        rb.setLinvel({ x: Math.sin(travel) * keep, y: v2.y, z: Math.cos(travel) * keep }, true);
      }
    }
    // with so little side grip, gravity would slide a drifting car down a banked bend: cancel most of that downhill pull
    if (c.drifting && !c.air) {
      const gy = -T.gravity, gn = g.nx * 0 + g.ny * gy, px = -g.nx * gn, py = gy - g.ny * gn, pz = -g.nz * gn, kk = T.driftHoldBank * MASS * dt;
      rb.applyImpulse({ x: -px * kk, y: -py * kk, z: -pz * kk }, true);
    }
    // tyre side grip eases down in a drift and back up after it
    const rearTarget = c.drifting ? T.driftRearGrip : 1;
    c.rearMul += (rearTarget - c.rearMul) * Math.min(1, dt / Math.max(0.02, c.drifting ? 0.06 : T.driftRecover));
    // ---- wheels: steering, engine, brakes, grip ----
    const thrust = inp.throttle ? MASS * T.accel * Math.max(0, 1 - (Math.max(0, u) / top) ** 3) : 0;
    let engine = thrust, brake = 0;
    if (inp.brake) { if (u > 1) brake = MASS * T.brake * (c.drifting ? T.driftBrake : 1) * dt; else engine = -MASS * T.reverse * Math.max(0, 1 - Math.max(0, -u) / 14); }
    else if (!inp.throttle) brake = MASS * 1.5 * dt;                                   // engine braking when you lift
    const rears = c.wheels.filter(w => !w.front).length || 2;
    for (let i = 0; i < c.wheels.length; i++) {
      const w = c.wheels[i];
      v.setWheelSteering(i, w.front ? steerAngle * (1 - 0.85 * (1 - c.rearMul) / (1 - Math.min(0.99, T.driftRearGrip))) : 0);   // in a drift the drift rule sets the rotation, not the front wheels
      v.setWheelEngineForce(i, w.front ? 0 : engine / rears);
      v.setWheelBrake(i, brake / c.wheels.length);
      const grip = T.tyreGrip * (off ? T.offGrip : 1) * (w.front ? 1 : T.rearGrip);
      v.setWheelFrictionSlip(i, grip); v.setWheelSideFrictionStiffness(i, T.sideGrip * c.rearMul);
    }

    // ---- arcade helpers ----
    // downforce presses the car down as speed rises; drag and grass slow you
    const down = T.downforce * MASS * (sp / T.topSpeed) ** 2 * 20 * dt;
    rb.applyImpulse({ x: -up.x * down, y: -up.y * down, z: -up.z * down }, true);
    const drag = (0.0006 * sp * sp + (off ? 0.5 * sp : 0)) * MASS * dt;
    if (sp > 0.1) rb.applyImpulse({ x: -lv.x / sp * drag, y: 0, z: -lv.z / sp * drag }, true);
    // keep the car upright: a gentle push back toward the ground's tilt (weaker in the air)
    const gn = new THREE.Vector3(g.nx, g.ny, g.nz), tilt = new THREE.Vector3().crossVectors(up, gn);
    const k = T.upright * (c.air ? 0.4 : 1) * MASS * dt * 3;
    rb.applyTorqueImpulse({ x: tilt.x * k, y: tilt.y * k, z: tilt.z * k }, true);
    // yaw damping outside drifts keeps straights calm; in a drift it's off so the rear can swing
    if (!c.drifting) {
      const yawRate = av.x * up.x + av.y * up.y + av.z * up.z, kd = T.yawDamp * (Math.abs(c.steer) > 0.1 ? 0.3 : 1) * MASS * dt * 2;
      rb.applyTorqueImpulse({ x: -up.x * yawRate * kd, y: -up.y * yawRate * kd, z: -up.z * yawRate * kd }, true);
    }

    v.updateVehicle(dt);
    Phys.step();
    readState(c);
    const lv2 = rb.linvel(); c.vx = lv2.x; c.vz = lv2.z; c.speed = u;
    c.slipR = slide; c.slip = Math.abs(Math.sin(slide)) * sp * (c.drifting ? 1 : 0.6); c.latA = lat; c.lonA = thrust / MASS;
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
