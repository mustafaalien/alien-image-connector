---
name: code-film
description: Make short films and reels entirely in code, with no paid AI video tools and no credits. Claude paints every frame in a browser canvas, makes the sound in code and encodes the video with ffmpeg. Use this whenever Mustafa asks for a reel, animation, motion piece or short film "in code", "by Claude", "free", "without Higgsfield", or sends a reference video or picture and asks to make something "like this style", to analyse and name a style, to show look options, or to turn a story into a painted, fog, dot (dither), ink or multi-style animation. Also use it for a map reel, location reel or property map video (a real satellite map with a gliding camera, route lines and drive times, like the vidly ads), and to change, shorten or restyle a film made this way.
---

# Code Film

Short films made only with code: a web page draws each frame on a canvas, a script saves the frames, numpy makes the sound, ffmpeg joins them. It is free and repeatable, and it gives a stylised, hand-made look. It is not for realistic people or faces; those stay in his AI Film skill (Higgsfield).

Call him Mustafa or MU. Keep replies short, with tables and emoji markers, and end with A / B / C options, a ⭐ pick and one next step. When he writes Arabic, answer in Egyptian Arabic.

## How a job runs

1. **Understand the reference.** If he sends a video, pull frames first (`ffprobe`, then a contact sheet with ffmpeg) and look at them before saying anything. Name the style in plain words and say what makes it (frame rate, colours, texture, how figures are drawn).
2. **Show the look as pictures before building.** Render 3–4 real test frames of each look option on the same moment of his story, put them side by side with labels, and send that board. He chooses by eye; a list of words is not enough. If the first round of options looks too similar, make them clearly different before sending.
3. **Build one template page** that draws any moment of the film from a time value (see "Page contract").
4. **Render, add sound, encode** (see "Render steps").
5. **Check before sending.** Make a contact sheet of the finished video and look at it. Say plainly what you checked and what you did not (for example, "I checked frames, I have not watched it play").
6. **Deliver** the video file with its version number and name, then 3–5 lines on what changed, what is still rough, and the options.

Change one thing per round when he gives feedback.

## Keep every version

He switches between versions often ("add this to the first draft, don't change the rest", "go back to the one before"), so no version is ever overwritten or deleted.

- Work in one project folder per film. Before each change, copy the current page to a new numbered file with a short name: `v1_first_draft.html`, `v2_heart.html`, `v3_glass_glow.html`. Give the video the same number and name: `v3_glass_glow.mp4`.
- Keep a `VERSIONS.md` in the folder with one line per version: number, name, what changed, which version it was built from, and its render call. Update it every round.
- A new version starts from whichever version he names, not always from the latest.
- In each delivery, name the version you are sending, and when there are three or more, list them in a small table so he can say "switch to v2".
- When he asks to switch, re-send that version's video as it is. Re-render only if the file is gone, and say so.
- Session folders are temporary. When he says a film is finished, or before a long break, offer to save the project folder (all versions and `VERSIONS.md`) somewhere lasting, such as his Drive.

## What he expects

These came from real corrections, so they matter more than they look:

- **Say the video length and the build time separately.** "The reel is 12 seconds; it takes me about 15 minutes to make." Mixing them confused him twice.
- **No text or subtitles in the film unless he asks.** Capture frames from the canvas, never from the page, so labels and buttons cannot leak in.
- **9:16 at 1080×1920 is the default** for reels; 16:9 only when the reference is wide.
- **Feet must match the ground.** Step length × steps per second has to equal how fast the world scrolls, or the figure looks like it is running on the spot. The only exception is when that is the story (a dream where he runs and cannot move).
- **Simple, smooth, natural human shapes.** Stick limbs read as "computer-made". Use real proportions, tapered limbs, a head with a profile, and feet with heel and toe. `assets/fog_dither_preview.html` has the pose and silhouette code that he approved.
- **One emotional light.** A single coloured element that follows the feeling (the red heart) worked better than decoration. Dim and slow when sad, bright and fast when hopeful.
- **Keep blacks deep and whites unclipped.** Glow, bloom and light spill wash a frame out fast; add them at low strength and check a frame.
- **Never install strangers' repos or skills** to get a look. Rebuild the idea in code.

## Page contract

Build each film as one self-contained HTML file with a canvas and a function that draws a given moment, with no dependence on real time:

```js
window.renderTick = k => { /* draw frame k (k / fps = seconds) */ };
```

Use a seeded random generator and re-seed it from the tick number, so the same tick always gives the same picture and a render can be repeated or resumed. Keep the story in small time curves (speed, posture, light strength as functions of `t`) and integrate walking phase and world scroll into arrays up front, so any tick can be drawn directly. Expose event times the sound needs, for example `window.stepTimes` and `window.beatTimes`.

A page may also run live in the browser for previews and artifacts, but the final render always goes through `renderTick`.

## Templates

Start from the closest one in `assets/` instead of a blank page. Read `references/templates.md` for what each contains and how to call it.

| File | Look | Render call |
|---|---|---|
| `painted_heart_film.html` | Painted figure on charcoal swirls, red heart light, paint trails, light rays (the "Ember Ghost" / Glass Glow film, 30 s story) | `LK=LOOKS.ref;PAINT=PSTYLES.glass;renderTick(k)` at 9 fps |
| `ink_reveal.html` | Ink landscape drawn stroke by stroke on rice paper, seal stamp | `render(k/30)` at 30 fps |
| `fog_dither_preview.html` | Fog-and-grain and white-dot (dither) looks with natural human silhouettes. Live preview only: give it a `renderTick` before a final render | live page |
| `style_switcher.html` | One scene restyled 10 ways (woodblock, pixel, noir, 1930s, brick, clay, CRT, knitted, PS2, sumi ink). Live page | live page |
| `map_reel/map_reel.html` | Property map location reel on a real Google Earth map, four looks (pop, navy, coral, night), each with its own camera style. Needs its own assets built first: read `references/map_reels.md` | `setLook(name);renderTick(k)` at 30 fps, through `scripts/map_capture_film.js --look name` |

## Render steps

```bash
# 1. frames (also saves event times for the sound)
node scripts/capture.js film.html frames --call "renderTick(k)" --frames 270 --canvas "#cv" --export stepTimes,beatTimes
# 2. sound: copy scripts/sound_example.py, adapt the layers, write frames/sound.wav
python3 my_sound.py frames
# 3. video (9 fps painted look shown at 30 fps)
ffmpeg -y -framerate 9 -i frames/f%04d.png -i frames/sound.wav -vf fps=30 -c:v libx264 -preset slow -crf 17 \
  -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart film.mp4
# 4. check
scripts/contact_sheet.sh film.mp4 check.jpg
```

- Render a few test ticks first (`--ticks` with a short list) and look at them before the full run; a full 270-frame painted render takes several minutes.
- To make a shorter cut, pass `--ticks` with only the tick numbers of the moments to keep, and cut the same time ranges out of the sound with short fades at each join.
- A low frame rate is part of a painted look: 9 fps for "boiling" paint, 12 for ink or fog. Encode at 30 fps so phones play it smoothly.
- `capture.js` needs Playwright with Chromium. It is pre-installed in Claude cloud sessions. On his Mac, it needs `npm i playwright` once.

## Sound

Make every sound in code with numpy and write a WAV; never rip audio. Useful layers: a low pad, a warm chord for hope, filtered-noise wind for emptiness, footsteps placed on the exported step times, and a two-part "lub-dub" heartbeat whose speed and loudness follow the story. Silence is a tool: a hard cut to quiet when something is lost reads stronger than a sound effect. Normalise to about −1 dB peak and check the level with the contact-sheet script.

## Map location reels

A map reel is the one kind of code film where text is wanted (headline, captions, agent bar) and where the picture must be real: the map comes from Google Earth, never drawn or generated. It has its own questions to ask, capture scripts, four looks and lessons. Read `references/map_reels.md` before starting one.

## More detail

- `references/templates.md` — what is inside each template and the lessons from building them.
- `references/research_painterly_upgrades.md` — sourced research on making code-painted animation look high-end: keeping one canvas and repainting only what moves, brush strokes that follow the body, film-style glow, real motion from his own filmed walk, colour plan, sound and Reels safe zones. Read it before a quality push.
- `references/map_reels.md` — property map location reels: what to ask, the rules about real maps and credits, the four looks and their camera styles, the full command sequence and the lessons from the first build.
