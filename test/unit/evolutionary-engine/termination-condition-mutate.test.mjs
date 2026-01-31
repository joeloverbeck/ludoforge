import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { terminationConditionMutateMutation } from "../../../src/evolutionary-engine/mutation.js";
import { createSeededRng } from "../../../src/simulation-engine/index.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

function twoVarDefinition() {
  const def = structuredClone(baseDefinition);
  def.state.variables.push({
    id: "health",
    scope: "per_player",
    type: { kind: "int", min: 0, max: 20 },
    initial: 10,
  });
  return def;
}

describe("terminationConditionMutateMutation", () => {
  it("has the correct operator name", () => {
    assert.equal(terminationConditionMutateMutation.name, "termination-condition-mutate");
  });

  it("no-op when no termination conditions exist", () => {
    const definition = structuredClone(baseDefinition);
    definition.termination.conditions = [];
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = terminationConditionMutateMutation.mutate(genome, rng);

    assert.deepEqual(mutated.definition.termination.conditions, []);
  });

  it("can swap the comparator", () => {
    const definition = structuredClone(baseDefinition);
    const originalOp = definition.termination.conditions[0].condition.op;
    const validOps = [">=", "<=", ">", "<", "=="];

    let swapped = false;
    for (let seed = 0; seed < 200; seed++) {
      const genome = { definition: structuredClone(definition) };
      const rng = createSeededRng(seed);
      const mutated = terminationConditionMutateMutation.mutate(genome, rng);
      const cond = mutated.definition.termination.conditions[0].condition;
      // Only check comparator swap when the condition is still a cmp (not wrapped in NOT)
      if (cond.kind === "cmp" && cond.op !== originalOp) {
        swapped = true;
        assert.ok(validOps.includes(cond.op));
        break;
      }
    }
    assert.ok(swapped, "Should swap comparator at least once in 200 seeds");
  });

  it("can swap the variable reference", () => {
    const definition = twoVarDefinition();
    const originalVarId = definition.termination.conditions[0].condition.left.ref.id;

    let swapped = false;
    for (let seed = 0; seed < 100; seed++) {
      const genome = { definition: structuredClone(definition) };
      const rng = createSeededRng(seed);
      const mutated = terminationConditionMutateMutation.mutate(genome, rng);
      const newVarId = mutated.definition.termination.conditions[0].condition.left.ref.id;
      if (newVarId !== originalVarId) {
        swapped = true;
        assert.equal(newVarId, "health");
        break;
      }
    }
    assert.ok(swapped, "Should swap variable reference at least once in 100 seeds");
  });

  it("can adjust the constant value", () => {
    const definition = structuredClone(baseDefinition);
    const originalValue = definition.termination.conditions[0].condition.right.value;

    let adjusted = false;
    for (let seed = 0; seed < 100; seed++) {
      const genome = { definition: structuredClone(definition) };
      const rng = createSeededRng(seed);
      const mutated = terminationConditionMutateMutation.mutate(genome, rng);
      const newValue = mutated.definition.termination.conditions[0].condition.right.value;
      if (newValue !== originalValue) {
        adjusted = true;
        assert.equal(typeof newValue, "number");
        // Should be within variable bounds [0, 10]
        assert.ok(newValue >= 0 && newValue <= 10, `Value ${newValue} out of bounds [0, 10]`);
        break;
      }
    }
    assert.ok(adjusted, "Should adjust constant at least once in 100 seeds");
  });

  it("can wrap with NOT", () => {
    const definition = structuredClone(baseDefinition);

    let wrapped = false;
    for (let seed = 0; seed < 100; seed++) {
      const genome = { definition: structuredClone(definition) };
      const rng = createSeededRng(seed);
      const mutated = terminationConditionMutateMutation.mutate(genome, rng);
      const cond = mutated.definition.termination.conditions[0].condition;
      if (cond.kind === "not") {
        wrapped = true;
        assert.ok(cond.operand);
        assert.equal(cond.operand.kind, "cmp");
        break;
      }
    }
    assert.ok(wrapped, "Should wrap with NOT at least once in 100 seeds");
  });

  it("can unwrap NOT", () => {
    const definition = structuredClone(baseDefinition);
    // Pre-wrap the condition with NOT
    definition.termination.conditions[0].condition = {
      kind: "not",
      operand: definition.termination.conditions[0].condition,
    };

    let unwrapped = false;
    for (let seed = 0; seed < 100; seed++) {
      const genome = { definition: structuredClone(definition) };
      const rng = createSeededRng(seed);
      const mutated = terminationConditionMutateMutation.mutate(genome, rng);
      const cond = mutated.definition.termination.conditions[0].condition;
      if (cond.kind === "cmp") {
        unwrapped = true;
        break;
      }
    }
    assert.ok(unwrapped, "Should unwrap NOT at least once in 100 seeds");
  });

  it("does not mutate the input genome", () => {
    const definition = structuredClone(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(1);
    const originalCond = structuredClone(definition.termination.conditions[0]);

    terminationConditionMutateMutation.mutate(genome, rng);

    assert.deepEqual(definition.termination.conditions[0], originalCond);
  });

  it("preserves untargeted conditions", () => {
    const definition = structuredClone(baseDefinition);
    definition.termination.conditions.push({
      condition: {
        kind: "cmp",
        op: "<=",
        left: { kind: "ref", ref: { kind: "var", id: "score" } },
        right: { kind: "value", value: 0 },
      },
      outcome: { type: "lose", players: "active" },
    });
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = terminationConditionMutateMutation.mutate(genome, rng);

    // Should still have 2 conditions
    assert.equal(mutated.definition.termination.conditions.length, 2);
  });
});
