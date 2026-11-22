#!/usr/bin/env python3
"""Sound for the map reel, all made in code: soft pad bed, whooshes on camera moves, small pops on pills,
plus the Kokoro voice lines. Also writes v1_voice.js (caption word times + voice level per frame).
Usage: python3 v1_sound.py <dir_with_vo_wavs> <voice_id> <out.wav>"""
import sys, json, numpy as np, soundfile as sf
VO, SID, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
SR, DUR, FPS = 44100, 20.0, 30
BEATS = [0.0, 3.3, 6.0, 12.6, 16.6]
CAPS = ["Dubai's most famous address.", "Your new home sits right here.", "Atlantis. The Marina. Burj Al Arab. All a short drive away.",
        "Beachfront living on the trunk of the Palm.", "Call today for a private viewing."]
ROUTES = [6.3, 8.3, 10.3]
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
    x, sr = sf.read(f"{VO}/vo_{SID}_{i}.wav"); x = np.interp(np.arange(0, len(x), sr/SR), np.arange(len(x)), x)
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
whoosh(14.6, 2.6, 0.13)
def pop(at, f):
    n = int(0.25*SR); tt = np.arange(n)/SR; place(fx, np.sin(2*np.pi*f*tt)*np.exp(-tt*28)*0.13, at)
pop(3.65, 660)
for r, f in zip(ROUTES, (784, 880, 988)): pop(r+1.15, f)
pop(15.5, 1046)
# --- mix: duck the bed under the voice
env = lp(np.abs(vo), 0.0008); duck = 1 - 0.55*np.clip(env/0.12, 0, 1)
mix = vo*0.95 + (bed*2.2 + pulse)*duck + fx
mix = np.tanh(mix*1.1); mix = mix/np.abs(mix).max()*0.89
st = np.stack([mix, mix], 1); sf.write(OUT, st, SR)
fr = [float(np.clip(np.abs(vo[int(k*SR/FPS):int((k+1)*SR/FPS)]).mean()/0.14, 0.06, 1)) for k in range(int(DUR*FPS))]
open(OUT.rsplit('/', 1)[0] + '/v1_voice.js' if '/' in OUT else 'v1_voice.js', 'w').write(f"window.CAP_TIMES={json.dumps(cap_times)};window.VOICE_ENV={json.dumps([round(v,3) for v in fr])};")
print('wrote', OUT)
