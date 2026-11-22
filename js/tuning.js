// ===== Tuning panel (Tab): every handling, camera and track number, live. Values are remembered in this browser. =====
const Tuning = (function () {
  // [key, label, min, max, step, group]
  const SPEC = [
    ['topSpeed', 'Top speed (m/s)', 20, 90, 1, 'Engine and brakes'], ['accel', 'Acceleration', 4, 40, 0.5, 'Engine and brakes'], ['brake', 'Brakes', 5, 70, 1, 'Engine and brakes'],
    ['reverse', 'Reverse', 2, 20, 0.5, 'Engine and brakes'],
    ['steerLock', 'Steering lock', 0.15, 1, 0.01, 'Steering'], ['steerFall', 'Steering kept at speed (higher = sharper at speed)', 8, 150, 1, 'Steering'],
    ['steerSpeed', 'Steering response', 1, 15, 0.25, 'Steering'],
    ['tyreGrip', 'Tyre grip limit (lower = slides sooner)', 0.5, 8, 0.1, 'Tyres'], ['sideGrip', 'Side grip stiffness', 0.2, 4, 0.05, 'Tyres'],
    ['rearGrip', 'Rear grip (x, lower = rear steps out sooner)', 0.4, 1.5, 0.02, 'Tyres'], ['offGrip', 'Grass grip (x)', 0.2, 1, 0.02, 'Tyres'], ['offTop', 'Grass top speed (x)', 0.2, 1, 0.02, 'Tyres'],
    ['suspStiff', 'Suspension stiffness', 10, 150, 1, 'Suspension and weight'], ['suspDamp', 'Suspension damping', 0.5, 10, 0.1, 'Suspension and weight'],
    ['suspTravel', 'Suspension travel (m)', 0.05, 0.6, 0.01, 'Suspension and weight'], ['gravity', 'Gravity (higher = more planted)', 9, 40, 0.5, 'Suspension and weight'],
    ['comY', 'Weight height (lower = harder to roll)', -1, 1, 0.05, 'Suspension and weight'],
    ['camDist', 'Camera distance', 4, 20, 0.25, 'Camera'], ['camHeight', 'Camera height', 1, 10, 0.1, 'Camera'], ['camLag', 'Camera follow speed', 1, 20, 0.5, 'Camera'],
    ['camLook', 'Look ahead', 0, 20, 0.5, 'Camera'], ['fov', 'Field of view', 40, 90, 1, 'Camera'], ['fovBoost', 'Extra view at speed', 0, 30, 1, 'Camera'],
    ['BANK', 'Bank angle (degrees)', 0, 40, 1, 'Track'], ['R', 'Bend radius (m)', 25, 120, 1, 'Track'], ['L', 'Straight length (m)', 60, 400, 5, 'Track'], ['W', 'Road width (m)', 8, 24, 0.5, 'Track']
  ];
  const TRACK_KEYS = ['BANK', 'R', 'L', 'W'];
  let T = {}, el = null, onTrack = null;
  function defaults() { return Object.assign({}, Car.DEF, { BANK: Track.defaults.BANK, R: Track.defaults.R, L: Track.defaults.L, W: Track.defaults.W }); }
  function load() { T = defaults(); try { Object.assign(T, JSON.parse(localStorage.getItem('r16_tune') || '{}')); } catch (e) {} return T; }
  function save() { try { localStorage.setItem('r16_tune', JSON.stringify(T)); } catch (e) {} }
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
      const txt = 'R1.6 tuning: ' + JSON.stringify(changed()), ta = el.querySelector('#tOut'); ta.value = txt; ta.style.display = 'block'; ta.select();
      try { navigator.clipboard.writeText(txt).catch(() => {}); } catch (e) {}
    };
    el.querySelector('#tReset').onclick = () => { T = Object.assign(T, defaults()); save(); render(); if (onTrack) onTrack(trackOpts()); };
  }
  function toggle() { el.style.display = el.style.display === 'block' ? 'none' : 'block'; if (el.style.display === 'block') render(); }
  function init(cb) { el = document.getElementById('tuning'); onTrack = cb; load(); return T; }
  return { init, toggle, get T() { return T; }, trackOpts };
})();
