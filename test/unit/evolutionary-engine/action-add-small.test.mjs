import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { actionAddSmallMutation } from "../../../src/evolutionary-engine/mutation.js";
import { createSeededRng } from "../../../src/simulation-engine/index.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

describe("actionAddSmallMutation", () => {
  it("adds a new action", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = actionAddSmallMutation.mutate(genome, rng);

    assert.equal(definition.actions.length, 1);
    assert.equal(mutated.definition.actions.length, 2);
  });

  it("assigns a unique id to the new action", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(2);

    const mutated = actionAddSmallMutation.mutate(genome, rng);
    const ids = mutated.definition.actions.map((a) => a.id);
    const uniqueIds = new Set(ids);

    assert.equal(ids.length, uniqueIds.size);
  });

  it("sets actor to player", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(3);

    const mutated = actionAddSmallMutation.mutate(genome, rng);
    const newAction = mutated.definition.actions[mutated.definition.actions.length - 1];

    assert.equal(newAction.actor, "player");
  });

  it("adds 1-2 effects to the new action", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(4);

    const mutated = actionAddSmallMutation.mutate(genome, rng);
    const newAction = mutated.definition.actions[mutated.definition.actions.length - 1];

    assert.ok(newAction.effects.length >= 1 && newAction.effects.length <= 2);
  });

  it("does not mutate the input genome", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(5);

    actionAddSmallMutation.mutate(genome, rng);

    assert.equal(definition.actions.length, 1);
  });

  it("has the correct operator name", () => {
    assert.equal(actionAddSmallMutation.name, "action-add-small");
  });
});
