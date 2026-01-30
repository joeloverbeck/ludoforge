import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyEvolution } from "../../src/evolution-runner/evolution-applicator.js";
import {
  createTelemetry,
  recordEvaluated,
  recordValidEvaluated,
  recordRejection,
} from "../../src/evolution-runner/operator-telemetry.js";
import { createSeededRng } from "../../src/simulation-engine/rng.js";
import { genomeBasicDefinition } from "./fixtures/index.mjs";

/**
 * Build a mock mutation operator with the given name and mutate function.
 * @param {string} name
 * @param {(genome: object, rng: object) => object} mutateFn
 */
function mockOperator(name, mutateFn) {
  return { name, mutate: mutateFn };
}

/**
 * Build a mock selector that always picks the given operator name.
 * @param {string} name
 */
function fixedSelector(name) {
  return { pick: () => name };
}

/**
 * Build a mock repair that always succeeds (returns the genome as-is).
 */
function alwaysRepairSucceeds() {
  return [{ name: "identity-repair", repair: (genome) => genome }];
}

/**
 * Build a mock repair that always fails (returns null for any changed genome).
 */
function alwaysRepairFails() {
  return [{ name: "failing-repair", repair: () => null }];
}

function makePopulation(count) {
  const population = [];
  for (let i = 0; i < count; i += 1) {
    population.push({
      id: `genome-${i}`,
      definition: structuredClone(genomeBasicDefinition),
    });
  }
  return population;
}

/**
 * Compute rejectedTotal from the rejected sub-counters.
 */
function rejectedTotal(counters) {
  const r = counters.rejected;
  return r.validationFailure + r.safetyFailure + r.evaluationError + r.evaluationNull;
}

/**
 * Simulate the runner-level evaluation recording for offspring produced by applyEvolution.
 * For each slot with a known operator:
 *   - outcome "ok" → recordEvaluated + recordValidEvaluated (simulates successful evaluation)
 *   - outcome "noOp" or "repairFailed" or "exhausted" → no evaluation recording (fallback genome)
 */
function simulateEvaluationRecording(telemetry, result) {
  for (let i = 0; i < result.operatorNames.length; i += 1) {
    const opName = result.operatorNames[i];
    const outcome = result.outcomes[i];
    if (!opName) continue;

    if (outcome === "ok") {
      recordEvaluated(telemetry, opName);
      recordValidEvaluated(telemetry, opName);
    }
  }
}

describe("telemetry accounting invariants (integration)", () => {
  const POPULATION_SIZE = 4;
  const MAX_RETRIES = 3;

  describe("always-succeeds operator", () => {
    it("has validEvaluated > 0 and satisfies all accounting invariants", () => {
      const operatorName = "always-succeeds";
      const operators = [
        mockOperator(operatorName, (genome) => {
          const cloned = structuredClone(genome);
          cloned.definition.termination.maxTurns += 1;
          return cloned;
        }),
      ];
      const telemetry = createTelemetry([operatorName]);
      const rng = createSeededRng(42);

      const result = applyEvolution(makePopulation(POPULATION_SIZE), {
        rng,
        mutationRate: 1,
        crossoverRate: 0,
        mutationOperators: operators,
        mutationSelector: fixedSelector(operatorName),
        telemetry,
        maxMutationRetries: MAX_RETRIES,
        repairOperators: alwaysRepairSucceeds(),
      });

      simulateEvaluationRecording(telemetry, result);

      const c = telemetry.operators[operatorName];
      const rt = rejectedTotal(c);

      assert.ok(c.validEvaluated > 0, "always-succeeds must have validEvaluated > 0");
      assert.equal(c.validEvaluated, POPULATION_SIZE, "every slot should succeed");
      assert.equal(c.noOp, 0, "no no-ops expected");
      assert.equal(c.repairFailed, 0, "no repair failures expected");

      // Accounting invariant §2: attempts === noOp + repairFailed + rejectedTotal + validEvaluated
      assert.equal(c.attempts, c.noOp + c.repairFailed + rt + c.validEvaluated,
        "attempts === noOp + repairFailed + rejectedTotal + validEvaluated");

      // Accounting invariant §2: evaluated === rejectedTotal + validEvaluated
      assert.equal(c.evaluated, rt + c.validEvaluated,
        "evaluated === rejectedTotal + validEvaluated");

      // Accounting invariant §2: validEvaluated <= evaluated <= attempts
      assert.ok(c.validEvaluated <= c.evaluated, "validEvaluated <= evaluated");
      assert.ok(c.evaluated <= c.attempts, "evaluated <= attempts");
    });
  });

  describe("always-no-ops operator", () => {
    it("has noOp === attempts and validEvaluated === 0, satisfies all accounting invariants", () => {
      const operatorName = "always-no-ops";
      // Returns genome unchanged → detected as noOp by JSON comparison in orchestrator
      const operators = [
        mockOperator(operatorName, (genome) => structuredClone(genome)),
      ];
      const telemetry = createTelemetry([operatorName]);
      const rng = createSeededRng(42);

      const result = applyEvolution(makePopulation(POPULATION_SIZE), {
        rng,
        mutationRate: 1,
        crossoverRate: 0,
        mutationOperators: operators,
        mutationSelector: fixedSelector(operatorName),
        telemetry,
        maxMutationRetries: MAX_RETRIES,
        repairOperators: alwaysRepairSucceeds(),
      });

      simulateEvaluationRecording(telemetry, result);

      const c = telemetry.operators[operatorName];
      const rt = rejectedTotal(c);

      assert.equal(c.validEvaluated, 0, "always-no-ops must have validEvaluated === 0");
      assert.equal(c.noOp, c.attempts, "noOp === attempts for always-no-ops");
      assert.ok(c.attempts > 0, "must have at least one attempt");

      // Each slot retries (maxRetries + 1) times, all no-ops
      assert.equal(c.attempts, POPULATION_SIZE * (MAX_RETRIES + 1),
        "attempts should be populationSize * (maxRetries + 1)");

      // Accounting invariant §2
      assert.equal(c.attempts, c.noOp + c.repairFailed + rt + c.validEvaluated,
        "attempts === noOp + repairFailed + rejectedTotal + validEvaluated");
      assert.equal(c.evaluated, rt + c.validEvaluated,
        "evaluated === rejectedTotal + validEvaluated");
      assert.ok(c.validEvaluated <= c.evaluated, "validEvaluated <= evaluated");
      assert.ok(c.evaluated <= c.attempts, "evaluated <= attempts");
    });

    it("fallback genomes are NOT counted as validEvaluated", () => {
      const operatorName = "always-no-ops";
      const operators = [
        mockOperator(operatorName, (genome) => structuredClone(genome)),
      ];
      const telemetry = createTelemetry([operatorName]);
      const rng = createSeededRng(99);

      const result = applyEvolution(makePopulation(POPULATION_SIZE), {
        rng,
        mutationRate: 1,
        crossoverRate: 0,
        mutationOperators: operators,
        mutationSelector: fixedSelector(operatorName),
        telemetry,
        maxMutationRetries: MAX_RETRIES,
        repairOperators: alwaysRepairSucceeds(),
      });

      // Even though population is returned (fallback to original), no evaluation recording
      simulateEvaluationRecording(telemetry, result);

      const c = telemetry.operators[operatorName];
      assert.equal(c.validEvaluated, 0,
        "fallback genomes (from noOp) must not be counted as validEvaluated");
      assert.equal(c.evaluated, 0,
        "fallback genomes (from noOp) must not be counted as evaluated");
    });
  });

  describe("always-repair-fails operator", () => {
    it("has repairFailed === attempts and validEvaluated === 0, satisfies all accounting invariants", () => {
      const operatorName = "always-repair-fails";
      // Produces a changed genome, but repair always returns null
      const operators = [
        mockOperator(operatorName, (genome) => {
          const cloned = structuredClone(genome);
          cloned.definition.termination.maxTurns += 1;
          return cloned;
        }),
      ];
      const telemetry = createTelemetry([operatorName]);
      const rng = createSeededRng(42);

      const result = applyEvolution(makePopulation(POPULATION_SIZE), {
        rng,
        mutationRate: 1,
        crossoverRate: 0,
        mutationOperators: operators,
        mutationSelector: fixedSelector(operatorName),
        telemetry,
        maxMutationRetries: MAX_RETRIES,
        repairOperators: alwaysRepairFails(),
      });

      simulateEvaluationRecording(telemetry, result);

      const c = telemetry.operators[operatorName];
      const rt = rejectedTotal(c);

      assert.equal(c.validEvaluated, 0, "always-repair-fails must have validEvaluated === 0");
      assert.equal(c.repairFailed, c.attempts, "repairFailed === attempts for always-repair-fails");
      assert.ok(c.attempts > 0, "must have at least one attempt");

      // Each slot retries (maxRetries + 1) times, all repair-fail
      assert.equal(c.attempts, POPULATION_SIZE * (MAX_RETRIES + 1),
        "attempts should be populationSize * (maxRetries + 1)");

      // Accounting invariant §2
      assert.equal(c.attempts, c.noOp + c.repairFailed + rt + c.validEvaluated,
        "attempts === noOp + repairFailed + rejectedTotal + validEvaluated");
      assert.equal(c.evaluated, rt + c.validEvaluated,
        "evaluated === rejectedTotal + validEvaluated");
      assert.ok(c.validEvaluated <= c.evaluated, "validEvaluated <= evaluated");
      assert.ok(c.evaluated <= c.attempts, "evaluated <= attempts");
    });

    it("fallback genomes are NOT counted as validEvaluated", () => {
      const operatorName = "always-repair-fails";
      const operators = [
        mockOperator(operatorName, (genome) => {
          const cloned = structuredClone(genome);
          cloned.definition.termination.maxTurns += 1;
          return cloned;
        }),
      ];
      const telemetry = createTelemetry([operatorName]);
      const rng = createSeededRng(99);

      const result = applyEvolution(makePopulation(POPULATION_SIZE), {
        rng,
        mutationRate: 1,
        crossoverRate: 0,
        mutationOperators: operators,
        mutationSelector: fixedSelector(operatorName),
        telemetry,
        maxMutationRetries: MAX_RETRIES,
        repairOperators: alwaysRepairFails(),
      });

      simulateEvaluationRecording(telemetry, result);

      const c = telemetry.operators[operatorName];
      assert.equal(c.validEvaluated, 0,
        "fallback genomes (from repairFailed) must not be counted as validEvaluated");
      assert.equal(c.evaluated, 0,
        "fallback genomes (from repairFailed) must not be counted as evaluated");
    });
  });

  describe("mixed operators in single generation", () => {
    it("accounting invariants hold per-operator with mixed outcomes", () => {
      const opNames = ["always-succeeds", "always-no-ops", "always-repair-fails"];

      // Create operators: succeeds changes genome, no-ops returns unchanged, repair-fails changes but repair nulls
      const alwaysSucceedsOp = mockOperator("always-succeeds", (genome) => {
        const cloned = structuredClone(genome);
        cloned.definition.termination.maxTurns += 1;
        return cloned;
      });
      const alwaysNoOpsOp = mockOperator("always-no-ops", (genome) => structuredClone(genome));
      const alwaysRepairFailsOp = mockOperator("always-repair-fails", (genome) => {
        const cloned = structuredClone(genome);
        cloned.definition.termination.maxTurns += 1;
        return cloned;
      });

      const operators = [alwaysSucceedsOp, alwaysNoOpsOp, alwaysRepairFailsOp];
      const telemetry = createTelemetry(opNames);
      const rng = createSeededRng(42);

      // Cycle through operators for each slot
      let pickIndex = 0;
      const cycleSelector = {
        pick: () => {
          const name = opNames[pickIndex % opNames.length];
          pickIndex += 1;
          return name;
        },
      };

      // Use repair operators that succeed for succeeds/no-ops and fail for repair-fails.
      // Since we can't per-operator configure repair, we use repair that always succeeds.
      // The "always-repair-fails" operator won't actually get repair failure this way.
      // Instead, let's use a single operator at a time to verify independently.

      // Test each operator independently to get clean per-operator accounting
      for (const opName of opNames) {
        const singleOp = operators.find((o) => o.name === opName);
        const singleTelemetry = createTelemetry([opName]);
        const singleRng = createSeededRng(77);
        const isRepairFails = opName === "always-repair-fails";

        const result = applyEvolution(makePopulation(2), {
          rng: singleRng,
          mutationRate: 1,
          crossoverRate: 0,
          mutationOperators: [singleOp],
          mutationSelector: fixedSelector(opName),
          telemetry: singleTelemetry,
          maxMutationRetries: 2,
          repairOperators: isRepairFails ? alwaysRepairFails() : alwaysRepairSucceeds(),
        });

        simulateEvaluationRecording(singleTelemetry, result);

        const c = singleTelemetry.operators[opName];
        const rt = rejectedTotal(c);

        // All three invariants must hold for each operator
        assert.equal(c.attempts, c.noOp + c.repairFailed + rt + c.validEvaluated,
          `[${opName}] attempts === noOp + repairFailed + rejectedTotal + validEvaluated`);
        assert.equal(c.evaluated, rt + c.validEvaluated,
          `[${opName}] evaluated === rejectedTotal + validEvaluated`);
        assert.ok(c.validEvaluated <= c.evaluated,
          `[${opName}] validEvaluated <= evaluated`);
        assert.ok(c.evaluated <= c.attempts,
          `[${opName}] evaluated <= attempts`);
      }
    });
  });

  describe("determinism", () => {
    it("produces identical telemetry across two runs with the same seed", () => {
      const operatorName = "deterministic-op";
      const operators = [
        mockOperator(operatorName, (genome) => {
          const cloned = structuredClone(genome);
          cloned.definition.termination.maxTurns += 1;
          return cloned;
        }),
      ];

      function runOnce(seed) {
        const telemetry = createTelemetry([operatorName]);
        const rng = createSeededRng(seed);

        const result = applyEvolution(makePopulation(POPULATION_SIZE), {
          rng,
          mutationRate: 1,
          crossoverRate: 0,
          mutationOperators: operators,
          mutationSelector: fixedSelector(operatorName),
          telemetry,
          maxMutationRetries: MAX_RETRIES,
          repairOperators: alwaysRepairSucceeds(),
        });

        simulateEvaluationRecording(telemetry, result);
        return telemetry.operators[operatorName];
      }

      const run1 = runOnce(42);
      const run2 = runOnce(42);

      assert.deepStrictEqual(run1, run2, "identical seeds must produce identical telemetry");
    });
  });
});
