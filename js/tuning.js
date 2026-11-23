// ===== Tuning panel (Tab): every handling, camera and track number, live. Values are remembered in this browser. =====
const Tuning = (function () {
  // [key, label, min, max, step, group]
  // the 'Main' group is the handful worth touching first; everything else sits under Advanced
  const SPEC = [
    ['topSpeed', 'Top speed (m/s)', 20, 90, 1, 'Main'], ['turnRate', 'Steering', 0.5, 4, 0.05, 'Main'],
    ['grip', 'Grip (lower = slides more)', 0.5, 20, 0.1, 'Main'], ['slideMax', 'Most sideways a slide gets (degrees)', 5, 70, 1, 'Main'], ['slideHold', 'Big slides carry further', 0, 0.9, 0.05, 'Main'],
    ['breakKmh', 'Break speed: hit a breakable rock faster than this (km/h, into it)', 30, 250, 5, 'Main'],
    ['scrape', 'Speed lost when you hit something (more when head-on)', 0, 1, 0.05, 'Impacts'], ['bounce', 'Bounce back off things', 0, 0.8, 0.05, 'Impacts'], ['breakLoss', 'Speed lost breaking through a wall', 0, 0.8, 0.05, 'Impacts'],
    ['accel', 'Acceleration', 4, 40, 0.5, 'Engine and brakes'], ['brake', 'Brakes', 5, 70, 1, 'Engine and brakes'], ['reverse', 'Reverse', 2, 20, 0.5, 'Engine and brakes'],
    ['turnFall', 'Steering kept at speed (higher = sharper at speed)', 15, 300, 5, 'Steering'], ['steerSpeed', 'Steering response', 1, 15, 0.25, 'Steering'],
    ['slideScrub', 'Speed lost while sliding', 0, 1, 0.02, 'Sliding'],
    ['suspStiff', 'Suspension stiffness', 10, 150, 1, 'Suspension'], ['suspDamp', 'Suspension damping', 0.5, 10, 0.1, 'Suspension'],
    ['suspTravel', 'Suspension travel (m)', 0.05, 0.6, 0.01, 'Suspension'], ['gravity', 'Gravity (higher = more planted)', 9, 40, 0.5, 'Suspension'],
    ['comY', 'Weight height (lower = harder to roll)', -1, 1, 0.05, 'Suspension'], ['landLoss', 'Speed lost on hard landings', 0, 0.08, 0.005, 'Suspension'],
    ['camDist', 'Camera distance', 4, 20, 0.25, 'Camera'], ['camHeight', 'Camera height', 1, 10, 0.1, 'Camera'], ['camLag', 'Camera follow speed', 1, 20, 0.5, 'Camera'],
    ['camLook', 'Look ahead', 0, 20, 0.5, 'Camera'], ['fov', 'Field of view', 40, 90, 1, 'Camera'], ['fovBoost', 'Extra view at speed', 0, 30, 1, 'Camera'],
    ['sceneA', 'Zone A: how much stuff (x)', 0, 3, 0.05, 'Scenery'], ['nearA', 'Zone A: closer (-) or further (+) from the road (m)', -6, 30, 0.5, 'Scenery'], ['sizeA', 'Zone A: size (x)', 0.3, 3, 0.05, 'Scenery'],
    ['sceneB', 'Zone B: how much stuff (x)', 0, 3, 0.05, 'Scenery'], ['nearB', 'Zone B: closer (-) or further (+) from the road (m)', -6, 30, 0.5, 'Scenery'], ['sizeB', 'Zone B: size (x)', 0.3, 3, 0.05, 'Scenery'],
    ['sceneC', 'Zone C: how much stuff (x)', 0, 3, 0.05, 'Scenery'], ['nearC', 'Zone C: closer (-) or further (+) from the road (m)', -6, 30, 0.5, 'Scenery'], ['sizeC', 'Zone C: size (x)', 0.3, 3, 0.05, 'Scenery'],
    ['sceneD', 'Zone D: how much stuff (x)', 0, 3, 0.05, 'Scenery'], ['nearD', 'Zone D: closer (-) or further (+) from the road (m)', -6, 30, 0.5, 'Scenery'], ['sizeD', 'Zone D: size (x)', 0.3, 3, 0.05, 'Scenery'],
    ['BANK', 'Sweeper bank (degrees; the carousel gets double)', 0, 20, 1, 'Track'], ['HILLS', 'Hills (x)', 0, 3, 0.1, 'Track'], ['JUMP', 'Jump height (m)', 0, 8, 0.1, 'Track'], ['JUMPA', 'Jump lip angle (degrees, steeper = more air)', 3, 35, 1, 'Track'], ['W', 'Road width (m)', 8, 24, 0.5, 'Track']
  ];
  const TRACK_KEYS = ['BANK', 'HILLS', 'JUMP', 'JUMPA', 'W'].concat(...'ABCD'.split('').map(z => ['scene' + z, 'near' + z, 'size' + z]));
  let T = {}, el = null, onTrack = null, advOpen = false;
  function defaults() { const d = Object.assign({}, Car.DEF, { BANK: Track.defaults.BANK, HILLS: Track.defaults.HILLS, JUMP: Track.defaults.JUMP, JUMPA: Track.defaults.JUMPA, W: Track.defaults.W }, Surfaces.defaults()); for (const z of 'ABCD') Object.assign(d, { ['scene' + z]: 1, ['near' + z]: 0, ['size' + z]: 1 }); return d; }
  function load() { T = defaults(); try { Object.assign(T, JSON.parse(localStorage.getItem('r20_tune') || '{}')); } catch (e) {} return T; }
  function save() { try { localStorage.setItem('r20_tune', JSON.stringify(T)); } catch (e) {} }
  const trackOpts = () => ({ BANK: T.BANK, HILLS: T.HILLS, JUMP: T.JUMP, JUMPA: T.JUMPA, W: T.W });
  function changed() { const d = defaults(), o = {}; for (const k in T) if (Math.abs(T[k] - d[k]) > 1e-9) o[k] = T[k]; return o; }
  function render() {
    let html = '<div class="tHead"><b>Tuning</b> <span>Tab to hide</span></div>', grp = '';
    const row = ([k, label, mn, mx, st]) => '<label><span>' + label + '</span><input type="range" data-k="' + k + '" min="' + mn + '" max="' + mx + '" step="' + st + '" value="' + T[k] + '"><output>' + (+T[k]).toFixed(st < 0.1 ? 2 : st < 1 ? 1 : 0) + '</output></label>';
    const head = g => '<h4>' + g + (g === 'Track' || g === 'Scenery' ? ' <small>(rebuilds when you let go)</small>' : '') + '</h4>';
    // main settings, then the surfaces this map is using (with which sector they're on), then everything else under Advanced
    html += head('Main') + SPEC.filter(r => r[5] === 'Main').map(row).join('');
    const use = Surfaces.inUse(), where = g => use.map((u, i) => u === g ? (i < 4 ? 'S' + (i + 1) : 'off-road') : null).filter(Boolean).join(', ');
    for (const g of [...new Set(use)]) html += '<h4>' + g + ' <small>(' + where(g) + ')</small></h4>' + Surfaces.spec().filter(r => r[5] === g).map(row).join('');
    html += '<details' + (advOpen ? ' open' : '') + '><summary>Advanced</summary>';
    for (const r of SPEC) { if (r[5] === 'Main') continue; if (r[5] !== grp) { html += head(r[5]); grp = r[5]; } html += row(r); }
    html += '</details>';
    html += '<div class="tBtns"><button id="tCopy">Copy values</button><button id="tReset">Reset all</button></div><textarea id="tOut" readonly></textarea>';
    el.innerHTML = html;
    el.querySelector('details').addEventListener('toggle', e => { advOpen = e.target.open; });
    el.querySelectorAll('input[type=range]').forEach(inp => {
      const k = inp.dataset.k, st = +inp.step, out = inp.nextElementSibling;
      inp.addEventListener('input', () => { T[k] = +inp.value; out.textContent = T[k].toFixed(st < 0.1 ? 2 : st < 1 ? 1 : 0); save(); });
      inp.addEventListener('change', () => { inp.blur(); if ((TRACK_KEYS.includes(k) || /_(depth|bumps)$/.test(k)) && onTrack) onTrack(trackOpts()); });   // blur so the driving keys work again
      inp.addEventListener('keydown', e => { if (e.code === 'Tab') { e.preventDefault(); toggle(); } });
    });
    el.querySelector('#tCopy').onclick = () => {
      const txt = 'R3.6 tuning: ' + JSON.stringify(changed()), ta = el.querySelector('#tOut'); ta.value = txt; ta.style.display = 'block'; ta.select();
      try { navigator.clipboard.writeText(txt).catch(() => {}); } catch (e) {}
    };
    el.querySelector('#tReset').onclick = () => { T = Object.assign(T, defaults()); save(); render(); if (onTrack) onTrack(trackOpts()); };
  }
  function toggle() { el.style.display = el.style.display === 'block' ? 'none' : 'block'; if (el.style.display === 'block') render(); }
  function init(cb) { el = document.getElementById('tuning'); onTrack = cb; load(); return T; }
  const refresh = () => { if (el && el.style.display === 'block') render(); };
  return { init, toggle, refresh, get T() { return T; }, trackOpts };
})();
