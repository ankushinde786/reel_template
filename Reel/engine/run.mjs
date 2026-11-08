// Executes code / shell snippets so the output on screen is REAL. Everything runs in a throw-away scratch folder.
//   runCode({ lang, files:[{name, code}], entry, timeoutSec })  -> { ok, stdout, stderr }
//   runShell({ setup:[...], cmds:[...], timeoutSec })           -> [{ out, ok }]   (one shell session, so `cd` carries over)
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

function scratch() { return mkdtempSync(join(tmpdir(), "reelkit-run-")); }
const sh = (cmd, cwd, timeoutSec, extraEnv = {}) =>
  spawnSync("bash", ["-c", cmd], { cwd, encoding: "utf8", timeout: timeoutSec * 1000, maxBuffer: 1 << 24, env: { ...process.env, LC_ALL: "C.UTF-8", TERM: "dumb", NO_COLOR: "1", ...extraEnv } });

export function runCode({ lang, files, entry, timeoutSec = 20 }) {
  if (!lang?.run) return null;
  const dir = scratch();
  try {
    for (const f of files) { const p = join(dir, f.name); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, f.code); }
    const q = (s) => `'${s.replaceAll("'", "'\\''")}'`;           // shell-quote; '/tmp/x'/prog is still one valid word
    const cmd = lang.run.replaceAll("{file}", q(join(dir, entry))).replaceAll("{dir}", q(dir));
    const r = sh(cmd, dir, timeoutSec);
    if (r.error?.code === "ENOENT" || (r.status === 127 && /not found/.test(r.stderr || ""))) return { ok: false, stdout: "", stderr: `runner not found: ${lang.run.split(" ")[0]}`, missing: true };
    return { ok: r.status === 0, stdout: r.stdout || "", stderr: r.stderr || "", timedOut: r.error?.code === "ETIMEDOUT" };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

/** Runs setup + the commands marked for running in ONE bash session. cmds: [{ cmd, run }]. Returns one result per cmd (null where run is falsy). */
export function runShell({ setup = [], cmds, timeoutSec = 20 }) {
  const dir = scratch();
  try {
    const mark = (i) => `__REEL_MARK_${i}__`;
    let script = "set +e\nexport PS1=''\n" + setup.join("\n") + "\n";
    cmds.forEach((c, i) => { script += `echo ${mark(i)}\n${c.run ? c.cmd + " 2>&1" : ":"}\n`; });
    script += `echo ${mark(cmds.length)}\n`;
    const r = sh(script, dir, timeoutSec, { HOME: dir });
    const text = (r.stdout || "") + (r.stderr ? "\n" + r.stderr : "");
    const res = cmds.map((c, i) => {
      if (!c.run) return null;
      const a = text.indexOf(mark(i) + "\n"), b = text.indexOf(mark(i + 1) + "\n", a);
      const body = a < 0 ? "" : text.slice(a + mark(i).length + 1, b < 0 ? undefined : b);
      return { out: body.replace(/\n$/, "").split("\n").filter((l, k, arr) => l !== "" || k < arr.length - 1 || arr.length > 1) };
    });
    return res;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

/** stdout/stderr -> [{ text, err? }] limited to the last `max` lines */
export function toLines(r, max, warn = () => {}) {
  if (!r) return [];
  let out = (r.stdout || "").replace(/\s+$/, "").split("\n").filter((l, i, a) => l || a.length > 1).map((text) => ({ text }));
  if (out.length === 1 && out[0].text === "") out = [];
  if (!r.ok && (r.stderr || "").trim()) out.push({ text: r.stderr.trim().split("\n").at(-1), err: true });
  if (out.length > max) { warn(`prints ${out.length} lines; showing the last ${max}`); out = out.slice(-max); }
  return out;
}
