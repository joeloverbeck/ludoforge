import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateRunnerConfig } from "../../../src/evolution-runner/config.js";

const minimalPreferenceLearning = {
  enabled: false,
  mode: "comparison",
  budget: {
    baseMaxPerGen: 5,
    adaptive: { enabled: false },
  },
  activeLearning: {
    maxPairsPerGen: 5,
    cadenceGens: 1,
    uncertaintyThreshold: 0.15,
    diversityQuota: 1,
    candidatePool: {
      source: "shortlist",
      maxCandidates: 20,
    },
  },
  controller: {
    freeze: {
      enabled: false,
      minTotalSamples: 50,
      freezeAfterStableGens: 5,
      stableUncertaintyThreshold: 0.1,
      requireNoNewMetricIds: true,
    },
    calibration: {
      enabled: false,
      everyGens: 10,
      samples: 2,
      strategy: "activeLearning",
    },
    drift: {
      enabled: false,
      unfreezeUncertaintyThreshold: 0.3,
      minCalibrationAccuracy: 0.7,
      ood: {
        enabled: false,
        featureDistance: "cosine",
        maxTrainDistanceP95: 2.0,
        maxOodRate: 0.2,
      },
    },
  },
};

const baseConfig = {
  runner: { generations: 3, maxRetainedGenerations: 30 },
  mapElites: {
    descriptors: [{ id: "agency", min: 0, max: 1, bins: 5 }],
  },
  preferenceLearning: minimalPreferenceLearning,
  seeding: {
    mode: "generate",
    populationSize: 10,
    generate: {
      coverage: {
        strategy: "uniform-bins",
        maxAttempts: 100,
        specialOnly: { policy: "cap", maxFraction: 0.10 },
      },
      grammar: {},
    },
  },
  evolution: {
    motifMining: {
      enabled: false,
      eliteSelection: { perNicheTopK: 3, globalTopK: 10 },
      minSupport: 2,
      maxMotifLength: 5,
      ngramSizes: [2, 3],
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

  describe("runner.minPopulationSize", () => {
    it("returns valid true when minPopulationSize is a positive integer", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.runner.minPopulationSize = 8;
      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, true);
      assert.deepEqual(result.errors, []);
    });
  });

  describe("runner.maxPopulationSize", () => {
    it("returns valid true when maxPopulationSize is a positive integer", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.runner.maxPopulationSize = 48;
      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, true);
      assert.deepEqual(result.errors, []);
    });

    it("rejects maxPopulationSize less than 1", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.runner.maxPopulationSize = 0;
      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, false);
      assert.ok(
        result.errors.some(
          (error) =>
            error.path === "/runner/maxPopulationSize" &&
            error.keyword === "minimum",
        ),
      );
    });

    it("accepts config with both minPopulationSize and maxPopulationSize", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.runner.minPopulationSize = 8;
      candidate.runner.maxPopulationSize = 48;
      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, true);
      assert.deepEqual(result.errors, []);
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
          coverage: { strategy: "random", maxAttempts: 50, specialOnly: { policy: "cap", maxFraction: 0.10 } },
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
          coverage: { strategy: "random", maxAttempts: 50, specialOnly: { policy: "cap", maxFraction: 0.10 } },
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

    it("rejects missing coverage.specialOnly", () => {
      const candidate = cloneConfig(baseConfig);
      delete candidate.seeding.generate.coverage.specialOnly;

      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, false);
      assert.ok(
        result.errors.some(
          (error) =>
            error.path === "/seeding/generate/coverage/specialOnly" &&
            error.keyword === "required",
        ),
      );
    });

    it("accepts valid coverage.specialOnly with all fields", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.seeding.generate.coverage.specialOnly = {
        policy: "cap",
        maxFraction: 0.10,
        maxCount: 3,
        countTowardCoverage: false,
      };

      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, true);
      assert.deepEqual(result.errors, []);
    });

    it("accepts coverage.specialOnly with only policy", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.seeding.generate.coverage.specialOnly = { policy: "reject" };

      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, true);
      assert.deepEqual(result.errors, []);
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
          coverage: { strategy: "random", maxAttempts: 50, specialOnly: { policy: "cap", maxFraction: 0.10 } },
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

  describe("preferenceLearning validation", () => {
    it("rejects old humanFeedback shape", () => {
      const candidate = cloneConfig(baseConfig);
      delete candidate.preferenceLearning;
      candidate.humanFeedback = { enabled: false, mode: "comparison" };

      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, false);
    });

    it("accepts the new preferenceLearning shape", () => {
      const result = validateRunnerConfig(cloneConfig(baseConfig));
      assert.equal(result.valid, true);
      assert.deepEqual(result.errors, []);
    });

    it("accepts budget.baseMaxPerGen = 0", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.preferenceLearning.budget.baseMaxPerGen = 0;

      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, true);
      assert.deepEqual(result.errors, []);
    });

    it("rejects budget.baseMaxPerGen = -1", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.preferenceLearning.budget.baseMaxPerGen = -1;

      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, false);
      assert.ok(
        result.errors.some(
          (error) =>
            error.path === "/preferenceLearning/budget/baseMaxPerGen" &&
            error.keyword === "minimum",
        ),
      );
    });

    it("accepts all candidatePool.source enum values", () => {
      for (const source of ["shortlist", "elites", "evaluated", "mixed"]) {
        const candidate = cloneConfig(baseConfig);
        candidate.preferenceLearning.activeLearning.candidatePool.source = source;

        const result = validateRunnerConfig(candidate);
        assert.equal(result.valid, true, `source="${source}" should be valid`);
      }
    });

    it("rejects invalid candidatePool.source", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.preferenceLearning.activeLearning.candidatePool.source = "invalid";

      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, false);
      assert.ok(
        result.errors.some(
          (error) =>
            error.path === "/preferenceLearning/activeLearning/candidatePool/source" &&
            error.keyword === "enum",
        ),
      );
    });

    it("validates controller.freeze sub-object", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.preferenceLearning.controller.freeze.freezeAfterStableGens = 0;

      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, false);
      assert.ok(
        result.errors.some(
          (error) =>
            error.path === "/preferenceLearning/controller/freeze/freezeAfterStableGens" &&
            error.keyword === "minimum",
        ),
      );
    });

    it("validates controller.calibration sub-object", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.preferenceLearning.controller.calibration.strategy = "invalid";

      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, false);
      assert.ok(
        result.errors.some(
          (error) =>
            error.path === "/preferenceLearning/controller/calibration/strategy" &&
            error.keyword === "enum",
        ),
      );
    });

    it("validates controller.drift sub-object", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.preferenceLearning.controller.drift.unfreezeUncertaintyThreshold = 1.5;

      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, false);
      assert.ok(
        result.errors.some(
          (error) =>
            error.path === "/preferenceLearning/controller/drift/unfreezeUncertaintyThreshold" &&
            error.keyword === "maximum",
        ),
      );
    });

    it("validates controller.drift.ood sub-object", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.preferenceLearning.controller.drift.ood.featureDistance = "manhattan";

      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, false);
      assert.ok(
        result.errors.some(
          (error) =>
            error.path === "/preferenceLearning/controller/drift/ood/featureDistance" &&
            error.keyword === "enum",
        ),
      );
    });

    it("rejects missing required preferenceLearning sub-objects", () => {
      const candidate = cloneConfig(baseConfig);
      delete candidate.preferenceLearning.controller;

      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, false);
      assert.ok(
        result.errors.some(
          (error) =>
            error.path === "/preferenceLearning/controller" &&
            error.keyword === "required",
        ),
      );
    });

    it("accepts optional adaptive budget fields", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.preferenceLearning.budget.adaptive = {
        enabled: true,
        lowUncertaintyThreshold: 0.1,
        highUncertaintyThreshold: 0.35,
        scaleDownFactor: 0.5,
        scaleUpFactor: 1.5,
        onNewMetricIds: "forceUnfreeze",
      };

      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, true);
      assert.deepEqual(result.errors, []);
    });

    it("accepts candidatePool with focus config", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.preferenceLearning.activeLearning.candidatePool.focus = {
        strategy: "topQuantile",
        topQuantile: 0.25,
      };

      const result = validateRunnerConfig(candidate);
      assert.equal(result.valid, true);
      assert.deepEqual(result.errors, []);
    });
  });
});
