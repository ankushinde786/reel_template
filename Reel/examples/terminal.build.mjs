// Linux commands reel: typed commands, real output (run:true) or your own output, anatomy chips.   node examples/terminal.build.mjs --voice mock
import { buildReel } from "../engine/index.mjs";
buildReel({
  id: "ex-terminal", type: "terminal", title: "5 Linux Commands", countLabel: "commands", subject: "linux",
  intro: { cap: ["Five Linux commands", "you will use daily."], say: "Five Linux commands you will use every day." },
  steps: [
    { name: "ls", desc: "List what is in a folder",
      setup: ["mkdir -p demo/src && cd demo", "touch README.md notes.txt .env", "mkdir docs"],
      cmds: [{ parts: [["ls", "list files"], ["-l", "long format"], ["-a", "include hidden"]], run: true }],
      cap: ["ls lists files.", "Add -la for details."], say: "The ls command lists files. Add dash l a to see details and hidden files." },
    { name: "grep", desc: "Search text inside files",
      setup: ["printf 'apple pie\\nbanana split\\napple tart\\n' > menu.txt"],
      cmds: [{ parts: [["grep", "search"], ["-n", "line numbers"], ["apple", "the pattern"], ["menu.txt", "the file"]], run: true }],
      cap: ["grep finds lines", "that match a pattern."], say: "The grep command finds lines that match a pattern. Dash n shows the line numbers." },
    { name: "pipe", desc: "Chain commands together",
      cmds: [{ cmd: "ls /etc | head -n 3", out: ["{b|adduser.conf}", "alternatives", "apt"], say: "Pipe the output of one command into another." },
             { cmd: "echo hello | tr a-z A-Z", run: true, say: "Here the text goes through tr, which makes it uppercase." }],
      cap: ["A pipe sends output", "into the next command."], say: "A pipe sends the output of one command into the next." },
    { name: "scroll", desc: "Long output scrolls like a real terminal",
      cmds: [{ cmd: "seq 1 14", run: true }], cap: ["Long output scrolls", "like a real terminal."], say: "Long output scrolls just like a real terminal." },
  ],
  outro: { style: "grid", cap: ["Save this cheat sheet", "and follow for more!"], say: "Save this cheat sheet, and follow Coding Archives for more!" },
});
