import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { loadConfig } from "../../../src/cli/load-config.js";
import { CLIError } from "../../../src/cli/cli-error.js";

describe("loadConfig", () => {
  it("throws CLIError when configPath is missing", async () => {
    await assert.rejects(
      () => loadConfig(undefined, {}),
      (err) => {
        assert.ok(err instanceof CLIError);
        assert.ok(err.message.includes("Missing required --config"));
        return true;
      },
    );
  });

  it("throws CLIError when file cannot be read", async () => {
    const deps = {
      readFile: async () => { throw new Error("ENOENT"); },
      validateRunnerConfig: () => ({ valid: true, errors: [] }),
    };
    await assert.rejects(
      () => loadConfig("/nonexistent.json", deps),
      (err) => {
        assert.ok(err instanceof CLIError);
        assert.ok(err.message.includes("Failed to read config"));
        return true;
      },
    );
  });

  it("throws CLIError for invalid JSON", async () => {
    const deps = {
      readFile: async () => "{ not json }",
      validateRunnerConfig: () => ({ valid: true, errors: [] }),
    };
    await assert.rejects(
      () => loadConfig("config.json", deps),
      (err) => {
        assert.ok(err instanceof CLIError);
        assert.ok(err.message.includes("Invalid JSON"));
        return true;
      },
    );
  });

  it("throws CLIError when schema validation fails", async () => {
    const deps = {
      readFile: async () => JSON.stringify({ bad: true }),
      validateRunnerConfig: () => ({
        valid: false,
        errors: [{ path: "/runner", message: "missing" }],
      }),
    };
    await assert.rejects(
      () => loadConfig("config.json", deps),
      (err) => {
        assert.ok(err instanceof CLIError);
        assert.ok(err.message.includes("validation failed"));
        assert.ok(err.message.includes("/runner"));
        return true;
      },
    );
  });

  it("returns parsed config on success", async () => {
    const config = { runner: { generations: 1 } };
    const deps = {
      readFile: async () => JSON.stringify(config),
      validateRunnerConfig: () => ({ valid: true, errors: [] }),
    };
    const result = await loadConfig("config.json", deps);
    assert.deepEqual(result, config);
  });

  it("formats unknown validation error for empty errors array", async () => {
    const deps = {
      readFile: async () => JSON.stringify({}),
      validateRunnerConfig: () => ({ valid: false, errors: [] }),
    };
    await assert.rejects(
      () => loadConfig("config.json", deps),
      (err) => {
        assert.ok(err.message.includes("Unknown validation error"));
        return true;
      },
    );
  });
});
