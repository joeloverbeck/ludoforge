/**
 * @typedef {{ slot: number, type: 'human' | 'random' | 'greedy' }} PlayerAssignment
 * @typedef {{
 *   gameFile: string | null,
 *   watch: boolean,
 *   speed: number,
 *   seed: number | undefined,
 *   players: PlayerAssignment[],
 *   help: boolean,
 *   _hasArgs: boolean,
 * }} PlayArgs
 */

/**
 * Parse CLI arguments for ludoforge-play.
 * Throws plain Error on invalid input (message is user-facing).
 * @param {string[]} argv - process.argv-style array
 * @returns {PlayArgs}
 */
export function parsePlayArgs(argv) {
  const args = Array.isArray(argv) ? argv.slice(2) : [];
  /** @type {PlayArgs} */
  const parsed = {
    gameFile: null,
    watch: false,
    speed: 500,
    seed: undefined,
    players: [],
    help: false,
    _hasArgs: args.length > 0,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }
    if (arg === "--watch") {
      parsed.watch = true;
      continue;
    }
    if (arg === "--speed") {
      const val = args[i + 1];
      if (val === undefined || val.startsWith("-")) {
        throw new Error("--speed requires a numeric value");
      }
      const num = Number(val);
      if (!Number.isFinite(num) || num < 0) {
        throw new Error("--speed must be a non-negative number");
      }
      parsed.speed = num;
      i += 1;
      continue;
    }
    if (arg === "--seed") {
      const val = args[i + 1];
      if (val === undefined || val.startsWith("-")) {
        throw new Error("--seed requires a numeric value");
      }
      const num = Number(val);
      if (!Number.isFinite(num)) {
        throw new Error("--seed must be a finite number");
      }
      parsed.seed = num;
      i += 1;
      continue;
    }
    if (arg === "--player") {
      const val = args[i + 1];
      if (val === undefined || val.startsWith("-")) {
        throw new Error("--player requires a value like 1=human or 2=random");
      }
      const match = val.match(/^(\d+)=(human|random|greedy)$/);
      if (!match) {
        throw new Error(
          `invalid --player format "${val}". Expected <n>=<human|random|greedy>`,
        );
      }
      parsed.players.push({
        slot: Number(match[1]),
        type: /** @type {'human' | 'random' | 'greedy'} */ (match[2]),
      });
      i += 1;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`unknown flag "${arg}"`);
    }
    if (parsed.gameFile === null) {
      parsed.gameFile = arg;
    } else {
      throw new Error(`unexpected argument "${arg}"`);
    }
  }

  return parsed;
}
