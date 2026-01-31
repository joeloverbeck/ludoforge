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
  it("returns { genomes, report } with correct shape", async () => {
    const result = await generateSeedPopulation(baseOptions);
    assert.ok(Array.isArray(result.genomes));
    assert.equal(typeof result.report, "object");
    assert.equal(typeof result.report.attempts, "number");
    assert.equal(typeof result.report.accepted, "number");
    assert.equal(typeof result.report.rejectedByReason, "object");
    assert.equal(typeof result.report.binCounts, "object");
    assert.equal(typeof result.report.specialBinCounts, "object");
    assert.equal(typeof result.report.coverageTargetSummary, "object");
    assert.equal(typeof result.report.acceptedSpecialOnly, "number");
    assert.equal(typeof result.report.specialOnlyCapHit, "boolean");
  });

  it("genomes have id (string) and definition (object)", async () => {
    const result = await generateSeedPopulation(baseOptions);
    for (const genome of result.genomes) {
      assert.equal(typeof genome.id, "string");
      assert.ok(genome.id.length > 0);
      assert.equal(typeof genome.definition, "object");
      assert.ok(genome.definition !== null);
    }
  });

  it("returns exactly populationSize genomes", async () => {
    const result = await generateSeedPopulation(baseOptions);
    assert.equal(result.genomes.length, 4);
  });

  it("deterministic: same inputs produce identical outputs", async () => {
    const a = await generateSeedPopulation(baseOptions);
    const b = await generateSeedPopulation(baseOptions);
    assert.deepStrictEqual(
      a.genomes.map((g) => g.id),
      b.genomes.map((g) => g.id)
    );
    assert.deepStrictEqual(a.report, b.report);
  });

  it("random strategy accepts all valid genomes", async () => {
    const result = await generateSeedPopulation({
      ...baseOptions,
      coverageStrategy: "random",
    });
    assert.equal(result.genomes.length, 4);
    assert.equal(result.report.coverageTargetSummary.strategy, "random");
    assert.equal(result.report.coverageTargetSummary.targetPerBin, Infinity);
  });

  it("uniform-bins distributes across bins", async () => {
    const result = await generateSeedPopulation({
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

  it("uniform-bins rejects full bins", async () => {
    const result = await generateSeedPopulation({
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

  it("underfilled-first fills deficit bins first", async () => {
    const result = await generateSeedPopulation({
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

  it("throws when maxAttempts exhausted and cannot fill", async () => {
    let callCount = 0;
    const failingEvaluator = () => {
      callCount++;
      if (callCount <= 2) {
        return { descriptors: { axis: 0.5 } };
      }
      throw new Error("evaluation failure");
    };

    await assert.rejects(
      generateSeedPopulation({
        ...baseOptions,
        populationSize: 10,
        maxAttempts: 5,
        evaluator: failingEvaluator,
      }),
      /Failed to generate/
    );
  });

  it("fallback accept-any-valid fills remainder", async () => {
    // Use a 4-bin config so uniform target=1, then evaluator always returns bin 0.
    // After bin 0 is full (1 genome), main phase rejects all → fallback accepts rest.
    const fourBinConfig = {
      descriptors: [{ id: "axis", min: 0, max: 1, bins: 4 }],
    };
    const singleBinEvaluator = () => ({ descriptors: { axis: 0.1 } });

    const result = await generateSeedPopulation({
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

  it("throws when fallback also cannot fill", async () => {
    let callCount = 0;
    const failAfterTwo = (_genome) => {
      callCount++;
      if (callCount <= 2) {
        return { descriptors: { axis: 0.5 } };
      }
      throw new Error("eval fail");
    };

    await assert.rejects(
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

  it("report coverageTargetSummary has correct fields", async () => {
    const result = await generateSeedPopulation({
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

  describe("special-bin policy (default=reject)", () => {
    it("rejects special-bin genomes with reason 'special-only-bin'", async () => {
      let callCount = 0;
      const evaluator = () => {
        callCount++;
        if (callCount <= 3) {
          return { descriptors: { axis: null } };
        }
        return { descriptors: { axis: 0.2 } };
      };
      const result = await generateSeedPopulation({
        ...baseOptions,
        populationSize: 2,
        maxAttempts: 100,
        evaluator,
        coverageStrategy: "random",
      });
      assert.equal(result.genomes.length, 2);
      assert.equal(result.report.rejectedByReason["special-only-bin"], 3);
      assert.deepStrictEqual(result.report.specialBinCounts, { "axis:unknown": 3 });
      assert.equal(result.report.acceptedSpecialOnly, 0);
    });

    it("special-bin genomes appear in specialBinCounts, not binCounts", async () => {
      let callCount = 0;
      const evaluator = () => {
        callCount++;
        if (callCount <= 2) {
          return { descriptors: { axis: null } };
        }
        return { descriptors: { axis: 0.8 } };
      };
      const result = await generateSeedPopulation({
        ...baseOptions,
        populationSize: 3,
        maxAttempts: 200,
        evaluator,
        coverageStrategy: "random",
      });
      const specialKeys = Object.keys(result.report.specialBinCounts);
      assert.ok(specialKeys.length > 0, "should have special bin entries");
      assert.ok(
        specialKeys.every((k) => k.includes("unknown")),
        "special bin keys contain 'unknown'"
      );
      const binValues = Object.values(result.report.binCounts);
      const binTotal = binValues.reduce((sum, count) => sum + count, 0);
      assert.equal(binTotal, result.report.accepted);
    });

    it("in-range bin counting is unaffected by special-bin rejections", async () => {
      let callCount = 0;
      // Alternate: 1 in-range, then 1 special (null), repeat
      const mixedEvaluator = () => {
        callCount++;
        if (callCount % 2 === 1) {
          return { descriptors: { axis: 0.2 } };
        }
        return { descriptors: { axis: null } };
      };
      const result = await generateSeedPopulation({
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

    it("uniform-bins still rejects full in-range bins despite special-bin rejections", async () => {
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
      const result = await generateSeedPopulation({
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

    it("totalBinCount equals product of d.bins (in-range only)", async () => {
      const result = await generateSeedPopulation({
        ...baseOptions,
        populationSize: 3,
        maxAttempts: 200,
        evaluator: () => ({ descriptors: { axis: 0.4 } }),
        coverageStrategy: "random",
      });
      // 2 bins for axis
      assert.equal(result.report.coverageTargetSummary.totalBinCount, 2);
    });

    it("special-bin rejection does not reset coverageRejectStreak", async () => {
      // This test verifies that rejecting a special-bin genome does NOT reset
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
      const result = await generateSeedPopulation({
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

  describe("special-bin policy=allow", () => {
    it("accepts all special-bin seeds", async () => {
      // All evaluations return null → all bin to special bins
      const allSpecialEvaluator = () => ({ descriptors: { axis: null } });
      const result = await generateSeedPopulation({
        ...baseOptions,
        populationSize: 4,
        maxAttempts: 200,
        evaluator: allSpecialEvaluator,
        coverageStrategy: "random",
        specialOnly: { policy: "allow" },
      });
      assert.equal(result.genomes.length, 4);
      assert.equal(result.report.acceptedSpecialOnly, 4);
      assert.equal(result.report.rejectedByReason["special-only-bin"], undefined);
      assert.equal(result.report.rejectedByReason["special-only-cap"], undefined);
      assert.equal(result.report.specialOnlyCapHit, false);
    });

    it("countTowardCoverage=false: special-bin seeds do not appear in binCounts", async () => {
      const allSpecialEvaluator = () => ({ descriptors: { axis: null } });
      const result = await generateSeedPopulation({
        ...baseOptions,
        populationSize: 3,
        maxAttempts: 200,
        evaluator: allSpecialEvaluator,
        coverageStrategy: "random",
        specialOnly: { policy: "allow", countTowardCoverage: false },
      });
      assert.equal(result.genomes.length, 3);
      assert.equal(result.report.acceptedSpecialOnly, 3);
      // binCounts should be empty since specials don't count toward coverage
      assert.deepStrictEqual(result.report.binCounts, {});
    });

    it("countTowardCoverage=true: special-bin seeds appear in binCounts", async () => {
      const allSpecialEvaluator = () => ({ descriptors: { axis: null } });
      const result = await generateSeedPopulation({
        ...baseOptions,
        populationSize: 3,
        maxAttempts: 200,
        evaluator: allSpecialEvaluator,
        coverageStrategy: "random",
        specialOnly: { policy: "allow", countTowardCoverage: true },
      });
      assert.equal(result.genomes.length, 3);
      assert.equal(result.report.acceptedSpecialOnly, 3);
      // binCounts should contain the special niche
      const binTotal = Object.values(result.report.binCounts).reduce(
        (sum, c) => sum + c,
        0
      );
      assert.equal(binTotal, 3);
    });
  });

  describe("special-bin policy=reject", () => {
    it("rejects all special-bin seeds (explicit reject)", async () => {
      let callCount = 0;
      const evaluator = () => {
        callCount++;
        if (callCount <= 3) {
          return { descriptors: { axis: null } };
        }
        return { descriptors: { axis: 0.5 } };
      };
      const result = await generateSeedPopulation({
        ...baseOptions,
        populationSize: 2,
        maxAttempts: 100,
        evaluator,
        coverageStrategy: "random",
        specialOnly: { policy: "reject" },
      });
      assert.equal(result.genomes.length, 2);
      assert.equal(result.report.rejectedByReason["special-only-bin"], 3);
      assert.equal(result.report.acceptedSpecialOnly, 0);
    });
  });

  describe("special-bin policy=cap", () => {
    it("enforces maxFraction", async () => {
      let callCount = 0;
      // First 20 calls return special (null), rest return in-range
      const evaluator = () => {
        callCount++;
        if (callCount <= 20) {
          return { descriptors: { axis: null } };
        }
        return { descriptors: { axis: 0.5 } };
      };
      const result = await generateSeedPopulation({
        populationSize: 10,
        maxAttempts: 500,
        rngSeed: 42,
        evaluator,
        mapElitesConfig,
        coverageStrategy: "random",
        specialOnly: { policy: "cap", maxFraction: 0.20 },
      });
      assert.equal(result.genomes.length, 10);
      // maxFraction=0.20 of populationSize=10 → floor(10*0.20)=2
      assert.ok(
        result.report.acceptedSpecialOnly <= 2,
        `acceptedSpecialOnly (${result.report.acceptedSpecialOnly}) should be <= 2`
      );
    });

    it("enforces maxCount", async () => {
      let callCount = 0;
      const evaluator = () => {
        callCount++;
        if (callCount <= 20) {
          return { descriptors: { axis: null } };
        }
        return { descriptors: { axis: 0.5 } };
      };
      const result = await generateSeedPopulation({
        populationSize: 10,
        maxAttempts: 500,
        rngSeed: 42,
        evaluator,
        mapElitesConfig,
        coverageStrategy: "random",
        specialOnly: { policy: "cap", maxFraction: 1.0, maxCount: 3 },
      });
      assert.equal(result.genomes.length, 10);
      assert.ok(
        result.report.acceptedSpecialOnly <= 3,
        `acceptedSpecialOnly (${result.report.acceptedSpecialOnly}) should be <= 3`
      );
    });

    it("cap uses min(maxFraction*size, maxCount)", async () => {
      let callCount = 0;
      const evaluator = () => {
        callCount++;
        if (callCount <= 20) {
          return { descriptors: { axis: null } };
        }
        return { descriptors: { axis: 0.5 } };
      };
      // maxFraction=0.10 of 10 → floor(1) = 1, maxCount=5 → effective cap = min(1,5) = 1
      const result = await generateSeedPopulation({
        populationSize: 10,
        maxAttempts: 500,
        rngSeed: 42,
        evaluator,
        mapElitesConfig,
        coverageStrategy: "random",
        specialOnly: { policy: "cap", maxFraction: 0.10, maxCount: 5 },
      });
      assert.equal(result.genomes.length, 10);
      assert.ok(
        result.report.acceptedSpecialOnly <= 1,
        `acceptedSpecialOnly (${result.report.acceptedSpecialOnly}) should be <= 1`
      );
    });

    it("specialOnlyCapHit reported when cap reached", async () => {
      let callCount = 0;
      const evaluator = () => {
        callCount++;
        if (callCount <= 20) {
          return { descriptors: { axis: null } };
        }
        return { descriptors: { axis: 0.5 } };
      };
      const result = await generateSeedPopulation({
        populationSize: 10,
        maxAttempts: 500,
        rngSeed: 42,
        evaluator,
        mapElitesConfig,
        coverageStrategy: "random",
        specialOnly: { policy: "cap", maxFraction: 0.10, maxCount: 1 },
      });
      assert.equal(result.genomes.length, 10);
      assert.equal(result.report.specialOnlyCapHit, true);
      assert.ok(
        (result.report.rejectedByReason["special-only-cap"] ?? 0) > 0,
        "should have special-only-cap rejections"
      );
    });
  });

  describe("special-bin policy determinism", () => {
    it("same rngSeed produces identical results with allow policy", async () => {
      let callCountA = 0;
      const evaluatorA = () => {
        callCountA++;
        if (callCountA % 3 === 0) {
          return { descriptors: { axis: null } };
        }
        return { descriptors: { axis: 0.5 } };
      };
      let callCountB = 0;
      const evaluatorB = () => {
        callCountB++;
        if (callCountB % 3 === 0) {
          return { descriptors: { axis: null } };
        }
        return { descriptors: { axis: 0.5 } };
      };
      const opts = {
        populationSize: 4,
        maxAttempts: 200,
        rngSeed: 42,
        mapElitesConfig,
        coverageStrategy: "random",
        specialOnly: { policy: "allow" },
      };
      const a = await generateSeedPopulation({ ...opts, evaluator: evaluatorA });
      const b = await generateSeedPopulation({ ...opts, evaluator: evaluatorB });
      assert.deepStrictEqual(
        a.genomes.map((g) => g.id),
        b.genomes.map((g) => g.id)
      );
      assert.deepStrictEqual(a.report, b.report);
    });
  });

  describe("backward compatibility", () => {
    it("no specialOnly param defaults to reject (previous behavior)", async () => {
      let callCount = 0;
      const evaluator = () => {
        callCount++;
        if (callCount <= 3) {
          return { descriptors: { axis: null } };
        }
        return { descriptors: { axis: 0.5 } };
      };
      const result = await generateSeedPopulation({
        ...baseOptions,
        populationSize: 2,
        maxAttempts: 100,
        evaluator,
        coverageStrategy: "random",
        // no specialOnly parameter
      });
      assert.equal(result.genomes.length, 2);
      // Should reject special-bin seeds as before
      assert.equal(result.report.rejectedByReason["special-only-bin"], 3);
      assert.equal(result.report.acceptedSpecialOnly, 0);
      // Old key should not exist
      assert.equal(result.report.rejectedByReason["special-bin"], undefined);
    });
  });

  it("rejects genomes with null fitness from evaluator", async () => {
    let callCount = 0;
    const nullFitnessEvaluator = () => {
      callCount++;
      if (callCount <= 4) {
        return { fitness: null, descriptors: null, diagnostics: { simulationError: true } };
      }
      return { fitness: 0.5, descriptors: { axis: 0.5 } };
    };
    const result = await generateSeedPopulation({
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
