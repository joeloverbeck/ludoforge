import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { evaluateGenome } from "../../../src/evolutionary-engine/evaluation-adapter.js";
import { dslSafetyRepair } from "../../../src/evolutionary-engine/repair.js";
import { baseDefinition, missingTerminationDefinition } from "../dsl/fixtures.mjs";

describe("evaluation-adapter", () => {
  describe("evaluateGenome", () => {
    describe("validation", () => {
      it("short-circuits invalid genomes before evaluation", () => {
        let called = false;
        const result = evaluateGenome(
          { definition: missingTerminationDefinition },
          {
            evaluator: () => {
              called = true;
              return { fitness: 1, descriptors: { length: 1 } };
            },
          }
        );

        assert.equal(called, false);
        assert.equal(result.fitness, null);
        assert.equal(result.descriptors, null);
        assert.equal(result.diagnostics.validation.valid, false);
        assert.deepEqual(result.diagnostics.safety, []);
      });
    });

    describe("safety gates", () => {
      it("reports safety gate failures without calling evaluator", () => {
        let called = false;
        const result = evaluateGenome(
          { definition: baseDefinition },
          {
            gates: [{ name: "no-op", check: () => ({ ok: false, reason: "blocked" }) }],
            evaluator: () => {
              called = true;
              return { fitness: 1, descriptors: { length: 1 } };
            },
          }
        );

        assert.equal(called, false);
        assert.equal(result.fitness, null);
        assert.equal(result.descriptors, null);
        assert.equal(result.diagnostics.safety.length, 1);
        assert.equal(result.diagnostics.safety[0].reason, "blocked");
      });
    });

    describe("successful evaluation", () => {
      it("forwards evaluator output on success", () => {
        const result = evaluateGenome(
          { definition: baseDefinition },
          {
            evaluator: () => ({
              fitness: 0.7,
              descriptors: { length: 4, randomness: 0.2 },
              diagnostics: { metrics: { agency: 0.7 } },
            }),
          }
        );

        assert.equal(result.fitness, 0.7);
        assert.deepEqual(result.descriptors, { length: 4, randomness: 0.2 });
        assert.equal(result.diagnostics.validation.valid, true);
        assert.deepEqual(result.diagnostics.safety, []);
        assert.deepEqual(result.diagnostics.evaluation, { metrics: { agency: 0.7 } });
      });
    });

    describe("repair operators", () => {
      it("applies repair operators before validation and evaluation", () => {
        const definition = structuredClone(baseDefinition);
        definition.state.variables[0].initial = 999;
        let observedInitial = null;

        const result = evaluateGenome(
          { definition },
          {
            repairOperators: [dslSafetyRepair],
            evaluator: (genome) => {
              observedInitial = genome.definition.state.variables[0].initial;
              return { fitness: 1, descriptors: { length: 1 } };
            },
          }
        );

        assert.equal(result.fitness, 1);
        assert.equal(observedInitial, 10);
        assert.ok(result.diagnostics.repair);
        assert.equal(result.diagnostics.repair.failed, false);
        assert.deepEqual(result.diagnostics.repair.applied, ["dsl-safety"]);
        assert.equal(result.genome.definition.state.variables[0].initial, 10);
      });

      it("rejects genomes when repair fails", () => {
        const definition = structuredClone(baseDefinition);
        definition.state.variables[0].type = { kind: "int", min: 5, max: 1 };
        let called = false;

        const result = evaluateGenome(
          { definition },
          {
            repairOperators: [dslSafetyRepair],
            evaluator: () => {
              called = true;
              return { fitness: 1, descriptors: { length: 1 } };
            },
          }
        );

        assert.equal(called, false);
        assert.equal(result.fitness, null);
        assert.equal(result.descriptors, null);
        assert.ok(result.diagnostics.repair);
        assert.equal(result.diagnostics.repair.failed, true);
        assert.deepEqual(result.diagnostics.repair.applied, ["dsl-safety"]);
      });
    });
  });
});
