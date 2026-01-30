import { CLIError } from "./cli-error.js";

const VALUE_FLAGS = new Set(["--seeds", "--config", "--run-id", "--out"]);
const BOOLEAN_FLAGS = new Set(["--dry-run", "--resume", "--help", "-h"]);
const ALL_FLAGS = new Set([...VALUE_FLAGS, ...BOOLEAN_FLAGS]);

function validFlagList() {
  return [...ALL_FLAGS].sort().join(", ");
}

export function parseArgs(argv) {
  const args = Array.isArray(argv) ? argv.slice(2) : [];
  const parsed = {
    dryRun: false,
    resume: false,
    help: false,
    _hasArgs: args.length > 0,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }
    if (arg === "--resume") {
      parsed.resume = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }

    if (arg.startsWith("--")) {
      const [flag, inlineValue] = arg.split("=", 2);
      if (!VALUE_FLAGS.has(flag)) {
        throw new CLIError(
          `Unknown flag: ${flag}. Valid flags are: ${validFlagList()}`,
          { showUsage: true },
        );
      }
      const value = inlineValue ?? args[i + 1];
      if (!value || value.startsWith("--")) {
        throw new CLIError(
          `${flag} requires a value. Example: ${flag} <value>`,
          { showUsage: true },
        );
      }
      i += inlineValue ? 0 : 1;
      if (flag === "--seeds") {
        parsed.seeds = value;
      } else if (flag === "--config") {
        parsed.config = value;
      } else if (flag === "--run-id") {
        parsed.runId = value;
      } else if (flag === "--out") {
        parsed.out = value;
      }
      continue;
    }

    throw new CLIError(
      `Unexpected argument: ${arg}. Only flags (--flag) are accepted, not positional arguments.`,
      { showUsage: true },
    );
  }

  return parsed;
}
