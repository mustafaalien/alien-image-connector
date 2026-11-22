#!/usr/bin/env node
// Render the reel's canvas to PNG frames. Waits for the page's assets (window.ready) before the first frame.
// Usage: node capture_film.js <page.html> <outdir> [--frames 600] [--ticks "0,90,180"]
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const a = process.argv.slice(2); const opt = n => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : null; };
const page = path.resolve(a[0]), out = path.resolve(a[1]);
const ticks = opt('ticks') ? opt('ticks').split(',').map(Number) : [...Array(+(opt('frames') || 600)).keys()];
(async () => {
  fs.mkdirSync(out, { recursive: true }); const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 2000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + page); await p.evaluate(() => window.ready);
  await p.evaluate(() => { window.requestAnimationFrame = () => 0; });
  fs.writeFileSync(path.join(out, 'film.json'), JSON.stringify(await p.evaluate(() => window.FILM)));
  for (let i = 0; i < ticks.length; i++) {
    const d = await p.evaluate(k => { renderTick(k); return document.querySelector('#cv').toDataURL('image/jpeg', 0.95); }, ticks[i]);
    const name = opt('ticks') ? 't' + String(ticks[i]).padStart(4, '0') : 'f' + String(i).padStart(4, '0');
    fs.writeFileSync(path.join(out, name + '.jpg'), Buffer.from(d.split(',')[1], 'base64'));
  }
  await b.close(); if (errs.length) { console.error('PAGE ERRORS:\n' + [...new Set(errs)].join('\n')); process.exit(2); } console.log('rendered ' + ticks.length + ' frames to ' + out);
})();
