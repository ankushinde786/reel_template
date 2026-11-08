// Flowchart + block diagram reel: auto layout, loop edges, animated trace, code card.   node examples/flowchart.build.mjs --voice mock
import { buildReel } from "../engine/index.mjs";
buildReel({
  id: "ex-flow", type: "flowchart", title: "How Loops Think", countLabel: "diagrams",
  intro: { cap: ["How loops think,", "as a flowchart."], say: "How a loop thinks, drawn as a flowchart." },
  steps: [
    { type: "flow", name: "If else", title: "if / else", desc: "A decision, two paths",
      nodes: ["start: Start", "in: Read age", "d: age >= 18?", "y: Print Adult", "n: Print Minor", "end: End"],
      edges: ["start -> in", "in -> d", "d -> y: Yes", "d -> n: No", "y -> end", "n -> end"],
      trace: ["start", "in", "d", "y", "end"],
      code: ["age = 20", 'print("Adult" if age >= 18 else "Minor")'],
      cap: ["An if statement picks", "one of two paths."], say: "An if statement checks a condition, then takes one of two paths." },
    { type: "flow", name: "While", title: "while loop", desc: "Repeat until the test fails",
      nodes: ["s: Start", "i: i = 0", "t: i < 3?", "p: print(i)", "inc: i = i + 1", "e: End"],
      edges: ["s -> i", "i -> t", "t -> p: Yes", "p -> inc", "inc -> t", "t -> e: No"],
      trace: ["s", "i", "t", "p", "inc", "t", "p", "inc", "t", "e"],
      cap: ["The loop goes back", "to the test each time."], say: "After each pass, the loop goes back to the test. When the test fails, it exits." },
    { type: "blocks", name: "Pipeline", title: "A function is a machine", desc: "Input, process, output",
      nodes: ["a: Input|x = 4", { id: "b", t: "square(x)", sub: "x * x", tone: "accent" }, "c: Output|16"],
      chain: undefined, edges: ["a -> b", "b -> c"],
      beats: [{ show: 1, note: "Values go in", say: "Values go in." }, { show: 1, note: "The function works on them", say: "The function works on them." }, { show: 1, note: "A result comes out", say: "And a result comes out." }],
      cap: ["Input, process,", "output."] },
  ],
  outro: { cap: ["Follow Coding Archives", "for more!"], say: "Follow Coding Archives for more!" },
});
