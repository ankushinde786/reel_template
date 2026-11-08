// Scene registry. A scene module is a plain object:
//   type        name used in build.mjs  ( { type: "compare", ... } )
//   normalize?  (scene, index, reel) validate + fill defaults (throw a clear error for missing fields)
//   segments    (scene, reel, cfg) -> [{ say, cap:[l1,l2], min }]   narrated pieces; scene length follows the voice
//   prepare?    (scene, reel, cfg, log) run code / shell so output is real
//   build       (scene, c) -> { html, chrome? }   html goes inside the scene layer; c = scene context (see _kit.mjs)
//   css?        ({G,theme,cfg,reel}) -> css string, added once if the scene type is used
// To add a scene type: create engine/scenes/<name>.mjs, export default the module, add it below.
import { intro, outro } from "./intro.mjs";
import method from "./method.mjs";
import code from "./code.mjs";
import concept from "./concept.mjs";
import { compare, tip } from "./compare.mjs";
import terminal from "./terminal.mjs";
import walkthrough from "./walkthrough.mjs";
import { flow, blocks } from "./diagram.mjs";

export const sceneModules = { intro, outro, method, code, concept, compare, tip, terminal, walkthrough, flow, blocks };
export const registerScene = (mod) => { sceneModules[mod.type] = mod; };
