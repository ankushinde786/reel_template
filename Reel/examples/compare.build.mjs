// Comparison + tips reel: panels (real code, real output) and a feature table.   node examples/compare.build.mjs --voice mock
import { buildReel } from "../engine/index.mjs";
buildReel({
  id: "ex-compare", type: "mixed", title: "List vs Tuple", subject: "list", countLabel: "differences", layout: "tall",
  intro: { style: "card", cap: ["List vs tuple,", "what is the difference?"], say: "List versus tuple. What is the difference?" },
  steps: [
    { type: "compare", name: "Changing", title: "Can you change it?", desc: "Mutable vs immutable",
      a: { label: "list", tone: "good", code: ["a = [1, 2, 3]", "a[0] = 99", "print(a)"] },
      b: { label: "tuple", tone: "bad", error: true, code: ["t = (1, 2, 3)", "t[0] = 99"] },
      verdict: "Lists change. Tuples do not.",
      cap: ["Lists can be changed.", "Tuples cannot."], say: "You can change a list in place, but a tuple will raise an error." },
    { type: "compare", name: "Table", title: "Quick facts", rows: [["Brackets", "[ ]", "( )"], ["Mutable", "+ yes", "- no"], ["Speed", "slower", "faster"], ["Dict key", "- no", "+ yes"]],
      heads: ["list", "tuple"], verdict: "Pick a tuple when it should not change.", cap: ["Quick facts,", "side by side."], say: "Here are the quick facts, side by side." },
    { type: "tip", name: "Enumerate", title: "Loop with the index", desc: "Stop using range(len())",
      a: { code: ["names = ['a', 'b']", "for i in range(len(names)):", "    print(i, names[i])"] },
      b: { code: ["names = ['a', 'b']", "for i, n in enumerate(names):", "    print(i, n)"] },
      verdict: "enumerate() gives index and item together.",
      cap: ["Use enumerate()", "instead of range(len())."], say: "Use enumerate instead of range of len. It gives you the index and the item together." },
  ],
  outro: { cap: ["Follow Coding Archives", "for more Python!"], say: "Follow Coding Archives for more Python!" },
});
