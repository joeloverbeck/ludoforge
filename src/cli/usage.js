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
    "  --help             Show this help",
  ].join("\n");
}
