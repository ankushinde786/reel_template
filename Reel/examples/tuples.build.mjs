// Example: a second topic, to show nothing in the engine is list-specific.
//   node examples/tuples.build.mjs --voice mock --thumb neon
import { buildReel } from "../engine/index.mjs";

const T = '("red", "green", "blue")';
buildReel({
  id: "python-tuples",
  title: "Python Tuples Explained",
  lang: "Python", subject: "tuple", subjectPlural: "tuples", countLabel: "ideas",
  file: "tuples.py", stepLabel: "IDEA", brackets: ["(", ")"],
  intro: { cap: ["Python tuples,", "explained in six steps."], say: "Python tuples, explained in six quick steps." },
  steps: [
    { name: "create", pill: "(1, 2, 3)", title: "t = (1, 2, 3)", desc: "A fixed group of values",
      code: [`colors = ${T}`, "print(colors)", "print(len(colors))"],
      before: ['"red"', '"green"', '"blue"'], res: ["len(colors)", "3"],
      cap: ["A tuple is a fixed", "group of values."], say: "A tuple is a fixed group of values, written in round brackets." },
    { name: "index", pill: "t[0]", title: "t[0]  t[-1]", desc: "Read by position",
      code: [`colors = ${T}`, "print(colors[0])", "print(colors[-1])"],
      before: ['"red"', '"green"', '"blue"'], bCls: { 0: "hit", 2: "hit" }, res: ["colors[0], colors[-1]", "red, blue"],
      cap: ["Read items by position,", "negative counts from the end."], say: "Read items by position. Negative numbers count from the end." },
    { name: "slice", pill: "t[1:4]", title: "t[1:4]", desc: "A piece of the tuple",
      code: ["t = (1, 2, 3, 4, 5)", "s = t[1:4]", "print(s)"],
      before: ["1", "2", "3", "4", "5"], bCls: { 1: "hit", 2: "hit", 3: "hit" }, after: ["2", "3", "4"], aCls: { 0: "new", 1: "new", 2: "new" },
      cap: ["A slice gives you", "a new, smaller tuple."], say: "A slice gives you a new, smaller tuple." },
    { name: "count", pill: "t.count()", title: "t.count(2)", desc: "How many times a value appears",
      code: ["nums = (1, 2, 2, 3, 2)", "n = nums.count(2)", "print(n)"],
      before: ["1", "2", "2", "3", "2"], bCls: { 1: "hit", 2: "hit", 4: "hit" }, res: ["nums.count(2)", "3"],
      cap: ["count() tells how many times", "a value appears."], say: "The count method tells how many times a value appears." },
    { name: "unpack", pill: "a, b = t", title: "x, y = point", desc: "Split into variables",
      code: ["point = (10, 20)", "x, y = point", "print(x, y)"],
      before: ["10", "20"], after: ["x = 10", "y = 20"], aCls: { 0: "new", 1: "new" }, aLabel: "variables",
      cap: ["Unpacking splits a tuple", "into separate variables."], say: "Unpacking splits a tuple into separate variables." },
    { name: "immutable", pill: "no changes", title: "t[0] = x", desc: "Tuples cannot be changed", error: true,
      code: ['colors = ("red", "green")', 'colors[0] = "pink"', "print(colors)"],
      before: ['"red"', '"green"'], bCls: { 0: "del" }, res: ["colors[0] = 'pink'", "TypeError"],
      cap: ["Tuples are immutable:", "you cannot change them."], say: "Tuples are immutable. You cannot change them after they are created." },
  ],
  outro: { title: "Tuples in one place", cap: ["Save this cheat sheet", "and follow for more Python!"],
           say: "That's tuples. Save this cheat sheet, and follow Coding Archives for more Python!" },
  thumb: {
    short: "tuple.py", word: "TUPLE", word2: "BASICS", countLine: "Python tuples", countQ: ["How many facts", "do you know?"],
    code: { lines: ['colors = ("red", "green")', "print(colors[0])", "print(len(colors))"], hi: 1, out: "red" },
    demo: { before: ["1", "2", "3"], call: "t = t + (4,)", after: ["1", "2", "3", "4"], hi: [3] },
    quiz: { q: "(1, 2, 3)[-1] returns?", options: ["1", "3", "(3,)", "Error"] },
    exam: { qs: ["tuple or list?", "t[0] = 5 works?", "(1) or (1,)?", "unpacking order?"], score: "?/6" },
    bug: { file: "tuple_bug.py", lines: ["t = (1, 2, 3)", "t[0] = 9", "print(t)"], bad: 1, word: "t[0]", error: ["TypeError:", "'tuple' object does not support item assignment"] },
    versus: {
      a: { name: "list", desc: "can change", setup: "a = [1, 2]", code: "a[0] = 9", resLabel: "a is now", result: "[9, 2]" },
      b: { name: "tuple", desc: "cannot change", setup: "a = (1, 2)", code: "a[0] = 9", resLabel: "result", result: "TypeError" },
    },
  },
});
