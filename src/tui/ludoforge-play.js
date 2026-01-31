import { parsePlayArgs } from "./parse-play-args.js";

const USAGE = [
  "Usage: ludoforge-play <game.json> [options]",
  "",
  "Play or watch a LudoForge game definition interactively in the terminal.",
  "",
  "Arguments:",
  "  <game.json>           Path to a GameDefinition JSON file",
  "",
  "Options:",
  "  --watch               All-AI watch mode (no human players)",
  "  --speed <ms>          AI step delay in watch mode (default: 500)",
  "  --seed <n>            RNG seed for reproducibility",
  "  --player <n>=<type>   Pre-assign player (e.g., --player 1=human --player 2=random)",
  "  --help, -h            Show this help",
].join("\n");

/** @type {import('./parse-play-args.js').PlayArgs} */
let parsed;
try {
  parsed = parsePlayArgs(process.argv);
} catch (err) {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
}

if (parsed.help || !parsed._hasArgs) {
  process.stdout.write(USAGE + "\n");
  process.exit(0);
}

if (!parsed.gameFile) {
  process.stderr.write("Error: <game.json> argument is required\n\n");
  process.stdout.write(USAGE + "\n");
  process.exit(1);
}

// Lazy imports: only load heavy deps (React, Ink, DSL validator) after early-exit checks.
const { loadDefinition } = await import("./utils/load-definition.js");
const React = await import("react");
const { render } = await import("ink");
const { App } = await import("./app.jsx");

try {
  const definition = await loadDefinition(parsed.gameFile);

  render(
    React.createElement(App, {
      definition,
      cliPlayers: parsed.players,
      watch: parsed.watch,
    }),
  );
} catch (err) {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
}
