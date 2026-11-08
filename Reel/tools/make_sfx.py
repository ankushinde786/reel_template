"""Synthesizes the reusable sound-effect library into assets/sfx/*.wav (44.1 kHz, 16-bit mono).
Deterministic (seeded), no downloads. Re-run to regenerate; tweak constants to change the sound."""
import numpy as np, wave, os, sys
SR = 44100
rng = np.random.default_rng(7)
out_dir = sys.argv[1] if len(sys.argv) > 1 else "assets/sfx"
os.makedirs(out_dir, exist_ok=True)

def t_(d): return np.arange(int(SR * d)) / SR
def exp_env(t, tau): return np.exp(-t / tau)

def svf_bandpass(x, centers, q=1.2):
    """State-variable bandpass with per-sample centre frequency (Hz)."""
    y = np.zeros_like(x); low = band = 0.0
    for i, s in enumerate(x):
        f = 2 * np.sin(np.pi * min(centers[i], SR * 0.45) / SR)
        low += f * band
        high = s - low - band / q
        band += f * high
        y[i] = band
    return y

def click(freq, amp=1.0, d=0.05):
    t = t_(d)
    n = rng.standard_normal(len(t)); n = np.diff(n, prepend=0)       # bright noise
    return amp * (0.7 * n * exp_env(t, 0.0035) + 0.6 * np.sin(2 * np.pi * freq * t) * exp_env(t, 0.006))

def mix_at(buf, snd, at):
    i = int(at * SR); j = min(len(buf), i + len(snd))
    if i < len(buf): buf[i:j] += snd[: j - i]

def norm(x, peak=0.9): return x / (np.max(np.abs(x)) + 1e-9) * peak

def save(name, x):
    x = np.clip(norm(x), -1, 1)
    with wave.open(os.path.join(out_dir, name + ".wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())
    print(f"{name}.wav  {len(x)/SR:.2f}s")

# typing: ~25 key clicks/s with jitter and varying pitch/amp, 1.6 s (trimmed per line by the composition)
buf = np.zeros(int(1.6 * SR)); at = 0.0
while at < 1.55:
    mix_at(buf, click(rng.uniform(1500, 2500), rng.uniform(0.55, 1.0)), at)
    at += 0.04 + rng.uniform(-0.01, 0.012)
save("typing", buf)

# enter: heavier key + low thump
t = t_(0.18)
save("enter", click(1200, 1.0, 0.18) + 0.9 * np.sin(2 * np.pi * 140 * t) * exp_env(t, 0.05))

# whoosh: noise through a sweeping bandpass, smooth envelope
d = 0.55; t = t_(d); x = rng.standard_normal(len(t))
env = np.sin(np.pi * t / d) ** 2
save("whoosh", svf_bandpass(x, 350 + 3800 * (t / d) ** 1.5, q=1.0) * env)

# swap: quick two-way sweep (up then down) for items trading places
d = 0.32; t = t_(d); x = rng.standard_normal(len(t))
sweep = 500 + 3000 * np.sin(np.pi * t / d)
env = np.sin(np.pi * t / d) ** 1.5
tone = 0.25 * np.sin(2 * np.pi * np.cumsum(300 + 700 * np.sin(np.pi * t / d)) / SR)
save("swap", svf_bandpass(x, sweep, q=1.4) * env + tone * env)

# pop: pitched blip dropping in frequency
t = t_(0.16); f = 900 * np.exp(-t * 7) + 250
save("pop", np.sin(2 * np.pi * np.cumsum(f) / SR) * exp_env(t, 0.05) + 0.3 * click(2200, 1.0, 0.16)[: len(t)] * 0.5)

# tick: tiny soft blip for staggered items
t = t_(0.05)
save("tick", np.sin(2 * np.pi * 1500 * t) * exp_env(t, 0.012))

# ding: bell, two notes with inharmonic partial
d = 0.9; buf = np.zeros(int(d * SR))
for at, f0, a in [(0.0, 1046.5, 1.0), (0.09, 1568.0, 0.8)]:
    t = t_(d - at)
    bell = (np.sin(2 * np.pi * f0 * t) + 0.35 * np.sin(2 * np.pi * f0 * 2.76 * t) * exp_env(t, 0.08)) * exp_env(t, 0.22)
    mix_at(buf, a * bell, at)
save("ding", buf)

# thud: low drop + dull noise, for delete / error
d = 0.35; t = t_(d); f = 150 * np.exp(-t * 8) + 45
n = rng.standard_normal(len(t)); n = np.convolve(n, np.ones(30) / 30, mode="same")
save("thud", np.sin(2 * np.pi * np.cumsum(f) / SR) * exp_env(t, 0.09) + 0.5 * n * exp_env(t, 0.03))
