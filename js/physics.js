// ===== Physics: the Rapier world. The road, terrain and tunnel are fixed triangle meshes; a big box far below catches anything that falls through. =====
// Rapier (Apache-2.0) does the rigid body, collisions and the raycast wheels; js/car.js drives it.
const Phys = (function () {
  let world = null, trackCols = [], ready = false;
  async function init(gravity) {
    await RAPIER.init();
    world = new RAPIER.World({ x: 0, y: -(gravity || 20), z: 0 });
    world.timestep = 1 / 120;
    world.createCollider(RAPIER.ColliderDesc.cuboid(3000, 0.5, 3000).setTranslation(0, -30.5, 0).setFriction(0.8));   // safety floor, far below the terrain
    ready = true;
  }
  function setTrack() {
    for (const c of trackCols) world.removeCollider(c, false);
    trackCols = Track.collisionMeshes().map(m => world.createCollider(RAPIER.ColliderDesc.trimesh(m.vertices, m.indices).setFriction(0.8)));
  }
  function setGravity(g) { if (world) world.gravity = { x: 0, y: -g, z: 0 }; }
  function step() { world.step(); }
  return { init, setTrack, setGravity, step, get world() { return world; }, get ready() { return ready; } };
})();
