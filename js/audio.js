// ===== Sound: engine and tyres, synthesized (no files). M mutes. =====
const Sfx = (function () {
  let ctx = null, master = null, eng = null, muted = false;
  try { muted = localStorage.getItem('r1_mute') === '1'; } catch (e) {}
  function start() {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC || ctx) { if (ctx && ctx.state === 'suspended') ctx.resume(); return; }
    ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ctx.destination);
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), eg = ctx.createGain(), o2g = ctx.createGain();
    o1.type = 'sawtooth'; o2.type = 'square'; lp.type = 'lowpass'; lp.Q.value = 2; o2g.gain.value = 0.35; eg.gain.value = 0;
    o1.connect(lp); o2.connect(o2g); o2g.connect(lp); lp.connect(eg); eg.connect(master);
    const n = ctx.createBufferSource(); n.buffer = buf; n.loop = true; const nb = ctx.createBiquadFilter(); nb.type = 'bandpass'; nb.frequency.value = 2600; nb.Q.value = 3; const ng = ctx.createGain(); ng.gain.value = 0;
    n.connect(nb); nb.connect(ng); ng.connect(master);                         // tyre squeal
    const r = ctx.createBufferSource(); r.buffer = buf; r.loop = true; const rb = ctx.createBiquadFilter(); rb.type = 'lowpass'; rb.frequency.value = 500; const rg = ctx.createGain(); rg.gain.value = 0;
    r.connect(rb); rb.connect(rg); rg.connect(master);                         // road / grass rumble
    o1.start(); o2.start(); n.start(); r.start();
    eng = { o1, o2, lp, eg, ng, rg, rb };
  }
  function update(o) {
    if (!eng) return; const t = ctx.currentTime, sp = Math.min(1.4, Math.abs(o.speed) / o.top);
    const f = 45 + 110 * sp + (o.throttle ? 25 : 0) + (o.boost ? 30 : 0);
    eng.o1.frequency.setTargetAtTime(f, t, 0.06); eng.o2.frequency.setTargetAtTime(f / 2, t, 0.06);
    eng.lp.frequency.setTargetAtTime(350 + 1100 * sp + (o.throttle ? 500 : 0), t, 0.08);
    eng.eg.gain.setTargetAtTime(0.07 + (o.throttle ? 0.06 : 0), t, 0.08);
    eng.ng.gain.setTargetAtTime(Math.min(0.12, o.slip * 0.012) * (o.onRoad ? 1 : 0.3), t, 0.05);
    eng.rg.gain.setTargetAtTime((o.onRoad ? 0.04 : 0.16) * Math.min(1, sp * 1.4), t, 0.1); eng.rb.frequency.setTargetAtTime(o.onRoad ? 700 : 300, t, 0.1);
  }
  function toggle() { muted = !muted; try { localStorage.setItem('r1_mute', muted ? '1' : '0'); } catch (e) {} if (master) master.gain.setTargetAtTime(muted ? 0 : 0.5, ctx.currentTime, 0.05); return muted; }
  return { start, update, toggle };
})();
