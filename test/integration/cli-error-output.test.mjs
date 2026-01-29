import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";

const execFileAsync = promisify(execFile);

const CLI_PATH = resolve("src/cli/ludoforge-evolve.js");

describe("CLI error output formatting", () => {
  it("prints error message, hint, and usage to stderr when invoked with no args", async () => {
    try {
      await execFileAsync("node", [CLI_PATH], { timeout: 10_000 });
      assert.fail("Expected non-zero exit code");
    } catch (error) {
      assert.equal(error.code, 1, "exit code should be 1");
      const stderr = error.stderr;
      assert.ok(stderr.includes("No arguments provided"), "stderr should contain error message");
      assert.ok(stderr.includes("Hint:"), "stderr should contain hint");
      assert.ok(stderr.includes("Usage:"), "stderr should contain usage");
    }
  });

  it("prints error and hint for nonexistent config path", async () => {
    try {
      await execFileAsync("node", [CLI_PATH, "--config", "/nonexistent/path.json"], {
        timeout: 10_000,
      });
      assert.fail("Expected non-zero exit code");
    } catch (error) {
      assert.equal(error.code, 1);
      const stderr = error.stderr;
      assert.ok(stderr.includes("Failed to read config"), "stderr should contain error message");
      assert.ok(stderr.includes("Hint:"), "stderr should contain hint");
      assert.ok(!stderr.includes("Usage:"), "stderr should NOT contain usage for file-not-found");
    }
  });

  it("prints error with valid flags for unknown flag", async () => {
    try {
      await execFileAsync("node", [CLI_PATH, "--bogus"], { timeout: 10_000 });
      assert.fail("Expected non-zero exit code");
    } catch (error) {
      assert.equal(error.code, 1);
      const stderr = error.stderr;
      assert.ok(stderr.includes("Unknown flag: --bogus"), "stderr should contain unknown flag error");
      assert.ok(stderr.includes("--config"), "stderr should list valid flags");
      assert.ok(stderr.includes("Usage:"), "stderr should contain usage");
    }
  });
});
