# Templates

All four files are self-contained pages. Open one, read its story and draw functions, then change the story, colours and figures for the new film.

## painted_heart_film.html (the main film engine)

A 30-second, 1080×1920 story painted at 9 fps: a man hides his sadness, his family appears, he runs after them, they vanish, he collapses and walks on.

- `story(t)` returns the curves that drive everything: `speed`, `slump`, `kneel`, `headDown`, `ember`, `fam` (family presence), `famBurst`, `color`.
- `phaseArr` / `worldArr` hold walking phase and world scroll for every 1/60 s, so any tick can be drawn directly. The integration line is where step rate and ground speed are tied together. In the "dream" version the world deliberately moves at the family's walking pace while he runs.
- `pose(phase, amp, slump, kneel, headDown, height, run)` returns the skeleton.
- `heartI(t)`, `bpm(t)`, `pulseAt(t)` drive the heart light and export `beatTimes`; `stepTimes` lists footsteps.
- Looks are data: `LOOKS` (colour sets) and `PSTYLES` (`oil`, `impasto`, `glass`) with stroke count, body thickness, trail strength, ray strength, bloom, light spill. Set `LK` and `PAINT` before `renderTick`. `PAINT=null` gives the older flat-stroke figure.
- `paintedFigure` paints the body with bristle strokes along each limb; strokes are seeded per bone and re-seeded every `boil` ticks, so the paint shimmers without flickering every frame.
- `lightPost` adds heart rays and bloom; a colour-dodge gradient before the figures makes the heart light the background swirls.
- Captions exist only as page text (`caps`), so they are never in a canvas capture.

Lessons from this film:
- The first figure was thin stick strokes with a fire skirt; he found the fire "weird". A light inside the chest that follows the emotion replaced it.
- Glow effects washed the frame out pink on the first try. Strengths that worked are the ones now in `PSTYLES`; a final small contrast pass brings the blacks back.
- Trails drawn as sharp copies look like duplicates. Draw them to a separate layer, blur it, and keep them close to the body.
- A fast walk is not a run. A run needs forward lean, high knees, bent arms and a bigger bounce.
- For a 12-second cut he preferred keeping real-time speed and cutting between moments over speeding the film up.

## ink_reveal.html

A 15-second ink landscape (mountain, pine, boat, birds, mist, red seal) drawn stroke by stroke. `strokes` is a list of brush strokes with start time and duration; each is drawn as parallel bristle lines whose paint runs dry toward the end. `window.render(t)` takes seconds. `window.schedule` lists stroke times for brush sounds. Camera pushes in slowly and drifts toward the brush tip.

## fog_dither_preview.html

Live preview of three looks for the same 12-second dream: white dots on black, grey fog with film grain, and fog printed in dots. Its `pose()` is the natural gait he approved: hip, knee and ankle follow real stride curves and the hip height is solved from the feet, so feet plant on the ground. `sil()` draws a full human silhouette (profile head, chest, calves, heel and toe, coats) and welds the parts with a blur-then-threshold pass. The dot looks are an ordered 4×4 dither of the grey scene; smaller cells look better. It animates from the clock, so add a tick-based render function before using it for a final film.

## style_switcher.html

A whale flying over a city, restyled ten ways from one scene. Each style is a small data object (sky, colours, outline, roof type, extras, overlay, post effect) and one `P()` paint function applies outline, shadow and texture. Good starting point when he wants "the same scene in many styles". Limits he was told about: the 3D-looking styles are flat drawings, and the layout is the same in every style.
