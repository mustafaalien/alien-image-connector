#!/usr/bin/env python3
"""Build assets.js for a map reel: the real Google Earth captures (UI cropped, levels tone-matched), the road
routes in metres from the project, and the fonts, all as data so the page is self-contained.
Usage: python3 map_build_assets.py <lat> <lon> <raw_dir> <routes.json> <fonts_node_modules> <out_dir>
Fonts: run `npm i @fontsource/sora @fontsource/inter` somewhere and pass that node_modules folder."""
import sys, json, math, base64, os, glob
import numpy as np
from PIL import Image
LAT, LON, RAW, ROUTES, FONTS, OUT = float(sys.argv[1]), float(sys.argv[2]), *sys.argv[3:7]
DS = sorted((int(os.path.basename(p)[6:-4]) for p in glob.glob(f"{RAW}/earth_*.png")), reverse=True)
VW, VH, TOP, BOT, FOV = 2000, 3500, 92, 132, 35.0      # capture size, UI strips to crop, Earth's vertical field of view
MLAT = 111132.92 - 559.82*math.cos(2*math.radians(LAT)) + 1.175*math.cos(4*math.radians(LAT))
MLON = 111412.84*math.cos(math.radians(LAT)) - 93.5*math.cos(3*math.radians(LAT))
b64 = lambda p, mime: f"data:{mime};base64," + base64.b64encode(open(p, 'rb').read()).decode()
os.makedirs(f"{OUT}/map", exist_ok=True)
ims = []
for d in DS:
    im = Image.open(f"{RAW}/earth_{d}.png").convert('RGB'); assert im.size == (VW, VH), im.size
    ims.append(im.crop((0, TOP, VW, VH - BOT)))
# Google shows different imagery at different zooms. Match each wider level's tone to the next closer one
# (per-channel mean and spread over the shared area) so levels blend without visible rectangles. Geography is untouched.
CX, CY = VW/2, VH/2 - TOP
for i in range(len(DS) - 2, -1, -1):
    r = DS[i+1] / DS[i]; w, h = ims[i].size
    box = tuple(int(round(v)) for v in (CX - CX*r, CY - CY*r, CX + (w-CX)*r, CY + (h-CY)*r))
    a = np.asarray(ims[i].crop(box), float); b = np.asarray(ims[i+1].resize((box[2]-box[0], box[3]-box[1]), Image.LANCZOS), float)
    full = np.asarray(ims[i], float)
    for c in range(3):
        g = np.clip(b[..., c].std() / max(a[..., c].std(), 1e-3), 0.6, 1.6)
        full[..., c] = (full[..., c] - a[..., c].mean()) * g + b[..., c].mean()
    ims[i] = Image.fromarray(np.clip(full, 0, 255).astype('uint8'))
levels = []
for i, d in enumerate(DS):
    p = f"{OUT}/map/z{i}_{d}m.jpg"; ims[i].save(p, quality=92, subsampling=0)
    levels.append(dict(src=b64(p, 'image/jpeg'), mpp=2*d*math.tan(math.radians(FOV/2))/VH, cx=CX, cy=CY, w=ims[i].size[0], h=ims[i].size[1], d=d))
routes = {k: dict(min=r['min'], km=r['km'], pts=[[round((lo-LON)*MLON, 1), round((LAT-la)*MLAT, 1)] for lo, la in r['coords']]) for k, r in json.load(open(ROUTES)).items()}
F = lambda fam, w: [fam.capitalize(), str(w), b64(f"{FONTS}/@fontsource/{fam}/files/{fam}-latin-{w}-normal.woff2", 'font/woff2')]
fonts = [F('sora', 700), F('sora', 800)] + [F('inter', w) for w in (300, 500, 600, 700, 800)]
open(f"{OUT}/assets.js", 'w').write("window.ASSETS=" + json.dumps(dict(levels=levels, routes=routes, fonts=fonts, centre=[LAT, LON])) + ";")
print("assets.js", os.path.getsize(f"{OUT}/assets.js")//1024, "KB; metres per pixel:", [round(l['mpp'], 3) for l in levels])
