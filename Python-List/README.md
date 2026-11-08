# Coding Archives Reel Kit

Write **one file per video** (`build.mjs`). Everything else is generated:

| Output (in `out/<id>/`) | How |
|---|---|
| `index.html` – HyperFrames composition (9:16, VS Code look, code + real terminal output) | from your steps; every snippet is **actually run** with python3 |
| `narration.txt` + voice WAVs | Kokoro-82M TTS, one clip per scene |
| scene timing | each scene = max(minimum, voice length + padding) – the video follows the voice |
| `captions.srt` + on-screen captions | timed from the scene length |
| sound effects | `assets/sfx/*.wav`, scheduled automatically, global volume flags |
| `thumbnail.png` (1080×1920, says "Coding Archives") | one of **15 templates**, filled from your topic |
| `<id>.mp4` (with `--render`) | built-in Chrome + ffmpeg renderer; mixes voice + SFX |

## Quick start
```bash
bash setup.sh                  # once: .venv + kokoro-onnx + model download (~350 MB)
node build.mjs                 # builds HTML, SRT, voice, thumbnail
node build.mjs --render        # + final MP4 with voice and sound
```
Needs Node 22+, ffmpeg, Chrome/Chromium, Python 3.9+. No npm packages.

## New video = new build.mjs
Copy `build.mjs` (or `examples/tuples.build.mjs`), change the content: `id`, `title`, `lang`, `subject`, `countLabel`, `file`, `steps[]`, `intro/outro`, `thumb`. Run it.

A **step**: `name, desc, code[≤3 lines], before[], after[] | res:[label,value], cap:[line1,line2], say:"narration"`.
Optional: `title` (code-style heading), `pill` (cheat-sheet text), `bCls/aCls` (`hit|del|new|ghost` per cell index), `bLabel/aLabel`, `error:true` (snippet is expected to raise; the error shows in red). Max 11 steps. Write `say` as plain speech (say "append method", not `append()`).

## Flags (CLI > env > `reel.config.json`)
| What | CLI | Env |
|---|---|---|
| Thumbnail template | `--thumb neon` · `--thumb all` · `--thumb off` | `THUMB_STYLE` |
| Voice provider | `--voice kokoro \| mock \| off` | `VOICE_PROVIDER`, `VOICE=0` |
| Voice / speed / volume | `--voice-name am_adam` `--voice-speed 1.1` `--voice-volume 0.8` | `VOICE_NAME` `VOICE_SPEED` `VOICE_VOLUME` |
| All SFX off / master | `--sfx off` · `--sfx-master 0.5` | `SFX=0` `SFX_MASTER` |
| One SFX category | edit `reel.config.json` | `SFX_TYPING=0` or `SFX_TYPING=0.3` (any category) |
| Render video | `--render` | |
| List voices | `--list-voices` | |

Thumbnail styles: `editor blueprint poster terminal cells q_quiz q_exam q_count q_bug q_versus sticky neon swiss levels chalk`.
Voices: 54 (e.g. `af_heart` default, `af_bella`, `am_adam`, `bf_emma`, `bm_george`). Language prefix decides accent (`a`=US, `b`=UK).

## Logo, watermark, thumbnail end card (all in `reel.config.json`)
| Block | Keys | CLI |
|---|---|---|
| `logo` | `enabled, file, anchor, x, y, width, opacity` — logo on the whole video, top-right by default | `--logo off` `--logo-width 240` `--logo-anchor top-left` |
| `watermark` | `enabled, text, anchor, x, y, fontSize, letterSpacing, rotate, opacity, color, tile, tileGapX, tileGapY` — text across the screen | `--watermark off` `--watermark "My Text"` `--watermark-opacity 0.1` |
| `thumbnail.endCard` | `enabled, seconds` — the chosen thumbnail shown full-screen as the last frame(s) | `--end-card off` `--end-card-seconds 1.5` |

`anchor` is one of `top-left top-center top-right center-left center center-right bottom-left bottom-center bottom-right`; `x`/`y` move the item inward from that edge in px (for `center` anchors: +x right, +y down). Frame is 1080×1920. Swap the logo by replacing `assets/logo.png`. `tile: true` repeats the watermark over the whole frame.

## Thumbnail data (`thumb` in build.mjs)
Derived automatically: title, subtitle, "Coding Archives", item list, counts, "Do you really know … ?" question.
Style-specific content you provide (a clear error names the missing key; `--thumb all` skips styles whose data is missing):
`code` (editor) · `demo` (cells, chalk) · `quiz` (q_quiz) · `exam` (q_exam) · `bug` (q_bug) · `versus` (q_versus). Optional: `word`, `word2`, `short`, `question`, `questionSub`, `countLine`, `countQ`, `sub`.
Long text auto-shrinks to fit.

## Voice details
Provider `kokoro` runs `engine/kokoro_tts.py` (same model files as `npx hyperframes tts`, cached in `~/.cache/hyperframes`). It uses the `kokoro-onnx` package when installed (setup.sh does this); otherwise it falls back to onnxruntime + an `espeak-ng` binary. Results are cached in `.cache/voice/`, so re-building is instant unless the narration, voice or speed changes. `mock` makes placeholder tones with realistic timing for layout tests.

## Rendering with HyperFrames instead
`out/<id>/index.html` is a standard HyperFrames composition: `cd out/<id> && npx hyperframes check && npx hyperframes render`. (The built-in renderer exists so the kit works with only Chrome + ffmpeg.)

## Layout
`build.mjs` your topic · `reel.config.json` global flags · `engine/` pipeline (don't edit per video) · `assets/` fonts, GSAP, SFX · `tools/frame.mjs` still-frame preview · `tools/make_sfx.py` regenerates SFX · `examples/` second topic.
