# Racing Rebuild

A fresh start after v17. The old game (v15 to v17) stays as an archive in `grunal01/racing-roguelike` (v17 is on branch `claude/v17-visuals`). We go slowly: one small step per branch, merged only after it has been played. See the project's rebuild plan.

**Current step: R1.6, pure raycast car (PolyTrack-style).** (R1: the jungle loop.) One banked loop (two straights, two 180° bends) with four labelled jungle designs, A to D, so we can compare looks and get the driving right.

## Layout
| File | What it is |
|---|---|
| `index.html` | Page, HUD and styles |
| `js/track.js` | The loop: samples along the centre line, banking, road meshes, and `surface(x, z)` (the ground under any point) |
| `js/car.js` | The car on Rapier's raycast vehicle (a port of Bullet's, the kind PolyTrack uses): chassis body, four spring wheels placed where the Kenney model's wheels are, a speed-sensitive steering curve, engine and brakes. No drift mode or arcade helpers. `Car.DEF` holds the default handling numbers |
| `js/physics.js` | The Rapier world: gravity, the track's collision mesh and the ground |
| `js/scenery.js` | The four jungle designs and their signs |
| `js/tuning.js` | Tuning panel (Tab): every handling, camera and track number, live |
| `js/main.js` | Scene, light, camera, input, laps |
| `js/audio.js` | Engine and tyre sound (synthesized) |
| `js/assets.loader.js` | Loads the packed Kenney models |
| `assets/` | Kenney Car Kit and Nature Kit models in use (CC0) |
| `vendor/three-bundle.js` | Three.js r160 (don't read or edit) |
| `vendor/gltf-loader.js` | Three.js glTF loader, built for the bundle above |
| `vendor/rapier.js` | Rapier 0.21 physics engine (`@dimforge/rapier3d-compat`, Apache-2.0, see `RAPIER-LICENSE.txt`); don't read or edit |

## Build
```
python3 tools/pack_assets.py     # assets/ -> js/assets.js (generated, not committed)
python3 tools/build_single.py    # -> dist/racing.html, the playable single file
```
