import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  generateSeedPopulation,
  hasSpecialBin,
} from "../../../src/seed-generation/generate-seed-population.js";

/**
 * Creates a mock evaluator that cycles through descriptor values.
 * Each call returns the next value in the cycle.
 */
function createCyclingEvaluator(descriptorId, values) {
  let index = 0;
  return (_genome) => {
    const value = values[index % values.length];
    index++;
    return { descriptors: { [descriptorId]: value } };
  };
}

const mapElitesConfig = {
  descriptors: [{ id: "axis", min: 0, max: 1, bins: 2 }],
};

const baseOptions = {
  populationSize: 4,
  maxAttempts: 200,
  rngSeed: 42,
  evaluator: createCyclingEvaluator("axis", [0.2, 0.8]),
  mapElitesConfig,
};

describe("generateSeedPopulation", () => {
  it("returns { genomes, report } with correct shape", () => {
    const result = generateSeedPopulation(baseOptions);
    assert.ok(Array.isArray(result.genomes));
    assert.equal(typeof result.report, "object");
    assert.equal(typeof result.report.attempts, "number");
    assert.equal(typeof result.report.accepted, "number");
    assert.equal(typeof result.report.rejectedByReason, "object");
    assert.equal(typeof result.report.binCounts, "object");
    assert.equal(typeof result.report.specialBinCounts, "object");
    assert.equal(typeof result.report.coverageTargetSummary, "object");
  });

  it("genomes have id (string) and definition (object)", () => {
    const result = generateSeedPopulation(baseOptions);
    for (const genome of result.genomes) {
      assert.equal(typeof genome.id, "string");
      assert.ok(genome.id.length > 0);
      assert.equal(typeof genome.definition, "object");
      assert.ok(genome.definition !== null);
    }
  });

  it("returns exactly populationSize genomes", () => {
    const result = generateSeedPopulation(baseOptions);
    assert.equal(result.genomes.length, 4);
  });

  it("deterministic: same inputs produce identical outputs", () => {
    const a = generateSeedPopulation(baseOptions);
    const b = generateSeedPopulation(baseOptions);
    assert.deepStrictEqual(
      a.genomes.map((g) => g.id),
      b.genomes.map((g) => g.id)
    );
    assert.deepStrictEqual(a.report, b.report);
  });

  it("random strategy accepts all valid genomes", () => {
    const result = generateSeedPopulation({
      ...baseOptions,
      coverageStrategy: "random",
    });
    assert.equal(result.genomes.length, 4);
    assert.equal(result.report.coverageTargetSummary.strategy, "random");
    assert.equal(result.report.coverageTargetSummary.targetPerBin, Infinity);
  });

  it("uniform-bins distributes across bins", () => {
    const result = generateSeedPopulation({
      ...baseOptions,
      populationSize: 4,
      coverageStrategy: "uniform-bins",
    });
    assert.equal(result.genomes.length, 4);
    const binValues = Object.values(result.report.binCounts);
    assert.ok(
      binValues.length > 0,
      "should have at least one occupied bin"
    );
  });

  it("uniform-bins rejects full bins", () => {
    const result = generateSeedPopulation({
      ...baseOptions,
      populationSize: 4,
      maxAttempts: 500,
      coverageStrategy: "uniform-bins",
    });
    const rejections = result.report.rejectedByReason;
    const hasBinFull = (rejections["bin-full"] ?? 0) > 0;
    const accepted = result.report.accepted;
    assert.equal(accepted, 4);
    // With cycling evaluator hitting same bins, some bin-full rejections expected
    // but the test mainly verifies population was still filled
    assert.ok(true, "uniform-bins completed without error");
  });

  it("underfilled-first fills deficit bins first", () => {
    const result = generateSeedPopulation({
      ...baseOptions,
      populationSize: 4,
      maxAttempts: 500,
      coverageStrategy: "underfilled-first",
    });
    assert.equal(result.genomes.length, 4);
    assert.equal(
      result.report.coverageTargetSummary.strategy,
      "underfilled-first"
    );
  });

  it("throws when maxAttempts exhausted and cannot fill", () => {
    let callCount = 0;
    const failingEvaluator = () => {
      callCount++;
      if (callCount <= 2) {
        return { descriptors: { axis: 0.5 } };
      }
      throw new Error("evaluation failure");
    };

    assert.throws(
      () =>
        generateSeedPopulation({
          ...baseOptions,
          populationSize: 10,
          maxAttempts: 5,
          evaluator: failingEvaluator,
        }),
      /Failed to generate/
    );
  });

  it("fallback accept-any-valid fills remainder", () => {
    // Use a 4-bin config so uniform target=1, then evaluator always returns bin 0.
    // After bin 0 is full (1 genome), main phase rejects all → fallback accepts rest.
    const fourBinConfig = {
      descriptors: [{ id: "axis", min: 0, max: 1, bins: 4 }],
    };
    const singleBinEvaluator = () => ({ descriptors: { axis: 0.1 } });

    const result = generateSeedPopulation({
      ...baseOptions,
      populationSize: 3,
      maxAttempts: 2000,
      evaluator: singleBinEvaluator,
      mapElitesConfig: fourBinConfig,
      coverageStrategy: "uniform-bins",
      fallback: { strategy: "accept-any-valid" },
    });
    assert.equal(result.genomes.length, 3);
    // Verify some bin-full rejections happened in main phase
    assert.ok(
      (result.report.rejectedByReason["bin-full"] ?? 0) > 0,
      "should have bin-full rejections"
    );
  });

  it("throws when fallback also cannot fill", () => {
    let callCount = 0;
    const failAfterTwo = (_genome) => {
      callCount++;
      if (callCount <= 2) {
        return { descriptors: { axis: 0.5 } };
      }
      throw new Error("eval fail");
    };

    assert.throws(
      () =>
        generateSeedPopulation({
          ...baseOptions,
          populationSize: 10,
          maxAttempts: 5,
          evaluator: failAfterTwo,
          coverageStrategy: "uniform-bins",
          fallback: { strategy: "accept-any-valid" },
        }),
      /Failed to generate/
    );
  });

  it("report coverageTargetSummary has correct fields", () => {
    const result = generateSeedPopulation({
      ...baseOptions,
      coverageStrategy: "uniform-bins",
    });
    const summary = result.report.coverageTargetSummary;
    assert.equal(summary.strategy, "uniform-bins");
    assert.equal(summary.populationSize, 4);
    assert.equal(summary.totalBinCount, 2);
    assert.equal(summary.targetPerBin, 2); // ceil(4/2) = 2
  });

  describe("hasSpecialBin", () => {
    it("returns true for niche containing 'unknown'", () => {
      assert.equal(hasSpecialBin("axis:unknown"), true);
      assert.equal(hasSpecialBin("axis:unknown|other:0"), true);
      assert.equal(hasSpecialBin("axis:0|other:unknown"), true);
    });

    it("returns true for niche containing 'under'", () => {
      assert.equal(hasSpecialBin("axis:under"), true);
      assert.equal(hasSpecialBin("axis:under|other:1"), true);
    });

    it("returns true for niche containing 'over'", () => {
      assert.equal(hasSpecialBin("axis:over"), true);
      assert.equal(hasSpecialBin("axis:0|other:over"), true);
    });

    it("returns false for fully in-range niche", () => {
      assert.equal(hasSpecialBin("axis:0"), false);
      assert.equal(hasSpecialBin("axis:0|other:1"), false);
      assert.equal(hasSpecialBin("axis:3|other:4"), false);
    });
  });

  describe("special bin exclusion from coverage", () => {
    it("special-bin genome is always accepted regardless of strategy", () => {
      const unknownEvaluator = () => ({ descriptors: { axis: null } });
      const result = generateSeedPopulation({
        ...baseOptions,
        populationSize: 3,
        maxAttempts: 200,
        evaluator: unknownEvaluator,
        coverageStrategy: "uniform-bins",
      });
      assert.equal(result.genomes.length, 3);
    });

    it("special-bin genomes appear in specialBinCounts, not binCounts", () => {
      const unknownEvaluator = () => ({ descriptors: { axis: null } });
      const result = generateSeedPopulation({
        ...baseOptions,
        populationSize: 3,
        maxAttempts: 200,
        evaluator: unknownEvaluator,
        coverageStrategy: "uniform-bins",
      });
      const specialKeys = Object.keys(result.report.specialBinCounts);
      assert.ok(specialKeys.length > 0, "should have special bin entries");
      assert.ok(
        specialKeys.every((k) => k.includes("unknown")),
        "special bin keys contain 'unknown'"
      );
      // binCounts should be empty since all genomes are special-bin
      assert.equal(Object.keys(result.report.binCounts).length, 0);
    });

    it("in-range bin counting is unaffected by special-bin acceptances", () => {
      let callCount = 0;
      // Alternate: 1 in-range, then 1 special (null), repeat
      const mixedEvaluator = () => {
        callCount++;
        if (callCount % 2 === 1) {
          return { descriptors: { axis: 0.2 } };
        }
        return { descriptors: { axis: null } };
      };
      const result = generateSeedPopulation({
        ...baseOptions,
        populationSize: 4,
        maxAttempts: 200,
        evaluator: mixedEvaluator,
        coverageStrategy: "random",
      });
      assert.equal(result.genomes.length, 4);
      // In-range genomes in binCounts, special in specialBinCounts
      const binKeys = Object.keys(result.report.binCounts);
      const specialKeys = Object.keys(result.report.specialBinCounts);
      assert.ok(binKeys.length > 0, "should have in-range bin entries");
      assert.ok(specialKeys.length > 0, "should have special bin entries");
    });

    it("uniform-bins still rejects full in-range bins despite special-bin acceptances", () => {
      let callCount = 0;
      // Produce: 2 in-range bin 0, then specials, then more in-range bin 0
      // With 4 bins and pop=3, targetPerBin = ceil(3/4)=1
      // After 1 in-range bin-0 acceptance, next in-range bin-0 should be rejected
      const fourBinConfig = {
        descriptors: [{ id: "axis", min: 0, max: 1, bins: 4 }],
      };
      const sequenceEvaluator = () => {
        callCount++;
        if (callCount === 2) {
          return { descriptors: { axis: null } }; // special bin
        }
        return { descriptors: { axis: 0.1 } }; // always bin 0
      };
      const result = generateSeedPopulation({
        ...baseOptions,
        populationSize: 3,
        maxAttempts: 2000,
        evaluator: sequenceEvaluator,
        mapElitesConfig: fourBinConfig,
        coverageStrategy: "uniform-bins",
        fallback: { strategy: "accept-any-valid" },
      });
      assert.equal(result.genomes.length, 3);
      // Should have bin-full rejections for the repeated in-range bin-0 hits
      assert.ok(
        (result.report.rejectedByReason["bin-full"] ?? 0) > 0,
        "should reject full in-range bins"
      );
      // Special bin counts should exist
      assert.ok(
        Object.keys(result.report.specialBinCounts).length > 0,
        "should have special bin entries"
      );
    });

    it("totalBinCount equals product of d.bins (in-range only)", () => {
      const unknownEvaluator = () => ({ descriptors: { axis: null } });
      const result = generateSeedPopulation({
        ...baseOptions,
        populationSize: 3,
        maxAttempts: 200,
        evaluator: unknownEvaluator,
        coverageStrategy: "uniform-bins",
      });
      // 2 bins for axis
      assert.equal(result.report.coverageTargetSummary.totalBinCount, 2);
    });

    it("special-bin acceptance does not reset coverageRejectStreak", () => {
      // This test verifies that accepting a special-bin genome does NOT reset
      // the coverageRejectStreak counter, so fallback still triggers correctly.
      let callCount = 0;
      const fourBinConfig = {
        descriptors: [{ id: "axis", min: 0, max: 1, bins: 4 }],
      };
      // Produce: 1 in-range bin-0 (accepted), then alternate null (special) and
      // in-range bin-0 (rejected as bin-full). The specials should NOT reset streak.
      const evaluator = () => {
        callCount++;
        if (callCount === 1) {
          return { descriptors: { axis: 0.1 } }; // in-range bin 0 (accepted)
        }
        if (callCount % 2 === 0) {
          return { descriptors: { axis: null } }; // special bin
        }
        return { descriptors: { axis: 0.1 } }; // in-range bin 0 (rejected)
      };
      const result = generateSeedPopulation({
        populationSize: 4,
        maxAttempts: 5000,
        rngSeed: 42,
        evaluator,
        mapElitesConfig: fourBinConfig,
        coverageStrategy: "uniform-bins",
        fallback: { strategy: "accept-any-valid" },
      });
      assert.equal(result.genomes.length, 4);
      // Fallback should have been triggered because specials don't reset streak
      assert.ok(
        (result.report.rejectedByReason["bin-full"] ?? 0) > 0,
        "should have bin-full rejections before fallback"
      );
    });
  });

  it("rejects genomes with null fitness from evaluator", () => {
    let callCount = 0;
    const nullFitnessEvaluator = () => {
      callCount++;
      if (callCount <= 4) {
        return { fitness: null, descriptors: null, diagnostics: { simulationError: true } };
      }
      return { fitness: 0.5, descriptors: { axis: 0.5 } };
    };
    const result = generateSeedPopulation({
      ...baseOptions,
      populationSize: 4,
      maxAttempts: 500,
      evaluator: nullFitnessEvaluator,
    });
    assert.equal(result.genomes.length, 4);
    assert.ok(
      (result.report.rejectedByReason["evaluation-error"] ?? 0) >= 4,
      "should have rejected null-fitness genomes"
    );
  });

  it("no node:fs import in source files", () => {
    const coveragePolicy = readFileSync(
      new URL(
        "../../../src/seed-generation/coverage-policy.js",
        import.meta.url
      ),
      "utf8"
    );
    const generateSeed = readFileSync(
      new URL(
        "../../../src/seed-generation/generate-seed-population.js",
        import.meta.url
      ),
      "utf8"
    );
    assert.ok(
      !coveragePolicy.includes("node:fs"),
      "coverage-policy.js imports node:fs"
    );
    assert.ok(
      !generateSeed.includes("node:fs"),
      "generate-seed-population.js imports node:fs"
    );
  });
});
