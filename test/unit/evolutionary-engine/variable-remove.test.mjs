import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { variableRemoveMutation } from "../../../src/evolutionary-engine/mutation.js";
import { createSeededRng } from "../../../src/simulation-engine/index.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

function makeGenome(overrides = {}) {
  const definition = structuredClone(baseDefinition);
  Object.assign(definition, overrides);
  return { definition };
}

/**
 * Creates a definition with "health" at index 0 and "score" at index 1.
 * Since rng.nextInt(2) tends to return 0 for the first call, this ensures
 * "health" gets removed and we can test the rewriting of refs to "score".
 */
function healthFirstDefinition() {
  const def = structuredClone(baseDefinition);
  def.state.variables = [
    {
      id: "health",
      scope: "per_player",
      type: { kind: "int", min: 0, max: 20 },
      initial: 10,
    },
    ...def.state.variables,
  ];
  return def;
}

describe("variableRemoveMutation", () => {
  it("has the correct operator name", () => {
    assert.equal(variableRemoveMutation.name, "variable-remove");
  });

  it("no-op when only one variable exists", () => {
    const genome = makeGenome();
    const rng = createSeededRng(1);

    const mutated = variableRemoveMutation.mutate(genome, rng);

    assert.equal(mutated.definition.state.variables.length, 1);
  });

  it("removes one variable when two or more exist", () => {
    const definition = healthFirstDefinition();
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = variableRemoveMutation.mutate(genome, rng);

    assert.equal(mutated.definition.state.variables.length, 1);
  });

  it("rewrites action effects referencing removed variable", () => {
    const definition = healthFirstDefinition();
    definition.actions = [
      {
        id: "heal",
        actor: "player",
        effects: [
          {
            kind: "inc",
            target: { kind: "var", id: "health" },
            amount: 1,
          },
        ],
      },
    ];
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = variableRemoveMutation.mutate(genome, rng);

    // "health" removed at index 0, rewritten to "score"
    const effect = mutated.definition.actions[0].effects[0];
    assert.equal(effect.target.id, "score");
  });

  it("rewrites termination conditions referencing removed variable", () => {
    const definition = healthFirstDefinition();
    definition.termination.conditions.push({
      condition: {
        kind: "cmp",
        op: "<=",
        left: { kind: "ref", ref: { kind: "var", id: "health" } },
        right: { kind: "value", value: 0 },
      },
      outcome: { type: "lose", players: "active" },
    });
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = variableRemoveMutation.mutate(genome, rng);

    // The second termination condition's var ref should be rewritten
    const cond = mutated.definition.termination.conditions[1].condition;
    assert.equal(cond.left.ref.id, "score");
  });

  it("rewrites turn.orderBy.variable when it references removed var", () => {
    const definition = healthFirstDefinition();
    definition.turn = {
      scheduler: "priority_queue",
      orderBy: { variable: "health" },
    };
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = variableRemoveMutation.mutate(genome, rng);

    assert.equal(mutated.definition.turn.orderBy.variable, "score");
  });

  it("does not mutate the input genome", () => {
    const definition = healthFirstDefinition();
    const genome = { definition };
    const rng = createSeededRng(1);
    const originalVars = definition.state.variables.length;

    variableRemoveMutation.mutate(genome, rng);

    assert.equal(definition.state.variables.length, originalVars);
  });

  it("rewrites trigger conditions referencing removed variable", () => {
    const definition = healthFirstDefinition();
    definition.triggers = [
      {
        event: "end_turn",
        condition: {
          kind: "cmp",
          op: ">=",
          left: { kind: "ref", ref: { kind: "var", id: "health" } },
          right: { kind: "value", value: 5 },
        },
        effects: [],
      },
    ];
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = variableRemoveMutation.mutate(genome, rng);

    assert.equal(mutated.definition.triggers[0].condition.left.ref.id, "score");
  });

  it("rewrites preconditions referencing removed variable", () => {
    const definition = healthFirstDefinition();
    definition.actions = [
      {
        id: "heal",
        actor: "player",
        effects: [],
        precondition: {
          kind: "cmp",
          op: "<",
          left: { kind: "ref", ref: { kind: "var", id: "health" } },
          right: { kind: "value", value: 20 },
        },
      },
    ];
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = variableRemoveMutation.mutate(genome, rng);

    assert.equal(mutated.definition.actions[0].precondition.left.ref.id, "score");
  });
});
