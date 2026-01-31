import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { repairActions } from "../../../src/evolutionary-engine/repair/action-repair.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

describe("repairActions — unsatisfiable preconditions", () => {
  it("removes preconditions that are unsatisfiable given variable bounds", () => {
    const definition = cloneDefinition(baseDefinition);
    // score has min:0, max:10 — requiring score > 15 is impossible
    definition.actions[0].preconditions = {
      kind: "cmp",
      op: ">",
      left: { kind: "ref", ref: { kind: "var", id: "score" } },
      right: { kind: "value", value: 15 },
    };

    const repaired = repairActions(definition);

    assert.equal(repaired[0].preconditions, undefined, "unsatisfiable precondition should be removed");
  });

  it("preserves satisfiable preconditions unchanged", () => {
    const definition = cloneDefinition(baseDefinition);
    // score has min:0, max:10 — requiring score >= 5 is satisfiable
    definition.actions[0].preconditions = {
      kind: "cmp",
      op: ">=",
      left: { kind: "ref", ref: { kind: "var", id: "score" } },
      right: { kind: "value", value: 5 },
    };

    const repaired = repairActions(definition);

    assert.ok(repaired[0].preconditions, "satisfiable precondition should be preserved");
    assert.equal(repaired[0].preconditions.op, ">=");
  });

  it("removes NOT-wrapped always-true preconditions", () => {
    const definition = cloneDefinition(baseDefinition);
    // score has min:0, max:10 — score < 15 is always true, so NOT(score < 15) is impossible
    definition.actions[0].preconditions = {
      kind: "not",
      value: {
        kind: "cmp",
        op: "<",
        left: { kind: "ref", ref: { kind: "var", id: "score" } },
        right: { kind: "value", value: 15 },
      },
    };

    const repaired = repairActions(definition);

    assert.equal(repaired[0].preconditions, undefined, "NOT(always-true) should be removed");
  });

  it("preserves actions without preconditions", () => {
    const definition = cloneDefinition(baseDefinition);
    delete definition.actions[0].preconditions;

    const repaired = repairActions(definition);

    assert.equal(repaired[0].preconditions, undefined);
    assert.ok(repaired[0].effects, "effects should still be present");
  });
});
