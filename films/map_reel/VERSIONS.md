# Map location reel — versions

| # | Name | What changed | Built from | Render call |
|---|---|---|---|---|
| v1 | palm_test | First look test. Random sample project on the Palm Jumeirah trunk, real Google Earth captures (5 zoom levels), real road routes (OSRM), placeholder agent. Full 20 s render with Kokoro voice (bm_george), code-made bed, whooshes and pops: `v1_palm_test.mp4`. | — | `node capture_film.js v1_palm_test.html frames --frames 600` (30 fps) |

Assets: `python3 build_assets.py <raw_capture_dir> <fonts_node_modules>` writes `assets.js` and `map/z*.jpg`.

Sound: `python3 v1_sound.py <dir_with_vo_wavs> 9 v1_palm_test.wav` (also writes `v1_voice.js`).
Video: `ffmpeg -framerate 30 -i frames/f%04d.jpg -i v1_palm_test.wav -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart v1_palm_test.mp4`

| v2 | looks | One page with 4 looks and a camera style per look: `pop` (v1), `navy` (tilted 3D, hold then fly), `coral` (tilted, warm map, one slow push-in), `night` (dark grey top-down, hard cuts with lime wipe). Added a 6th wider map level, tone-matched levels, feathered level edges, perspective tilt and heading. Videos: `v2_looks_navy.mp4`, `v2_looks_coral.mp4`, `v2_looks_night.mp4`. Same story, voice and sound as v1. | v1 | `node capture_film.js v2_looks.html frames --look navy --frames 600` (or `coral`, `night`, `pop`) |
