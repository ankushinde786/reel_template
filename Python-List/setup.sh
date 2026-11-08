#!/usr/bin/env bash
# One-time setup. Safe to re-run.   bash setup.sh [--no-model]
# Installs the voiceover dependencies (Kokoro TTS) into ./.venv and downloads the model (~350 MB, cached in ~/.cache/hyperframes).
set -e
cd "$(dirname "$0")"
need() { command -v "$1" >/dev/null 2>&1 || { echo "MISSING: $1  ->  $2"; MISSING=1; }; }
need node    "install Node 22+ (https://nodejs.org)"
need ffmpeg  "install ffmpeg (apt install ffmpeg / brew install ffmpeg)"
need python3 "install Python 3.9+"
if ! command -v google-chrome >/dev/null && ! command -v chromium >/dev/null && ! command -v chromium-browser >/dev/null && [ -z "$CHROME_PATH" ] && [ ! -d "/Applications/Google Chrome.app" ]; then
  echo "MISSING: Chrome/Chromium  ->  install Chrome or set CHROME_PATH=/path/to/chrome"; MISSING=1; fi
[ -z "$MISSING" ] || exit 1
node -e 'process.exit(+process.versions.node.split(".")[0] >= 22 ? 0 : 1)' || { echo "Node 22+ required (found $(node -v))"; exit 1; }

echo "== Python voice dependencies (.venv)"
[ -d .venv ] || python3 -m venv .venv
PY=.venv/bin/python; [ -x "$PY" ] || PY=.venv/Scripts/python.exe
"$PY" -m pip install --quiet --upgrade pip
"$PY" -m pip install --quiet -r requirements.txt

if [ "$1" != "--no-model" ]; then
  echo "== Kokoro model files -> ~/.cache/hyperframes (skipped if present)"
  "$PY" - <<'PYEOF'
import importlib.util, os, sys
sys.path.insert(0, "engine"); import kokoro_tts as k
k.ensure(k.MODEL, "kokoro-v1.0.onnx"); k.ensure(k.VOICES, "voices-v1.0.bin"); print("model ready")
PYEOF
fi
echo "== Done. Try:  node build.mjs --voice mock   (instant)   |   node build.mjs --render   (real voice + video)"
