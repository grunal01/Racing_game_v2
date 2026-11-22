// ===== Physics: the Rapier world. The track is a fixed triangle mesh, the ground a big flat box. =====
// Rapier (Apache-2.0) does the rigid body, collisions and the raycast wheels; js/car.js drives it.
const Phys = (function () {
  let world = null, trackCol = null, ready = false;
  async function init(gravity) {
    await RAPIER.init();
    world = new RAPIER.World({ x: 0, y: -(gravity || 20), z: 0 });
    world.timestep = 1 / 120;
    world.createCollider(RAPIER.ColliderDesc.cuboid(2000, 0.5, 2000).setTranslation(0, -0.5, 0).setFriction(0.8));   // the ground, top at y = 0
    ready = true;
  }
  function setTrack() {
    if (trackCol) world.removeCollider(trackCol, false);
    const m = Track.collisionMesh();
    trackCol = world.createCollider(RAPIER.ColliderDesc.trimesh(m.vertices, m.indices).setFriction(0.8));
  }
  function setGravity(g) { if (world) world.gravity = { x: 0, y: -g, z: 0 }; }
  function step() { world.step(); }
  return { init, setTrack, setGravity, step, get world() { return world; }, get ready() { return ready; } };
})();
