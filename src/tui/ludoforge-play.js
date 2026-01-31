#!/usr/bin/env node
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

// Placeholder: future tickets will add Ink rendering here.
process.stdout.write(
  `ludoforge-play: game="${parsed.gameFile}" watch=${parsed.watch} speed=${parsed.speed}\n`,
);
process.stdout.write("TUI components not yet implemented. See TUIGAMPLA-06+.\n");
