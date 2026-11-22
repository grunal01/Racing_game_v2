// ===== Tuning panel (Tab): every handling, camera and track number, live. Values are remembered in this browser. =====
const Tuning = (function () {
  // [key, label, min, max, step, group]
  const SPEC = [
    ['topSpeed', 'Top speed (m/s)', 20, 90, 1, 'Driving'], ['accel', 'Acceleration', 5, 40, 0.5, 'Driving'], ['brake', 'Brakes', 10, 70, 1, 'Driving'],
    ['reverse', 'Reverse', 2, 20, 0.5, 'Driving'], ['steerLock', 'Steering lock', 0.2, 1, 0.01, 'Driving'], ['steerSpeed', 'Steering speed', 1, 15, 0.25, 'Driving'],
    ['steerFall', 'Steering kept at speed (higher = sharper)', 10, 150, 1, 'Driving'],
    ['gripF', 'Front grip', 0.6, 5, 0.05, 'Grip and drift'], ['gripR', 'Rear grip (lower = drifts more)', 0.6, 5, 0.05, 'Grip and drift'],
    ['tyrePeak', 'Tyre bite (how fast grip builds)', 2, 20, 0.5, 'Grip and drift'], ['tyreFade', 'Slide falloff (higher = grip drops more past the limit)', 1, 1.9, 0.01, 'Grip and drift'],
    ['weightShift', 'Weight shift on brakes (higher = brake drifts)', 0, 1.2, 0.02, 'Grip and drift'], ['brakeRear', 'Rear brake share', 0, 1, 0.02, 'Grip and drift'],
    ['yawInertia', 'Rotation weight (higher = lazier spins)', 0.5, 5, 0.05, 'Grip and drift'],
    ['driftMax', 'Slide angle held (degrees)', 5, 60, 1, 'Grip and drift'], ['slideKeep', 'Speed kept while sliding', 0, 1, 0.02, 'Grip and drift'], ['driftCatch', 'Drift catch (higher = harder to spin)', 0, 20, 0.5, 'Grip and drift'], ['traction', 'Traction control (lower = less wheelspin)', 0.2, 1, 0.02, 'Grip and drift'],
    ['downforce', 'Downforce at speed', 0, 3, 0.05, 'Grip and drift'], ['bankGrip', 'Extra grip on banks', 0, 4, 0.1, 'Grip and drift'],
    ['offTop', 'Grass top speed (x)', 0.2, 1, 0.02, 'Grip and drift'], ['offGrip', 'Grass grip (x)', 0.2, 1, 0.02, 'Grip and drift'],
    ['camDist', 'Camera distance', 4, 20, 0.25, 'Camera'], ['camHeight', 'Camera height', 1, 10, 0.1, 'Camera'], ['camLag', 'Camera follow speed', 1, 20, 0.5, 'Camera'],
    ['camLook', 'Look ahead', 0, 20, 0.5, 'Camera'], ['fov', 'Field of view', 40, 90, 1, 'Camera'], ['fovBoost', 'Extra view at speed', 0, 30, 1, 'Camera'],
    ['BANK', 'Bank angle (degrees)', 0, 40, 1, 'Track'], ['R', 'Bend radius (m)', 25, 120, 1, 'Track'], ['L', 'Straight length (m)', 60, 400, 5, 'Track'], ['W', 'Road width (m)', 8, 24, 0.5, 'Track']
  ];
  const TRACK_KEYS = ['BANK', 'R', 'L', 'W'];
  let T = {}, el = null, onTrack = null;
  function defaults() { return Object.assign({}, Car.DEF, { BANK: Track.defaults.BANK, R: Track.defaults.R, L: Track.defaults.L, W: Track.defaults.W }); }
  function load() { T = defaults(); try { Object.assign(T, JSON.parse(localStorage.getItem('r12_tune') || '{}')); } catch (e) {} return T; }
  function save() { try { localStorage.setItem('r12_tune', JSON.stringify(T)); } catch (e) {} }
  const trackOpts = () => ({ BANK: T.BANK, R: T.R, L: T.L, W: T.W });
  function changed() { const d = defaults(), o = {}; for (const k in T) if (Math.abs(T[k] - d[k]) > 1e-9) o[k] = T[k]; return o; }
  function render() {
    let html = '<div class="tHead"><b>Tuning</b> <span>Tab to hide</span></div>', grp = '';
    for (const [k, label, mn, mx, st, g] of SPEC) {
      if (g !== grp) { html += '<h4>' + g + (g === 'Track' ? ' <small>(rebuilds when you let go)</small>' : '') + '</h4>'; grp = g; }
      html += '<label><span>' + label + '</span><input type="range" data-k="' + k + '" min="' + mn + '" max="' + mx + '" step="' + st + '" value="' + T[k] + '"><output>' + (+T[k]).toFixed(st < 0.1 ? 2 : st < 1 ? 1 : 0) + '</output></label>';
    }
    html += '<div class="tBtns"><button id="tCopy">Copy values</button><button id="tReset">Reset all</button></div><textarea id="tOut" readonly></textarea>';
    el.innerHTML = html;
    el.querySelectorAll('input[type=range]').forEach(inp => {
      const k = inp.dataset.k, st = +inp.step, out = inp.nextElementSibling;
      inp.addEventListener('input', () => { T[k] = +inp.value; out.textContent = T[k].toFixed(st < 0.1 ? 2 : st < 1 ? 1 : 0); save(); });
      inp.addEventListener('change', () => { inp.blur(); if (TRACK_KEYS.includes(k) && onTrack) onTrack(trackOpts()); });   // blur so the driving keys work again
      inp.addEventListener('keydown', e => { if (e.code === 'Tab') { e.preventDefault(); toggle(); } });
    });
    el.querySelector('#tCopy').onclick = () => {
      const txt = 'R1.2 tuning: ' + JSON.stringify(changed()), ta = el.querySelector('#tOut'); ta.value = txt; ta.style.display = 'block'; ta.select();
      try { navigator.clipboard.writeText(txt).catch(() => {}); } catch (e) {}
    };
    el.querySelector('#tReset').onclick = () => { T = Object.assign(T, defaults()); save(); render(); if (onTrack) onTrack(trackOpts()); };
  }
  function toggle() { el.style.display = el.style.display === 'block' ? 'none' : 'block'; if (el.style.display === 'block') render(); }
  function init(cb) { el = document.getElementById('tuning'); onTrack = cb; load(); return T; }
  return { init, toggle, get T() { return T; }, trackOpts };
})();
