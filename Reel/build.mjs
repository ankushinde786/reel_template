// ─────────────────────────────────────────────────────────────────────────────
//  THE ONLY FILE YOU CHANGE PER VIDEO.  Describe the topic; the kit does the rest:
//  runs your code for real, writes the voiceover (Kokoro), times the scenes to the voice,
//  adds sound effects, builds captions + SRT, and renders the thumbnail in your chosen style.
//
//    node build.mjs                     build everything (HTML, SRT, voice, thumbnail)
//    node build.mjs --render            ...and render the final MP4 with sound
//    node build.mjs --thumb neon        pick a thumbnail template (or --thumb all to preview all 15)
//    node build.mjs --voice-name am_adam --voice-speed 1.1
//    node build.mjs --voice mock        placeholder voice (no TTS install needed) | --voice off
//  Global defaults live in reel.config.json.
// ─────────────────────────────────────────────────────────────────────────────
import { buildReel } from "./engine/index.mjs";

const steps = [
  { name: "append", desc: "Adds an item at the end",
    code: ['fruits = ["apple", "banana"]', 'fruits.append("cherry")', "print(fruits)"],
    before: ['"apple"', '"banana"'], after: ['"apple"', '"banana"', '"cherry"'], aCls: { 2: "new" },
    cap: ["append() adds an item", "at the end of the list."],
    say: "The append method adds one item at the end of the list." },
  { name: "clear", desc: "Removes all items",
    code: ['fruits = ["apple", "banana"]', "fruits.clear()", "print(fruits)"],
    before: ['"apple"', '"banana"'], bCls: { 0: "del", 1: "del" }, after: ["empty"], aCls: { 0: "ghost" },
    cap: ["clear() removes", "every item from the list."],
    say: "The clear method removes every item, and leaves an empty list." },
  { name: "copy", desc: "Returns a copy of the list",
    code: ["a = [1, 2, 3]", "b = a.copy()", "print(b, a is b)"], bLabel: "a", aLabel: "b  (a new list)",
    before: ["1", "2", "3"], after: ["1", "2", "3"], aCls: { 0: "new", 1: "new", 2: "new" },
    cap: ["copy() makes a new list", "with the same items."],
    say: "The copy method makes a brand new list with the same items. Notice, a is b prints False." },
  { name: "count", desc: "Counts items with a given value",
    code: ["nums = [1, 2, 2, 3, 2]", "n = nums.count(2)", "print(n)"],
    before: ["1", "2", "2", "3", "2"], bCls: { 1: "hit", 2: "hit", 4: "hit" }, res: ["nums.count(2)", "3"],
    cap: ["count() tells how many times", "a value appears."],
    say: "The count method tells you how many times a value appears. Here, two shows up three times." },
  { name: "extend", desc: "Adds items of another list at the end",
    code: ["a = [1, 2]", "a.extend([3, 4])", "print(a)"],
    before: ["1", "2"], after: ["1", "2", "3", "4"], aCls: { 2: "new", 3: "new" },
    cap: ["extend() adds all items", "from another list."],
    say: "The extend method adds every item from another list, at the end." },
  { name: "index", desc: "Index of the first matching item",
    code: ['fruits = ["kiwi", "fig", "plum"]', 'i = fruits.index("plum")', "print(i)"],
    before: ['"kiwi"', '"fig"', '"plum"'], bCls: { 2: "hit" }, res: ['fruits.index("plum")', "2"],
    cap: ["index() finds the position", "of the first match."],
    say: "The index method returns the position of the first match. Plum is at index two." },
  { name: "insert", desc: "Adds an item at a given position",
    code: ['fruits = ["kiwi", "plum"]', 'fruits.insert(1, "fig")', "print(fruits)"],
    before: ['"kiwi"', '"plum"'], after: ['"kiwi"', '"fig"', '"plum"'], aCls: { 1: "new" },
    cap: ["insert() puts an item", "at any position you choose."],
    say: "The insert method puts an item at any position you choose. Fig goes in at index one." },
  { name: "pop", desc: "Removes and returns the item at a position",
    code: ['fruits = ["kiwi", "fig", "plum"]', "x = fruits.pop(1)", "print(x, fruits)"],
    before: ['"kiwi"', '"fig"', '"plum"'], bCls: { 1: "del" }, after: ['"kiwi"', '"plum"'],
    cap: ["pop() removes and returns", "the item at that position."],
    say: "The pop method removes the item at a position, and gives it back to you." },
  { name: "remove", desc: "Removes the first matching item",
    code: ['fruits = ["kiwi", "fig", "plum"]', 'fruits.remove("fig")', "print(fruits)"],
    before: ['"kiwi"', '"fig"', '"plum"'], bCls: { 1: "del" }, after: ['"kiwi"', '"plum"'],
    cap: ["remove() deletes the first", "item with that value."],
    say: "The remove method deletes the first item that has that value." },
  { name: "reverse", desc: "Reverses the order of the list",
    code: ["nums = [1, 2, 3, 4]", "nums.reverse()", "print(nums)"],
    before: ["1", "2", "3", "4"], after: ["4", "3", "2", "1"], aCls: { 0: "new", 1: "new", 2: "new", 3: "new" },
    cap: ["reverse() flips the order", "of the list."],
    say: "The reverse method flips the order of the list, in place." },
  { name: "sort", desc: "Sorts the list in place",
    code: ["nums = [3, 1, 4, 2]", "nums.sort()", "print(nums)"],
    before: ["3", "1", "4", "2"], after: ["1", "2", "3", "4"], aCls: { 0: "new", 1: "new", 2: "new", 3: "new" },
    cap: ["sort() orders the list", "from smallest to largest."],
    say: "The sort method orders the list from smallest to largest." },
];

buildReel({
  id: "list-methods",
  title: "Python List Methods",
  lang: "Python", subject: "list", subjectPlural: "lists", countLabel: "methods",
  file: "list_methods.py",
  stepLabel: "METHOD",
  intro: { cap: ["11 Python list methods,", "explained with code."],
           say: "Eleven Python list methods, explained with code. Let's go one by one." },
  steps,
  outro: { cap: ["Save this cheat sheet", "and follow for more Python!"],
           say: "That's all eleven list methods. Save this cheat sheet, and follow Coding Archives for more Python!" },

  // ── thumbnail data (used by whichever template you pick; every template says "Coding Archives") ──
  thumb: {
    short: "list.py",
    code: { lines: ['fruits = ["apple", "banana"]', 'fruits.append("cherry")', "print(fruits)"], hi: 1, out: "['apple', 'banana', 'cherry']" },
    demo: { before: ["1", "2", "3"], call: "list.append(4)", after: ["1", "2", "3", "4"], hi: [3] },
    quiz: { q: "[1, 2, 3].pop() returns?", options: ["1", "3", "[1, 2]", "Error"] },
    exam: { qs: ["append() or extend()?", "pop() or remove()?", "sort() or reverse()?", "copy() or just = ?"] },
    bug: { file: "list_bug.py", lines: ["nums = [1, 2, 3]", "nums.add(4)", "print(nums)"], bad: 1, word: "add",
           error: ["AttributeError:", "'list' object has no attribute 'add'"] },
    versus: {
      a: { name: "append()", desc: "adds one item", setup: "a = [1, 2]", code: "a.append([3, 4])", resLabel: "a is now", result: "[1, 2, [3, 4]]" },
      b: { name: "extend()", desc: "adds each item", setup: "a = [1, 2]", code: "a.extend([3, 4])", resLabel: "a is now", result: "[1, 2, 3, 4]" },
    },
  },
});
