// ===== Tuning panel (Tab): every handling, camera and track number, live. Values are remembered in this browser. =====
const Tuning = (function () {
  // [key, label, min, max, step, group]
  const SPEC = [
    ['topSpeed', 'Top speed (m/s)', 20, 90, 1, 'Driving'], ['accel', 'Acceleration', 5, 40, 0.5, 'Driving'], ['brake', 'Brakes', 10, 70, 1, 'Driving'],
    ['reverse', 'Reverse', 2, 20, 0.5, 'Driving'], ['turnRate', 'Steering', 0.6, 4, 0.05, 'Driving'], ['turnFall', 'Steering kept at speed (higher = sharper)', 20, 300, 5, 'Driving'],
    ['steerSpeed', 'Steering response', 1, 15, 0.25, 'Driving'],
    ['grip', 'Normal grip (how fast the car follows its nose)', 2, 30, 0.5, 'Grip'], ['cornerLimit', 'Cornering limit before it slides wide', 10, 80, 1, 'Grip'],
    ['bankGrip', 'Extra cornering on banks', 0, 4, 0.1, 'Grip'], ['offTop', 'Grass top speed (x)', 0.2, 1, 0.02, 'Grip'], ['offGrip', 'Grass grip (x)', 0.2, 1, 0.02, 'Grip'],
    ['driftEase', 'Steering needed to start a drift (lower = easier)', 0.1, 1, 0.05, 'Drift'], ['driftMinSpeed', 'Slowest speed you can drift (m/s)', 5, 40, 1, 'Drift'],
    ['driftKick', 'Kick when a drift starts', 0, 2, 0.05, 'Drift'], ['driftTurn', 'Steering in a drift', 0.5, 4, 0.05, 'Drift'],
    ['driftGrip', 'Drift grip (lower = more sideways)', 0.2, 8, 0.1, 'Drift'], ['driftMax', 'Most sideways a drift can get (degrees)', 10, 80, 1, 'Drift'],
    ['driftScrub', 'Speed lost while drifting', 0, 1, 0.02, 'Drift'], ['driftBrake', 'Brake strength while drifting (x)', 0, 1, 0.05, 'Drift'],
    ['camDist', 'Camera distance', 4, 20, 0.25, 'Camera'], ['camHeight', 'Camera height', 1, 10, 0.1, 'Camera'], ['camLag', 'Camera follow speed', 1, 20, 0.5, 'Camera'],
    ['camLook', 'Look ahead', 0, 20, 0.5, 'Camera'], ['fov', 'Field of view', 40, 90, 1, 'Camera'], ['fovBoost', 'Extra view at speed', 0, 30, 1, 'Camera'],
    ['BANK', 'Bank angle (degrees)', 0, 40, 1, 'Track'], ['R', 'Bend radius (m)', 25, 120, 1, 'Track'], ['L', 'Straight length (m)', 60, 400, 5, 'Track'], ['W', 'Road width (m)', 8, 24, 0.5, 'Track']
  ];
  const TRACK_KEYS = ['BANK', 'R', 'L', 'W'];
  let T = {}, el = null, onTrack = null;
  function defaults() { return Object.assign({}, Car.DEF, { BANK: Track.defaults.BANK, R: Track.defaults.R, L: Track.defaults.L, W: Track.defaults.W }); }
  function load() { T = defaults(); try { Object.assign(T, JSON.parse(localStorage.getItem('r13_tune') || '{}')); } catch (e) {} return T; }
  function save() { try { localStorage.setItem('r13_tune', JSON.stringify(T)); } catch (e) {} }
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
      const txt = 'R1.3 tuning: ' + JSON.stringify(changed()), ta = el.querySelector('#tOut'); ta.value = txt; ta.style.display = 'block'; ta.select();
      try { navigator.clipboard.writeText(txt).catch(() => {}); } catch (e) {}
    };
    el.querySelector('#tReset').onclick = () => { T = Object.assign(T, defaults()); save(); render(); if (onTrack) onTrack(trackOpts()); };
  }
  function toggle() { el.style.display = el.style.display === 'block' ? 'none' : 'block'; if (el.style.display === 'block') render(); }
  function init(cb) { el = document.getElementById('tuning'); onTrack = cb; load(); return T; }
  return { init, toggle, get T() { return T; }, trackOpts };
})();
