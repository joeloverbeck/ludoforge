import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { actionCostAddMutation } from "../../../src/evolutionary-engine/mutation.js";
import { createSeededRng } from "../../../src/simulation-engine/index.js";
import { validateGameDefinition } from "../../../src/dsl/validate.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

describe("actionCostAddMutation", () => {
  it("adds a dec cost to an action with no existing costs", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };

    let found = false;
    for (let seed = 0; seed < 50; seed++) {
      const rng = createSeededRng(seed);
      const mutated = actionCostAddMutation.mutate(genome, rng);
      const action = mutated.definition.actions[0];
      if (Array.isArray(action.costs) && action.costs.length > 0) {
        const cost = action.costs[0];
        assert.equal(cost.kind, "dec");
        assert.equal(cost.target.kind, "var");
        assert.ok(cost.amount >= 1 && cost.amount <= 3);
        found = true;
        break;
      }
    }
    assert.ok(found, "should add a dec cost within 50 seeds");
  });

  it("appends cost to action with existing costs", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].costs = [
      { kind: "dec", target: { kind: "var", id: "score" }, amount: 2 },
    ];
    const genome = { definition };

    let found = false;
    for (let seed = 0; seed < 50; seed++) {
      const rng = createSeededRng(seed);
      const mutated = actionCostAddMutation.mutate(genome, rng);
      const costs = mutated.definition.actions[0].costs;
      if (costs && costs.length === 2) {
        assert.deepStrictEqual(costs[0], {
          kind: "dec",
          target: { kind: "var", id: "score" },
          amount: 2,
        });
        found = true;
        break;
      }
    }
    assert.ok(found, "should append a cost to existing costs within 50 seeds");
  });

  it("can add destroy cost when token types and zones exist", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };

    let foundDestroy = false;
    for (let seed = 0; seed < 200; seed++) {
      const rng = createSeededRng(seed);
      const mutated = actionCostAddMutation.mutate(genome, rng);
      const action = mutated.definition.actions[0];
      if (Array.isArray(action.costs)) {
        const destroyCost = action.costs.find((c) => c.kind === "destroy");
        if (destroyCost) {
          assert.equal(destroyCost.target.kind, "token");
          foundDestroy = true;
          break;
        }
      }
    }
    assert.ok(foundDestroy, "should produce a destroy cost within 200 seeds");
  });

  it("noOp when no int variables AND no token types", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.state.variables = [
      {
        id: "flag",
        scope: "global",
        type: { kind: "enum", values: ["a", "b"] },
        initial: "a",
      },
    ];
    delete definition.state.tokenTypes;
    delete definition.state.zones;
    const genome = { definition };
    const rng = createSeededRng(42);

    const mutated = actionCostAddMutation.mutate(genome, rng);
    assert.deepStrictEqual(mutated.definition.actions, definition.actions);
  });

  it("noOp when no actions", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions = [];
    const genome = { definition };
    const rng = createSeededRng(42);

    const mutated = actionCostAddMutation.mutate(genome, rng);
    assert.deepStrictEqual(mutated.definition.actions, []);
  });

  it("does not mutate input genome", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const originalJson = JSON.stringify(genome);
    const rng = createSeededRng(0);

    actionCostAddMutation.mutate(genome, rng);

    assert.equal(JSON.stringify(genome), originalJson);
  });

  it("is deterministic with seeded RNG", () => {
    const definition = cloneDefinition(baseDefinition);

    const first = actionCostAddMutation.mutate(
      { definition: cloneDefinition(definition) },
      createSeededRng(42),
    );
    const second = actionCostAddMutation.mutate(
      { definition: cloneDefinition(definition) },
      createSeededRng(42),
    );

    assert.deepStrictEqual(first.definition, second.definition);
  });

  it("result passes schema validation", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };

    for (let seed = 0; seed < 20; seed++) {
      const rng = createSeededRng(seed);
      const mutated = actionCostAddMutation.mutate(genome, rng);
      const validation = validateGameDefinition(mutated.definition);
      assert.ok(
        validation.valid,
        `seed ${seed} schema invalid: ${JSON.stringify(validation.errors)}`,
      );
    }
  });
});
