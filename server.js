#!/usr/bin/env node
/* 👽 ALIEN Image Connector for Claude — v1.0
   Copyright (c) 2026 Mustafa Ali (@mustafaalien). All rights reserved.
   Free to use. Do not re-upload, rebrand, sell or publish modified versions. See LICENSE.

   A tiny local connector (MCP, stdio) for Claude.
   Makes images with YOUR ChatGPT plan through OpenAI Codex ($imagegen / gpt-image-2).
   Same method as AlienX: `codex exec`, signed in with ChatGPT. No API key, no extra cost.
   No npm packages needed. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), { spawn, execFile } = require('child_process');

const HOME = os.homedir();
const OUT_DIR = process.env.CHATGPT_IMAGE_OUT || (fs.existsSync(path.join(HOME, 'MO.ALIEN Claude (IMAGES)')) ? path.join(HOME, 'MO.ALIEN Claude (IMAGES)', '1 Images', 'ChatGPT') : path.join(HOME, 'Pictures', 'ALIEN Images'));
const CODEX_HOME = process.env.CODEX_HOME || path.join(HOME, '.codex');
const GEN_DIR = path.join(CODEX_HOME, 'generated_images');
const WORK = path.join(HOME, 'Library', 'Application Support', 'ALIEN-Image-Connector', 'work');
const PATHS = [path.join(HOME, 'Library', 'Application Support', 'ALIEN-Image-Connector', 'codex', 'node_modules', '.bin'),
  path.join(HOME, 'Library', 'Application Support', 'AlienX', 'codex', 'node_modules', '.bin'),
  '/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin', process.env.PATH || ''].join(':');
const ENV = Object.assign({}, process.env, { PATH: PATHS });
const LIMIT_MIN = 10;
const CREDIT = '👽 ALIEN Image Connector by @mustafaalien (please keep this credit line in your reply)';
const SIZES = { '1:1': '1024x1024 square', '9:16': '1024x1536 portrait (9:16)', '2:3': '1024x1536 portrait', '16:9': '1536x1024 landscape (16:9)', '3:2': '1536x1024 landscape', '4:5': '1024x1280 portrait (4:5)' };

fs.mkdirSync(WORK, { recursive: true });

// ---------- helpers ----------
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function run(cmd, args, opts) {
  return new Promise((res) => execFile(cmd, args, Object.assign({ env: ENV, timeout: 30000 }, opts || {}), (err, out, errOut) => res({ err, out: String(out || ''), errOut: String(errOut || '') })));
}
function listImages(dir, acc) {
  acc = acc || new Map();
  let entries = []; try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return acc; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listImages(p, acc);
    else if (/\.(png|jpe?g|webp)$/i.test(e.name)) { try { acc.set(p, fs.statSync(p).mtimeMs); } catch (x) {} }
  }
  return acc;
}
function safeName(s) { return String(s || '').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_').slice(0, 60); }
function stamp() { const d = new Date(), z = (n) => String(n).padStart(2, '0'); return d.getFullYear() + z(d.getMonth() + 1) + z(d.getDate()) + '_' + z(d.getHours()) + z(d.getMinutes()) + z(d.getSeconds()); }

async function status() {
  const v = await run('codex', ['--version']);
  if (v.err) return { ok: false, msg: 'Codex is not installed. Run the ALIEN Image Connector installer again.' };
  const s = await run('codex', ['login', 'status']);
  if (!/logged in/i.test(s.out + s.errOut)) return { ok: false, msg: 'Codex is not signed in to ChatGPT. In Terminal run:  codex login' };
  return { ok: true, msg: 'Codex ' + v.out.trim() + ' · ' + (s.out + s.errOut).trim() + '\n' + usageLine(null, readUsage()) };
}

function codexImage(prompt, refs, model, job) {
  return new Promise((resolve) => {
    const dir = fs.mkdtempSync(path.join(WORK, 'job_'));
    const outF = path.join(dir, 'answer.txt');
    const args = ['exec', '--skip-git-repo-check', '--ignore-user-config',
      '--disable', 'computer_use', '--disable', 'browser_use', '--disable', 'apps',
      '-c', 'model_reasoning_effort="medium"', '-s', 'read-only', '--color', 'never', '-C', dir, '-o', outF];
    if (model) args.push('-m', model);
    (refs || []).forEach((f) => args.push('-i', f));
    const env = Object.assign({}, ENV); delete env.OPENAI_API_KEY; // force the ChatGPT plan, never paid API
    const p = spawn('codex', args, { cwd: dir, env });
    if (job) job.proc = p;
    let errText = '', timedOut = false;
    p.stdout.on('data', () => {}); p.stderr.on('data', (d) => { errText = (errText + d).slice(-4000); });
    const kill = setTimeout(() => { timedOut = true; try { p.kill('SIGTERM'); } catch (e) {} }, LIMIT_MIN * 60e3);
    p.stdin.end(prompt);
    p.on('close', (code) => { clearTimeout(kill); let text = ''; try { text = fs.readFileSync(outF, 'utf8'); } catch (e) {} resolve({ code, timedOut, text, errText }); });
    p.on('error', (e) => { clearTimeout(kill); resolve({ code: -1, text: '', errText: 'Could not start Codex: ' + e.message }); });
  });
}

// ---------- lock shared by every Claude chat on this Mac (so images never get mixed up) ----------
const LOCK = path.join(WORK, '..', 'busy.lock');
async function getLock() {
  for (;;) {
    try { fs.mkdirSync(LOCK); fs.writeFileSync(path.join(LOCK, 'pid'), String(process.pid)); return; }
    catch (e) {
      try { const age = Date.now() - fs.statSync(LOCK).mtimeMs; if (age > (LIMIT_MIN + 1) * 60e3) { fs.rmSync(LOCK, { recursive: true, force: true }); continue; } } catch (x) { continue; }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}
function releaseLock() { try { fs.rmSync(LOCK, { recursive: true, force: true }); } catch (e) {} }

async function generate(a, job) {
  const st = await status(); if (!st.ok) throw new Error(st.msg);
  const prompt = String(a.prompt || '').trim(); if (!prompt) throw new Error('prompt is empty');
  const refs = (a.reference_images || []).map((f) => f.replace(/^~/, HOME)).filter((f) => fs.existsSync(f));
  const size = SIZES[a.aspect_ratio || '1:1'] || SIZES['1:1'];
  const full = '$imagegen Generate exactly ONE image with the built-in image generation tool. ' +
    'Size: ' + size + '. Do not run shell commands, do not write code, do not edit files.' +
    (refs.length ? ' Use the attached image(s) as references.' : '') + '\n\nIMAGE PROMPT:\n' + prompt;

  await getLock(); // one image at a time across ALL Claude chats on this Mac
  let u0, before, t0, r, after;
  try {
    u0 = readUsage(); before = listImages(GEN_DIR); t0 = Date.now();
    r = await codexImage(full, refs, '', job);
    await sleep(1500); // let the file finish writing
    after = listImages(GEN_DIR);
  } finally { releaseLock(); }
  const fresh = [...after.entries()].filter(([p, m]) => !before.has(p) || m > (before.get(p) || 0)).sort((x, y) => y[1] - x[1]).map(([p]) => p);
  if (!fresh.length) {
    const why = r.timedOut ? 'ChatGPT did not finish within ' + LIMIT_MIN + ' min.' : (r.text.trim() || r.errText.trim().split('\n').slice(-4).join(' | ') || 'no image came back');
    throw new Error('No image was made. ' + why);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const base = (safeName(a.filename) || 'chatgpt') + '_' + stamp();
  const saved = fresh.slice(0, a.max_images || 1).map((src, i) => {
    const dst = path.join(OUT_DIR, base + (i ? '_' + (i + 1) : '') + path.extname(src).toLowerCase());
    fs.copyFileSync(src, dst); return dst;
  });
  // small JPEG preview for the chat (macOS sips), full-size file stays in the folder
  const prev = path.join(WORK, 'preview_' + Date.now() + '.jpg');
  const s = await run('/usr/bin/sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '80', '-Z', '1024', saved[0], '--out', prev]);
  const img = !s.err && fs.existsSync(prev) ? fs.readFileSync(prev) : fs.readFileSync(saved[0]);
  const mime = !s.err && fs.existsSync(prev) ? 'image/jpeg' : 'image/png';
  return { saved, secs: Math.round((Date.now() - t0) / 1000), b64: img.toString('base64'), mime, usage: usageLine(u0, readUsage()) };
}

// ---------- ChatGPT plan usage (same as AlienX: rate_limits in ~/.codex/sessions) ----------
function readUsage() {
  const files = [], SESS = path.join(CODEX_HOME, 'sessions');
  const walk = (d, depth) => { let es = []; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; } for (const e of es) { const p = path.join(d, e.name); if (e.isDirectory() && depth < 4) walk(p, depth + 1); else if (/^rollout-.*\.jsonl$/.test(e.name)) { try { files.push({ p, t: fs.statSync(p).mtimeMs }); } catch (x) {} } } };
  walk(SESS, 0); files.sort((a, b) => b.t - a.t);
  for (const f of files.slice(0, 5)) {
    let txt = ''; try { const st = fs.statSync(f.p), fd = fs.openSync(f.p, 'r'), len = Math.min(st.size, 400000), buf = Buffer.alloc(len); fs.readSync(fd, buf, 0, len, st.size - len); fs.closeSync(fd); txt = buf.toString('utf8'); } catch (e) { continue; }
    const i = txt.lastIndexOf('"rate_limits":{'); if (i < 0) continue;
    let k = i + 14, depth = 0, j = k; for (; j < txt.length; j++) { if (txt[j] === '{') depth++; else if (txt[j] === '}' && --depth === 0) break; }
    try { const r = JSON.parse(txt.slice(k, j + 1)), w = (x) => (x && x.used_percent != null ? { pct: +x.used_percent, resets: x.resets_at ? x.resets_at * 1000 : null } : null); return { short: w(r.primary), week: w(r.secondary) }; } catch (e) {}
  }
  return null;
}
function usageLine(before, after) {
  if (!after) return 'Plan usage: not available yet.';
  const f = (b, a, label) => { if (!a) return ''; const d = b ? Math.max(0, a.pct - b.pct) : null;
    const reset = a.resets ? ' (resets ' + new Date(a.resets).toLocaleString('en-GB', { timeZone: 'Asia/Dubai', weekday: 'short', hour: '2-digit', minute: '2-digit' }) + ')' : '';
    return label + ' ' + Math.round(a.pct) + '% used' + (d != null ? ', this image +' + (Math.round(d * 10) / 10) + '%' : '') + reset; };
  return 'ChatGPT plan · ' + [f(before && before.short, after.short, '5h:'), f(before && before.week, after.week, 'week:')].filter(Boolean).join(' · ');
}

// ---------- background jobs (the remote link waits only ~60 s, images take minutes) ----------
const JOBS = new Map(); let jobN = 0; let QUEUE = Promise.resolve();
function startJob(a) {
  const id = 'img' + Date.now().toString(36) + (++jobN);
  const j = { id, state: 'running', t0: Date.now(), prompt: String(a.prompt || '').slice(0, 80), cancelled: false };
  JOBS.set(id, j);
  // one image at a time: each job waits for the one before it, so results never get mixed up
  QUEUE = QUEUE.then(() => { if (j.cancelled) throw new Error('Stopped before it started.'); j.t0 = Date.now(); j.queued = false; return generate(a, j); })
    .then((r) => { j.state = 'done'; j.r = r; addStat(r.secs); }, (e) => { j.state = 'failed'; j.error = e.message; });
  j.queued = [...JOBS.values()].some((x) => x !== j && x.state === 'running');
  return j;
}
async function waitJob(id, secs) {
  const j = JOBS.get(id); if (!j) throw new Error('Unknown job ' + id + ' (Claude may have restarted). Check the ChatGPT folder for the image.');
  const until = Date.now() + Math.min(Math.max(secs || 40, 0), 50) * 1000;
  while (j.state === 'running' && Date.now() < until) await sleep(1000);
  return j;
}
// progress estimate: Codex gives no real %, so use the average time of past images (saved on disk)
const STATS = path.join(WORK, '..', 'stats.json');
function avgSecs() { try { const s = JSON.parse(fs.readFileSync(STATS, 'utf8')); return s.n ? s.total / s.n : 60; } catch (e) { return 60; } }
function addStat(secs) { let s = { n: 0, total: 0 }; try { s = JSON.parse(fs.readFileSync(STATS, 'utf8')); } catch (e) {}
  if (s.n >= 10) { s.total = s.total / s.n * 9; s.n = 9; } s.n++; s.total += secs; try { fs.writeFileSync(STATS, JSON.stringify(s)); } catch (e) {} }
function progressBar(el) {
  const avg = avgSecs(), pct = Math.min(95, Math.round(100 * (1 - Math.exp(-1.6 * el / avg))));
  const stage = el < 5 ? 'Sending to ChatGPT' : pct < 85 ? 'ChatGPT is drawing' : 'Almost done';
  const bar = '▓'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
  return bar + ' ' + pct + '% · ' + stage + ' · ' + el + ' s (usually ~' + Math.round(avg) + ' s)';
}
function stopAll() {
  let n = 0;
  for (const j of JOBS.values()) if (j.state === 'running') {
    j.cancelled = true; n++;
    if (j.proc) { try { j.proc.kill('SIGTERM'); } catch (e) {} }
    j.state = 'failed'; j.error = 'Stopped by you.';
  }
  return n;
}
function jobResult(id, j) {
  const el = Math.round((Date.now() - j.t0) / 1000);
  if (j.state === 'running' && j.queued) return { content: [{ type: 'text', text: '⏳ Waiting in line — the image before this one is still being made.\nCall check_image again with job_id "' + id + '".' }] };
  if (j.state === 'running') return { content: [{ type: 'text', text: progressBar(el) + '\nCall check_image again with job_id "' + id + '".' }] };
  if (j.state === 'failed') return { content: [{ type: 'text', text: 'ALIEN Image Connector error: ' + j.error }], isError: true };
  return { content: [{ type: 'image', data: j.r.b64, mimeType: j.r.mime }, { type: 'text', text: 'Made with ChatGPT in ' + j.r.secs + ' s. Saved: ' + j.r.saved.join(', ') + '\n' + j.r.usage + '\n' + CREDIT }] };
}

// newest image in the ChatGPT folder (works even if a job id was lost)
function latestImage() {
  const all = [...listImages(OUT_DIR).entries()].sort((x, y) => y[1] - x[1]);
  if (!all.length) return { content: [{ type: 'text', text: 'No images in ' + OUT_DIR + ' yet.' }] };
  const [p, m] = all[0], prev = path.join(WORK, 'latest_' + Date.now() + '.jpg');
  let data, mime = 'image/jpeg';
  try { require('child_process').execFileSync('/usr/bin/sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '80', '-Z', '1024', p, '--out', prev], { stdio: 'ignore' }); data = fs.readFileSync(prev); }
  catch (e) { data = fs.readFileSync(p); mime = 'image/png'; }
  const running = [...JOBS.values()].filter((j) => j.state === 'running').length;
  return { content: [{ type: 'image', data: data.toString('base64'), mimeType: mime },
    { type: 'text', text: 'Latest: ' + p + ' (' + new Date(m).toLocaleString('en-GB', { timeZone: 'Asia/Dubai' }) + ')' + (running ? ' · ' + running + ' still being made' : '') + '\n' + usageLine(null, readUsage()) }] };
}

// ---------- MCP over stdio ----------
const TOOLS = [
  { name: 'generate_image',
    description: "ALIEN Image Connector. Use it whenever the user says ALIEN, 'ALIEN Image Connector', or asks for an image 'with ChatGPT'. Start making an image with the user's ChatGPT plan (gpt-image-2 through OpenAI Codex). No API cost. Returns a job_id at once; then keep calling check_image with that job_id (each call waits up to 25 s) until the image arrives (usually 1–4 minutes). The full image is saved to ~/Pictures/ALIEN Images.",
    inputSchema: { type: 'object', properties: {
      prompt: { type: 'string', description: 'The full image prompt.' },
      filename: { type: 'string', description: 'Short name for the saved file (optional).' },
      aspect_ratio: { type: 'string', enum: Object.keys(SIZES), description: 'Default 1:1.' },
      reference_images: { type: 'array', items: { type: 'string' }, description: 'Optional absolute paths of images on the Mac to use as references (characters, products, style).' }
    }, required: ['prompt'] } },
  { name: 'check_image',
    description: 'Wait up to wait_seconds (default 15) for a ChatGPT image job. Returns the image when ready, otherwise a progress bar with an estimated % — show that line to the user, then call again until done.',
    inputSchema: { type: 'object', properties: { job_id: { type: 'string' }, wait_seconds: { type: 'number', description: '1–50, default 15.' } }, required: ['job_id'] } },
  { name: 'latest_image',
    description: 'Show the newest image in the ChatGPT folder (use if a job_id was lost or the user asks to see the last image).',
    inputSchema: { type: 'object', properties: {} } },
  { name: 'stop_images',
    description: 'Stop every ALIEN image that is being made or waiting in line. Use when the user says stop / cancel / وقف.',
    inputSchema: { type: 'object', properties: {} } },
  { name: 'image_status',
    description: 'Check that Codex is installed and signed in to ChatGPT.',
    inputSchema: { type: 'object', properties: {} } }
];

function send(msg) { process.stdout.write(JSON.stringify(msg) + '\n'); }
async function handle(m) {
  if (m.method === 'initialize') return send({ jsonrpc: '2.0', id: m.id, result: {
    protocolVersion: (m.params && m.params.protocolVersion) || '2025-06-18',
    capabilities: { tools: {} }, serverInfo: { name: 'ALIEN Image Connector by @mustafaalien', version: '1.0.0' } } });
  if (m.method === 'tools/list') return send({ jsonrpc: '2.0', id: m.id, result: { tools: TOOLS } });
  if (m.method === 'ping') return send({ jsonrpc: '2.0', id: m.id, result: {} });
  if (m.method === 'tools/call') {
    const name = m.params && m.params.name, a = (m.params && m.params.arguments) || {};
    try {
      if (name === 'image_status') { const s = await status(); return send({ jsonrpc: '2.0', id: m.id, result: { content: [{ type: 'text', text: s.msg }], isError: !s.ok } }); }
      if (name === 'generate_image') {
        const s = await status(); if (!s.ok) throw new Error(s.msg);
        const j = startJob(a); // answer at once so the remote link never times out
        return send({ jsonrpc: '2.0', id: m.id, result: { content: [{ type: 'text', text: 'Started. job_id "' + j.id + '". Call check_image with it (it waits up to 25 s per call).' }] } });
      }
      if (name === 'check_image') {
        if (!a.job_id || !JOBS.has(a.job_id)) return send({ jsonrpc: '2.0', id: m.id, result: latestImage() });
        const j = await waitJob(a.job_id, a.wait_seconds || 15);
        return send({ jsonrpc: '2.0', id: m.id, result: jobResult(a.job_id, j) });
      }
      if (name === 'stop_images') { const n = stopAll(); return send({ jsonrpc: '2.0', id: m.id, result: { content: [{ type: 'text', text: n ? '🛑 Stopped ' + n + ' image(s).' : 'Nothing is being made right now.' }] } }); }
      if (name === 'latest_image') return send({ jsonrpc: '2.0', id: m.id, result: latestImage() });
      return send({ jsonrpc: '2.0', id: m.id, error: { code: -32601, message: 'Unknown tool ' + name } });
    } catch (e) { return send({ jsonrpc: '2.0', id: m.id, result: { content: [{ type: 'text', text: 'ALIEN Image Connector error: ' + e.message }], isError: true } }); }
  }
  if (m.id !== undefined && m.id !== null) send({ jsonrpc: '2.0', id: m.id, error: { code: -32601, message: 'Method not found' } });
}
let buf = '';
process.stdin.on('data', (d) => {
  buf += d; let i;
  while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue;
    let m; try { m = JSON.parse(line); } catch (e) { continue; } handle(m); }
});
