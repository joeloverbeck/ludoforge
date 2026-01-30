import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { triggerAddMutation } from "../../../src/evolutionary-engine/mutation.js";
import { createSeededRng } from "../../../src/simulation-engine/index.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

describe("triggerAddMutation", () => {
  it("has the correct operator name", () => {
    assert.equal(triggerAddMutation.name, "trigger-add");
  });

  it("adds a trigger to the definition", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(1);
    const originalCount = Array.isArray(definition.triggers) ? definition.triggers.length : 0;

    const mutated = triggerAddMutation.mutate(genome, rng);

    assert.equal(mutated.definition.triggers.length, originalCount + 1);
  });

  it("new trigger has a valid event", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(2);

    const mutated = triggerAddMutation.mutate(genome, rng);
    const newTrigger = mutated.definition.triggers.at(-1);

    const validEvents = ["start_turn", "end_turn", "start_phase", "end_phase", "after_action"];
    assert.ok(validEvents.includes(newTrigger.event));
  });

  it("new trigger has at least one effect", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(3);

    const mutated = triggerAddMutation.mutate(genome, rng);
    const newTrigger = mutated.definition.triggers.at(-1);

    assert.ok(Array.isArray(newTrigger.effects));
    assert.ok(newTrigger.effects.length >= 1);
  });

  it("is a no-op when no variables, token types, or zones exist", () => {
    const definition = cloneDefinition(baseDefinition);
    delete definition.state.variables;
    delete definition.state.tokenTypes;
    delete definition.state.zones;
    const genome = { definition };
    const rng = createSeededRng(4);

    const mutated = triggerAddMutation.mutate(genome, rng);

    const triggers = mutated.definition.triggers;
    assert.ok(!triggers || triggers.length === 0);
  });

  it("does not mutate the input genome", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };
    const rng = createSeededRng(5);
    const originalTriggerCount = Array.isArray(definition.triggers) ? definition.triggers.length : 0;

    triggerAddMutation.mutate(genome, rng);

    const currentCount = Array.isArray(definition.triggers) ? definition.triggers.length : 0;
    assert.equal(currentCount, originalTriggerCount);
  });

  it("produces triggers with 1-2 effects", () => {
    const definition = cloneDefinition(baseDefinition);
    // Run multiple seeds to exercise both 1 and 2 effect counts
    for (let seed = 0; seed < 20; seed++) {
      const genome = { definition: structuredClone(definition) };
      const rng = createSeededRng(seed);
      const mutated = triggerAddMutation.mutate(genome, rng);
      const triggers = mutated.definition.triggers ?? [];
      if (triggers.length > 0) {
        const trigger = triggers.at(-1);
        assert.ok(trigger.effects.length >= 1 && trigger.effects.length <= 2,
          `Expected 1-2 effects, got ${trigger.effects.length} for seed ${seed}`);
      }
    }
  });
});
