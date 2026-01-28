import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSeedPopulation } from "../../../src/evolution-runner/seed-loader.js";

async function createTempDir() {
  return mkdtemp(join(tmpdir(), "ludoforge-seeds-"));
}

test("loadSeedPopulation loads JSON seed arrays in order", async () => {
  const dir = await createTempDir();
  const filePath = join(dir, "seeds.json");
  const payload = [
    { id: "seed-a", definition: { game: "alpha" } },
    { id: "seed-b", definition: { game: "beta" } },
  ];

  await writeFile(filePath, JSON.stringify(payload), "utf8");

  const seeds = await loadSeedPopulation(filePath);

  assert.deepEqual(
    seeds.map((seed) => seed.id),
    ["seed-a", "seed-b"],
  );
  assert.deepEqual(seeds[0].definition, { game: "alpha" });
});

test("loadSeedPopulation loads JSONL seeds in order", async () => {
  const dir = await createTempDir();
  const filePath = join(dir, "seeds.jsonl");
  const lines = [
    JSON.stringify({ id: "seed-1", definition: { score: 1 } }),
    JSON.stringify({ id: "seed-2", definition: { score: 2 } }),
  ];

  await writeFile(filePath, `${lines.join("\n")}\n`, "utf8");

  const seeds = await loadSeedPopulation(filePath);

  assert.deepEqual(
    seeds.map((seed) => seed.id),
    ["seed-1", "seed-2"],
  );
});

test("loadSeedPopulation loads directory files in sorted order", async () => {
  const dir = await createTempDir();
  const aPath = join(dir, "a.json");
  const bPath = join(dir, "b.json");

  await writeFile(aPath, JSON.stringify({ id: "seed-a", definition: { game: "a" } }), "utf8");
  await writeFile(bPath, JSON.stringify({ id: "seed-b", definition: { game: "b" } }), "utf8");

  const seeds = await loadSeedPopulation(dir);

  assert.deepEqual(
    seeds.map((seed) => seed.id),
    ["seed-a", "seed-b"],
  );
});

test("loadSeedPopulation rejects seeds missing id or definition", async () => {
  const dir = await createTempDir();
  const missingIdPath = join(dir, "missing-id.json");
  const missingDefinitionPath = join(dir, "missing-definition.json");

  await writeFile(missingIdPath, JSON.stringify({ definition: { game: "x" } }), "utf8");
  await writeFile(missingDefinitionPath, JSON.stringify({ id: "seed-x" }), "utf8");

  await assert.rejects(
    () => loadSeedPopulation(missingIdPath),
    (error) => {
      assert.ok(error instanceof Error);
      assert.ok(error.message.includes("missing a valid id"));
      assert.ok(error.message.includes(missingIdPath));
      assert.ok(error.message.includes("entry 0"));
      return true;
    },
  );

  await assert.rejects(
    () => loadSeedPopulation(missingDefinitionPath),
    (error) => {
      assert.ok(error instanceof Error);
      assert.ok(error.message.includes("missing a valid definition"));
      assert.ok(error.message.includes(missingDefinitionPath));
      assert.ok(error.message.includes("entry 0"));
      return true;
    },
  );
});
