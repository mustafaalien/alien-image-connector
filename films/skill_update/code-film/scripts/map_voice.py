#!/usr/bin/env python3
"""Free English voice lines with Kokoro (sherpa-onnx), one WAV per caption line: <outdir>/vo_<i>.wav
Setup once:  pip install "sherpa-onnx<2" soundfile     (version 2 dropped the built-in phonemizer and fails with "No lexicon")
             download and unpack https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-en-v0_19.tar.bz2
Usage: python3 map_voice.py <kokoro-en-v0_19 dir> <voice 0-10> <outdir> <film.json>
Voices: 0 af, 1 af_bella, 2 af_nicole, 3 af_sarah, 4 af_sky, 5 am_adam, 6 am_michael, 7 bf_emma, 8 bf_isabella, 9 bm_george, 10 bm_lewis.
Arabic is not covered: use the user's own recording or a paid voice, and ask first."""
import sys, json, os, numpy as np, sherpa_onnx, soundfile as sf
M, sid, out, film = sys.argv[1], int(sys.argv[2]), sys.argv[3], json.load(open(sys.argv[4]))
K = sherpa_onnx.OfflineTtsKokoroModelConfig(model=f'{M}/model.onnx', voices=f'{M}/voices.bin', tokens=f'{M}/tokens.txt', data_dir=f'{M}/espeak-ng-data')
tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(kokoro=K, num_threads=4)))
os.makedirs(out, exist_ok=True)
for i, b in enumerate(x for x in film['BEATS'] if x.get('cap')):
    a = tts.generate(b['cap'], sid=sid, speed=1.0); s = np.asarray(a.samples, dtype='float32'); assert s.size, 'empty audio: check the sherpa-onnx version'
    sf.write(f'{out}/vo_{i}.wav', s, int(a.sample_rate)); print(i, round(s.size/a.sample_rate, 2), 's', b['cap'])
