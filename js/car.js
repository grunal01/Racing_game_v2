// ===== Car: a Kenney model on simple two-axle physics =====
// The car has a front and a rear axle. Each axle's tyres grip sideways up to a limit and then fade smoothly into a slide.
// Braking or lifting shifts weight forward: the rear gets lighter, loses grip, and the car rotates into a drift, PolyTrack-style.
// No drift button: S brakes, and once stopped it reverses. The rear wheels drive. Banking and downforce add grip.
const Car = (function () {
  // every number here can be changed live in the tuning panel (Tab)
  const DEF = {
    topSpeed: 52, accel: 17, brake: 30, reverse: 9,
    gripF: 4.2, gripR: 4.4, tyrePeak: 9, tyreFade: 1.25, driftMax: 32, driftCatch: 10, weightShift: 0.5, downforce: 0.7, bankGrip: 1.0,
    steerLock: 0.5, steerSpeed: 5, steerFall: 45, yawInertia: 1.7, brakeRear: 0.5, traction: 0.55,
    offTop: 0.62, offGrip: 0.6,
    camDist: 9.5, camHeight: 3.6, camLag: 7, camLook: 6, fov: 62, fovBoost: 14
  };
  const G = 22;          // gravity for slopes and air, a little stronger than real for a planted arcade feel (m/s²)
  const GT = 9.81;       // gravity for tyre load: grip numbers above are in "g"
  const A = 1.25, B = 1.35;   // centre of mass to front and rear axle (m)

  function create(scene, modelName) {
    const c = {
      x: 0, y: 0, z: 0, yaw: 0, vx: 0, vz: 0, vy: 0, yawRate: 0, steer: 0, hint: -1, ground: null,
      drifting: false, driftT: 0, boostT: 0, air: false, sus: 0, susV: 0, roll: 0, pitch: 0, wheelSpin: 0, ax: 0,
      mesh: new THREE.Group(), body: new THREE.Group(), wheels: [], model: null, speed: 0, slip: 0, latA: 0, lonA: 0, slipR: 0, quat: new THREE.Quaternion()
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
    Object.assign(c, { x, z, yaw, vx: 0, vz: 0, vy: 0, yawRate: 0, steer: 0, hint: -1, driftT: 0, boostT: 0, drifting: false, air: false, ax: 0 });
    const g = Track.surface(x, z, -1); c.hint = g.i; c.y = g.y; c.ground = g; c.quatInit = false;
  }

  // tyre curve: grip rises with slip angle, peaks, then fades gently (never a hard on/off switch)
  const tyre = (alpha, T) => Math.sin(T.tyreFade * Math.atan(T.tyrePeak * alpha));

  // one fixed physics step. input: { throttle, brake, steer (-1 left .. 1 right) }
  function step(c, T, inp, dt) {
    const g = Track.surface(c.x, c.z, c.hint); c.hint = g.i; c.ground = g;
    const off = !g.onRoad, top = T.topSpeed * (off ? T.offTop : 1);
    // local frame: f = forward, l = left. yaw rate positive = turning left
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), lx = Math.cos(c.yaw), lz = -Math.sin(c.yaw);
    let u = c.vx * fx + c.vz * fz, w = c.vx * lx + c.vz * lz, r = c.yawRate;

    // steering: one quick ramp toward the input; a bit less lock at high speed so it stays stable
    const rate = T.steerSpeed * dt; c.steer += Math.max(-rate, Math.min(rate, inp.steer - c.steer));
    const delta = -c.steer * T.steerLock / (1 + Math.max(0, u) / T.steerFall);

    // drive and brakes (longitudinal accelerations, per axle)
    let FxF = 0, FxR = 0;
    if (!c.air) {
      if (inp.throttle) FxR += T.accel * 1.25 * Math.max(0, 1 - (Math.max(0, u) / top) ** 3);
      if (inp.brake) {
        if (u > 1) { FxF -= T.brake * (1 - T.brakeRear); FxR -= T.brake * T.brakeRear; }
        else FxR -= T.reverse * Math.max(0, 1 - Math.max(0, -u) / 14);   // stopped: S drives backward
      }
      if (!inp.throttle && !inp.brake) FxR -= 0.35 * u;                    // engine braking when you lift
      FxR -= 0.0015 * u * Math.abs(u) * (off ? 4 : 1);                      // air and ground drag
      if (u > top) FxR -= (u - top) * 2;
    }
    // load on each axle: static share, weight moves forward under braking, downforce and banking press harder
    const press = (1 + T.downforce * (u / T.topSpeed) ** 2) * (1 + T.bankGrip * Math.sin(g.b || 0)) * (off ? T.offGrip : 1);
    const shift = Math.max(-0.3, Math.min(0.05, T.weightShift * c.ax / GT));   // braking moves weight forward a lot; accelerating barely lightens the front
    const NF = (B / (A + B) - shift) * press, NR = (A / (A + B) + shift) * press;
    const capF = T.gripF * GT * NF, capR = T.gripR * GT * NR;
    // friction circle: grip used for driving or braking isn't available for cornering
    FxF = Math.max(-capF * 0.95, FxF); FxR = Math.max(-capR * 0.95, Math.min(capR * T.traction, FxR));   // traction control: power never takes all the rear grip
    const latF = Math.sqrt(Math.max(0.05, capF * capF - FxF * FxF)), latR = Math.sqrt(Math.max(0.05, capR * capR - FxR * FxR));

    // slip angles and side forces
    const us = Math.max(Math.abs(u), 5);
    const aF = Math.atan2(w + A * r, us) - delta * Math.sign(u || 1), aR = Math.atan2(w - B * r, us);
    let FyF = -latF * tyre(aF, T), FyR = -latR * tyre(aR, T);
    if (c.air) { FyF = FyR = 0; FxF = FxR = 0; }

    // integrate (per unit mass): forward, sideways, yaw
    const cd = Math.cos(delta), sd = Math.sin(delta);
    const du = FxR + FxF * cd - FyF * sd + r * w;
    const dw = FyF * cd + FxF * sd + FyR - r * u;
    const dr = (A * (FyF * cd + FxF * sd) - B * FyR) / T.yawInertia;
    u += du * dt; w += dw * dt; r += dr * dt;
    // drift catch: past the set drift angle the car is eased back, so a slide holds its angle instead of snapping into a spin
    const over = Math.abs(aR) - T.driftMax * Math.PI / 180;
    if (over > 0 && !c.air && Math.abs(u) > 6) r += Math.sign(aR) * over * T.driftCatch * 10 * dt;
    if (Math.abs(u) < 3) { const k = Math.exp(-6 * dt); w *= k; if (!inp.steer) r *= k; }   // settle cleanly at walking pace
    c.ax = c.ax + ((FxR + FxF) - c.ax) * Math.min(1, 10 * dt);                              // smoothed, for weight transfer

    c.slipR = aR; c.drifting = !c.air && Math.abs(aR) > 0.12 && Math.abs(u) > 12;
    c.driftT = c.drifting ? c.driftT + dt : 0;
    c.slip = Math.max(0, Math.abs(aR) - 0.06) * Math.abs(u) + Math.max(0, Math.abs(aF) - 0.1) * Math.abs(u) * 0.5;
    c.lonA = du; c.latA = u * r;

    c.vx = fx * u + lx * w; c.vz = fz * u + lz * w; c.yawRate = r;
    // gravity along the slope (pulls you down a bank or a hill)
    if (!c.air) { c.vx += G * g.ny * g.nx * dt; c.vz += G * g.ny * g.nz * dt; }
    c.yaw += r * dt;
    c.x += c.vx * dt; c.z += c.vz * dt;
    // vertical: stick to the ground, but leave it over a crest if moving up faster than the ground falls away
    const g2 = Track.surface(c.x, c.z, c.hint);
    if (c.air) { c.vy -= G * dt; c.y += c.vy * dt; if (c.y <= g2.y) { c.susV -= Math.min(6, -c.vy * 0.25); c.y = g2.y; c.vy = 0; c.air = false; } }
    else { const vyG = (g2.y - c.y) / dt; if (c.vy > vyG + 4 && c.vy > 3) { c.air = true; } else { c.vy = vyG; c.y = g2.y; } }
    c.speed = u;
  }

  // visuals, every drawn frame: tilt eased to the ground, lean, pitch, suspension, wheels
  const UP = new THREE.Vector3(0, 1, 0), tq = new THREE.Quaternion(), yq = new THREE.Quaternion(), nv = new THREE.Vector3();
  function draw(c, dt) {
    const g = c.ground || { nx: 0, ny: 1, nz: 0 };
    c.mesh.position.set(c.x, c.y, c.z);
    // the heading follows instantly (no lag on steering); only the tilt to the ground is eased, so bank changes feel smooth
    tq.setFromUnitVectors(UP, nv.set(g.nx, g.ny, g.nz));
    if (!c.quatInit) { c.quat.copy(tq); c.quatInit = true; } else c.quat.slerp(tq, Math.min(1, 14 * dt));
    c.mesh.quaternion.copy(c.quat).multiply(yq.setFromAxisAngle(UP, c.yaw));
    for (let n = Math.min(8, Math.ceil(dt / 0.008)), h = dt / n, k = 0; k < n; k++) { c.susV += (-180 * c.sus - 12 * c.susV) * h; c.sus += c.susV * h; }
    c.roll += (Math.max(-0.08, Math.min(0.08, c.latA * 0.0035)) - c.roll) * Math.min(1, 8 * dt);
    c.pitch += (Math.max(-0.05, Math.min(0.05, -c.lonA * 0.0022)) - c.pitch) * Math.min(1, 8 * dt);
    c.body.rotation.set(c.pitch + c.sus * 0.05, 0, c.roll);
    c.body.position.y = c.sus * 0.4;
    c.wheelSpin += c.speed * dt / 0.45;
    for (const w of c.wheels) { w.o.rotation.x = w.baseX + c.wheelSpin * w.sgn; if (w.front) w.o.rotation.y = w.baseY - c.steer * 0.45; }
  }
  return { create, setModel, place, step, draw, DEF };
})();
