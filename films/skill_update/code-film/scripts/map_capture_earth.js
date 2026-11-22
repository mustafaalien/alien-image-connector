#!/usr/bin/env node
// Capture REAL Google Earth imagery, straight down, north up, labels and 3D buildings off, at several zoom
// levels on the same centre. One PNG per level: <outdir>/earth_<distance>.png (2000x3500, UI strips still on).
// Usage: node map_capture_earth.js <lat> <lon> <outdir> [--levels 100000,45000,20000,9000,4000,1800]
// Works in a Claude cloud session (software WebGL). About 1.5 minutes per level.
// The "Clean" map style is NOT remembered after a reload, so it is set again for every level.
// The clicks below are fixed positions in a 1080x1920 window; if Google moves its buttons, open one
// screenshot, find the new positions and update them. Always look at the PNGs before using them.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const a = process.argv.slice(2); const opt = n => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : null; };
const LAT = +a[0], LON = +a[1], OUT = path.resolve(a[2]); const DS = (opt('levels') || '100000,45000,20000,9000,4000,1800').split(',').map(Number);
const url = d => `https://earth.google.com/web/@${LAT},${LON},0a,${d}d,35y,0h,0t,0r`;
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const d of DS) {
    let ok = false;
    for (let att = 0; att < 3 && !ok; att++) {
      const ctx = await b.newContext({ viewport: { width: 1080, height: 1920 } }); const p = await ctx.newPage();
      await p.goto(url(d), { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(40000);
      if (!p.url().includes('@' + String(LAT).slice(0, 5))) { console.log('retry', d, '(Earth opened at the wrong place)'); await ctx.close(); continue; }
      const click = async (x, y, w) => { await p.mouse.click(x, y); await p.waitForTimeout(w); };
      await click(743, 719, 1500);   // close the "New from Google Earth" pop-up
      await click(45, 149, 1500);    // dismiss the projects tip
      await click(47, 1841, 3000);   // open Basemap settings (thumbnail, bottom left)
      await click(288, 834, 2000);   // Details: Clean (no borders, labels, places or roads)
      await click(273, 1278, 2000);  // 3D buildings: off (flat imagery, so the camera maths stays linear)
      await click(296, 570, 1000);   // close the panel
      await click(636, 184, 1000);   // dismiss the data-catalog tip
      await p.setViewportSize({ width: 2000, height: 3500 }); await p.mouse.move(1000, 1750); await p.waitForTimeout(45000);
      await p.screenshot({ path: path.join(OUT, `earth_${d}.png`) }); console.log('done', d); ok = true; await ctx.close();
    }
    if (!ok) { console.log('FAILED', d); process.exitCode = 1; }
  }
  await b.close();
})().catch(e => { console.log('FAIL', e.message.slice(0, 300)); process.exit(1); });
