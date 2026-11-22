#!/usr/bin/env python3
"""Build assets.js for the map reel: real Google Earth captures (cropped of UI), real road routes, fonts.
Usage: python3 build_assets.py <raw_capture_dir> <fonts_node_modules_dir>"""
import sys, json, math, base64, os
from PIL import Image
RAW, FONTS = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
LAT, LON = 25.1105, 55.1405            # camera centre of every capture = the project
DS = [100000, 45000, 20000, 9000, 4000, 1800]  # Google Earth camera distances (m), top-down, north up
VW, VH, TOP, BOT = 2000, 3500, 92, 132 # capture size and the UI strips cropped away
FOV = 35.0
MLAT = 111132.92 - 559.82*math.cos(2*math.radians(LAT)) + 1.175*math.cos(4*math.radians(LAT))
MLON = 111412.84*math.cos(math.radians(LAT)) - 93.5*math.cos(3*math.radians(LAT))
b64 = lambda p, mime: f"data:{mime};base64," + base64.b64encode(open(p, 'rb').read()).decode()
levels = []
os.makedirs(f"{HERE}/map", exist_ok=True)
import numpy as np
ims = []
for d in DS:
    im = Image.open(f"{RAW}/raw2_{d}.png").convert('RGB'); assert im.size == (VW, VH), im.size
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
for i, d in enumerate(DS):
    im = ims[i]
    out = f"{HERE}/map/z{i}_{d}m.jpg"; im.save(out, quality=92, subsampling=0)
    levels.append(dict(src=b64(out, 'image/jpeg'), mpp=2*d*math.tan(math.radians(FOV/2))/VH, cx=VW/2, cy=VH/2 - TOP, w=im.size[0], h=im.size[1], d=d))
routes = {}
for k, r in json.load(open(f"{HERE}/routes.json")).items():
    routes[k] = dict(min=r['min'], km=r['km'], pts=[[round((lo-LON)*MLON, 1), round((LAT-la)*MLAT, 1)] for lo, la in r['coords']])
fonts = [["Sora", "700", b64(f"{FONTS}/@fontsource/sora/files/sora-latin-700-normal.woff2", 'font/woff2')],
         ["Sora", "800", b64(f"{FONTS}/@fontsource/sora/files/sora-latin-800-normal.woff2", 'font/woff2')],
         ["Inter", "500", b64(f"{FONTS}/@fontsource/inter/files/inter-latin-500-normal.woff2", 'font/woff2')],
         ["Inter", "300", b64(f"{FONTS}/@fontsource/inter/files/inter-latin-300-normal.woff2", 'font/woff2')],
         ["Inter", "700", b64(f"{FONTS}/@fontsource/inter/files/inter-latin-700-normal.woff2", 'font/woff2')],
         ["Inter", "800", b64(f"{FONTS}/@fontsource/inter/files/inter-latin-800-normal.woff2", 'font/woff2')],
         ["Inter", "600", b64(f"{FONTS}/@fontsource/inter/files/inter-latin-600-normal.woff2", 'font/woff2')]]
open(f"{HERE}/assets.js", 'w').write("window.ASSETS=" + json.dumps(dict(levels=levels, routes=routes, fonts=fonts, centre=[LAT, LON])) + ";")
print("assets.js", os.path.getsize(f"{HERE}/assets.js")//1024, "KB", [round(l['mpp'], 3) for l in levels])
