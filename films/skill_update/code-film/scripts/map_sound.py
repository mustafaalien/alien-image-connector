#!/usr/bin/env python3
"""Sound for a map reel, all made in code: soft pad bed, a pulse, whooshes on beat changes, small pops on pills,
plus the voice lines from map_voice.py. Also writes voice.js next to the WAV (caption word times + voice level per frame),
which the page loads so captions and the waveform follow the voice. Word times are ESTIMATED from word length.
Usage: python3 map_sound.py <film.json> <dir_with_vo_wavs> <out.wav>     (film.json is written by map_capture_film.js)"""
import sys, json, numpy as np, soundfile as sf
FILM, VO, OUT = json.load(open(sys.argv[1])), sys.argv[2], sys.argv[3]
SR, DUR, FPS = 44100, float(FILM['DUR']), FILM['FPS']
BEATS = [b['t'] for b in FILM['BEATS'] if b.get('cap')]
CAPS = [b['cap'] for b in FILM['BEATS'] if b.get('cap')]
ROUTES = [l['t0'] for l in FILM['LANDMARKS']]
N = int(SR*DUR); t = np.arange(N)/SR; rs = np.random.RandomState(7)
def place(buf, x, at):
    i = int(at*SR); n = min(len(x), len(buf)-i)
    if n > 0: buf[i:i+n] += x[:n]
def lp(x, a):                      # one-pole low-pass
    y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s += a*(x[i]-s); y[i] = s
    return y
# --- voice
vo = np.zeros(N); cap_times = []
for i, (b, cap) in enumerate(zip(BEATS, CAPS)):
    x, sr = sf.read(f"{VO}/vo_{i}.wav"); x = np.interp(np.arange(0, len(x), sr/SR), np.arange(len(x)), x)
    e = np.abs(x) > 0.02*np.abs(x).max(); a, z = np.argmax(e), len(e)-np.argmax(e[::-1]); x = x[max(0, a-400):z+2000]
    start = b + 0.45; place(vo, x/np.abs(x).max()*0.8, start)
    ws = cap.split(' '); wt = np.array([len(w)+1.5+(3 if w[-1] in '.,' else 0) for w in ws], float); cum = np.concatenate([[0], np.cumsum(wt)[:-1]])/wt.sum()
    cap_times.append([round(start + c*(len(x)-2000)/SR, 3) for c in cum])
    print(i, 'voice', round(start, 2), '->', round(start+len(x)/SR, 2))
# --- bed: slow warm pad (D minor 9), gentle movement
bed = np.zeros(N)
for f, g in [(73.42, .5), (110.0, .35), (146.83, .3), (174.61, .22), (220.0, .2), (329.63, .12), (261.63, .1)]:
    for det in (-0.25, 0.25): bed += g*np.sin(2*np.pi*(f+det)*t + rs.rand()*6)*(0.75+0.25*np.sin(2*np.pi*(0.07+rs.rand()*0.1)*t+rs.rand()*6))
bed *= 0.05*np.clip(t/1.5, 0, 1)*np.clip((DUR-t)/1.2, 0, 1)
pulse = np.zeros(N)                # soft pulse, 100 bpm
for k in np.arange(0.6, DUR-0.5, 0.6):
    n = int(0.35*SR); tt = np.arange(n)/SR; place(pulse, np.sin(2*np.pi*(55+25*np.exp(-tt*30))*tt)*np.exp(-tt*14)*0.11, k)
# --- whooshes on beat changes, a longer one on the push-in
fx = np.zeros(N)
def whoosh(at, d, g):
    n = int(d*SR); x = rs.randn(n); u = np.arange(n)/n
    y = lp(x, 0.02)*(1-u) + lp(x, 0.25)*u; place(fx, y*np.sin(np.pi*u)**2*g, at-d*0.6)
for b in BEATS[1:]: whoosh(b, 0.9, 0.16)
whoosh(BEATS[-1]-2.0, 2.6, 0.13)          # long one under the final push-in
def pop(at, f):
    n = int(0.25*SR); tt = np.arange(n)/SR; place(fx, np.sin(2*np.pi*f*tt)*np.exp(-tt*28)*0.13, at)
pop(BEATS[1]+0.35, 660)
for n, r in enumerate(ROUTES): pop(r+1.15, 784*2**(n*2/12))
# --- mix: duck the bed under the voice
env = lp(np.abs(vo), 0.0008); duck = 1 - 0.55*np.clip(env/0.12, 0, 1)
mix = vo*0.95 + (bed*2.2 + pulse)*duck + fx
mix = np.tanh(mix*1.1); mix = mix/np.abs(mix).max()*0.89
st = np.stack([mix, mix], 1); sf.write(OUT, st, SR)
fr = [float(np.clip(np.abs(vo[int(k*SR/FPS):int((k+1)*SR/FPS)]).mean()/0.14, 0.06, 1)) for k in range(int(DUR*FPS))]
import os
open(os.path.join(os.path.dirname(os.path.abspath(OUT)), 'voice.js'), 'w').write(f"window.CAP_TIMES={json.dumps(cap_times)};window.VOICE_ENV={json.dumps([round(v,3) for v in fr])};")
print('wrote', OUT)
