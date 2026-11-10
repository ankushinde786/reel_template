// TYPE: concept — explain ideas with cards that appear one by one, then a real code example.
//   node examples/numpy/3-concept.build.mjs --voice mock
import { buildReel } from "../../engine/index.mjs";

buildReel({
  id: "np-concept", type: "concept", title: "What Is NumPy?", lang: "Python", subject: "numpy", countLabel: "ideas", file: "numpy_ideas.py",
  intro: { cap: ["What is NumPy,", "and why use it?"], say: "What is NumPy, and why should you use it?" },
  steps: [
    { name: "Arrays", title: "The ndarray", desc: "NumPy's one big idea", min: 11,
      points: [{ h: "A grid of numbers", t: "All items share one type, so NumPy can store them tightly." },
               { h: "Any number of dimensions", t: "A line, a table, or a stack of tables." }],
      code: ["import numpy as np", "a = np.array([[1, 2], [3, 4]])", "print(a.ndim, a.size)"],
      cap: ["The ndarray."], say: "The big idea is the n d array. It is a grid of numbers that all share one type, in any number of dimensions." },
    { name: "Fast", title: "Why it is fast", desc: "Loops run in C, not Python", min: 11,
      points: [{ h: "Vectorized math", t: "One operation works on every item at once." },
               { h: "No Python loop", t: "The loop runs in fast compiled code." }],
      code: ["import numpy as np", "a = np.arange(5)", "print(a ** 2)"],
      cap: ["Why it is fast."], say: "NumPy is fast because math is vectorized. One operation hits every item, and the loop runs in compiled code." },
    { name: "Shape", title: "Shape and axes", desc: "Rows, columns, and beyond", min: 11,
      points: [{ h: "shape", t: "A tuple that says how many items on each axis." },
               { h: "axis", t: "The direction an operation moves along. Axis 0 goes down the rows." }],
      code: ["import numpy as np", "a = np.zeros((2, 3))", "print(a.shape)"],
      cap: ["Shape and axes."], say: "Shape is a tuple that says how many items sit on each axis. Axis zero runs down the rows." },
    { name: "Dtype", title: "Data types", desc: "Every array has one", min: 10,
      points: [{ h: "dtype", t: "int64, float64, bool and more." },
               { h: "Upcasting", t: "Mixing types picks the safest one for all items." }],
      code: ["import numpy as np", "a = np.array([1, 2.5])", "print(a.dtype)"],
      cap: ["Data types."], say: "Every array has one d type. Mix whole numbers and decimals, and NumPy picks float for all of them." },
    { name: "Views", title: "Views share memory", desc: "Slices are not copies", min: 10,
      points: [{ h: "A slice is a view", t: "Changing the slice changes the original." },
               { h: "Use copy()", t: "When you need an independent array." }],
      code: ["import numpy as np", "a = np.arange(4)", "b = a[:2]", "b[0] = 99", "print(a)"],
      cap: ["Views share memory."], say: "A slice is a view, not a copy. Change the slice, and the original changes too. Use copy for a separate array." },
  ],
  outro: { cap: ["Follow Coding Archives", "for more Python!"], say: "Follow Coding Archives for more Python!" },
  thumb: { short: "numpy.py" },
});
