import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { repairTriggers } from "../../../src/evolutionary-engine/repair/action-repair.js";
import { repairGenome } from "../../../src/evolutionary-engine/repair.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

describe("repairTriggers – condition repair", () => {
  it("strips trigger condition referencing non-existent variable", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.triggers = [
      {
        event: "after_action",
        condition: {
          kind: "cmp",
          op: ">=",
          left: { kind: "ref", ref: { kind: "var", id: "nonexistent" } },
          right: { kind: "value", value: 5 },
        },
        effects: [
          { kind: "inc", target: { kind: "var", id: "score" }, amount: 1 },
        ],
      },
    ];

    const repaired = repairTriggers(definition);

    assert.equal(repaired.length, 1);
    assert.equal(repaired[0].condition, undefined);
    assert.equal(repaired[0].effects.length, 1);
  });

  it("preserves trigger condition referencing existing variable", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.triggers = [
      {
        event: "after_action",
        condition: {
          kind: "cmp",
          op: ">=",
          left: { kind: "ref", ref: { kind: "var", id: "score" } },
          right: { kind: "value", value: 5 },
        },
        effects: [
          { kind: "inc", target: { kind: "var", id: "score" }, amount: 1 },
        ],
      },
    ];

    const repaired = repairTriggers(definition);

    assert.equal(repaired.length, 1);
    assert.ok(repaired[0].condition);
    assert.equal(repaired[0].condition.kind, "cmp");
  });
});

describe("orchestrator – stepEffects repair", () => {
  it("repairs stepEffects referencing removed zone", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.turn = {
      ...definition.turn,
      stepEffects: [
        {
          event: "after_action",
          effects: [
            {
              kind: "move",
              target: { kind: "token", id: "pawn" },
              toZone: "nonexistent_zone",
            },
          ],
        },
      ],
    };

    const repaired = repairGenome({ definition });

    assert.ok(repaired);
    const stepEffects = repaired.definition.turn.stepEffects;
    assert.ok(Array.isArray(stepEffects));
    const effects = stepEffects[0].effects;
    if (effects.length > 0) {
      assert.notEqual(effects[0].toZone, "nonexistent_zone");
    }
  });
});
