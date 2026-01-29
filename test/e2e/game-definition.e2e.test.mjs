import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateGameDefinition } from "../../src/dsl/validate.js";
import { validateSemanticDefinition } from "../../src/dsl/semantic.js";
import { serializeGameDefinition } from "../../src/dsl/serialize.js";

async function loadFixture(name) {
  const fileUrl = new URL(`./fixtures/${name}`, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

function reorderKeys(value) {
  if (Array.isArray(value)) {
    return value.map(reorderKeys);
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort().reverse();
    const reordered = {};
    for (const key of keys) {
      reordered[key] = reorderKeys(value[key]);
    }
    return reordered;
  }
  return value;
}

describe("game-definition", () => {
  describe("validation and serialization", () => {
    it("game definitions validate and serialize deterministically", async () => {
      const definition = await loadFixture("minimal-game.json");

      const schemaResult = validateGameDefinition(definition);
      assert.equal(
        schemaResult.valid,
        true,
        `Schema validation failed: ${JSON.stringify(schemaResult.errors)}`,
      );

      const semanticResult = validateSemanticDefinition(definition);
      assert.equal(
        semanticResult.valid,
        true,
        `Semantic validation failed: ${JSON.stringify(semanticResult.issues)}`,
      );

      const serialized = serializeGameDefinition(definition);
      const reorderedSerialized = serializeGameDefinition(reorderKeys(definition));

      assert.equal(serialized, reorderedSerialized);
      assert.equal(serialized, serializeGameDefinition(definition));
    });
  });

  describe("validation errors", () => {
    it("game definition validation fails when required fields are missing", async () => {
      const definition = await loadFixture("minimal-game.json");
      delete definition.players;

      const schemaResult = validateGameDefinition(definition);
      assert.equal(schemaResult.valid, false);
      assert.ok(
        schemaResult.errors?.some(
          (error) =>
            error.keyword === "required" &&
            error.params?.missingProperty === "players",
        ),
      );
    });
  });
});
