// ===== Car: a Kenney model on arcade drift physics =====
// The car points one way (its heading) and travels another (its velocity). Steering turns the heading. The direction of travel
// then catches up with the heading at a set rate: that rate is "grip". In normal driving it catches up almost at once, so the
// car goes where it points. In a drift the rate drops, so the car slides sideways with its nose in the bend and keeps its speed.
// A drift starts when you tap the brake, or lift off, while turning hard at speed. In a drift, steering into the bend tightens
// it, counter-steering opens it up, and straightening out ends it. S brakes; once stopped it reverses.
const Car = (function () {
  // every number here can be changed live in the tuning panel (Tab)
  const DEF = {
    topSpeed: 52, accel: 16, brake: 28, reverse: 9,
    turnRate: 1.7, turnFall: 60, steerSpeed: 4.5,
    grip: 10, cornerLimit: 34, bankGrip: 1.0, offTop: 0.62, offGrip: 0.6,
    driftEase: 0.45, driftKick: 0.5, driftTurn: 1.6, driftGrip: 1.6, driftMax: 45, driftScrub: 0.18, driftBrake: 0.3, driftMinSpeed: 14,
    camDist: 9.5, camHeight: 3.6, camLag: 7, camLook: 6, fov: 62, fovBoost: 14
  };
  const G = 22;   // gravity for slopes and air, a little stronger than real for a planted arcade feel (m/s²)

  function create(scene, modelName) {
    const c = {
      x: 0, y: 0, z: 0, yaw: 0, vx: 0, vz: 0, vy: 0, yawRate: 0, steer: 0, hint: -1, ground: null,
      drifting: false, driftT: 0, driftDir: 0, boostT: 0, air: false, sus: 0, susV: 0, roll: 0, pitch: 0, wheelSpin: 0, ax: 0,
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
    Object.assign(c, { x, z, yaw, vx: 0, vz: 0, vy: 0, yawRate: 0, steer: 0, hint: -1, driftT: 0, boostT: 0, drifting: false, air: false, ax: 0, prevBrake: false, prevThrottle: false });
    const g = Track.surface(x, z, -1); c.hint = g.i; c.y = g.y; c.ground = g; c.quatInit = false;
  }

  const angDiff = (x, y) => { let d = x - y; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

  // one fixed physics step. input: { throttle, brake, steer (-1 left .. 1 right) }
  function step(c, T, inp, dt) {
    const g = Track.surface(c.x, c.z, c.hint); c.hint = g.i; c.ground = g;
    const off = !g.onRoad, top = T.topSpeed * (off ? T.offTop : 1);
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    let sp = Math.hypot(c.vx, c.vz);
    const fwd = sp > 0.01 ? (c.vx * fx + c.vz * fz) / sp : 1;        // +1 moving forwards, -1 backwards
    let u = sp * Math.sign(fwd || 1);                                  // signed speed
    const steerIn = inp.steer;
    const rate = T.steerSpeed * dt; c.steer += Math.max(-rate, Math.min(rate, steerIn - c.steer));

    // slide angle: between where the car points and where it's going (positive = travelling to the car's left)
    const velYaw = sp > 1 ? Math.atan2(c.vx, c.vz) : c.yaw;
    const slide = u >= 0 ? angDiff(velYaw, c.yaw) : 0;

    // ---- drift start and end ----
    const pressedBrake = inp.brake && !c.prevBrake, liftedThrottle = !inp.throttle && c.prevThrottle;
    if (!c.drifting && !c.air && u > T.driftMinSpeed && Math.abs(steerIn) >= T.driftEase && (pressedBrake || liftedThrottle || (inp.brake && Math.abs(c.steer) >= T.driftEase))) {
      c.drifting = true; c.driftDir = Math.sign(steerIn); c.driftT = 0;
      c.yawRate -= c.driftDir * T.driftKick;                           // a kick that swings the rear out
    }
    if (c.drifting) {
      c.driftT += dt;
      const opening = c.steer * c.driftDir < 0.2 && Math.abs(slide) < 0.1 && c.driftT > 0.25;
      if (opening || u < T.driftMinSpeed * 0.6 || c.air) { c.drifting = false; c.driftT = 0; }
    }
    c.prevBrake = inp.brake; c.prevThrottle = inp.throttle;

    // ---- heading: steering turns where the car points ----
    let yawT;
    if (c.drifting) {
      const into = Math.max(-1, Math.min(1, c.steer * c.driftDir));  // 1 = steering into the drift, -1 = full counter-steer
      yawT = -c.driftDir * T.driftTurn * (0.45 + 0.55 * into);
    } else {
      const a = Math.abs(u);
      yawT = -c.steer * T.turnRate * Math.min(1, a / 8) / (1 + a / T.turnFall) * (u < 0 ? -1 : 1);
    }
    if (c.air) yawT = c.yawRate;
    c.yawRate += (yawT - c.yawRate) * Math.min(1, 12 * dt);
    c.yaw += c.yawRate * dt;

    // ---- speed: engine, brakes, drag ----
    let acc = 0;
    if (!c.air) {
      if (inp.throttle) acc += T.accel * 1.25 * Math.max(0, 1 - (Math.max(0, u) / top) ** 3);
      if (inp.brake) acc += u > 1 ? -T.brake * (c.drifting ? T.driftBrake : 1) : -T.reverse * Math.max(0, 1 - Math.max(0, -u) / 14);
      if (!inp.throttle && !inp.brake) acc -= 0.3 * u;
      acc -= 0.0015 * u * Math.abs(u) * (off ? 4 : 1);
      if (c.drifting) acc -= T.driftScrub * Math.abs(Math.sin(slide)) * Math.abs(u) * 2;   // a sideways car loses a little speed
    }
    u += acc * dt;

    // ---- direction of travel catches up with the heading at the grip rate ----
    let follow;
    if (c.drifting) follow = T.driftGrip * (1 + 2 * Math.max(0, -(c.steer * c.driftDir)));   // counter-steering straightens the car quickly
    else {
      // past the cornering limit the car can't follow its nose as fast, so it slides wide (banking raises the limit)
      const lim = T.cornerLimit * (1 + T.bankGrip * Math.sin(g.b || 0)) * (off ? T.offGrip : 1), lat = Math.abs(u * c.yawRate);
      follow = T.grip * (off ? T.offGrip : 1) * Math.min(1, lim / Math.max(lat, 0.01));
    }
    if (c.air) follow = 0;
    const heading = u >= 0 ? c.yaw : c.yaw + Math.PI;
    let travel = sp > 0.5 ? Math.atan2(c.vx, c.vz) : heading;
    let d = angDiff(heading, travel);
    const maxSlide = T.driftMax * Math.PI / 180;
    if (Math.abs(d) > maxSlide) { travel = heading - Math.sign(d) * maxSlide; d = angDiff(heading, travel); }   // never slide past the max angle
    travel += d * Math.min(1, follow * dt);
    c.vx = Math.sin(travel) * Math.abs(u); c.vz = Math.cos(travel) * Math.abs(u);
    // gravity along the slope (pulls you down a bank or a hill)
    if (!c.air) { c.vx += G * g.ny * g.nx * dt; c.vz += G * g.ny * g.nz * dt; }

    c.slipR = slide; c.lonA = acc; c.latA = u * c.yawRate;
    c.slip = Math.abs(Math.sin(slide)) * Math.abs(u) * (c.drifting ? 1 : 0.6);
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
