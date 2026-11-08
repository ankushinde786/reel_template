# Coding Archives Reel Kit  v2 — one engine, many kinds of reel

Write **one file per video** (`build.mjs`: the content). Everything about *how it looks and sounds* lives in **`reel.config.json`** (one file, global flags). Voiceover, SFX, captions, SRT, thumbnail and MP4 are generated.

```bash
bash setup.sh                       # once: .venv + kokoro-onnx + model
node build.mjs                      # HTML, SRT, voice, thumbnail
node build.mjs --render             # + final MP4
node examples/terminal.build.mjs --voice mock     # try any example without the TTS install
```

## 1. Pick the kind of reel (global flags)
`reel.config.json -> reel`  |  CLI `--type walkthrough`  |  env `REEL_TYPE`  |  or `type:` inside build.mjs. Precedence: CLI > env > build.mjs > config file.

| `type` | What it is | Default scene | Example |
|---|---|---|---|
| `methods` | the original: 3 code lines + before/after row + terminal (cheat sheets) | `method` | `build.mjs` |
| `code` | any code (up to 16 lines) + real output, optional line-by-line notes | `code` | |
| `concept` | cards that explain an idea + code example | `concept` | `examples/concept.build.mjs` |
| `compare` | A vs B (code panels, or a feature table) | `compare` | `examples/compare.build.mjs` |
| `tips` | "instead of this, use that" | `tip` | `examples/javascript.build.mjs` |
| `walkthrough` | LONG code: file tabs, scroll bars, highlighted ranges, breadcrumb, terminal | `walkthrough` | `examples/walkthrough.build.mjs` |
| `flowchart` / `blocks` | auto-laid-out diagrams, loops, animated trace | `flow` / `blocks` | `examples/flowchart.build.mjs` |
| `terminal` | Linux/shell: typed commands, real output, command anatomy chips | `terminal` | `examples/terminal.build.mjs` |
| `mixed` | set `type` on every step | – | `examples/compare.build.mjs` |

**Every step can set its own `type`**, so one reel can mix a concept card, a flowchart, a comparison and a terminal. The reel `type` only sets defaults (scene type, layout, intro/outro style, labels). Add your own preset in `reelTypes`.

Captions: `captions.mode` = `speech` (default: on-screen text shows everything the voice says, in short phrases timed to the voice) or `cap` (only your `cap:[..]` lines). No fixed limits: any number of steps (14+ switch to the list card), any number of code lines in `code`/`concept` (font shrinks; use `walkthrough` to scroll long files). Only the original `method` scene stays at 3 code lines.

Other global switches: `--lang javascript` (key of `languages`), `--theme dracula` (key of `themes`: vscode-dark, one-dark, dracula, midnight), `--layout tall|classic`, `--captions off`, and **`--set any.config.key=value`** (repeatable) for anything else, e.g. `--set typing.cps=0.03 --set walkthrough.fontSize=26 --set diagram.maxScale=1`.

## 2. Languages
`languages` in the config: label, file extension, highlighter grammar, tab-icon colour, status-bar text, and **`run`** (the command that executes the snippet so output is real; `null` = give `out:[...]` yourself), plus `prompt`. Included: python, javascript, typescript, bash, java, c, cpp, go, rust, sql, json. Add one by copying a block. A step may use another language with `lang: "bash"`.

## 3. Scene types (fields)
Common: `name, title, desc, cap:[line1,line2], say, type, lang, recap`. `say` is plain speech. Scenes that have several narrated parts (`beats`, `points`, `notes`, `cmds`, `a/b`) get **one voice clip per part** when every part has its own `say`; otherwise the scene `say` is spread over them.

* **method** – `code[<=3], before[], after[] | res:[label,value], bCls/aCls, error, out`
* **code** – `code[], hi[], notes:[text | {text, say}], out | out:false, run:false, error`
* **concept** – `points:[text | {h, t, icon}], code[] (example), out`
* **compare** – panels: `a:{label,code[],tone,out}, b:{...}, verdict` · table: `rows:[[feature,a,b]], heads:[A,B]` (values may start `+ ` check / `- ` cross)
* **tip** – like compare, defaults to bad (a) / good (b); `why` = verdict
* **walkthrough** – `files:[{name,code}], entry, beats:[{file, lines:[from,to], fn, note, cap, say, run:true | out:[..]}]`
* **flow / blocks** – `nodes:["id: Text" | {id,t,shape,tone,sub,code}], edges:["a -> b: label"] | chain:["A","B"], dir, beats:[{show,hl,note,say}], trace:[ids], code[]`; shapes `box pill decision io circle code`
* **terminal** – `cmds:[{cmd | parts:[[token, meaning],...], out:[..] | run:true, say}], setup:[bash], shell:{user,host,cwd}`; output colour markup `{g|green} {r|red} {y|yellow} {b|blue} {c|cyan} {m|magenta} {d|dim}`
* intro/outro: `intro:{style:"grid"|"card", chip,title,sub,cap,say}` (`intro:false` removes it); the reel type picks the style.

Running code: every snippet runs in a throw-away folder. `run:false` or `out:[..]` skips it. Shell commands only run when you set `run:true` on that command (and the sandbox user/dates then appear in the output; give `out` yourself for a clean look).

## 4. Add your own scene type
Create `engine/scenes/<name>.mjs` exporting `{ type, normalize?, segments, prepare?, build(scene, c), css? }` and add it to `engine/scenes/index.mjs`. `_kit.mjs` has headers, typed code panels, terminal output, scroll bars. `c` gives timing (`c.at`), tweens (`c.FT/c.T`), sounds (`c.S`), geometry (`c.G`), theme, config.

## 5. Everything else (unchanged from v1)
Voice (Kokoro), SFX volumes, logo, watermark, thumbnail templates and end card work with every reel type; see the sections below.

---


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
