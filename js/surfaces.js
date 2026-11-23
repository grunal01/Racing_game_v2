// ===== Surfaces: how each kind of ground drives, and which surface each map puts on each sector =====
// Every surface has four numbers, all live-tunable (Tab, under "Surface: ..."):
//   grip  - how quickly the kart's direction of travel follows its nose (x the car's grip). Low = slides wide.
//   drag  - how much the ground holds you back (0 = none, 2 = very heavy). Bogs you down in sand, mud, water, deep snow.
//   top   - top speed on it (x the car's top speed).
//   brake - braking strength on it (x). Ice barely stops you.
//   spray - how much the wheels throw up on it (dust, mud, water, snow...), x.
//   depth - how far the ground sits below the top of the surface: the wheels sink in (water, deep snow, mud). bumps - lumps, ruts, drifts.
// Each map: S1 is its main road surface, S2-S4 are test surfaces, and `ground` is what's off the road.
// The lab menu can put any road surface on any sector.
const Surfaces = (function () {
  const DEF = {
    asphalt:    { name: 'Asphalt', color: 0x5a5753, grip: 1, drag: 0, top: 1, brake: 1, spray: 1, depth: 0, bumps: 0 },
    hardpan:    { name: 'Hardpan', color: 0xc29a6c, grip: 0.9, drag: 0.05, top: 0.98, brake: 0.95, spray: 2, depth: 0, bumps: 0 },
    packedDirt: { name: 'Packed dirt', color: 0x8c6b49, grip: 0.8, drag: 0.08, top: 0.96, brake: 0.85, spray: 2, depth: 0, bumps: 0 },
    gravel:     { name: 'Gravel', color: 0x9d968b, grip: 0.6, drag: 0.25, top: 0.9, brake: 0.7, spray: 1.8, depth: 0, bumps: 0.02 },
    dirt:       { name: 'Dirt', color: 0x7d5c3b, grip: 0.65, drag: 0.15, top: 0.93, brake: 0.75, spray: 2.2, depth: 0, bumps: 0.03 },
    mud:        { name: 'Mud', color: 0x4b3727, grip: 0.4, drag: 1.0, top: 0.7, brake: 0.55, spray: 1.8, depth: 0.2, bumps: 0.07, layer: 'mud' },
    wetGrass:   { name: 'Wet grass', color: 0x4c6d31, grip: 0.4, drag: 0.3, top: 0.88, brake: 0.5, spray: 1.6, depth: 0, bumps: 0 },
    water:      { name: 'Shallow water', color: 0x4a8ea3, grip: 0.5, drag: 1.6, top: 0.6, brake: 0.7, spray: 0.35, depth: 0.45, bumps: 0.02, layer: 'water' },
    wetClay:    { name: 'Wet clay', color: 0x8e5032, grip: 0.45, drag: 0.4, top: 0.88, brake: 0.55, spray: 1.5, depth: 0.08, bumps: 0.05, layer: 'mud' },
    softSand:   { name: 'Soft sand', color: 0xdfc38c, grip: 0.5, drag: 0.9, top: 0.72, brake: 0.75, spray: 2.4, depth: 0, bumps: 0.05 },
    packedSnow: { name: 'Packed snow', color: 0xe3eaef, grip: 0.6, drag: 0.1, top: 0.94, brake: 0.65, spray: 1.8, depth: 0, bumps: 0.02 },
    deepSnow:   { name: 'Deep snow', color: 0xf6f9fb, grip: 0.45, drag: 1.1, top: 0.68, brake: 0.7, spray: 2.4, depth: 0.35, bumps: 0.12, layer: 'snow' },
    ice:        { name: 'Ice', color: 0xa6d3ea, grip: 0.12, drag: 0.02, top: 1, brake: 0.2, spray: 1, depth: 0, bumps: 0 },
    slush:      { name: 'Slush', color: 0x99a6ad, grip: 0.35, drag: 0.7, top: 0.8, brake: 0.5, spray: 1.5, depth: 0.15, bumps: 0.04, layer: 'slush' },
    // off-road ground for each map
    meadow:     { name: 'Meadow', color: 0x5a8a3a, grip: 0.6, drag: 0.35, top: 0.75, brake: 0.7, spray: 1.4, depth: 0, bumps: 0, ground: true },
    jungleFloor:{ name: 'Jungle floor', color: 0x4f7a34, grip: 0.55, drag: 0.45, top: 0.7, brake: 0.65, spray: 1.4, depth: 0, bumps: 0, ground: true },
    snowField:  { name: 'Snow field', color: 0xeef3f6, grip: 0.45, drag: 0.6, top: 0.72, brake: 0.6, spray: 2, depth: 0, bumps: 0, ground: true },
    dunes:      { name: 'Dune sand', color: 0xd8b67e, grip: 0.5, drag: 0.7, top: 0.72, brake: 0.7, spray: 2.2, depth: 0, bumps: 0, ground: true }
  };
  const PROPS = [['grip', 'Grip (x)', 0.05, 1.5, 0.01], ['drag', 'Drag (0 none, 2 heavy)', 0, 3, 0.05], ['top', 'Top speed (x)', 0.2, 1.2, 0.01], ['brake', 'Brakes (x)', 0.05, 1.5, 0.05], ['spray', 'Spray / dust thrown up (x)', 0, 4, 0.05], ['depth', 'Depth: how far the wheels sink in (m; rebuilds)', 0, 1, 0.01], ['bumps', 'Bumps / ruts / drifts (m; rebuilds)', 0, 0.4, 0.01]];
  const MAPS = {
    country: { name: 'Country road', sectors: ['asphalt', 'gravel', 'dirt', 'wetGrass'], ground: 'meadow', scenery: 'country' },
    jungle:  { name: 'Jungle', sectors: ['packedDirt', 'mud', 'water', 'wetClay'], ground: 'jungleFloor', scenery: 'jungle' },
    tundra:  { name: 'Tundra', sectors: ['packedSnow', 'ice', 'deepSnow', 'slush'], ground: 'snowField', scenery: 'tundra' },
    desert:  { name: 'Desert', sectors: ['hardpan', 'softSand', 'gravel', 'water'], ground: 'dunes', scenery: 'desert' }
  };
  let map = 'desert', lab = [null, null, null, null];
  try { const l = JSON.parse(localStorage.getItem('r31_lab') || 'null'); if (Array.isArray(l) && l.length === 4) lab = l; } catch (e) {}
  const key = (id, p) => 's_' + id + '_' + p;
  // the surface's numbers, with any live tuning applied
  function get(id, T) { const d = DEF[id] || DEF.asphalt, o = { id, name: d.name, color: d.color }; for (const [p] of PROPS) o[p] = T && T[key(id, p)] != null ? T[key(id, p)] : d[p]; return o; }
  const sectorId = k => lab[k] || MAPS[map].sectors[k];
  // what's under the kart: the sector's road surface, or the map's ground
  function at(g, T) { return get(g && g.onRoad ? sectorId(Math.max(0, 'ABCD'.indexOf(g.zone))) : MAPS[map].ground, T); }
  function defaults() { const o = {}; for (const id in DEF) for (const [p] of PROPS) o[key(id, p)] = DEF[id][p]; return o; }
  // tuning-panel rows for every surface (the panel only shows the ones in use)
  function spec() { const out = []; for (const id in DEF) for (const [p, label, a, b, st] of PROPS) out.push([key(id, p), label, a, b, st, 'Surface: ' + DEF[id].name]); return out; }
  // per sector, what the track needs to build depth and layers: [{ depth, bumps, kind, color } x4]
  const layerInfo = T => [0, 1, 2, 3].map(k => { const id = sectorId(k), g = get(id, T); return { depth: g.depth, bumps: g.bumps, kind: DEF[id].layer || '', color: DEF[id].color }; });
  const inUse = () => [0, 1, 2, 3].map(sectorId).concat([MAPS[map].ground]).map(id => 'Surface: ' + DEF[id].name);
  return {
    DEF, MAPS, get, at, defaults, spec, inUse, sectorId, layerInfo,
    get map() { return map; }, setMap(m) { if (MAPS[m]) map = m; },
    get lab() { return lab.slice(); }, setLab(k, id) { lab[k] = id || null; try { localStorage.setItem('r31_lab', JSON.stringify(lab)); } catch (e) {} },
    roadIds: () => Object.keys(DEF).filter(id => !DEF[id].ground)
  };
})();
