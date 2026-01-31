import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFile, unlink, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { loadDefinition } from "../../../src/tui/utils/load-definition.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VALID_FIXTURE = join(__dirname, "../../e2e/fixtures/minimal-game.json");

describe("loadDefinition", () => {
  it("returns a valid definition from a well-formed JSON file", async () => {
    const def = await loadDefinition(VALID_FIXTURE);
    assert.ok(def);
    assert.equal(typeof def, "object");
    assert.ok(def.version);
    assert.ok(def.players);
    assert.ok(def.actions);
  });

  it("throws for a missing file", async () => {
    await assert.rejects(
      () => loadDefinition("/nonexistent/path/game.json"),
      (err) => {
        assert.ok(err.message.includes("Cannot read game definition file"));
        return true;
      },
    );
  });

  it("throws for invalid JSON content", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ludoforge-test-"));
    const badFile = join(dir, "bad.json");
    await writeFile(badFile, "{ not valid json", "utf8");
    try {
      await assert.rejects(
        () => loadDefinition(badFile),
        (err) => {
          assert.ok(err.message.includes("Invalid JSON"));
          return true;
        },
      );
    } finally {
      await unlink(badFile).catch(() => {});
    }
  });

  it("throws for JSON that fails schema validation", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ludoforge-test-"));
    const invalidFile = join(dir, "invalid.json");
    await writeFile(invalidFile, JSON.stringify({ not: "a game" }), "utf8");
    try {
      await assert.rejects(
        () => loadDefinition(invalidFile),
        (err) => {
          assert.ok(err.message.includes("Schema validation failed"));
          return true;
        },
      );
    } finally {
      await unlink(invalidFile).catch(() => {});
    }
  });

  it("throws if filePath is not a string", async () => {
    await assert.rejects(
      () => loadDefinition(123),
      { message: "filePath must be a non-empty string" },
    );
  });

  it("throws if filePath is empty string", async () => {
    await assert.rejects(
      () => loadDefinition(""),
      { message: "filePath must be a non-empty string" },
    );
  });

  it("returned definition matches original JSON structure", async () => {
    const def = await loadDefinition(VALID_FIXTURE);
    assert.equal(def.version, "1.0");
    assert.equal(def.players.count, 2);
  });
});
