// Concept reel: explain an idea with cards, then a real code example.   node examples/concept.build.mjs --voice mock
import { buildReel } from "../engine/index.mjs";
buildReel({
  id: "ex-concept", type: "concept", title: "Python Variables", subject: "variable", countLabel: "ideas",
  intro: { cap: ["Python variables,", "explained simply."], say: "Python variables, explained simply." },
  steps: [
    { name: "Names", title: "A variable is a name", desc: "A label that points to a value",
      points: [{ h: "Not a box", t: "A variable does not hold the value. It points to it." },
               { h: "Created by assignment", t: "Write a name, an equals sign, and a value." },
               { h: "No type needed", t: "Python works out the type from the value." }],
      code: ["age = 21", 'name = "Asha"', "print(name, age)"],
      cap: ["A variable is a name", "that points to a value."], say: "A variable is just a name that points to a value. You create one with an equals sign." },
    { name: "Reassign", title: "Names can move", desc: "Same name, new value",
      points: ["Assigning again points the name somewhere new.", { h: "Types can change", t: "The name does not care what it points to." }],
      code: ["x = 10", 'x = "ten"', "print(type(x))"],
      cap: ["Reassign a name", "to point somewhere new."], say: "Assign again, and the name points somewhere new, even to a different type." },
  ],
  outro: { cap: ["Follow Coding Archives", "for more Python!"], say: "That's variables. Follow Coding Archives for more Python!" },
});
