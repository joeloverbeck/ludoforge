import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

describe("main() error output", () => {
  it("outputs human-readable errors without raw JSON", async () => {
    // Invoke the CLI with no arguments, which triggers a CLIError.
    // main() should catch it and write to stderr without JSON logging.
    try {
      await execFileAsync(
        process.execPath,
        ["./src/cli/ludoforge-evolve.js"],
        { timeout: 10000 },
      );
      assert.fail("CLI should have exited with non-zero code");
    } catch (error) {
      const stderr = error.stderr ?? "";
      assert.ok(stderr.length > 0, "stderr should contain output");
      assert.ok(
        stderr.startsWith("Error: "),
        `stderr should start with 'Error: ', got: ${stderr.slice(0, 60)}`,
      );
      assert.ok(
        !stderr.includes('{"level":'),
        "stderr should not contain raw JSON log output",
      );
      assert.ok(
        !stderr.includes('"msg":'),
        "stderr should not contain Pino JSON fields",
      );
    }
  });
});
