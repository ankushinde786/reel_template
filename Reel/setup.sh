#!/usr/bin/env bash
# One-time setup. Safe to re-run.   bash setup.sh [--no-model]
# Installs system deps (ffmpeg, Chromium, Python 3.12), creates ./.venv, installs Python deps, and downloads Kokoro TTS models.
set -e
cd "$(dirname "$0")"

# Use sudo if available and not running as root
SUDO=""
if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then
  SUDO="sudo"
fi

# 1. Check Node 22+
if ! command -v node >/dev/null 2>&1; then
  echo "MISSING: node -> install Node 22+ (https://nodejs.org)"
  exit 1
fi
node -e 'process.exit(+process.versions.node.split(".")[0] >= 22 ? 0 : 1)' || {
  echo "Node 22+ required (found $(node -v))"
  exit 1
}

# 2. Check or auto-install ffmpeg
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "== Installing ffmpeg..."
  if command -v apt-get >/dev/null 2>&1; then
    $SUDO apt-get update -qq && $SUDO apt-get install -y -qq ffmpeg
  elif command -v brew >/dev/null 2>&1; then
    brew install ffmpeg
  else
    echo "MISSING: ffmpeg -> please install ffmpeg manually"
    exit 1
  fi
fi

# 3. Check or auto-install Chrome/Chromium (via Playwright on Linux to avoid Snap issues)
find_chrome() {
  if [ -n "$CHROME_PATH" ] && [ -x "$CHROME_PATH" ]; then
    echo "$CHROME_PATH"
  elif command -v google-chrome >/dev/null 2>&1; then
    command -v google-chrome
  elif command -v chromium >/dev/null 2>&1; then
    command -v chromium
  elif command -v chromium-browser >/dev/null 2>&1; then
    command -v chromium-browser
  elif [ -d "/Applications/Google Chrome.app" ]; then
    echo "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  else
    find "$HOME/.cache/ms-playwright" -name "chrome" -type f 2>/dev/null | head -n 1
  fi
}

DETECTED_CHROME=$(find_chrome)
if [ -z "$DETECTED_CHROME" ]; then
  echo "== Installing Chromium via Playwright..."
  if command -v apt-get >/dev/null 2>&1; then
    npx -y playwright install-deps chromium
  fi
  npx -y playwright install chromium
  DETECTED_CHROME=$(find_chrome)
fi

if [ -z "$DETECTED_CHROME" ]; then
  echo "MISSING: Chrome/Chromium -> install Chrome or set CHROME_PATH=/path/to/chrome"
  exit 1
fi

export CHROME_PATH="$DETECTED_CHROME"
# Persist CHROME_PATH in ~/.bashrc for future terminal sessions if not already saved
if [ -f "$HOME/.bashrc" ] && ! grep -q "export CHROME_PATH=" "$HOME/.bashrc"; then
  echo "export CHROME_PATH=\"$CHROME_PATH\"" >> "$HOME/.bashrc"
fi
echo "== Using Chrome: $CHROME_PATH"

# 4. Find or install a compatible Python (3.10 - 3.13 required for kokoro-onnx)
find_valid_python() {
  for py in python3.12 python3.11 python3.10 python3; do
    if command -v "$py" >/dev/null 2>&1; then
      if "$py" -c 'import sys; exit(0 if (3, 10) <= sys.version_info[:2] <= (3, 13) else 1)' 2>/dev/null; then
        command -v "$py"
        return 0
      fi
    fi
  done
  return 1
}

SYS_PY=$(find_valid_python || true)
if [ -z "$SYS_PY" ]; then
  echo "== Compatible Python (3.10-3.13) not found. Installing Python 3.12..."
  if command -v apt-get >/dev/null 2>&1; then
    $SUDO apt-get update -qq && $SUDO apt-get install -y -qq python3.12 python3.12-venv
    SYS_PY=$(find_valid_python || true)
  fi
fi

if [ -z "$SYS_PY" ]; then
  echo "MISSING: Python 3.10 - 3.13 required (kokoro-onnx does not support Python 3.14+ yet)."
  exit 1
fi
echo "== Using Python: $SYS_PY ($($SYS_PY --version))"

# 5. Create/Verify .venv and install requirements
echo "== Python voice dependencies (.venv)"
if [ -d .venv ]; then
  VENV_PY=".venv/bin/python"
  [ -x "$VENV_PY" ] || VENV_PY=".venv/Scripts/python.exe"
  if ! "$VENV_PY" -c 'import sys; exit(0 if (3, 10) <= sys.version_info[:2] <= (3, 13) else 1)' 2>/dev/null; then
    echo "== Recreating .venv with compatible Python version..."
    rm -rf .venv
  fi
fi

[ -d .venv ] || "$SYS_PY" -m venv .venv
PY=.venv/bin/python; [ -x "$PY" ] || PY=.venv/Scripts/python.exe
"$PY" -m pip install --quiet --upgrade pip
"$PY" -m pip install --quiet -r requirements.txt

# 6. Download Kokoro model files
if [ "$1" != "--no-model" ]; then
  echo "== Kokoro model files -> ~/.cache/hyperframes (skipped if present)"
  "$PY" - <<'PYEOF'
import sys
sys.path.insert(0, "engine")
import kokoro_tts as k
k.ensure(k.MODEL, "kokoro-v1.0.onnx")
k.ensure(k.VOICES, "voices-v1.0.bin")
print("model ready")
PYEOF
fi

echo ""
echo "== Done! Run 'source ~/.bashrc' (once) and try:"
echo "   node build.mjs --voice mock   (instant)"
echo "   node build.mjs --render       (real voice + video)"
