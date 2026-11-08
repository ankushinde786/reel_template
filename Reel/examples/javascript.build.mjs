// Another language: same engine, language flag only.   node examples/javascript.build.mjs --voice mock   (or: node build.mjs --lang javascript)
import { buildReel } from "../engine/index.mjs";
buildReel({
  id: "ex-js", type: "tips", language: "javascript", title: "3 JavaScript Tips", countLabel: "tips",
  steps: [
    { name: "Optional chaining", title: "Optional chaining", desc: "Skip the long && chains",
      a: { code: ["const u = { profile: null };", "console.log(u.profile && u.profile.name);"] },
      b: { code: ["const u = { profile: null };", "console.log(u.profile?.name);"] },
      verdict: "?. stops at null or undefined.", cap: ["Use ?. instead of", "long && chains."], say: "Use optional chaining instead of long and chains." },
    { name: "Spread", title: "Copy with spread", desc: "No mutation surprises",
      a: { code: ["const a = [1, 2];", "const b = a;", "b.push(3);", "console.log(a);"] },
      b: { code: ["const a = [1, 2];", "const b = [...a];", "b.push(3);", "console.log(a);"] },
      verdict: "Spread makes a real copy.", cap: ["Spread copies,", "= only shares."], say: "Spread makes a real copy. Plain assignment only shares the same array." },
  ],
});
