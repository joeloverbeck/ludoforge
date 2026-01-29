import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../../..");

describe("config-ownership-docs", () => {
  describe("README config ownership table", () => {
    it("lists every config file", async () => {
      const readme = await readFile(resolve(root, "docs/architecture/README.md"), "utf8");
      const configFiles = await readdir(resolve(root, "configs"));
      const jsonFiles = configFiles.filter((f) => f.endsWith(".json")).sort();

      for (const file of jsonFiles) {
        const ref = `configs/${file}`;
        assert.ok(
          readme.includes(ref),
          `Config file ${ref} is missing from README ownership table`
        );
      }
    });
  });

  describe("pipeline-overview", () => {
    it("references at least one config per documented stage", async () => {
      const pipeline = await readFile(
        resolve(root, "docs/architecture/pipeline-overview.md"),
        "utf8"
      );
      assert.ok(
        pipeline.includes("configs/simulation.json"),
        "Pipeline should reference simulation config"
      );
      assert.ok(
        pipeline.includes("configs/fitness.json"),
        "Pipeline should reference fitness config"
      );
      assert.ok(
        pipeline.includes("configs/map-elites.json"),
        "Pipeline should reference map-elites config"
      );
      assert.ok(
        pipeline.includes("configs/evolution-operators.json"),
        "Pipeline should reference evolution-operators config"
      );
      assert.ok(
        pipeline.includes("configs/evolution-runner.json"),
        "Pipeline should reference evolution-runner config"
      );
    });
  });
});
