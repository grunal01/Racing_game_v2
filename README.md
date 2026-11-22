# Racing Rebuild

A fresh start after v17. The old game (v15 to v17) stays as an archive in `grunal01/racing-roguelike` (v17 is on branch `claude/v17-visuals`). We go slowly: one small step per branch, merged only after it has been played. See the project's rebuild plan.

**Current step: R1.3, arcade drift physics.** (R1: the jungle loop.) One banked loop (two straights, two 180° bends) with four labelled jungle designs, A to D, so we can compare looks and get the driving right.

## Layout
| File | What it is |
|---|---|
| `index.html` | Page, HUD and styles |
| `js/track.js` | The loop: samples along the centre line, banking, road meshes, and `surface(x, z)` (the ground under any point) |
| `js/car.js` | Arcade car physics: the heading follows steering, the direction of travel catches up at the grip rate, and a drift (brake tap or lift while turning hard) lowers that rate; plus visuals. `Car.DEF` holds the default handling numbers |
| `js/scenery.js` | The four jungle designs and their signs |
| `js/tuning.js` | Tuning panel (Tab): every handling, camera and track number, live |
| `js/main.js` | Scene, light, camera, input, laps |
| `js/audio.js` | Engine and tyre sound (synthesized) |
| `js/assets.loader.js` | Loads the packed Kenney models |
| `assets/` | Kenney Car Kit and Nature Kit models in use (CC0) |
| `vendor/three-bundle.js` | Three.js r160 (don't read or edit) |
| `vendor/gltf-loader.js` | Three.js glTF loader, built for the bundle above |

## Build
```
python3 tools/pack_assets.py     # assets/ -> js/assets.js (generated, not committed)
python3 tools/build_single.py    # -> dist/racing.html, the playable single file
```
