# Map location reels (property marketing)

A 9:16 reel that glides over a real satellite map and pushes in on a property, with a headline, word-by-word captions, a pulsing dot, a project card, route lines with drive-time pills, an agent bar and a progress bar. First built in November 2026 from a reference ad for a service called vidly. Read this before making or changing one.

## Ask first (one message)

1. Project name and exact location (a Google Maps link is best).
2. 2–4 nearby landmarks to show with drive times.
3. Agent name, photo and phone, if the agent bar is wanted.
4. Real photos or official renders of the project, if any.
5. Language of captions and voice (English or Arabic).

If he says "random" or "test", use a clearly named sample project ("Sample Residence", "Agent Name", a dummy phone number) and say which parts are placeholders.

## Rules that do not bend

- **The map is real.** Capture it from Google Earth. Never draw or generate the map, coastline or roads. Tilting, rotating, recolouring and tone-matching the real image is fine; changing the geography is not.
- **Credit and terms.** Keep "Imagery: Google Earth" in the reel, and tell him that Google's terms for using its imagery in marketing videos are his to check.
- **Drive times are approximate.** OSRM gives times without traffic. Show "Drive times approximate" and tell him to check them on Google Maps before a real ad.
- **Landmark pictures** are cropped from the satellite image. **The project picture** is his real photo or official render. Only if none exist, make one with the ALIEN Image Connector (Mac only) and label it "Artist impression"; in a cloud session use a satellite crop labelled as such.
- He wants to **see video, not only a board**. Send the look board, and when he asks "where is the video", render it; a full render takes about a minute per look.

## The four looks (all in `assets/map_reel/map_reel.html`)

| Look | Map | Type and captions | Camera |
|---|---|---|---|
| `pop` Lime Pop | Top-down, natural colour | Centred heavy headline, lime pill on the current word, agent bar | Soft glide, then a push-in |
| `navy` Navy Glide (reference look 1) | Tilted 3D, navy sea | Thin first line + bold lime line, left; plain captions; picture card above the dot; no agent bar | Holds, then flies fast to the place and turns |
| `coral` Coral Sand (reference look 2) | Tilted 3D, warm sand tone, coral accent | Bold left headline with underline, word chips, slim agent bar, outlined plot that fills | One long slow push-in |
| `night` Night Grid (reference look 3) | Top-down, dark grey | Kicker with dash, left headline, spaced captions, agent chip top right | Nearly still; hard cuts with a lime wipe line |

Each look is one entry in `LOOKS`: accent, tilt, map filter, layout flags and its own camera keys `[time, x m east, y m south, metres per pixel, heading deg, ease]`. Ease is `soft`, `fly` or `lin`; two keys at the same time make a hard cut. He may ask to mix a look with another look's camera: copy the `cam` list across.

The story (`BEATS`: start time, kicker, headline with the accent word in `*stars*`, caption) and `PROJECT`, `AGENT`, `LANDMARKS` sit at the top of the page and are shared by every look.

## Steps

```bash
P=project_folder; SK=<this skill>/scripts
# 1. real map, 6 zoom levels on the project (about 9 minutes; works in a cloud session, no Mac needed)
node $SK/map_capture_earth.js <lat> <lon> $P/raw          # then LOOK at the PNGs
# 2. real road routes and drive times
python3 $SK/map_routes.py <lat> <lon> $P/routes.json "Landmark A=lat,lon" "Landmark B=lat,lon"
# 3. assets.js (needs: npm i @fontsource/sora @fontsource/inter)
python3 $SK/map_build_assets.py <lat> <lon> $P/raw $P/routes.json <node_modules> $P
# 4. copy assets/map_reel/map_reel.html to $P/v1_name.html, edit the data at the top, then test frames per look
node $SK/map_capture_film.js $P/v1_name.html $P/test --look navy --ticks "70,150,355,590"
# 5. voice and sound (writes voice.js next to the WAV; the page loads it for caption timing and the waveform)
python3 $SK/map_voice.py <kokoro dir> 9 $P/vo $P/test/film.json
python3 $SK/map_sound.py $P/test/film.json $P/vo $P/sound.wav
# 6. full render (600 frames = 20 s at 30 fps), encode, check
node $SK/map_capture_film.js $P/v1_name.html $P/frames --look navy --frames 600
ffmpeg -y -framerate 30 -i $P/frames/f%04d.jpg -i $P/sound.wav -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart $P/v1_name_navy.mp4
```

`LANDMARKS[].key` in the page must match the names given to `map_routes.py`. The route start times (`t0`) and beat times drive the pops and whooshes in the sound.

## Lessons from the first build

- **Google Earth runs in the cloud session's browser** with software WebGL (`--use-angle=swiftshader`). The earlier belief that it needs the Mac was wrong.
- **"Clean" style is lost on every reload**, so the capture script sets it again for each level. It clicks fixed screen positions; if a capture still shows labels or pop-ups, Google moved a button: open a screenshot and update the positions.
- **Earth sometimes opens at 0,0.** The script checks the address and retries.
- **Turn 3D buildings off.** Flat imagery keeps the metres-to-pixels maths linear, so route lines sit exactly on the roads. Check this by eye on a routes frame.
- **Scale:** metres per pixel = 2 × camera distance × tan(17.5°) ÷ viewport height. Earth's `35y` is the vertical field of view.
- **Zoom levels differ in tone.** Without tone-matching and feathered edges, tilted or wide views show rectangles. The builder matches each wider level to the next closer one; the page feathers the finer levels.
- **Six levels, ratio about 2.2**, keep the push-in sharp. The widest (100 km) is needed so tilted and rotated views never run off the image.
- **The 3D tilt is a perspective warp of the flat image**, drawn one screen row at a time, with haze toward the horizon. Buildings do not stand up as in the reference; say so.
- **Keep landmarks inside the frame.** At the routes beat, check every pill against the headline and the captions; move the camera or use `dy` on a landmark.
- **Keep the opening camera inside the widest image**, or a dark band shows at the edge. A contact sheet can hide this: pull a real frame near the start.
- **Kokoro needs `sherpa-onnx<2`.** Version 2 fails with "No lexicon". Kokoro gives no word times, so caption timing is estimated from word length; say it is approximate.
- **Do not commit the captures to a public repo without telling him**: the folder holds Google imagery and is about 25 MB.

## Still rough (ideas for a quality push)

- True word timing for captions (forced alignment, or timing from his own recording).
- Real 3D buildings (capture Earth tilted with 3D on, as a separate hero shot).
- Arabic captions (right-to-left layout, an Arabic font, his own voice).
- A real plot outline instead of the square in the coral look.
