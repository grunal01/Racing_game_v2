// ===== Car: a Kenney model on arcade physics =====
// The car is a point that slides over the track surface. Forward speed comes from throttle, brakes and drag. Sideways speed is
// killed by tyre grip up to a limit: ask for more than the limit and the car slides. Space lowers rear grip to kick it into a drift,
// and holding a drift charges a boost. Gravity pulls along slopes, so a banked bend helps hold you in the turn.
const Car = (function () {
  // every number here can be changed live in the tuning panel (Tab)
  const DEF = {
    topSpeed: 52, accel: 20, brake: 38, reverse: 11, coast: 0.25,
    steerRate: 1.9, steerFall: 38, steerEase: 7, yawEase: 9,
    grip: 30, gripStiff: 9, driftGrip: 0.42, driftYaw: 1.35, bankGrip: 1.2,
    boostTime: 0.9, boostPower: 14, offTop: 0.62, offGrip: 0.65,
    camDist: 9.5, camHeight: 3.6, camLag: 7, camLook: 6, fov: 62, fovBoost: 14
  };
  const G = 22;   // gravity, a little stronger than real for a planted arcade feel (m/s²)

  function create(scene, modelName) {
    const c = {
      x: 0, y: 0, z: 0, yaw: 0, vx: 0, vz: 0, vy: 0, yawRate: 0, steer: 0, hint: -1, ground: null,
      drifting: false, driftT: 0, boostT: 0, air: false, sus: 0, susV: 0, roll: 0, pitch: 0, wheelSpin: 0,
      mesh: new THREE.Group(), body: new THREE.Group(), wheels: [], model: null, speed: 0, slip: 0, latA: 0, lonA: 0
    };
    c.mesh.add(c.body); scene.add(c.mesh);
    setModel(c, modelName);
    return c;
  }

  // swap the visible model; all cars share one length so handling stays comparable
  function setModel(c, name) {
    if (c.model) c.body.remove(c.model);
    const src = Assets.car(name); if (!src) return;
    const m = src.clone(true), box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3());
    const k = 4.4 / Math.max(size.z, 0.01); m.scale.setScalar(k); m.position.y = -box.min.y * k;
    m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    c.wheels = [];
    m.traverse(o => { if (/^wheel-/.test(o.name)) { o.rotation.order = 'YXZ'; c.wheels.push({ o, front: /front/.test(o.name), baseY: o.rotation.y, baseX: o.rotation.x, sgn: Math.cos(o.rotation.y) >= 0 ? 1 : -1 }); } });
    c.model = m; c.body.add(m); c.name = name;
  }

  function place(c, x, z, yaw) {
    Object.assign(c, { x, z, yaw, vx: 0, vz: 0, vy: 0, yawRate: 0, steer: 0, hint: -1, driftT: 0, boostT: 0, drifting: false, air: false });
    const g = Track.surface(x, z, -1); c.hint = g.i; c.y = g.y; c.ground = g;
  }

  // one fixed physics step. input: { throttle, brake, steer (-1 left .. 1 right), drift }
  function step(c, T, inp, dt) {
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), rx = -Math.cos(c.yaw), rz = Math.sin(c.yaw);
    let vf = c.vx * fx + c.vz * fz, vl = c.vx * rx + c.vz * rz;
    const g = Track.surface(c.x, c.z, c.hint); c.hint = g.i; c.ground = g;
    const off = !g.onRoad, top = T.topSpeed * (off ? T.offTop : 1) + (c.boostT > 0 ? T.boostPower : 0);
    const bank = Math.acos(Math.min(1, g.ny));

    // steering eases toward the input; it turns less at very low speed and less again at high speed
    c.steer += (inp.steer - c.steer) * Math.min(1, T.steerEase * dt);
    const sp = Math.abs(vf);
    let yawT = -c.steer * T.steerRate * Math.min(1, sp / 7) / (1 + sp / T.steerFall) * Math.sign(vf || 1);
    c.drifting = inp.drift && sp > 12 && Math.abs(c.steer) > 0.2 && !c.air;
    if (c.drifting) yawT *= T.driftYaw;
    c.yawRate += (yawT - c.yawRate) * Math.min(1, T.yawEase * dt);
    if (!c.air) c.yaw += c.yawRate * dt;

    // forward: throttle, brakes, reverse, drag that caps the top speed
    let a = 0;
    if (!c.air) {
      if (inp.throttle) a += T.accel * Math.max(0, 1 - Math.max(0, vf) / top) * 1.6;
      if (c.boostT > 0) a += T.boostPower * 1.5;
      if (inp.brake) a += vf > 0.5 ? -T.brake : -T.reverse * Math.max(0, 1 - Math.max(0, -vf) / 14);
      if (!inp.throttle && !inp.brake) a -= T.coast * vf;
      if (vf > top) a -= (vf - top) * 1.5;
      if (off) a -= 0.6 * vf;
    }
    vf += a * dt;

    // sideways: grip kills sliding up to a limit; banking adds grip because the road pushes into the tyres
    if (!c.air) {
      let lim = T.grip * (off ? T.offGrip : 1) * (1 + T.bankGrip * Math.sin(bank));
      if (c.drifting) lim *= T.driftGrip;
      const want = -vl * T.gripStiff, f = Math.max(-lim, Math.min(lim, want));
      vl += f * dt;
      c.slip = Math.abs(want) > lim ? Math.abs(vl) : 0;
    }
    // drift charge becomes a boost when you let go
    if (c.drifting) c.driftT += dt; else { if (c.driftT > 0.7) { c.boostT = T.boostTime * Math.min(2, c.driftT / 1.2); } c.driftT = 0; }
    if (c.boostT > 0) c.boostT -= dt;

    c.lonA = a; c.latA = vf * c.yawRate;
    c.vx = fx * vf + rx * vl; c.vz = fz * vf + rz * vl;
    // gravity along the slope (pulls you down a bank or a hill)
    if (!c.air) { c.vx += G * g.ny * g.nx * dt; c.vz += G * g.ny * g.nz * dt; }

    c.x += c.vx * dt; c.z += c.vz * dt;
    // vertical: stick to the ground, but leave it over a crest if moving up faster than the ground falls away
    const g2 = Track.surface(c.x, c.z, c.hint);
    if (c.air) { c.vy -= G * dt; c.y += c.vy * dt; if (c.y <= g2.y) { c.susV -= Math.min(6, -c.vy * 0.25); c.y = g2.y; c.vy = 0; c.air = false; } }
    else { const vyG = (g2.y - c.y) / dt; if (c.vy > vyG + 4 && c.vy > 3) { c.air = true; } else { c.vy = vyG; c.y = g2.y; } }
    c.speed = vf;
  }

  // visuals, every drawn frame: lean, pitch, suspension, wheels
  function draw(c, dt) {
    const g = c.ground || { nx: 0, ny: 1, nz: 0 };
    c.mesh.position.set(c.x, c.y, c.z);
    // align to the ground normal, then turn to the heading
    const up = new THREE.Vector3(g.nx, g.ny, g.nz), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    c.mesh.quaternion.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), c.yaw));
    for (let n = Math.min(8, Math.ceil(dt / 0.008)), h = dt / n, k = 0; k < n; k++) { c.susV += (-180 * c.sus - 12 * c.susV) * h; c.sus += c.susV * h; }
    c.roll += (Math.max(-0.09, Math.min(0.09, -c.latA * 0.004)) - c.roll) * Math.min(1, 8 * dt);
    c.pitch += (Math.max(-0.05, Math.min(0.05, -c.lonA * 0.0022)) - c.pitch) * Math.min(1, 8 * dt);
    c.body.rotation.set(c.pitch + c.sus * 0.05, 0, c.roll);
    c.body.position.y = c.sus * 0.4;
    c.wheelSpin += c.speed * dt / 0.45;
    for (const w of c.wheels) { w.o.rotation.x = w.baseX + c.wheelSpin * w.sgn; if (w.front) w.o.rotation.y = w.baseY - c.steer * 0.45; }
  }
  return { create, setModel, place, step, draw, DEF };
})();
