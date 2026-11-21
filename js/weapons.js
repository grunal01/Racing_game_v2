// ===== Weapons (v16): items, not built into rides =====
// Every ride has three open slots: any mix of front, rear and passive weapons. All weapons are shared by every ride.
// Numbers are tier 1 first guesses from the weapons draft. Each weapon tier adds 15% to damage, slow time and knockback.
// Damage runs through Race's hurt(), which applies: base x Power/1000 x 2000 / (1000 + Resist x 1000 / Penetration).
const Weapons = (function () {
  const D = (name, slot, eff, type, aim, o) => Object.assign({ name, slot, eff, type, aim }, o);
  const DEFS = {
    // ---- front ----
    shotgun:   D("Shotgun", "front", "damage", "phys", "wide", { range: 30, cone: 40, cd: 1.3, dmg: 50, color: 0xffd27a, desc: "Wide 40° cone, 30 m. 50 damage up to 10 m, fading to 13 at 30 m. Hits everything in the cone." }),
    sniper:    D("Sniper rifle", "front", "damage", "phys", "lock", { range: 150, cone: 8, cd: 2.5, dmg: 80, crit: 0.25, instant: true, color: 0xffffff, desc: "Narrow 8° lock, 150 m. 80 damage, instant, 25% crit chance." }),
    minigun:   D("Minigun", "front", "damage", "phys", "track", { range: 60, cone: 16, cd: 2, dmg: 3, shots: 30, burst: 3, color: 0xffe08a, desc: "Locks on and tracks, 60 m. 30 bullets over 3 s at 3 each (about 60 if most hit). 2 s cooldown after the burst." }),
    rockets:   D("Rockets", "front", "damage", "phys", "home", { range: 100, cone: 30, cd: 2, dmg: 32, shots: 2, gap: 0.3, splash: 4, color: 0xff7a2a, desc: "2 rockets, 0.3 s apart, mild homing, 100 m. 32 each with a 4 m splash." }),
    netgun:    D("Net gun", "front", "slow", "none", "lock", { range: 40, cone: 12, cd: 2.5, slow: 0.5, dur: 2.5, color: 0xe8e0c8, desc: "Narrow lock, 40 m. The target is slowed 50% for 2.5 s." }),
    taser:     D("Taser", "front", "slow", "magic", "lock", { range: 25, cone: 12, cd: 1.6, dmg: 18, slow: 0.4, dur: 1.5, instant: true, color: 0x8fd8ff, desc: "Narrow lock, 25 m, instant. 18 magic damage plus 40% slow for 1.5 s." }),
    flare:     D("Flare gun", "front", "poison", "magic", "home", { range: 80, cone: 24, cd: 2, dps: 8, dur: 5, color: 0xff4a6a, desc: "Mild homing, 80 m. Poison: 8 magic damage a second for 5 s (40 total)." }),
    acidspit:  D("Acid spit", "front", "poison", "magic", "home", { range: 30, cone: 30, cd: 2, dps: 6, dur: 6, splash: 3, lob: true, color: 0x9dff4a, desc: "Lobbed glob, mild homing, 30 m, 3 m splash. Poison: 6 a second for 6 s (36 total)." }),
    blower:    D("Leaf blower", "front", "knock", "none", "wide", { range: 15, cone: 50, cd: 1.6, knock: 9, blow: 1, color: 0xdfe8d0, desc: "Wide cone, 15 m. Blows for 1 s: a strong shove to the side." }),
    grapple:   D("Grappling gun", "front", "knock", "phys", "lock", { range: 50, cone: 12, cd: 2.5, dmg: 12, yank: 30, color: 0xb0b0b0, desc: "Narrow lock, 50 m. 12 damage, and yanks you toward the target - line up a ram." }),
    // ---- rear ----
    mines:     D("Mine dropper", "rear", "damage", "phys", "drop", { cd: 3, dmg: 60, shots: 3, gap: 0.5, life: 15, trig: 2, color: 0x2a2a2a, desc: "Drops 3 mines behind you, 0.5 s apart. 60 damage each; they last 15 s." }),
    caltrops:  D("Caltrop bag", "rear", "damage", "phys", "drop", { cd: 2.5, dmg: 25, life: 6, rad: 3, color: 0xa0a0a0, desc: "A 6 m patch behind you for 6 s. 25 damage to each ride that drives through." }),
    icetrail:  D("Ice trail", "rear", "slow", "none", "drop", { cd: 3, slow: 0.3, dur: 1, trail: 4, life: 5, spin: true, color: 0xbfefff, desc: "4 s of ice in your wake. 30% slow and a chance to spin out." }),
    glue:      D("Glue spray", "rear", "slow", "none", "drop", { cd: 2.5, slow: 0.6, dur: 2, life: 6, color: 0xe8d35a, desc: "A glue puddle behind you. 60% slow for 2 s." }),
    acidtrail: D("Acid trail", "rear", "poison", "magic", "drop", { cd: 3, dps: 6, dur: 4, trail: 4, life: 5, color: 0x7dff4a, desc: "4 s of acid in your wake. Poison: 6 a second for 4 s." }),
    firetrail: D("Fire trail", "rear", "poison", "magic", "drop", { cd: 3, dps: 10, dur: 2, trail: 4, life: 5, color: 0xff6a1a, desc: "4 s of fire in your wake. 10 magic damage a second while in it, plus 2 s." }),
    exhaust:   D("Exhaust blast", "rear", "knock", "magic", "wide", { range: 10, cone: 60, cd: 2, dmg: 12, knock: 20, color: 0x8a7a70, desc: "Wide cone behind you, 10 m. 12 magic damage plus a shove." }),
    aircannon: D("Rear air cannon", "rear", "knock", "none", "wide", { range: 20, cone: 20, cd: 2, knock: 30, back: true, color: 0xe0f0ff, desc: "Narrow cone behind you, 20 m. A strong shove straight back." }),
    // ---- passive: always on, ignore their slot's key ----
    sawblade:    D("Sawblade skirt", "passive", "damage", "phys", "aura", { rad: 5, dps: 12, desc: "Aura, 5 m: 12 damage a second to rides in range." }),
    tar:         D("Tar sprayers", "passive", "slow", "none", "aura", { rad: 5, slow: 0.25, desc: "Aura, 5 m: rides in range are slowed 25%." }),
    fumes:       D("Toxic fumes", "passive", "poison", "magic", "aura", { rad: 8, dps: 4, desc: "Aura, 8 m: 4 magic damage a second to rides in range." }),
    aircannons:  D("Air cannons", "passive", "knock", "none", "aura", { rad: 5, knock: 16, every: 3, desc: "Aura, 5 m: shoves nearby rides away every 3 s." }),
    thorns:      D("Thorns", "passive", "damage", "phys", "hit", { frac: 0.3, desc: "When you're rammed: 30% of the ram damage goes back to the attacker." }),
    gluecoat:    D("Glue coating", "passive", "slow", "none", "hit", { slow: 0.4, dur: 2, desc: "When you're hit: the attacker is slowed 40% for 2 s." }),
    venomskin:   D("Venom skin", "passive", "poison", "magic", "hit", { dps: 12, dur: 4, desc: "When you're hit: the attacker takes 12 magic damage a second for 4 s." }),
    spring:      D("Spring armour", "passive", "knock", "none", "hit", { knock: 26, desc: "When you're hit: the attacker is bounced away hard." }),
    spiked:      D("Spiked bumper", "passive", "damage", "phys", "ram", { mult: 0.4, desc: "When you hit someone: your rams deal +40% damage." }),
    sticky:      D("Sticky bumper", "passive", "slow", "none", "ram", { slow: 0.4, dur: 2, desc: "When you hit someone: they're slowed 40% for 2 s." }),
    venomspikes: D("Venom spikes", "passive", "poison", "magic", "ram", { dps: 12, dur: 5, desc: "When you hit someone: they take 12 magic damage a second for 5 s." }),
    battering:   D("Battering ram", "passive", "knock", "none", "ram", { knock: 24, desc: "When you hit someone: your rams shove them much further." })
  };
  for (const k in DEFS) DEFS[k].id = k;
  // the Snail's Slime trail ability drops these (not a weapon you can pick)
  const SLIME = D("Slime", "rear", "slow", "none", "drop", { id: "slime", slow: 0.4, dur: 1.5, trail: 3, life: 5, spin: true, color: 0x9be86a });
  const IDS = Object.keys(DEFS);
  const tk = t => 1 + 0.15 * (t - 1);
  const SLOT_COL = { front: "#ff7a6b", rear: "#ffb703", passive: "#8fd18a" };
  const SLOT_TXT = { front: "Front", rear: "Rear", passive: "Passive" };
  const EFF_TXT = { damage: "damage", slow: "slow", poison: "poison", knock: "knockback" };
  const TYPE_TXT = { phys: "physical", magic: "magic", none: "" };

  // ---------- garage side ----------
  const rint = (rnd, a, b) => a + Math.floor(rnd() * (b - a + 1));
  function offer(n, base, rnd) {
    rnd = rnd || Math.random;
    const ids = IDS.slice(); for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    return ids.slice(0, n).map(id => ({ id, tier: Math.max(1, Math.min(10, base + rint(rnd, -1, 1))) }));
  }
  const pickBase = k => Math.max(1, Math.min(10, 1 + Math.floor(k / 2)));   // tier on offer rises steadily over the run
  // AI racers get weapons exactly like the player: one pick of 1 from 3 after every race, filling, replacing or skipping
  function aiLoadout(picks, rnd) {
    const out = [];
    for (let k = 1; k <= picks; k++) {
      const o = offer(3, pickBase(k), rnd).sort((a, b) => b.tier - a.tier)[0];
      if (out.length < 3) out.push(o);
      else { let lo = 0; for (let i = 1; i < 3; i++) if (out[i].tier < out[lo].tier) lo = i; if (o.tier > out[lo].tier) out[lo] = o; }
    }
    return out;
  }
  const label = w => DEFS[w.id].name + " T" + w.tier;
  function card(w) {
    const d = DEFS[w.id], ty = TYPE_TXT[d.type];
    return '<div class="wCard"><small style="color:' + SLOT_COL[d.slot] + '">' + SLOT_TXT[d.slot] + ' &middot; ' + EFF_TXT[d.eff] + (ty ? ' &middot; ' + ty : '') + (d.cd ? ' &middot; ' + d.cd + ' s cooldown' : '') + '</small><br>' + d.desc +
      (w.tier > 1 ? '<br><b>Tier ' + w.tier + ': x' + tk(w.tier).toFixed(2) + '</b> damage, slow time and shove' : '<br><span class="dim">Tier 1 numbers</span>') + '</div>';
  }
  function slotsLine(list) {
    return [0, 1, 2].map(i => { const w = list[i]; return '<span class="wTag"' + (w ? ' style="border-color:' + SLOT_COL[DEFS[w.id].slot] + '"' : '') + '>' + (w ? (DEFS[w.id].slot === 'passive' ? '' : (i + 1) + ': ') + label(w) : (i + 1) + ': empty') + '</span>'; }).join(' ');
  }
  // quick-sim: how much a loadout adds to wrecks, bounties and boss damage
  function simScore(list) { return (list || []).reduce((a, w) => a + (DEFS[w.id].slot === 'passive' ? 0.12 : 0.22) * tk(w.tier), 0); }

  // ---------- race side ----------
  // X: { scene, cars, player, order(), hurt, emit, burst, R, time(), state(), down, nearPlayer, ROAD_W }
  function attach(X) {
    const T3 = window.THREE, R = X.R, scene = X.scene, ROAD_W = X.ROAD_W;
    const shots = [], ground = [], fx = [], own = [];   // own: geometries/materials to dispose at the end
    const keep = o => (own.push(o), o);
    const matCache = {}, lineCache = {};
    const basic = (c, op) => matCache[c + '|' + (op || 1)] || (matCache[c + '|' + (op || 1)] = keep(new T3.MeshBasicMaterial(op ? { color: c, transparent: true, opacity: op, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 } : { color: c })));
    const lineMat = c => lineCache[c] || (lineCache[c] = keep(new T3.LineBasicMaterial({ color: c })));
    const ball = keep(new T3.SphereGeometry(0.35, 8, 6)), plane = keep(new T3.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
    const disc = keep(new T3.CircleGeometry(1, 18).rotateX(-Math.PI / 2)), mineG = keep(new T3.CylinderGeometry(0.6, 0.75, 0.35, 10));
    // soft round patches for trails and puddles, so they read as splashes rather than boxes
    const softTex = keep(new T3.CanvasTexture((() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'), gr = g.createRadialGradient(64, 64, 8, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      g.fillStyle = 'rgba(255,255,255,0.9)'; for (let i = 0; i < 40; i++) { const a = Math.random() * 6.28, r = Math.random() * 40; g.fillRect(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 2, 2); } return cv; })()));
    const softCache = {};
    const soft = (c, op) => softCache[c + '|' + op] || (softCache[c + '|' + op] = keep(new T3.MeshBasicMaterial({ color: c, map: softTex, transparent: true, opacity: op, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 })));
    const olMat = keep(new T3.MeshBasicMaterial({ color: 0xff2a2a, side: T3.BackSide }));
    olMat.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize(normal) * 0.14;'); };
    const el = document.getElementById('raceW');
    const P = X.player;
    let auraT = 0, dotT = 0, groundT = 0, outlined = new Set();

    function setup(c, list) {
      c.weapons = (list || []).slice(0, 3).map(w => ({ id: w.id, tier: w.tier || 1, d: DEFS[w.id], k: tk(w.tier || 1), cd: 0, t: 0, n: 0, gapT: 0, tgt: null }));
      c.wSlowA = 0; c.wSlowT = 0; c.knockT = 0; c.dots = []; c.wThink = R() * 0.4; c.aircT = 0; c.whT = -9;
    }
    const passives = (c, aim) => c.weapons ? c.weapons.filter(w => w.d.aim === aim) : [];
    const hittable = c => !c.destroyed && !c.crashed && !c.falling && !c.finished;
    const cy = c => c.y + (c.yOff || 0) + 1.1 * (c.size || 1);
    const closeToPlayer = (c, d) => { const dx = c.pos.x - P.pos.x, dy = c.pos.y - P.pos.y; return dx * dx + dy * dy < d * d; };
    // every racer within rad of (x, z), using the x-sorted order list
    function around(x, z, rad, fn) {
      const o = X.order(); if (!o.length) return;
      let lo = 0, hi = o.length; const x0 = x - rad;
      while (lo < hi) { const m = (lo + hi) >> 1; if (o[m].pos.x < x0) lo = m + 1; else hi = m; }
      for (let i = lo; i < o.length; i++) { const c = o[i]; if (c.pos.x > x + rad) break; const dx = c.pos.x - x, dz = c.pos.y - z, d2 = dx * dx + dz * dz; if (d2 <= rad * rad) fn(c, Math.sqrt(d2)); }
    }

    // ---- effects ----
    function slowCar(c, amt, dur) {
      if (c.shieldT > 0 || c.destroyed) return;
      const a = Math.min(0.9, amt * c.slowF);   // slow taken = base x 2000 / (1000 + Slow resist)
      c.wSlowA = c.wSlowT > 0 ? Math.max(c.wSlowA, a) : a; c.wSlowT = Math.max(c.wSlowT, dur);
    }
    function poison(c, dps, dur, by, key) {
      if (c.destroyed) return;
      if (key) { const e = c.dots.find(q => q.key === key); if (e) { e.t = Math.max(e.t, dur); e.dps = Math.max(e.dps, dps); return; } }
      if (c.dots.length >= 6) c.dots.shift();
      c.dots.push({ dps, t: dur, by, key });
    }
    function knock(c, dx, dy, k) {   // distance cut by Health (weight) and Stability
      if (c.shieldT > 0 || c.destroyed || c.crashed) return;
      const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const v = k * c.stabF / Math.max(0.35, c.mass);
      c.vel.x += dx * v; c.vel.y += dy * v; c.knockT = Math.max(c.knockT, 0.5);
      c.speed += (dx * Math.cos(c.rot) + dy * Math.sin(c.rot)) * v * 0.6;
    }
    function hit(c, base, by, type, o) {
      const dealt = X.hurt(c, base, by, type === 'magic' ? 'magic' : 'shot', o);
      if (dealt > 0 && by && by !== c && !by.destroyed && raceT() - c.whT > 0.5 && Math.hypot(by.pos.x - c.pos.x, by.pos.y - c.pos.y) < 30) { c.whT = raceT(); whenHit(c, by, 0); }
      return dealt;
    }
    const raceT = () => X.time();
    // victim's "when you're hit" passives (thorns only for rams)
    function whenHit(v, a, ramDealt) {
      for (const w of passives(v, 'hit')) {
        const d = w.d;
        if (d.id === 'thorns' && ramDealt > 0) X.hurt(a, ramDealt * d.frac * w.k, v, 'shot');
        if (d.id === 'gluecoat') slowCar(a, d.slow, d.dur * w.k);
        if (d.id === 'venomskin') poison(a, d.dps * w.k, d.dur, v, 'vskin' + w.id);
        if (d.id === 'spring') knock(a, a.pos.x - v.pos.x, a.pos.y - v.pos.y, d.knock * w.k);
      }
    }
    // called from car collisions after a ram: a was hit by b for `dealt`
    function onRam(a, b, dealt) {
      if (!a.weapons || !b.weapons || dealt <= 0) return;
      for (const w of passives(b, 'ram')) {
        const d = w.d;
        if (d.id === 'sticky') slowCar(a, d.slow, d.dur * w.k);
        if (d.id === 'venomspikes') poison(a, d.dps * w.k, d.dur, b, 'vspk' + w.id);
        if (d.id === 'battering') knock(a, a.pos.x - b.pos.x, a.pos.y - b.pos.y, d.knock * w.k);
      }
      whenHit(a, b, dealt);
    }
    function ramMult(c) { let m = 1; if (c.weapons) for (const w of c.weapons) if (w.id === 'spiked') m += w.d.mult * w.k; return m; }

    // ---- aiming ----
    function inCone(s, d) {
      const dir = s.rot + (d.slot === 'rear' ? Math.PI : 0), fx = Math.cos(dir), fy = Math.sin(dir), half = d.cone * Math.PI / 360, out = [];
      around(s.pos.x, s.pos.y, d.range + 4, (c, dist) => {
        if (c === s || !hittable(c) || Math.abs(cy(c) - cy(s)) > 12) return;
        const rr = Math.max(0.01, dist), dx = c.pos.x - s.pos.x, dy = c.pos.y - s.pos.y;
        if (rr - c.r > d.range) return;
        const a = Math.acos(Math.max(-1, Math.min(1, (dx * fx + dy * fy) / rr)));
        if (a <= half + Math.atan2(c.r, rr)) out.push({ c, dist, a });   // big rides are easier to catch
      });
      return out;
    }
    function lockOn(s, d) {
      const l = inCone(s, d); if (!l.length) return null;
      if (s.isHunter || s.isBoss) { const p = l.find(e => e.c.isPlayer); if (p) return p.c; }
      let best = null, bs = 1e9; const half = d.cone * Math.PI / 360 + 0.05;
      for (const e of l) { const sc = e.a / half + e.dist / d.range * 0.6; if (sc < bs) { bs = sc; best = e.c; } }
      return best;
    }
    const REAR_LOOK = { slot: 'rear', cone: 70, range: 30 };
    function muzzle(s, rear) { const f = rear ? -1 : 1, fx = Math.cos(s.rot) * f, fy = Math.sin(s.rot) * f; return { x: s.pos.x + fx * (s.r + 1), z: s.pos.y + fy * (s.r + 1), y: cy(s), fx, fy }; }
    function tracer(a, b, color, life) {
      const g = new T3.BufferGeometry().setFromPoints([new T3.Vector3(a.x, a.y, a.z), new T3.Vector3(b.x, b.y, b.z)]);
      const m = new T3.Line(g, lineMat(color)); scene.add(m); fx.push({ mesh: m, t: life || 0.08, geo: g });
    }
    const tp = c => ({ x: c.pos.x, y: cy(c), z: c.pos.y });

    // ---- firing ----
    function fire(s, w) {
      const d = w.d, k = w.k, vis = X.nearPlayer(s);
      if (d.slot === 'passive' || w.cd > 0 || w.t > 0) return false;
      const m = muzzle(s, d.slot === 'rear');
      if (d.aim === 'wide') {
        if (d.blow) { w.t = d.blow; w.cd = d.cd + d.blow; return true; }
        for (const e of inCone(s, d)) {
          if (d.dmg) { let base = d.dmg * k; if (d.id === 'shotgun' && e.dist > 10) base *= Math.max(0.25, 1 - 0.75 * (e.dist - 10) / 20); hit(e.c, base, s, d.type); }
          if (d.knock) { if (d.back) knock(e.c, m.fx, m.fy, d.knock * k); else knock(e.c, e.c.pos.x - s.pos.x, e.c.pos.y - s.pos.y, d.knock * k); }
        }
        if (vis) for (let i = 0; i < 18; i++) { const a = s.rot + (d.slot === 'rear' ? Math.PI : 0) + (R() - 0.5) * d.cone * Math.PI / 180, sp = d.range * (0.9 + R()); X.emit(m.x, m.y, m.z, Math.cos(a) * sp + s.vel.x, R() * 2, Math.sin(a) * sp + s.vel.y, d.color, 0.35, 0.2, 2); }
        w.cd = d.cd; return true;
      }
      if (d.aim === 'drop') {
        if (d.shots) { w.n = d.shots; w.gapT = 0; w.t = d.shots * d.gap; }
        else if (d.trail) { w.t = d.trail; w.gapT = 0; }   // a piece every 0.2 s
        else drop(s, w);
        w.cd = d.cd + (w.t || 0); return true;
      }
      const tgt = lockOn(s, d);
      if (d.aim === 'track') { w.tgt = tgt; w.n = d.shots; w.t = d.burst; w.gapT = 0; w.cd = d.cd + d.burst; return true; }
      if (d.instant) {
        const end = tgt ? tp(tgt) : { x: m.x + m.fx * d.range, y: m.y, z: m.z + m.fy * d.range };
        if (vis) tracer(m, end, d.color, 0.12);
        if (tgt) {
          if (d.dmg) hit(tgt, d.dmg * k, s, d.type, d.crit ? { crit: d.crit } : null);
          if (d.slow) slowCar(tgt, d.slow, d.dur * k);
          if (vis) X.burst(end.x, end.y, end.z, 8, d.color, 6, 0.3, 0.3, 2);
        }
        w.cd = d.cd; return true;
      }
      launch(s, w, tgt, m);
      if (d.shots) { w.n = d.shots - 1; w.gapT = d.gap; w.t = d.gap * (d.shots - 1) + 0.01; w.tgt = tgt; }
      w.cd = d.cd + (w.t || 0); return true;
    }
    function launch(s, w, tgt, m) {
      const d = w.d; m = m || muzzle(s, false);
      const sp = Math.abs(s.speed) + 69.4;   // firing ride's speed + 250 km/h, so fast rides never outrun their own shots
      const mesh = new T3.Mesh(ball, basic(d.color)); mesh.scale.setScalar(d.id === 'netgun' ? 2.2 : d.id === 'rockets' ? 1.3 : d.id === 'grapple' ? 0.8 : 1.4);
      mesh.position.set(m.x, m.y, m.z); scene.add(mesh);
      shots.push({ s, w, d, k: w.k, tgt, x: m.x, y: m.y, z: m.z, vx: m.fx * sp, vz: m.fy * sp, sp, life: d.range / sp + 0.15, age: 0, mesh, y0: m.y });
    }
    function drop(s, w) {
      const d = w.d, fx = Math.cos(s.rot), fy = Math.sin(s.rot), back = s.r + 2.5, gy = (s.gh !== undefined ? s.gh : s.y) + 0.15;
      const x = s.pos.x - fx * back, z = s.pos.y - fy * back;
      const g = { d, k: w.k, by: s, x, z, y: gy, life: d.life, rot: s.rot, hit: new Set() };
      if (d.id === 'mines') { g.kind = 'mine'; g.r = d.trig; g.reach = d.trig + 5; g.mesh = new T3.Mesh(mineG, basic(0x2a2a2a)); g.mesh.add(new T3.Mesh(ball, basic(0xff3030))); g.mesh.children[0].position.y = 0.25; g.mesh.children[0].scale.setScalar(0.5); g.mesh.position.set(x, gy + 0.1, z); }
      else if (d.id === 'caltrops') { g.kind = 'circle'; g.r = d.rad; g.reach = d.rad + 5; g.mesh = new T3.Mesh(disc, basic(d.color, 0.7)); g.mesh.scale.setScalar(d.rad); g.mesh.position.set(x, gy, z); }
      else {   // a strip across the road
        g.kind = 'strip'; g.w = d.trail ? 9 : 14; g.depth = d.trail ? Math.max(5, Math.abs(s.speed) * 0.25 + 4) : 9;   // about two rides wide
        g.reach = g.w / 2 + 6; g.mesh = new T3.Mesh(plane, soft(d.color, 0.8)); g.mesh.scale.set(g.depth * 1.25, 1, g.w * 1.15); g.mesh.rotation.y = -s.rot; g.mesh.position.set(x, gy, z);
      }
      scene.add(g.mesh); ground.push(g);
      if (ground.length > 240) { const o = ground.shift(); scene.remove(o.mesh); }
    }

    // ---- per-frame ----
    function update(dt, state) {
      const now = raceT(), armed = now > 5 && state !== 'countdown';
      const cars = X.cars;
      for (const c of cars) {
        if (c.wSlowT > 0) c.wSlowT -= dt; if (c.knockT > 0) c.knockT -= dt;
        if (!c.weapons || !c.weapons.length) continue;
        for (const w of c.weapons) {
          if (w.cd > (w.cdPrev || 0) + 1e-6) w.cdMax = w.cd;   // remember the full cooldown, for the HUD bar
          if (w.cd > 0) w.cd -= dt;
          w.cdPrev = w.cd;
          if (w.t <= 0) continue;
          w.t -= dt; if (c.destroyed || c.crashed) { w.t = 0; continue; }
          const d = w.d; w.gapT -= dt;
          if (d.blow) {   // leaf blower: push everything in the cone away and to the side
            for (const e of inCone(c, d)) { const side = ((e.c.pos.x - c.pos.x) * -Math.sin(c.rot) + (e.c.pos.y - c.pos.y) * Math.cos(c.rot)) >= 0 ? 1 : -1;
              knock(e.c, Math.cos(c.rot) * 0.6 - Math.sin(c.rot) * side, Math.sin(c.rot) * 0.6 + Math.cos(c.rot) * side, d.knock * w.k * dt * 6); }
            if (X.nearPlayer(c) && R() < 0.8) { const m = muzzle(c, false), a = c.rot + (R() - 0.5) * 0.8; X.emit(m.x, m.y, m.z, Math.cos(a) * 22 + c.vel.x, R() * 3, Math.sin(a) * 22 + c.vel.y, 0xc8e6a0, 0.5, 0.1); }
          } else if (d.aim === 'track') {   // minigun: a bullet every 0.1 s at the tracked target
            while (w.gapT <= 0 && w.n > 0) {
              w.gapT += d.burst / d.shots; w.n--;
              let t = w.tgt;
              if (!t || !hittable(t) || Math.hypot(t.pos.x - c.pos.x, t.pos.y - c.pos.y) > d.range + t.r) t = w.tgt = lockOn(c, d);
              if (t) { const dx = t.pos.x - c.pos.x, dy = t.pos.y - c.pos.y, a = Math.acos(Math.max(-1, Math.min(1, (dx * Math.cos(c.rot) + dy * Math.sin(c.rot)) / (Math.hypot(dx, dy) || 1)))); if (a > 1.2) t = w.tgt = null; }
              const m = muzzle(c, false), hitIt = t && R() < 0.7;   // slight spread
              if (hitIt) hit(t, d.dmg * w.k, c, d.type);
              if (X.nearPlayer(c) && w.n % 2 === 0) tracer(m, t ? { x: t.pos.x + (hitIt ? 0 : (R() - 0.5) * 4), y: cy(t), z: t.pos.y + (hitIt ? 0 : (R() - 0.5) * 4) } : { x: m.x + m.fx * d.range, y: m.y, z: m.z + m.fy * d.range }, d.color, 0.05);
            }
          } else if (d.shots && w.n > 0 && w.gapT <= 0) {   // rockets / mines: the next one
            w.n--; w.gapT = d.gap;
            if (d.aim === 'drop') drop(c, w); else launch(c, w, w.tgt && hittable(w.tgt) ? w.tgt : lockOn(c, d));
          } else if (d.trail && w.gapT <= 0) { w.gapT = 0.2; drop(c, w); }
        }
      }
      for (const c of cars) {
        if (c.slimeT > 0) { c.slimeT -= dt; c.slimeGap = (c.slimeGap || 0) - dt; if (c.slimeGap <= 0 && hittable(c) && closeToPlayer(c, 300)) { c.slimeGap = 0.2; drop(c, { d: SLIME, k: 1 }); } }
        if (c.spinT > 0 && hittable(c)) {   // Shell spin: anything touching the shell takes damage and is batted aside
          c.spinTick = (c.spinTick || 0) - dt;
          if (c.spinTick <= 0) { c.spinTick = 0.25;
            around(c.pos.x, c.pos.y, c.r + 8, (o, dist) => { if (o === c || !hittable(o) || dist > c.r + o.r + 1.5) return; X.hurt(o, 15 * c.size, c, 'shot'); knock(o, o.pos.x - c.pos.x, o.pos.y - c.pos.y, 14); });
            if (X.nearPlayer(c)) X.burst(c.pos.x, c.y + 1, c.pos.y, 8, 0xc49bff, 8, 0.3, 0.2, 2); }
        }
      }
      bubbles();
      // player fires on 1, 2, 3; nothing fires automatically
      if (armed && state === 'racing' && P.weapons) for (let i = 0; i < P.weapons.length; i++) if (X.down('Digit' + (i + 1), 'Numpad' + (i + 1))) fire(P, P.weapons[i]);
      // AI: same cone rule; only racers near you, to keep it fast
      if (armed && now > 8) for (const c of cars) {   // AI holds fire a little longer than you
        if (c.isPlayer || !c.weapons || !c.weapons.length || !hittable(c) || !closeToPlayer(c, 300)) continue;
        if ((c.wThink -= dt) > 0) continue;
        c.wThink = 0.3 + R() * 0.25;
        for (const w of c.weapons) {
          if (w.d.slot === 'passive' || w.cd > 0 || w.t > 0) continue;
          const keen = c.isBoss ? 0.6 : c.isHunter ? 0.4 : 0.15;   // AI racers mostly race; hunters and bosses are the ones gunning for you
          if (w.d.aim === 'drop') { if (inCone(c, REAR_LOOK).length && R() < keen) fire(c, w); }
          else if ((w.d.aim === 'wide' ? inCone(c, w.d).length : lockOn(c, w.d)) && R() < keen) fire(c, w);
        }
      }
      // projectiles
      for (let i = shots.length - 1; i >= 0; i--) {
        const p = shots[i], d = p.d; p.age += dt; p.life -= dt;
        if (p.tgt && hittable(p.tgt) && (d.aim === 'home' || d.id === 'netgun' || d.id === 'grapple')) {   // mild homing
          const want = Math.atan2(p.tgt.pos.y - p.z, p.tgt.pos.x - p.x), cur = Math.atan2(p.vz, p.vx);
          let df = want - cur; while (df > Math.PI) df -= 2 * Math.PI; while (df < -Math.PI) df += 2 * Math.PI;
          const turn = Math.max(-1, Math.min(1, df)) * (d.aim === 'home' ? 1.6 : 3) * dt, na = cur + turn;
          p.vx = Math.cos(na) * p.sp; p.vz = Math.sin(na) * p.sp; p.y += (cy(p.tgt) - p.y) * Math.min(1, 4 * dt);
        }
        p.x += p.vx * dt; p.z += p.vz * dt;
        const lobY = d.lob ? Math.sin(Math.min(1, p.age / (d.range / p.sp)) * Math.PI) * 4 : 0;
        p.mesh.position.set(p.x, p.y + lobY, p.z);
        if ((d.id === 'rockets' || d.id === 'flare') && X.nearPlayer(p.s) && R() < 0.8) X.emit(p.x, p.y, p.z, 0, 0.5, 0, d.id === 'rockets' ? 0x9a9088 : 0xff8aa0, 0.5, -0.05);
        let victim = null;
        around(p.x, p.z, 8, (c, dist) => { if (!victim && c !== p.s && hittable(c) && dist < c.r + 1.2 && Math.abs(cy(c) - p.y) < 2 + 1.5 * c.size) victim = c; });
        if (victim || p.life <= 0) {
          if (victim || d.splash) impact(p, victim);
          scene.remove(p.mesh); shots.splice(i, 1);
        }
      }
      // ground items: mines, caltrops, trails
      groundT += dt;
      if (groundT >= 0.1) {
        const gdt = groundT; groundT = 0;
        for (let i = ground.length - 1; i >= 0; i--) {
          const g = ground[i]; g.life -= gdt;
          if (g.life <= 0 || g.dead) { scene.remove(g.mesh); ground.splice(i, 1); continue; }
          if (g.kind === 'strip' && g.life < 1) g.mesh.material = soft(g.d.color, 0.35);   // fading out
          around(g.x, g.z, g.reach, (c, dist) => {
            if (g.dead || c === g.by || !hittable(c) || c.air) return;
            if (g.kind === 'strip') {
              const dx = c.pos.x - g.x, dy = c.pos.y - g.z, al = dx * Math.cos(g.rot) + dy * Math.sin(g.rot), la = -dx * Math.sin(g.rot) + dy * Math.cos(g.rot);
              if (Math.abs(al) > g.depth / 2 + c.r || Math.abs(la) > g.w / 2) return;
            } else if (dist > g.r + c.r) return;
            const d = g.d;
            if (g.kind === 'mine') { g.dead = true; hit(c, d.dmg * g.k, g.by, 'phys'); knock(c, c.pos.x - g.x, c.pos.y - g.z, 8); if (X.nearPlayer(c)) { X.burst(g.x, g.y + 1, g.z, 40, 0xff8a2a, 14, 0.6, 0.5, 3); X.burst(g.x, g.y + 1, g.z, 20, 0x3a3330, 6, 1.4, -0.1); } return; }
            if (d.id === 'caltrops') { if (!g.hit.has(c)) { g.hit.add(c); hit(c, d.dmg * g.k, g.by, 'phys'); } return; }
            if (d.slow) slowCar(c, d.slow, d.dur * g.k);
            if (d.spin && !g.hit.has(c)) { g.hit.add(c); if (R() < 0.35 * c.stabF && c.shieldT <= 0) { c.rot += (R() < 0.5 ? -1 : 1) * 0.7; c.speed *= 0.8; } }
            if (d.dps) poison(c, d.dps * g.k, d.dur, g.by, d.id + (g.by.name || ''));
          });
          if (g.d.id === 'firetrail' && R() < 0.5 && X.nearPlayer(g.by)) X.emit(g.x + (R() - 0.5) * g.depth, g.y + 0.3, g.z + (R() - 0.5) * 6, 0, 3 + R() * 3, 0, R() < 0.5 ? 0xff7a2a : 0xffd27a, 0.6, -0.1, 2);
        }
      }
      // auras: every 0.5 s
      auraT += dt;
      if (auraT >= 0.5 && armed) {
        const adt = auraT; auraT = 0;
        for (const c of cars) {
          if (!c.weapons || !hittable(c) || !closeToPlayer(c, 300)) continue;
          for (const w of c.weapons) {
            if (w.d.aim !== 'aura') continue;
            const d = w.d;
            if (d.every) { c.aircT -= adt; if (c.aircT > 0) continue; c.aircT = d.every; }
            around(c.pos.x, c.pos.y, d.rad + 3, (o, dist) => {
              if (o === c || !hittable(o) || dist > d.rad + o.r) return;
              if (d.id === 'sawblade') X.hurt(o, d.dps * w.k * adt, c, 'shot');
              if (d.id === 'fumes') X.hurt(o, d.dps * w.k * adt, c, 'magic');
              if (d.id === 'tar') slowCar(o, d.slow, 0.6 * w.k);
              if (d.id === 'aircannons') knock(o, o.pos.x - c.pos.x, o.pos.y - c.pos.y, d.knock * w.k);
            });
            if (X.nearPlayer(c) && (d.id === 'fumes' || d.id === 'tar')) for (let k = 0; k < 4; k++) X.emit(c.pos.x + (R() - 0.5) * d.rad, c.y + 0.6, c.pos.y + (R() - 0.5) * d.rad, 0, 1 + R(), 0, d.id === 'fumes' ? 0x8dff6a : 0x2a2420, 1, -0.05);
          }
        }
      }
      // poison ticks every 0.5 s
      dotT += dt;
      if (dotT >= 0.5) {
        const tdt = dotT; dotT = 0;
        for (const c of cars) {
          if (!c.dots || !c.dots.length) continue;
          if (c.destroyed || c.crashed) { c.dots.length = 0; continue; }
          let sum = 0, by = null;
          for (let i = c.dots.length - 1; i >= 0; i--) { const q = c.dots[i]; const step = Math.min(tdt, q.t); sum += q.dps * step; by = by || q.by; q.t -= tdt; if (q.t <= 0) c.dots.splice(i, 1); }
          if (sum > 0) X.hurt(c, sum, by, 'magic');
          if (X.nearPlayer(c) && R() < 0.7) X.emit(c.pos.x, cy(c), c.pos.y, 0, 2, 0, 0x9dff4a, 0.6, -0.1);
        }
      }
      for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t -= dt; if (f.t <= 0) { scene.remove(f.mesh); f.geo.dispose(); fx.splice(i, 1); } }
      // red outline on whatever your weapons would hit right now
      const want = new Set();
      if (state === 'racing' && P.weapons && hittable(P)) for (const w of P.weapons) {
        const d = w.d; if (d.slot === 'passive' || d.aim === 'drop') continue;
        if (d.aim === 'wide') inCone(P, d).slice(0, 6).forEach(e => want.add(e.c));
        else { const t = w.t > 0 && w.tgt && hittable(w.tgt) ? w.tgt : lockOn(P, d); if (t) want.add(t); }
      }
      for (const c of outlined) if (!want.has(c)) outline(c, false);
      for (const c of want) outline(c, true);
      outlined = want;
    }
    // a faint bubble on every nearby ride whose Shield stat still has points; it flashes when hit
    const bubbleGeo = keep(new T3.SphereGeometry(2.4, 18, 12)), bubbleMats = {};
    const bubbleMat = op => bubbleMats[op] || (bubbleMats[op] = keep(new T3.MeshBasicMaterial({ color: 0x8fdcff, transparent: true, opacity: op, depthWrite: false })));
    function bubbles() {
      const now = raceT();
      for (const c of X.cars) {
        const u = c.mesh && c.mesh.userData; if (!u || !u.body) continue;
        const on = c.sh > 1 && hittable(c) && X.nearPlayer(c);
        if (!u.shBub) { if (!on) continue; u.shBub = new T3.Mesh(bubbleGeo, bubbleMat(0.1)); u.shBub.position.y = 1.4; u.body.add(u.shBub); }
        u.shBub.visible = on;
        if (on) { const hitAgo = now - (c.shT || -9); u.shBub.material = bubbleMat(hitAgo < 0.25 ? 0.35 : 0.1); }
      }
    }
    // the Ice cream van's Jingle: everyone close by is slowed
    function jingle(c) {
      around(c.pos.x, c.pos.y, 38, (o, dist) => { if (o !== c && hittable(o) && dist < 35 + o.r) slowCar(o, 0.35, 2.5); });
      if (X.nearPlayer(c)) for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; X.emit(c.pos.x, c.y + 2, c.pos.y, Math.cos(a) * 30 + c.vel.x, 2 + R() * 2, Math.sin(a) * 30 + c.vel.y, i % 2 ? 0xff9ad5 : 0xfff3a0, 0.9, 0.05, 2); }
    }
    // how many rivals are near: dir 1 = ahead, -1 = behind, 0 = all round (for AI ability use)
    function crowd(c, dir) {
      let n = 0; const fx = Math.cos(c.rot), fy = Math.sin(c.rot);
      around(c.pos.x, c.pos.y, 30, o => { if (o === c || !hittable(o)) return; const al = (o.pos.x - c.pos.x) * fx + (o.pos.y - c.pos.y) * fy; if (!dir || al * dir > 0) n++; });
      return n;
    }
    function impact(p, victim) {
      const d = p.d, s = p.s;
      const apply = c => {
        if (d.dmg) hit(c, d.dmg * p.k, s, d.type);
        if (d.slow) slowCar(c, d.slow, d.dur * p.k);
        if (d.dps) poison(c, d.dps * p.k, d.dur, s, d.id === 'flare' ? null : 'acid' + (s.name || ''));
        if (d.id === 'grapple' && !s.destroyed) knock(s, c.pos.x - s.pos.x, c.pos.y - s.pos.y, d.yank * p.k);
      };
      if (d.splash) around(p.x, p.z, d.splash + 6, (c, dist) => { if (c !== s && hittable(c) && dist < d.splash + c.r) apply(c); });
      else if (victim) apply(victim);
      if (X.nearPlayer(s) || (victim && X.nearPlayer(victim))) X.burst(p.x, p.y, p.z, d.splash ? 26 : 10, d.color, d.splash ? 10 : 5, 0.45, 0.4, 3);
    }
    function outline(c, on) {
      const u = c.mesh && c.mesh.userData; if (!u) return;
      if (!u.tgtOl) {
        if (!on) return;
        const g = new T3.Group();
        for (const k in u.model.geos) if (k === 'paint' || k === 'second') g.add(new T3.Mesh(u.model.geos[k], olMat));
        u.rig.add(g); u.tgtOl = g;
      }
      u.tgtOl.visible = on;
    }
    function hud(state) {
      if (!el) return;
      const ws = P.weapons || [], armed = raceT() > 5 && state === 'racing';
      el.innerHTML = [0, 1, 2].map(i => {
        const w = ws[i];
        if (!w) return '<div class="wSlot empty"><b>' + (i + 1) + '</b><div><span>empty</span></div></div>';
        const pas = w.d.slot === 'passive', ready = pas || (w.cd <= 0 && w.t <= 0), col = SLOT_COL[w.d.slot];
        const frac = pas || !armed ? 1 : w.t > 0 ? 0 : w.cd > 0 ? 1 - w.cd / Math.max(0.1, w.cdMax || w.d.cd) : 1;
        const label = pas ? 'ALWAYS ON' : !armed ? 'ARMING' : w.t > 0 ? 'FIRING' : w.cd > 0 ? w.cd.toFixed(1) + ' s' : 'READY';
        return '<div class="wSlot' + (ready && armed ? ' ready' : '') + (pas ? ' pas' : '') + '" style="--c:' + col + '"><b>' + (pas ? '&bull;' : i + 1) + '</b><div><span>' + w.d.name + ' <i>T' + w.tier + '</i></span>' +
          '<em><u style="width:' + (frac * 100).toFixed(0) + '%"></u></em><small>' + label + '</small></div></div>';
      }).join('');
    }
    function show(on) { if (el) el.style.display = on ? 'flex' : 'none'; }
    function dispose() {
      for (const p of shots) scene.remove(p.mesh); for (const g of ground) scene.remove(g.mesh); for (const f of fx) { scene.remove(f.mesh); f.geo.dispose(); }
      shots.length = ground.length = fx.length = 0;
      for (const c of outlined) outline(c, false);
      own.forEach(o => o.dispose && o.dispose()); show(false);
    }
    return { setup, update, onRam, ramMult, hud, show, dispose, fire, knock, jingle, crowd, _shots: shots, _ground: ground };
  }

  return { DEFS, IDS, tk, offer, pickBase, aiLoadout, label, card, slotsLine, simScore, attach, SLOT_COL };
})();
