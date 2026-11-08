// Multi-language syntax highlighter. highlight(lines, syntax, extraKeywords) -> one HTML string per line.
// Token classes (colours come from the theme): k keyword  s string  n number  f function/call  v name  o operator/punctuation
//                                               c comment  t type/class  fl shell flag  d decorator
// State (multi-line strings / block comments) is carried across lines, so long listings colour correctly.
import { esc } from "./util.mjs";

const W = (s) => new Set(s.split(/\s+/).filter(Boolean));
const GRAMMARS = {
  python: {
    kw: W("False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case self cls"),
    line: ["#"], triple: ['"""', "'''"], str: ['"', "'"], deco: true,
  },
  javascript: {
    kw: W("abstract as async await break case catch class const continue debugger declare default delete do else enum export extends false finally for from function get if implements import in instanceof interface let new null of private protected public readonly return set static super switch this throw true try type typeof undefined var void while with yield"),
    line: ["//"], block: [["/*", "*/"]], str: ['"', "'", "`"], deco: true,
  },
  java: {
    kw: W("abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for if implements import instanceof int interface long native new null package private protected public return short static strictfp super switch synchronized this throw throws transient true false try var void volatile while record"),
    line: ["//"], block: [["/*", "*/"]], str: ['"', "'"], deco: true,
  },
  c: {
    kw: W("auto break case char const continue default do double else enum extern float for goto if inline int long register return short signed sizeof static struct switch typedef union unsigned void volatile while class public private protected namespace using template typename new delete nullptr true false bool this virtual override"),
    line: ["//"], block: [["/*", "*/"]], str: ['"', "'"], pre: "#",
  },
  go: {
    kw: W("break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var true false nil"),
    line: ["//"], block: [["/*", "*/"]], str: ['"', "'", "`"],
  },
  rust: {
    kw: W("as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while"),
    line: ["//"], block: [["/*", "*/"]], str: ['"'],
  },
  sql: {
    ci: true,
    kw: W("select from where group by order having join inner left right outer full cross on as and or not in is null like between exists distinct limit offset union all insert into values update set delete create table alter drop index view primary key foreign references default constraint unique check case when then else end count sum avg min max asc desc with"),
    line: ["--"], block: [["/*", "*/"]], str: ["'", '"'],
  },
  json: { kw: W("true false null"), str: ['"'], json: true },
  bash: {
    kw: W("if then else elif fi for while until do done case esac in function select time return exit break continue export local readonly declare source alias unset"),
    line: ["#"], str: ['"', "'"], shell: true,
  },
  generic: { kw: new Set(), line: ["//", "#"], block: [["/*", "*/"]], str: ['"', "'", "`"] },
};

const NUM = /^(?:0[xX][0-9a-fA-F_]+|0[bB][01_]+|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?)/;
const IDENT = /^[A-Za-z_$][\w$]*/;
const SHELL_WORD = /^[^\s"'|&;<>()$`#]+/;

export function grammarFor(syntax) { return GRAMMARS[syntax] || GRAMMARS.generic; }

export function highlight(lines, syntax = "generic", extraKeywords = []) {
  const g = grammarFor(syntax), extra = new Set((extraKeywords || []).map((k) => (g.ci ? k.toLowerCase() : k)));
  let st = null;                                              // { end, cls } while inside a multi-line construct
  return lines.map((line) => {
    const out = [], push = (c, t) => out.push(c ? `<span class="${c}">${esc(t)}</span>` : esc(t));
    let i = 0, cmdPos = true;
    if (st) {
      const j = line.indexOf(st.end);
      if (j < 0) { push(st.cls, line); return out.join(""); }
      push(st.cls, line.slice(0, j + st.end.length)); i = j + st.end.length; st = null;
    }
    while (i < line.length) {
      const rest = line.slice(i), ch = line[i];
      if (/\s/.test(ch)) { const m = /^\s+/.exec(rest)[0]; push("", m); i += m.length; continue; }

      if (g.pre && ch === "#" && /^\s*$/.test(line.slice(0, i))) { push("d", rest); break; }                              // C preprocessor line
      const lc = g.line?.find((m) => rest.startsWith(m) && (!g.shell || i === 0 || /\s/.test(line[i - 1])));
      if (lc) { push("c", rest); break; }
      const bc = g.block?.find(([o]) => rest.startsWith(o));
      if (bc) { const j = rest.indexOf(bc[1], bc[0].length); if (j < 0) { push("c", rest); st = { end: bc[1], cls: "c" }; break; } push("c", rest.slice(0, j + bc[1].length)); i += j + bc[1].length; continue; }
      const tq = g.triple?.find((m) => rest.startsWith(m));
      if (tq) { const j = rest.indexOf(tq, 3); if (j < 0) { push("s", rest); st = { end: tq, cls: "s" }; break; } push("s", rest.slice(0, j + 3)); i += j + 3; continue; }
      if (g.str?.includes(ch)) {
        let j = 1; while (j < rest.length && rest[j] !== ch) j += rest[j] === "\\" ? 2 : 1;
        const s = rest.slice(0, Math.min(j + 1, rest.length));
        const isKey = g.json && /^\s*:/.test(rest.slice(s.length));
        push(isKey ? "v" : "s", s); i += s.length;
        if (ch === "`" && j >= rest.length) st = { end: "`", cls: "s" };
        cmdPos = false; continue;
      }
      if (g.deco && ch === "@" && IDENT.test(rest.slice(1))) { const m = /^@[\w.]+/.exec(rest)[0]; push("d", m); i += m.length; continue; }

      if (g.shell) {
        if (ch === "$") { const m = /^\$(?:\{[^}]*\}|\(|[\w@#?*!$-]+)/.exec(rest)?.[0] || "$"; push("v", m); i += m.length; cmdPos = m === "$(" ? true : cmdPos; continue; }
        if ("|&;".includes(ch)) { const m = /^(?:\|\||&&|\||;|&)/.exec(rest)[0]; push("o", m); i += m.length; cmdPos = m !== "&"; continue; }
        if ("<>".includes(ch)) { const m = /^(?:>>|2>&1|2>|<|>)/.exec(rest)?.[0] || ch; push("o", m); i += m.length; continue; }
        if ("()".includes(ch) || "`".includes(ch)) { push("o", ch); i++; cmdPos = ch !== ")"; continue; }
        if (/^\d+(?=\s|$)/.test(rest) && !cmdPos) { const m = /^\d+/.exec(rest)[0]; push("n", m); i += m.length; continue; }
        const w = SHELL_WORD.exec(rest)?.[0] || ch;
        const key = w;
        if (cmdPos && g.kw.has(key)) { push("k", w); }
        else if (g.kw.has(key)) { push("k", w); }
        else if (cmdPos && !w.includes("=")) { push("f", w); cmdPos = false; }
        else if (/^--?[A-Za-z][\w-]*/.test(w)) { push("fl", w); }
        else if (/^[A-Za-z_]\w*=/.test(w)) { const eq = w.indexOf("="); push("v", w.slice(0, eq)); push("o", "="); push("s", w.slice(eq + 1)); }
        else push("o", w);
        if (g.kw.has(key) && ["then", "do", "else", "elif", "if", "while", "until"].includes(key)) cmdPos = true;
        i += w.length; continue;
      }

      const nm = NUM.exec(rest);
      if (nm && !/[\w$]/.test(line[i - 1] || "")) { push("n", nm[0]); i += nm[0].length; continue; }
      const id = IDENT.exec(rest);
      if (id) {
        const w = id[0], key = g.ci ? w.toLowerCase() : w, after = rest.slice(w.length), prev = line.slice(0, i).trimEnd();
        let cls;
        if (g.kw.has(key) || extra.has(key)) cls = "k";
        else if (/^\s*\(/.test(after)) cls = /^[A-Z]/.test(w) && !/(?:def|function|func|fn)$/.test(prev) ? "t" : "f";
        else if (/(?:^|\s)(?:class|struct|interface|enum|trait|type|new|extends|implements)$/.test(prev) || /^[A-Z][A-Za-z0-9]*$/.test(w) && w.length > 1 && !/^[A-Z0-9_]+$/.test(w)) cls = "t";
        else cls = "v";
        push(cls, w); i += w.length; continue;
      }
      push("o", ch); i++;
    }
    return out.join("");
  });
}

/** one line -> html (compat helper) */
export const hline = (line, syntax, extra) => highlight([line], syntax, extra)[0];
