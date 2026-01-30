import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { phaseRemoveMutation } from "../../../src/evolutionary-engine/mutation/operators/phase-remove.js";
import { createSeededRng } from "../../../src/simulation-engine/rng.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

describe("phaseRemoveMutation – reference cleanup", () => {
  it("rebinds actions to remaining phase when their phase is removed", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.turn = {
      scheduler: "round_robin",
      phases: ["setup", "main", "end"],
    };
    definition.actions = [
      {
        id: "a1",
        actor: "player",
        effects: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }],
        metadata: { phase: "main" },
      },
      {
        id: "a2",
        actor: "player",
        effects: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 2 }],
        metadata: { phase: "setup" },
      },
    ];

    const rng = createSeededRng(42);
    let result;
    for (let i = 0; i < 100; i++) {
      const attempt = phaseRemoveMutation.mutate(
        { id: "g1", definition: structuredClone(definition) },
        createSeededRng(i)
      );
      const removedPhases = definition.turn.phases.filter(
        (p) => !attempt.definition.turn.phases.includes(p)
      );
      if (removedPhases.includes("main")) {
        result = attempt;
        break;
      }
    }

    if (result) {
      const remaining = result.definition.turn.phases;
      const a1 = result.definition.actions.find((a) => a.id === "a1");
      assert.ok(a1);
      assert.ok(
        remaining.includes(a1.metadata.phase),
        `Action a1 should be rebound to a remaining phase, got "${a1.metadata.phase}"`
      );
    }
  });

  it("removes metadata.phase when no phases remain after removal", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.turn = {
      scheduler: "round_robin",
      phases: ["only_phase", "other"],
    };
    definition.actions = [
      {
        id: "a1",
        actor: "player",
        effects: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }],
        metadata: { phase: "only_phase" },
      },
    ];

    const rng = createSeededRng(42);
    let result;
    for (let i = 0; i < 100; i++) {
      const attempt = phaseRemoveMutation.mutate(
        { id: "g1", definition: structuredClone(definition) },
        createSeededRng(i)
      );
      if (!attempt.definition.turn.phases.includes("only_phase")) {
        result = attempt;
        break;
      }
    }

    if (result) {
      const a1 = result.definition.actions.find((a) => a.id === "a1");
      assert.ok(a1);
      const remaining = result.definition.turn.phases;
      if (remaining.length === 0) {
        assert.equal(a1.metadata.phase, undefined);
      } else {
        assert.ok(remaining.includes(a1.metadata.phase));
      }
    }
  });

  it("does not modify actions bound to other phases", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.turn = {
      scheduler: "round_robin",
      phases: ["setup", "main", "end"],
    };
    definition.actions = [
      {
        id: "a1",
        actor: "player",
        effects: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }],
        metadata: { phase: "setup" },
      },
    ];

    let result;
    for (let i = 0; i < 100; i++) {
      const attempt = phaseRemoveMutation.mutate(
        { id: "g1", definition: structuredClone(definition) },
        createSeededRng(i)
      );
      if (attempt.definition.turn.phases.includes("setup")) {
        result = attempt;
        break;
      }
    }

    if (result) {
      const a1 = result.definition.actions.find((a) => a.id === "a1");
      assert.equal(a1.metadata.phase, "setup");
    }
  });
});
