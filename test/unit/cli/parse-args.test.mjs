import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { parseArgs } from "../../../src/cli/parse-args.js";
import { CLIError } from "../../../src/cli/cli-error.js";

describe("parseArgs", () => {
  it("returns defaults for empty argv", () => {
    const result = parseArgs(["node", "cli"]);
    assert.equal(result.dryRun, false);
    assert.equal(result.resume, false);
    assert.equal(result.help, false);
    assert.equal(result._hasArgs, false);
  });

  it("parses boolean flags", () => {
    const result = parseArgs(["node", "cli", "--dry-run", "--resume"]);
    assert.equal(result.dryRun, true);
    assert.equal(result.resume, true);
  });

  it("parses --help and -h", () => {
    assert.equal(parseArgs(["node", "cli", "--help"]).help, true);
    assert.equal(parseArgs(["node", "cli", "-h"]).help, true);
  });

  it("parses value flags with separate value", () => {
    const result = parseArgs([
      "node", "cli",
      "--config", "a.json",
      "--seeds", "b.json",
      "--run-id", "abc",
      "--out", "/tmp",
    ]);
    assert.equal(result.config, "a.json");
    assert.equal(result.seeds, "b.json");
    assert.equal(result.runId, "abc");
    assert.equal(result.out, "/tmp");
  });

  it("parses value flags with inline = syntax", () => {
    const result = parseArgs(["node", "cli", "--config=a.json", "--out=/tmp"]);
    assert.equal(result.config, "a.json");
    assert.equal(result.out, "/tmp");
  });

  it("throws CLIError for unknown flags", () => {
    assert.throws(
      () => parseArgs(["node", "cli", "--bogus"]),
      (err) => {
        assert.ok(err instanceof CLIError);
        assert.ok(err.message.includes("Unknown flag: --bogus"));
        return true;
      },
    );
  });

  it("throws CLIError when value flag missing value", () => {
    assert.throws(
      () => parseArgs(["node", "cli", "--config"]),
      (err) => {
        assert.ok(err instanceof CLIError);
        assert.ok(err.message.includes("requires a value"));
        return true;
      },
    );
  });

  it("throws CLIError for positional arguments", () => {
    assert.throws(
      () => parseArgs(["node", "cli", "somefile.json"]),
      (err) => {
        assert.ok(err instanceof CLIError);
        assert.ok(err.message.includes("Unexpected argument"));
        return true;
      },
    );
  });

  it("handles non-array argv gracefully", () => {
    const result = parseArgs(null);
    assert.equal(result._hasArgs, false);
  });
});
