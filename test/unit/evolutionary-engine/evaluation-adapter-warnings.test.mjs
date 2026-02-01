import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { evaluateGenome } from "../../../src/evolutionary-engine/evaluation-adapter.js";
import { baseDefinition, exampleDefinition } from "../dsl/fixtures.mjs";

function makeNoopRepairOperator() {
  return { name: "noop-repair", repair: (genome) => genome };
}

function makeRepairOptions(evaluator) {
  return {
    evaluator,
    repairOperators: [makeNoopRepairOperator()],
    repairRng: { next: () => 0.5 },
  };
}

function makeGenomeWithUnusedVariable() {
  const definition = structuredClone(baseDefinition);
  definition.state.variables.push({
    id: "unusedVar",
    scope: "global",
    type: { kind: "int", min: 0, max: 1 },
    initial: 0,
  });
  return { id: "test-genome", definition };
}

describe("evaluation-adapter – semantic warnings", () => {
  describe("repair-leak detection", () => {
    it("returns fitness null with repairLeaks when repair-expected warning survives", async () => {
      const genome = makeGenomeWithUnusedVariable();
      const result = await evaluateGenome(genome, makeRepairOptions(() => ({
        fitness: 1,
        descriptors: { agency: 0.5 },
      })));

      assert.equal(result.fitness, null);
      assert.equal(result.descriptors, null);
      assert.ok(Array.isArray(result.diagnostics.repairLeaks));
      assert.ok(result.diagnostics.repairLeaks.length > 0);
      const leakRules = result.diagnostics.repairLeaks.map((l) => l.rule);
      assert.ok(leakRules.includes("unused-variable"));
    });

    it("skips repair-leak check when no repair operators configured", async () => {
      const genome = makeGenomeWithUnusedVariable();
      let evaluatorCalled = false;
      const result = await evaluateGenome(genome, {
        evaluator: () => {
          evaluatorCalled = true;
          return {
            fitness: 0.5,
            descriptors: { agency: 0.3 },
          };
        },
      });

      assert.equal(evaluatorCalled, true);
      assert.equal(result.fitness, 0.5);
      assert.equal(result.diagnostics.repairLeaks, undefined);
    });
  });

  describe("warning count passthrough", () => {
    it("passes semanticWarningCount to evaluator context", async () => {
      // exampleDefinition is fully clean (no warnings or infos)
      const genome = { id: "clean-genome", definition: structuredClone(exampleDefinition) };
      let receivedContext = null;
      await evaluateGenome(genome, {
        evaluator: (_candidate, ctx) => {
          receivedContext = ctx;
          return { fitness: 0.5, descriptors: { agency: 0.3 } };
        },
      });

      assert.equal(typeof receivedContext.semanticWarningCount, "number");
      assert.equal(typeof receivedContext.semanticInfoCount, "number");
    });

    it("passes zero counts for clean genome", async () => {
      const genome = { id: "clean-genome", definition: structuredClone(exampleDefinition) };
      let receivedContext = null;
      await evaluateGenome(genome, {
        evaluator: (_candidate, ctx) => {
          receivedContext = ctx;
          return { fitness: 0.5, descriptors: { agency: 0.3 } };
        },
      });

      assert.equal(receivedContext.semanticWarningCount, 0);
      assert.equal(receivedContext.semanticInfoCount, 0);
    });

    it("counts warnings when present", async () => {
      // baseDefinition has unused-action-param warning
      const genome = { id: "warn-genome", definition: structuredClone(baseDefinition) };
      let receivedContext = null;
      await evaluateGenome(genome, {
        evaluator: (_candidate, ctx) => {
          receivedContext = ctx;
          return { fitness: 0.5, descriptors: { agency: 0.3 } };
        },
      });

      assert.ok(receivedContext.semanticWarningCount >= 1);
    });
  });
});
