# Map location reel — versions

| # | Name | What changed | Built from | Render call |
|---|---|---|---|---|
| v1 | palm_test | First look test. Random sample project on the Palm Jumeirah trunk, real Google Earth captures (5 zoom levels), real road routes (OSRM), placeholder agent. Board only so far, no full render. | — | `node capture_film.js v1_palm_test.html frames --frames 600` (30 fps) |

Assets: `python3 build_assets.py <raw_capture_dir> <fonts_node_modules>` writes `assets.js` and `map/z*.jpg`.
