// ===== Assets: parse the packed Kenney models once, hand out copies =====
const Assets = (function () {
  const cars = {}, nature = {};
  const b64 = s => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
  async function load(onProgress) {
    const man = new THREE.LoadingManager();
    man.setURLModifier(url => { for (const k in ASSETS.tex) if (url.endsWith(k)) return ASSETS.tex[k]; return url; });
    const loader = new GLTFLoader(man);
    const parse = buf => new Promise((res, rej) => loader.parse(buf, '', res, rej));
    const jobs = [], total = Object.keys(ASSETS.cars).length + Object.keys(ASSETS.nature).length; let done = 0;
    const tick = () => onProgress && onProgress(++done / total);
    for (const [n, s] of Object.entries(ASSETS.cars)) jobs.push(parse(b64(s)).then(g => { cars[n] = g.scene; tick(); }));
    for (const [n, s] of Object.entries(ASSETS.nature)) jobs.push(parse(b64(s)).then(g => {
      // the nature kit ships unlit flat colours; give them real lighting and shadows
      g.scene.traverse(o => { if (o.isMesh) { const c = o.material.color ? o.material.color.clone() : new THREE.Color(0xffffff); o.material = new THREE.MeshLambertMaterial({ color: c, flatShading: true }); } });
      nature[n] = g.scene; tick();
    }));
    await Promise.all(jobs);
  }
  // pieces of a nature model as [geometry, material, matrix relative to the model], for instancing
  const partsCache = {};
  function parts(name) {
    if (partsCache[name]) return partsCache[name];
    const root = nature[name]; if (!root) return [];
    root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), out = [];
    root.traverse(o => { if (o.isMesh) out.push([o.geometry, o.material, new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)]); });
    // height of the model, for scaling to a size in metres
    const box = new THREE.Box3().setFromObject(root); out.h = box.max.y - box.min.y; out.w = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
    return (partsCache[name] = out);
  }
  return { load, car: n => cars[n], carNames: () => Object.keys(cars).sort(), natureNames: () => Object.keys(nature).sort(), parts, has: n => !!nature[n] };
})();
