export function createUsage() {
  return [
    "Usage: ludoforge-evolve --config <path> [--seeds <path>] [options]",
    "",
    "Required:",
    "  --config <path>    Path to runner config JSON",
    "",
    "Options:",
    "  --seeds <path>     Path to seed population JSON or JSONL (overrides config seeding)",
    "  --run-id <id>      Explicit run ID (UUID)",
    "  --resume           Resume an existing run (requires --run-id)",
    "  --out <dir>        Base output directory (default: cwd)",
    "  --dry-run          Validate inputs without executing the runner",
    "  --verbose, -v      Show debug-level logs with pretty printing",
    "  --quiet, -q        Suppress progress output, only show errors",
    "  --help             Show this help",
  ].join("\n");
}
