import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_RUNNER_LAYOUT,
  formatGenerationDirName,
} from "../../../src/evolution-runner/runner-defaults.js";

describe("runner-defaults", () => {
  describe("DEFAULT_RUNNER_LAYOUT", () => {
    it("loads and has expected top-level keys", () => {
      assert.ok(DEFAULT_RUNNER_LAYOUT);
      assert.equal(typeof DEFAULT_RUNNER_LAYOUT.version, "number");
      assert.equal(typeof DEFAULT_RUNNER_LAYOUT.runsRoot, "string");
      assert.ok(DEFAULT_RUNNER_LAYOUT.artifacts);
      assert.ok(DEFAULT_RUNNER_LAYOUT.resume);
    });

    it("artifacts has all required filenames", () => {
      const { artifacts } = DEFAULT_RUNNER_LAYOUT;
      assert.equal(typeof artifacts.runMetadata, "string");
      assert.equal(typeof artifacts.generationDirPattern, "string");
      assert.equal(typeof artifacts.population, "string");
      assert.equal(typeof artifacts.evaluated, "string");
      assert.equal(typeof artifacts.rejected, "string");
      assert.equal(typeof artifacts.mapElites, "string");
      assert.equal(typeof artifacts.shortlist, "string");
      assert.equal(typeof artifacts.feedback, "string");
      assert.equal(typeof artifacts.preferenceModel, "string");
      assert.equal(typeof artifacts.determinism, "string");
    });

    it("resume has both flags", () => {
      const { resume } = DEFAULT_RUNNER_LAYOUT;
      assert.equal(typeof resume.requireConfigMatch, "boolean");
      assert.equal(typeof resume.requireDescriptorMatch, "boolean");
    });
  });

  describe("formatGenerationDirName", () => {
    it("interpolates generation number into pattern", () => {
      assert.equal(
        formatGenerationDirName("generation-{generation}", 0),
        "generation-0",
      );
      assert.equal(
        formatGenerationDirName("generation-{generation}", 42),
        "generation-42",
      );
    });

    it("handles custom patterns", () => {
      assert.equal(
        formatGenerationDirName("gen_{generation}", 7),
        "gen_7",
      );
    });
  });
});
