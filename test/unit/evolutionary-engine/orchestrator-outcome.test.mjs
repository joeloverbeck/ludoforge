import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mutateAndRepairGenome } from "../../../src/evolutionary-engine/mutation/orchestrator.js";

describe("mutateAndRepairGenome structured outcome", () => {
  const baseGenome = { definition: { id: "g1", actions: [] } };

  describe("outcome: ok", () => {
    it("returns ok when mutation succeeds and repair passes", () => {
      const operators = [
        { name: "tweaker", mutate: (g) => ({ ...g, definition: { ...g.definition, tweaked: true } }) },
      ];
      const repairOperators = [{ repair: (g) => g }];
      const selector = { pick: () => "tweaker" };

      const result = mutateAndRepairGenome(baseGenome, {
        operators,
        repairOperators,
        selector,
      });

      assert.equal(result.outcome, "ok");
      assert.notEqual(result.genome, null);
      assert.equal(result.genome.definition.tweaked, true);
      assert.equal(result.operatorName, "tweaker");
    });

    it("returns ok when mutation changes genome and no repair operators exist", () => {
      const operators = [
        { name: "adder", mutate: (g) => ({ ...g, definition: { ...g.definition, added: 1 } }) },
      ];
      const repairOperators = [{ repair: (g) => g }];
      const selector = { pick: () => "adder" };

      const result = mutateAndRepairGenome(baseGenome, {
        operators,
        repairOperators,
        selector,
      });

      assert.equal(result.outcome, "ok");
      assert.equal(result.operatorName, "adder");
      assert.equal(result.genome.definition.added, 1);
    });
  });

  describe("outcome: noOp", () => {
    it("returns noOp when operator returns genome unchanged", () => {
      const operators = [
        { name: "noop-op", mutate: (g) => structuredClone(g) },
      ];
      const repairOperators = [{ repair: (g) => g }];
      const selector = { pick: () => "noop-op" };

      const result = mutateAndRepairGenome(baseGenome, {
        operators,
        repairOperators,
        selector,
      });

      assert.equal(result.outcome, "noOp");
      assert.equal(result.operatorName, "noop-op");
      assert.notEqual(result.genome, null);
    });

    it("returns noOp with operatorName when operator cannot find targets", () => {
      const operators = [
        { name: "effect-kind-swap", mutate: (g) => ({ ...g, definition: structuredClone(g.definition) }) },
      ];
      const repairOperators = [{ repair: (g) => g }];
      const selector = { pick: () => "effect-kind-swap" };

      const result = mutateAndRepairGenome(baseGenome, {
        operators,
        repairOperators,
        selector,
      });

      assert.equal(result.outcome, "noOp");
      assert.equal(result.operatorName, "effect-kind-swap");
    });
  });

  describe("outcome: repairFailed", () => {
    it("returns repairFailed with null genome when repair returns null", () => {
      const operators = [
        { name: "breaker", mutate: (g) => ({ ...g, definition: { ...g.definition, broken: true } }) },
      ];
      const repairOperators = [{ repair: () => null }];
      const selector = { pick: () => "breaker" };

      const result = mutateAndRepairGenome(baseGenome, {
        operators,
        repairOperators,
        selector,
      });

      assert.equal(result.outcome, "repairFailed");
      assert.equal(result.genome, null);
      assert.equal(result.operatorName, "breaker");
    });

    it("does not fall back to original genome on repair failure", () => {
      const operators = [
        { name: "mutator", mutate: (g) => ({ ...g, definition: { ...g.definition, mutated: true } }) },
      ];
      const repairOperators = [{ repair: () => null }];
      const selector = { pick: () => "mutator" };

      const result = mutateAndRepairGenome(baseGenome, {
        operators,
        repairOperators,
        selector,
      });

      assert.equal(result.genome, null);
      assert.notDeepEqual(result.genome, baseGenome);
    });
  });

  describe("operatorName invariant", () => {
    it("always includes operatorName in every outcome", () => {
      const outcomes = [];

      // ok case
      outcomes.push(
        mutateAndRepairGenome(baseGenome, {
          operators: [{ name: "op-ok", mutate: (g) => ({ ...g, definition: { ...g.definition, x: 1 } }) }],
          repairOperators: [{ repair: (g) => g }],
          selector: { pick: () => "op-ok" },
        }),
      );

      // noOp case
      outcomes.push(
        mutateAndRepairGenome(baseGenome, {
          operators: [{ name: "op-noop", mutate: (g) => structuredClone(g) }],
          repairOperators: [{ repair: (g) => g }],
          selector: { pick: () => "op-noop" },
        }),
      );

      // repairFailed case
      outcomes.push(
        mutateAndRepairGenome(baseGenome, {
          operators: [{ name: "op-fail", mutate: (g) => ({ ...g, definition: { ...g.definition, y: 2 } }) }],
          repairOperators: [{ repair: () => null }],
          selector: { pick: () => "op-fail" },
        }),
      );

      for (const result of outcomes) {
        assert.ok(
          "operatorName" in result,
          `operatorName missing in outcome: ${result.outcome}`,
        );
        assert.equal(typeof result.operatorName, "string");
      }
    });
  });

  describe("selector required", () => {
    it("throws when called without a selector", () => {
      const operators = [{ mutate: (g) => ({ ...g, definition: { ...g.definition, mutated: true } }) }];
      const repairOperators = [{ repair: (g) => g }];

      assert.throws(
        () => mutateAndRepairGenome(baseGenome, { operators, repairOperators }),
        /requires a selector/,
      );
    });
  });
});
