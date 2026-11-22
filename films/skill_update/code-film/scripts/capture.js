#!/usr/bin/env node
// Render a code film to PNG frames by driving a page's own render function, one tick at a time.
// Usage: node capture.js <page.html> <outdir> --call "<js using k>" [--frames 270] [--ticks ticks.json]
//                        [--canvas "#cv"] [--export stepTimes,beatTimes]
//   --call   JS run in the page for each frame; `k` is the tick number.  e.g. "renderTick(k)"  or  "render(k/30)"
//   --ticks  JSON array of tick numbers (use it to cut a short version out of a longer film)
//   --export page globals to save as <outdir>/<name>.json (step / heartbeat times for the sound script)
// Frames are read straight from the canvas, so page text and buttons never end up in the film.
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const a=process.argv.slice(2);if(a.length<2){console.error('usage: capture.js page.html outdir --call "renderTick(k)" [--frames N]');process.exit(1);}
const opt=n=>{const i=a.indexOf('--'+n);return i>=0?a[i+1]:null;};
const page=path.resolve(a[0]),out=path.resolve(a[1]),call=opt('call')||'renderTick(k)',sel=opt('canvas')||'canvas';
const ticks=opt('ticks')?JSON.parse(fs.readFileSync(opt('ticks'),'utf8')):[...Array(+(opt('frames')||90)).keys()];
(async()=>{fs.mkdirSync(out,{recursive:true});const b=await chromium.launch();const p=await b.newPage({viewport:{width:1200,height:2000}});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());          // web fonts are often unreachable in a sandbox
  await p.goto('file://'+page);await p.waitForTimeout(600);
  await p.evaluate(()=>{window.requestAnimationFrame=()=>0;});              // stop the page's live loop; we drive it
  for(const name of (opt('export')||'').split(',').filter(Boolean)){const v=await p.evaluate(n=>window[n]??null,name);if(v)fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify(v));}
  for(let i=0;i<ticks.length;i++){const d=await p.evaluate(([k,call,sel])=>{(0,eval)('var k='+k+';'+call);return document.querySelector(sel).toDataURL('image/png');},[ticks[i],call,sel]);
    fs.writeFileSync(path.join(out,'f'+String(i).padStart(4,'0')+'.png'),Buffer.from(d.split(',')[1],'base64'));}
  await b.close();if(errs.length){console.error('PAGE ERRORS:\n'+[...new Set(errs)].join('\n'));process.exit(2);}console.log('rendered '+ticks.length+' frames to '+out);})();
