import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { evaluateGenome } from "../../../src/evolutionary-engine/evaluation-adapter.js";
import { dslSafetyRepair } from "../../../src/evolutionary-engine/repair.js";
import { baseDefinition, exampleDefinition, missingTerminationDefinition } from "../dsl/fixtures.mjs";

describe("evaluation-adapter", () => {
  describe("evaluateGenome", () => {
    describe("validation", () => {
      it("short-circuits invalid genomes before evaluation", async () => {
        let called = false;
        const result = await evaluateGenome(
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
      it("reports safety gate failures without calling evaluator", async () => {
        let called = false;
        const result = await evaluateGenome(
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
      it("forwards evaluator output on success", async () => {
        const result = await evaluateGenome(
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
      it("applies repair operators before validation and evaluation", async () => {
        // Use exampleDefinition which has no pre-existing repair-expected warnings.
        // Set initial below min so it clamps to 0 (the min) without creating
        // an immediately-true termination condition (score >= 5 is false at 0).
        const definition = structuredClone(exampleDefinition);
        definition.state.variables[0].initial = -999;
        let observedInitial = null;

        const result = await evaluateGenome(
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
        assert.equal(observedInitial, 0);
        assert.ok(result.diagnostics.repair);
        assert.equal(result.diagnostics.repair.failed, false);
        assert.deepEqual(result.diagnostics.repair.applied, ["dsl-safety"]);
        assert.equal(result.genome.definition.state.variables[0].initial, 0);
      });

      it("rejects genomes when repair fails", async () => {
        const definition = structuredClone(baseDefinition);
        definition.state.variables[0].type = { kind: "int", min: 5, max: 1 };
        let called = false;

        const result = await evaluateGenome(
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

      it("no repair leak when unfixable condition is removed by repair", async () => {
        // Two conditions: one valid, one unfixable (>= with initial at max).
        // After repair the unfixable is removed, leaving one valid condition.
        const definition = structuredClone(exampleDefinition);
        // Add a second variable and an unfixable termination condition
        definition.state.variables.push({
          id: "turns",
          scope: "global",
          type: { kind: "int", min: 0, max: 10 },
          initial: 10,
        });
        definition.termination.conditions.push({
          condition: {
            kind: "cmp",
            op: ">=",
            left: { kind: "ref", ref: { kind: "var", id: "turns" } },
            right: { kind: "value", value: 10 },
          },
          outcome: { type: "draw", players: "all" },
        });
        // Also add an action that modifies 'turns' so it isn't flagged as unreachable
        definition.actions.push({
          id: "wait",
          actor: "player",
          effects: [
            {
              kind: "dec",
              target: { kind: "var", id: "turns" },
              amount: 1,
            },
          ],
        });

        const result = await evaluateGenome(
          { definition },
          {
            repairOperators: [dslSafetyRepair],
            evaluator: () => ({
              fitness: 0.5,
              descriptors: { length: 3 },
            }),
          }
        );

        assert.notEqual(result.fitness, null);
        assert.equal(result.fitness, 0.5);
        assert.ok(result.diagnostics.repair);
        assert.equal(result.diagnostics.repair.failed, false);
      });

      it("repair fails when only condition is unfixable", async () => {
        // Single unfixable termination: >= with initial at max → removed → empty conditions → repair null
        const definition = structuredClone(exampleDefinition);
        definition.state.variables[0].initial = 5;
        definition.state.variables[0].type = { kind: "int", min: 0, max: 5 };
        // score >= 5 with initial=5, max=5 → immediately true, can't shift to 6
        definition.termination.conditions = [
          {
            condition: {
              kind: "cmp",
              op: ">=",
              left: { kind: "ref", ref: { kind: "var", id: "score" } },
              right: { kind: "value", value: 5 },
            },
            outcome: { type: "win", players: "active" },
          },
        ];
        let called = false;

        const result = await evaluateGenome(
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
        assert.ok(result.diagnostics.repair);
        assert.equal(result.diagnostics.repair.failed, true);
      });
    });
  });
});
