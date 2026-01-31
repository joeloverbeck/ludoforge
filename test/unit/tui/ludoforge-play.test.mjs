import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";

const exec = promisify(execFile);

const DIST_ENTRY = "dist/tui/ludoforge-play.js";

describe("ludoforge-play CLI (subprocess)", () => {
  before(() => {
    assert.ok(
      existsSync(DIST_ENTRY),
      `${DIST_ENTRY} must exist — run "npm run build:tui" first`,
    );
  });

  it("prints usage and exits 0 with --help", async () => {
    const { stdout, stderr } = await exec("node", [DIST_ENTRY, "--help"]);
    assert.ok(stdout.includes("Usage: ludoforge-play"), "should contain usage header");
    assert.ok(stdout.includes("--watch"), "should mention --watch");
    assert.equal(stderr, "");
  });

  it("prints usage and exits 0 with -h", async () => {
    const { stdout } = await exec("node", [DIST_ENTRY, "-h"]);
    assert.ok(stdout.includes("Usage: ludoforge-play"));
  });

  it("prints usage and exits 0 with no arguments", async () => {
    const { stdout } = await exec("node", [DIST_ENTRY]);
    assert.ok(stdout.includes("Usage: ludoforge-play"));
  });

  it("exits 1 with error for unknown flag", async () => {
    await assert.rejects(
      exec("node", [DIST_ENTRY, "--bogus"]),
      (err) => {
        assert.ok(err.stderr.includes("unknown flag"));
        assert.equal(err.code, 1);
        return true;
      },
    );
  });

  it("exits 1 with error for --speed without value", async () => {
    await assert.rejects(
      exec("node", [DIST_ENTRY, "game.json", "--speed"]),
      (err) => {
        assert.ok(err.stderr.includes("--speed requires"));
        assert.equal(err.code, 1);
        return true;
      },
    );
  });

  it("exits 1 with error for invalid --player format", async () => {
    await assert.rejects(
      exec("node", [DIST_ENTRY, "game.json", "--player", "bad"]),
      (err) => {
        assert.ok(err.stderr.includes("invalid --player format"));
        assert.equal(err.code, 1);
        return true;
      },
    );
  });

  it("runs with a game file argument (placeholder output)", async () => {
    const { stdout } = await exec("node", [DIST_ENTRY, "test.json"]);
    assert.ok(stdout.includes('game="test.json"'));
    assert.ok(stdout.includes("TUI components not yet implemented"));
  });

  it("passes --watch and --speed through", async () => {
    const { stdout } = await exec("node", [
      DIST_ENTRY, "test.json", "--watch", "--speed", "200",
    ]);
    assert.ok(stdout.includes("watch=true"));
    assert.ok(stdout.includes("speed=200"));
  });
});
