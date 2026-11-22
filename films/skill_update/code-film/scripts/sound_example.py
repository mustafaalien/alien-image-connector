# Example soundtrack made in code for the painted heart film (30 s): low pad, warm chord while the family is
# on screen, wind after they vanish, footsteps on every step and a two-part heartbeat that follows the heart light.
# Usage: python3 sound_example.py <frames_dir>   (needs stepTimes.json and beatTimes.json written by capture.js --export)
# Treat it as a recipe: copy it and change the layers, times and levels for each new film.
import sys;D=sys.argv[1] if len(sys.argv)>1 else '.'
import numpy as np, json, wave
sr=48000;T=30.0;n=int(sr*T);t=np.arange(n)/sr;rng=np.random.default_rng(5)
def follow(target,tau):  # smooth step-like gain from target array
    a=1-np.exp(-1/(sr*tau));y=np.empty(n);s=0.0
    for i in range(0,n,48):
        s+= (target[i]-s)*(1-(1-a)**48); y[i:i+48]=s
    return y
pad=sum(g*np.sin(2*np.pi*f*t) for f,g in [(55,.12),(82.4,.12),(110,.12)])*follow(np.where(t<29,.9,0.),.4)
warm_t=np.where((t>8)&(t<19.5),1.,0.);wg=np.where(t<19.5,follow(warm_t,.8),0.)
wg[t>=19.5]=follow(warm_t,.08)[t>=19.5]
tri=lambda f:2/np.pi*np.arcsin(np.sin(2*np.pi*f*t))
warm=sum(.025*tri(f) for f in [220,277.2,329.6,440])*wg
noise=rng.standard_normal(n);lp=np.convolve(noise,np.ones(96)/96,'same')
wind=lp*follow(np.where((t>19.5)&(t<29),.18,.04),.5)*3
out=pad+warm+wind
for ts,vol in json.load(open(D+'/stepTimes.json')):
    i0=int(ts*sr);L=int(.15*sr);tt=np.arange(L)/sr
    f=120*np.exp(np.log(50/120)*np.minimum(tt/.08,1));ph=2*np.pi*np.cumsum(f)/sr
    s=(2/np.pi*np.arcsin(np.sin(ph)))*vol*np.exp(-tt/.03)
    s+=np.convolve(rng.standard_normal(L),np.ones(8)/8,'same')*vol*.25*np.exp(-tt/.02)
    out[i0:i0+L]+=s[:max(0,n-i0)]
for ts,b,I in json.load(open(D+'/beatTimes.json')):
    for dt,g in [(0,1.0),(0.33*60/b*0.6,0.7)]:
        i0=int((ts+dt)*sr);L=int(.25*sr);tt=np.arange(L)/sr
        f=60+40*np.exp(-tt*30);ph=2*np.pi*np.cumsum(f)/sr
        hb=np.sin(ph)*np.exp(-tt/.07)*g*(0.25+0.75*I)*0.9
        out[i0:i0+L]+=hb[:max(0,n-i0)]
out*=np.clip((30-t)/1.0,0,1)
out/=np.abs(out).max()/0.89
st=np.stack([out,np.roll(out,240)],1)
w=wave.open(D+'/sound.wav','wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes((st*32767).astype('<i2').tobytes());w.close();print('ok')
