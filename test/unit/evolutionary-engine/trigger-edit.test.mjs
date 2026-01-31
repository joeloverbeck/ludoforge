import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { triggerEditMutation } from "../../../src/evolutionary-engine/mutation.js";
import { createSeededRng } from "../../../src/simulation-engine/index.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

function makeGenomeWithTriggers(triggers) {
  const definition = cloneDefinition(baseDefinition);
  definition.triggers = triggers;
  return { definition };
}

describe("triggerEditMutation", () => {
  it("has the correct operator name", () => {
    assert.equal(triggerEditMutation.name, "trigger-edit");
  });

  it("is a no-op when no triggers exist", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.triggers = [];
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = triggerEditMutation.mutate(genome, rng);

    assert.equal(mutated.definition.triggers.length, 0);
  });

  it("is a no-op when triggers array is missing", () => {
    const definition = cloneDefinition(baseDefinition);
    delete definition.triggers;
    const genome = { definition };
    const rng = createSeededRng(1);

    const mutated = triggerEditMutation.mutate(genome, rng);

    assert.ok(!mutated.definition.triggers || mutated.definition.triggers.length === 0);
  });

  it("does not mutate the input genome", () => {
    const genome = makeGenomeWithTriggers([
      { event: "start_turn", effects: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }] },
    ]);
    const original = structuredClone(genome);
    const rng = createSeededRng(1);

    triggerEditMutation.mutate(genome, rng);

    assert.deepStrictEqual(genome, original);
  });

  it("can swap trigger event to a different one", () => {
    let swapped = false;
    for (let seed = 0; seed < 200; seed++) {
      const genome = makeGenomeWithTriggers([
        { event: "start_turn", effects: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }] },
      ]);
      const rng = createSeededRng(seed);
      const mutated = triggerEditMutation.mutate(genome, rng);
      const trigger = mutated.definition.triggers[0];
      if (trigger.event !== "start_turn") {
        swapped = true;
        break;
      }
    }
    assert.ok(swapped, "Should be able to swap event across 200 seeds");
  });

  it("can add a condition to a trigger without one", () => {
    let conditionAdded = false;
    for (let seed = 0; seed < 200; seed++) {
      const genome = makeGenomeWithTriggers([
        { event: "start_turn", effects: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }] },
      ]);
      const rng = createSeededRng(seed);
      const mutated = triggerEditMutation.mutate(genome, rng);
      const trigger = mutated.definition.triggers[0];
      if (trigger.condition) {
        assert.equal(trigger.condition.kind, "cmp");
        conditionAdded = true;
        break;
      }
    }
    assert.ok(conditionAdded, "Should be able to add condition across 200 seeds");
  });

  it("can remove a condition from a trigger that has one", () => {
    let conditionRemoved = false;
    for (let seed = 0; seed < 200; seed++) {
      const genome = makeGenomeWithTriggers([
        {
          event: "threshold",
          condition: { kind: "cmp", op: ">=", left: { kind: "ref", ref: { kind: "var", id: "score" } }, right: { kind: "value", value: 5 } },
          effects: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }],
        },
      ]);
      const rng = createSeededRng(seed);
      const mutated = triggerEditMutation.mutate(genome, rng);
      const trigger = mutated.definition.triggers[0];
      if (!trigger.condition) {
        conditionRemoved = true;
        break;
      }
    }
    assert.ok(conditionRemoved, "Should be able to remove condition across 200 seeds");
  });

  it("can insert an effect into a trigger", () => {
    let effectInserted = false;
    for (let seed = 0; seed < 200; seed++) {
      const genome = makeGenomeWithTriggers([
        { event: "start_turn", effects: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }] },
      ]);
      const rng = createSeededRng(seed);
      const mutated = triggerEditMutation.mutate(genome, rng);
      const trigger = mutated.definition.triggers[0];
      if (trigger.effects.length === 2) {
        effectInserted = true;
        break;
      }
    }
    assert.ok(effectInserted, "Should be able to insert effect across 200 seeds");
  });

  it("can delete an effect from a trigger with multiple effects", () => {
    let effectDeleted = false;
    for (let seed = 0; seed < 200; seed++) {
      const genome = makeGenomeWithTriggers([
        {
          event: "start_turn",
          effects: [
            { kind: "inc", target: { kind: "var", id: "score" }, amount: 1 },
            { kind: "dec", target: { kind: "var", id: "score" }, amount: 1 },
          ],
        },
      ]);
      const rng = createSeededRng(seed);
      const mutated = triggerEditMutation.mutate(genome, rng);
      const trigger = mutated.definition.triggers[0];
      if (trigger.effects.length === 1) {
        effectDeleted = true;
        break;
      }
    }
    assert.ok(effectDeleted, "Should be able to delete effect across 200 seeds");
  });

  it("can reorder effects in a trigger", () => {
    let reordered = false;
    const effectA = { kind: "inc", target: { kind: "var", id: "score" }, amount: 1 };
    const effectB = { kind: "dec", target: { kind: "var", id: "score" }, amount: 1 };
    for (let seed = 0; seed < 200; seed++) {
      const genome = makeGenomeWithTriggers([
        { event: "start_turn", effects: [structuredClone(effectA), structuredClone(effectB)] },
      ]);
      const rng = createSeededRng(seed);
      const mutated = triggerEditMutation.mutate(genome, rng);
      const trigger = mutated.definition.triggers[0];
      if (trigger.effects.length === 2 && trigger.effects[0].kind === "dec" && trigger.effects[1].kind === "inc") {
        reordered = true;
        break;
      }
    }
    assert.ok(reordered, "Should be able to reorder effects across 200 seeds");
  });

  it("preserves unedited triggers", () => {
    const genome = makeGenomeWithTriggers([
      { event: "start_turn", effects: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }] },
      { event: "end_turn", effects: [{ kind: "dec", target: { kind: "var", id: "score" }, amount: 1 }] },
    ]);
    const rng = createSeededRng(1);

    const mutated = triggerEditMutation.mutate(genome, rng);

    assert.equal(mutated.definition.triggers.length, 2);
  });
});
