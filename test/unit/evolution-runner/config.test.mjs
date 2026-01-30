import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateRunnerConfig } from "../../../src/evolution-runner/config.js";

const baseConfig = {
  runner: { generations: 3, maxRetainedGenerations: 30 },
  mapElites: {
    descriptors: [{ id: "agency", min: 0, max: 1, bins: 5 }],
  },
  seeding: {
    mode: "generate",
    populationSize: 10,
    generate: {
      coverage: {
        strategy: "uniform-bins",
        maxAttempts: 100,
      },
      grammar: {},
    },
  },
};

function cloneConfig(config) {
  return structuredClone(config);
}

function compareErrors(left, right) {
  if (left.path !== right.path) {
    return left.path < right.path ? -1 : 1;
  }
  if (left.keyword !== right.keyword) {
    return left.keyword < right.keyword ? -1 : 1;
  }
  if (left.schemaPath !== right.schemaPath) {
    return left.schemaPath < right.schemaPath ? -1 : 1;
  }
  if (left.message !== right.message) {
    return left.message < right.message ? -1 : 1;
  }
  const leftParams = JSON.stringify(left.params);
  const rightParams = JSON.stringify(right.params);
  if (leftParams !== rightParams) {
    return leftParams < rightParams ? -1 : 1;
  }
  return 0;
}

describe("config", () => {
  describe("validateRunnerConfig", () => {
    it("returns valid true for a minimal config", () => {
      const result = validateRunnerConfig(cloneConfig(baseConfig));
      assert.equal(result.valid, true);
      assert.deepEqual(result.errors, []);
    });

    it("returns sorted, structured errors", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.runner.generations = 0;
      delete candidate.seeding;

      const result = validateRunnerConfig(candidate);

      assert.equal(result.valid, false);
      assert.ok(result.errors.length >= 2);

      const sorted = [...result.errors].sort(compareErrors);
      assert.deepEqual(result.errors, sorted);
    });

    it("rejects config with version field (additionalProperties)", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.version = "v1";

      const result = validateRunnerConfig(candidate);

      assert.equal(result.valid, false);
      assert.ok(
        result.errors.some(
          (error) =>
            error.path === "/version" &&
            error.keyword === "additionalProperties",
        ),
      );
    });

    it("reports descriptor range violations", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.mapElites.descriptors[0].min = 5;
      candidate.mapElites.descriptors[0].max = 1;

      const result = validateRunnerConfig(candidate);

      assert.equal(result.valid, false);
      assert.ok(
        result.errors.some(
          (error) =>
            error.path === "/mapElites/descriptors/0" &&
            /max must be greater than min/i.test(error.message),
        ),
      );
    });

    it("reports duplicate descriptor ids", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.mapElites.descriptors.push({ id: "agency", min: 0, max: 10, bins: 4 });

      const result = validateRunnerConfig(candidate);

      assert.equal(result.valid, false);
      assert.ok(
        result.errors.some(
          (error) =>
            error.path === "/mapElites/descriptors/1/id" &&
            /duplicated/i.test(error.message),
        ),
      );
    });

    it("reports schema violations for descriptors", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.mapElites.descriptors[0].bins = 0;

      const result = validateRunnerConfig(candidate);

      assert.equal(result.valid, false);
      assert.ok(
        result.errors.some(
          (error) =>
            error.path === "/mapElites/descriptors/0/bins" &&
            /must be >= 1/i.test(error.message),
        ),
      );
    });
  });

  describe("seeding validation", () => {
    it("accepts valid generate mode config", () => {
      const result = validateRunnerConfig(cloneConfig(baseConfig));
      assert.equal(result.valid, true);
    });

    it("accepts valid folder mode config", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.seeding = {
        mode: "folder",
        populationSize: 5,
        folder: { path: "seeds/" },
      };

      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, true);
    });

    it("accepts valid mixed mode config", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.seeding = {
        mode: "mixed",
        populationSize: 20,
        folder: { path: "seeds/" },
        generate: {
          coverage: { strategy: "random", maxAttempts: 50 },
          grammar: {},
        },
        mix: { folderFraction: 0.4 },
      };

      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, true);
    });

    it("rejects missing seeding.mode", () => {
      const candidate = cloneConfig(baseConfig);
      delete candidate.seeding.mode;

      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, false);
      assert.ok(
        result.errors.some(
          (error) =>
            error.path === "/seeding/mode" && error.keyword === "required",
        ),
      );
    });

    it("rejects invalid seeding.mode value", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.seeding.mode = "invalid";

      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, false);
      assert.ok(
        result.errors.some(
          (error) => error.path === "/seeding/mode" && error.keyword === "enum",
        ),
      );
    });

    it("rejects missing seeding.populationSize", () => {
      const candidate = cloneConfig(baseConfig);
      delete candidate.seeding.populationSize;

      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, false);
      assert.ok(
        result.errors.some(
          (error) =>
            error.path === "/seeding/populationSize" &&
            error.keyword === "required",
        ),
      );
    });

    it("rejects populationSize less than 1", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.seeding.populationSize = 0;

      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, false);
      assert.ok(
        result.errors.some(
          (error) =>
            error.path === "/seeding/populationSize" &&
            error.keyword === "minimum",
        ),
      );
    });

    it("rejects folder mode missing seeding.folder", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.seeding = {
        mode: "folder",
        populationSize: 5,
      };

      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, false);
      assert.ok(
        result.errors.some(
          (error) =>
            error.path === "/seeding/folder" && error.keyword === "required",
        ),
      );
    });

    it("rejects generate mode missing seeding.generate", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.seeding = {
        mode: "generate",
        populationSize: 10,
      };

      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, false);
      assert.ok(
        result.errors.some(
          (error) =>
            error.path === "/seeding/generate" && error.keyword === "required",
        ),
      );
    });

    it("rejects mixed mode missing seeding.mix", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.seeding = {
        mode: "mixed",
        populationSize: 20,
        folder: { path: "seeds/" },
        generate: {
          coverage: { strategy: "random", maxAttempts: 50 },
          grammar: {},
        },
      };

      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, false);
      assert.ok(
        result.errors.some(
          (error) =>
            error.path === "/seeding/mix" && error.keyword === "required",
        ),
      );
    });

    it("validates coverage strategy enum", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.seeding.generate.coverage.strategy = "invalid-strategy";

      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, false);
      assert.ok(
        result.errors.some(
          (error) =>
            error.path === "/seeding/generate/coverage/strategy" &&
            error.keyword === "enum",
        ),
      );
    });

    it("validates coverage maxAttempts as positive integer", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.seeding.generate.coverage.maxAttempts = 0;

      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, false);
      assert.ok(
        result.errors.some(
          (error) =>
            error.path === "/seeding/generate/coverage/maxAttempts" &&
            error.keyword === "minimum",
        ),
      );
    });

    it("validates grammar limits as positive integers", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.seeding.generate.grammar = {
        limits: { minVariables: 0 },
      };

      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, false);
      assert.ok(
        result.errors.some(
          (error) =>
            error.path === "/seeding/generate/grammar/limits/minVariables" &&
            error.keyword === "minimum",
        ),
      );
    });

    it("validates mix.folderFraction range 0-1", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.seeding = {
        mode: "mixed",
        populationSize: 20,
        folder: { path: "seeds/" },
        generate: {
          coverage: { strategy: "random", maxAttempts: 50 },
          grammar: {},
        },
        mix: { folderFraction: 1.5 },
      };

      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, false);
      assert.ok(
        result.errors.some(
          (error) =>
            error.path === "/seeding/mix/folderFraction" &&
            error.keyword === "maximum",
        ),
      );
    });
  });
});
