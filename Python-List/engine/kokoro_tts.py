#!/usr/bin/env python3
"""Batch text-to-speech with Kokoro-82M (ONNX), the same model `npx hyperframes tts` uses.

  python kokoro_tts.py --jobs jobs.json --voice af_heart --speed 1.0 --lang en-us

jobs.json is a list of {"text": "...", "out": "path/to/file.wav"}; the model loads once for the whole batch.
Output: 24 kHz, 16-bit, mono WAV files.

Backends (--backend auto|kokoro-onnx|lite):
  kokoro-onnx  the `kokoro-onnx` PyPI package (pip install kokoro-onnx soundfile) - phonemizes with its bundled espeak-ng.
  lite         onnxruntime + numpy + an `espeak-ng` binary on PATH (or ESPEAK_NG=/path). Same model, same voices,
               no PyPI package needed beyond onnxruntime. Used automatically when kokoro-onnx is not importable.

Model files are cached in ~/.cache/hyperframes/ (shared with HyperFrames) and downloaded on first use.
"""
import argparse, json, os, re, shutil, subprocess, sys, urllib.request, wave
import numpy as np

REL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"
CACHE = os.path.expanduser(os.environ.get("KOKORO_CACHE", "~/.cache/hyperframes"))
MODEL = os.path.join(CACHE, "kokoro-v1.0.onnx")
VOICES = os.path.join(CACHE, "voices-v1.0.bin")
SR = 24000
HERE = os.path.dirname(os.path.abspath(__file__))


def ensure(path, name):
    if os.path.exists(path) and os.path.getsize(path) > 1_000_000:
        return
    os.makedirs(CACHE, exist_ok=True)
    print(f"downloading {name} -> {path}", file=sys.stderr)
    tmp = path + ".part"
    urllib.request.urlretrieve(REL + name, tmp)
    os.replace(tmp, path)


def write_wav(path, audio):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    pcm = (np.clip(audio, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


# ------------------------------------------------------------------ backend: kokoro-onnx package
def backend_pkg(args):
    from kokoro_onnx import Kokoro
    k = Kokoro(MODEL, VOICES)
    def synth(text):
        kw = {"voice": args.voice, "speed": args.speed}
        try:
            audio, sr = k.create(text, lang=args.lang, **kw)
        except TypeError:
            audio, sr = k.create(text, **kw)
        assert sr == SR, sr
        return np.asarray(audio, dtype=np.float32)
    return synth, "kokoro-onnx"


# ------------------------------------------------------------------ backend: lite (onnxruntime + espeak-ng binary)
MARKS_SENT, MARKS_CLAUSE = set(".!?…"), set(",;:—")

def backend_lite(args):
    import onnxruntime as ort
    vocab = json.load(open(os.path.join(HERE, "kokoro_vocab.json"), encoding="utf-8"))
    espeak = os.environ.get("ESPEAK_NG") or shutil.which("espeak-ng") or shutil.which("espeak")
    if not espeak:
        sys.exit("lite backend needs the espeak-ng binary (apt install espeak-ng / brew install espeak-ng), "
                 "or `pip install kokoro-onnx soundfile` which bundles it.")
    voices = np.load(VOICES)
    if args.voice not in voices.files:
        sys.exit(f"unknown voice {args.voice!r}. Available: {', '.join(voices.files)}")
    style_bank = voices[args.voice]
    sess = ort.InferenceSession(MODEL, providers=["CPUExecutionProvider"])
    names = {i.name for i in sess.get_inputs()}
    tok_name = "input_ids" if "input_ids" in names else "tokens"

    def ipa(chunk):
        r = subprocess.run([espeak, "-q", "--ipa", "-v", args.lang, chunk], capture_output=True, text=True, check=True)
        return " ".join(r.stdout.replace("_", "").split())

    def phonemize(text):
        out = ""
        for part in re.split(r"([.,!?;:—…\"“”()])", " ".join(text.split())):
            if not part:
                continue
            out += part if part in vocab and len(part) == 1 and not part.isalnum() else ipa(part) + " "
        out = "".join(c for c in out if c in vocab)
        return " ".join(out.split())

    def batches(ph, limit=500):
        cur = ""
        for piece in re.findall(r"[^.!?…]+[.!?…]*\s*", ph) or [ph]:
            if len(cur) + len(piece) > limit and cur:
                yield cur.strip(); cur = ""
            cur += piece
        if cur.strip():
            yield cur.strip()

    def trim(a, thr=0.004, keep=int(0.03 * SR)):
        idx = np.flatnonzero(np.abs(a) > thr)
        return a[max(idx[0] - keep, 0): idx[-1] + keep] if len(idx) else a

    def infer(ph):
        tokens = [vocab[c] for c in ph if c in vocab]
        style = style_bank[min(len(tokens), len(style_bank)) - 1]
        out = sess.run(None, {tok_name: np.array([[0, *tokens, 0]], dtype=np.int64),
                              "style": np.asarray(style, dtype=np.float32).reshape(1, -1),
                              "speed": np.array([args.speed], dtype=np.float32)})
        return np.asarray(out[0]).ravel()

    def synth(text):
        ph = phonemize(text)
        if not ph:
            raise ValueError(f"nothing to say in {text!r}")
        parts = []
        for b in batches(ph):
            parts.append(trim(infer(b)))
            end = b.rstrip()[-1:]
            pause = 0.28 if end in MARKS_SENT else 0.12 if end in MARKS_CLAUSE else 0.0
            if pause:
                parts.append(np.zeros(int(pause * SR), dtype=np.float32))
        return np.concatenate(parts)
    return synth, "lite (onnxruntime + espeak-ng)"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--jobs", required=True)
    ap.add_argument("--voice", default="af_heart")
    ap.add_argument("--speed", type=float, default=1.0)
    ap.add_argument("--lang", default="en-us")
    ap.add_argument("--backend", default="auto", choices=["auto", "kokoro-onnx", "lite"])
    args = ap.parse_args()
    if not 0.5 <= args.speed <= 2.0:
        sys.exit("speed must be between 0.5 and 2.0")
    jobs = json.load(open(args.jobs, encoding="utf-8"))
    ensure(MODEL, "kokoro-v1.0.onnx"); ensure(VOICES, "voices-v1.0.bin")

    synth = name = None
    if args.backend in ("auto", "kokoro-onnx"):
        try:
            synth, name = backend_pkg(args)
        except ImportError:
            if args.backend == "kokoro-onnx":
                sys.exit("kokoro-onnx is not installed: pip install kokoro-onnx soundfile")
    if synth is None:
        synth, name = backend_lite(args)
    print(f"backend: {name}  voice: {args.voice}  speed: {args.speed}", file=sys.stderr)
    for j in jobs:
        audio = synth(j["text"])
        write_wav(j["out"], audio)
        print(f"{j['out']}  {len(audio) / SR:.2f}s", file=sys.stderr)


if __name__ == "__main__":
    main()
