import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { repairGenome } from "../../../src/evolutionary-engine/repair.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

describe("repairGenome", () => {
  it("returns null when actions are empty", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions = [];

    const repaired = repairGenome({ definition });

    assert.equal(repaired, null);
  });

  it("removes zone-referencing effects when zones are empty", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.state.zones = [];
    definition.actions[0].effects.push({
      kind: "move",
      toZone: "board",
    });

    const repaired = repairGenome({ definition });

    assert.ok(repaired);
    assert.equal(repaired.definition.actions[0].effects.length, 1);
    assert.equal(repaired.definition.actions[0].effects[0].kind, "inc");
  });

  it("returns null when termination conditions are empty", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.termination.conditions = [];

    const repaired = repairGenome({ definition });

    assert.equal(repaired, null);
  });

  it("returns null when all actions have empty effects", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions = definition.actions.map((action) => ({
      ...action,
      effects: [],
    }));

    const repaired = repairGenome({ definition });

    assert.equal(repaired, null);
  });

  it("returns a repaired genome for valid structure", () => {
    const definition = cloneDefinition(baseDefinition);

    const repaired = repairGenome({ definition });

    assert.ok(repaired);
    assert.notEqual(repaired, definition);
    assert.equal(repaired.definition.actions.length, 1);
  });

  it("repairs effects that reference missing variables", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.state.variables.push({
      id: "energy",
      scope: "global",
      type: { kind: "int", min: 0, max: 5 },
      initial: 0,
    });
    definition.actions[0].effects.push({
      kind: "set",
      target: { kind: "var", id: "missing" },
      value: 2,
    });

    const repaired = repairGenome({ definition });

    assert.ok(repaired);
    const repairedEffect = repaired.definition.actions[0].effects.find(
      (effect) => effect.kind === "set"
    );
    assert.ok(repairedEffect);
    assert.equal(repairedEffect.target.id, "score");
  });

  it("repairs spawn effects that reference missing token types", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].effects.push({
      kind: "spawn",
      target: { kind: "token", id: "ghost" },
      toZone: "board",
    });

    const repaired = repairGenome({ definition });

    assert.ok(repaired);
    const spawnEffect = repaired.definition.actions[0].effects.find(
      (effect) => effect.kind === "spawn"
    );
    assert.ok(spawnEffect);
    assert.equal(spawnEffect.target.id, "pawn");
  });

  it("repairs effects that reference missing zones", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].effects.push({
      kind: "move",
      target: { kind: "token", id: "piece" },
      toZone: "missing-zone",
    });

    const repaired = repairGenome({ definition });

    assert.ok(repaired);
    const moveEffect = repaired.definition.actions[0].effects.find(
      (effect) => effect.kind === "move" && effect.toZone
    );
    assert.ok(moveEffect);
    assert.equal(moveEffect.toZone, "board");
  });

  it("removes action preconditions with missing variable refs", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].preconditions = {
      kind: "cmp",
      op: ">=",
      left: { kind: "ref", ref: { kind: "var", id: "missing" } },
      right: { kind: "value", value: 1 },
    };

    const repaired = repairGenome({ definition });

    assert.ok(repaired);
    assert.equal("preconditions" in repaired.definition.actions[0], false);
  });

  it("removes effects when no valid variable exists", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.state.variables = [];
    definition.actions[0].effects = [
      { kind: "set", target: { kind: "var", id: "missing" }, value: 1 },
      { kind: "move", target: { kind: "token", id: "piece" }, toZone: "board" },
    ];

    const repaired = repairGenome({ definition });

    assert.ok(repaired);
    assert.equal(repaired.definition.actions[0].effects.length, 1);
    assert.equal(repaired.definition.actions[0].effects[0].kind, "move");
  });

  it("leaves valid references unchanged", () => {
    const definition = cloneDefinition(baseDefinition);

    const repaired = repairGenome({ definition });

    assert.ok(repaired);
    assert.deepEqual(repaired.definition.actions[0].effects, definition.actions[0].effects);
    assert.deepEqual(repaired.definition.state, definition.state);
  });

  it("repairs shuffle effects that reference missing zones", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].effects.push({
      kind: "shuffle",
      target: { kind: "zone", id: "missing-zone" },
    });

    const repaired = repairGenome({ definition });

    assert.ok(repaired);
    const shuffleEffect = repaired.definition.actions[0].effects.find(
      (effect) => effect.kind === "shuffle"
    );
    assert.ok(shuffleEffect);
    assert.equal(shuffleEffect.target.id, "board");
  });

  it("repairs queue_push effects that reference missing toZone", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].effects.push({
      kind: "queue_push",
      target: { kind: "token", id: "pawn" },
      toZone: "missing-zone",
    });

    const repaired = repairGenome({ definition });

    assert.ok(repaired);
    const pushEffect = repaired.definition.actions[0].effects.find(
      (effect) => effect.kind === "queue_push"
    );
    assert.ok(pushEffect);
    assert.equal(pushEffect.toZone, "board");
  });

  it("repairs queue_pop effects that reference missing fromZone", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].effects.push({
      kind: "queue_pop",
      fromZone: "missing-zone",
    });

    const repaired = repairGenome({ definition });

    assert.ok(repaired);
    const popEffect = repaired.definition.actions[0].effects.find(
      (effect) => effect.kind === "queue_pop"
    );
    assert.ok(popEffect);
    assert.equal(popEffect.fromZone, "board");
  });

  it("clamps set value to variable bounds after repair", () => {
    const definition = cloneDefinition(baseDefinition);
    // score has min:0, max:10
    definition.actions[0].effects = [
      { kind: "set", target: { kind: "var", id: "score" }, value: 99 },
    ];

    const repaired = repairGenome({ definition });

    assert.ok(repaired);
    assert.equal(repaired.definition.actions[0].effects[0].value, 10);
  });

  it("clamps inc amount to variable range after repair", () => {
    const definition = cloneDefinition(baseDefinition);
    // score has min:0, max:10, range=10
    definition.actions[0].effects = [
      { kind: "inc", target: { kind: "var", id: "score" }, amount: 25 },
    ];

    const repaired = repairGenome({ definition });

    assert.ok(repaired);
    assert.equal(repaired.definition.actions[0].effects[0].amount, 10);
  });

  it("clamps dec amount to variable range after repair", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].effects = [
      { kind: "dec", target: { kind: "var", id: "score" }, amount: 25 },
    ];

    const repaired = repairGenome({ definition });

    assert.ok(repaired);
    assert.equal(repaired.definition.actions[0].effects[0].amount, 10);
  });

  it("clamps termination threshold to variable bounds after repair", () => {
    const definition = cloneDefinition(baseDefinition);
    // score has min:0, max:10
    definition.termination.conditions[0].condition.right.value = 50;

    const repaired = repairGenome({ definition });

    assert.ok(repaired);
    assert.equal(
      repaired.definition.termination.conditions[0].condition.right.value,
      10,
      "threshold should be clamped to variable max"
    );
  });

  it("repairs spawn mismatch to compatible zone", () => {
    const definition = cloneDefinition(baseDefinition);
    // board has tokenType: "pawn", add a second zone for "card"
    definition.state.tokenTypes.push({ id: "card", attributes: [] });
    definition.state.zones.push({
      id: "hand",
      tokenType: "card",
      scope: "per_player",
      order: "ordered",
      visibility: "private",
    });
    // Spawn card into board (mismatched: board expects pawn)
    definition.actions[0].effects.push({
      kind: "spawn",
      target: { kind: "token", id: "card" },
      toZone: "board",
    });

    const repaired = repairGenome({ definition });

    assert.ok(repaired);
    const spawnEffect = repaired.definition.actions[0].effects.find(
      (e) => e.kind === "spawn" && e.target?.kind === "token"
    );
    assert.ok(spawnEffect);
    assert.equal(spawnEffect.toZone, "hand", "should repair to compatible zone");
    assert.equal(spawnEffect.target.id, "card");
  });

  it("repairs spawn mismatch by switching token type when no compatible zone exists", () => {
    const definition = cloneDefinition(baseDefinition);
    // Only zone is board with tokenType: "pawn"
    // Add a token type "ghost" with no matching zone
    definition.state.tokenTypes.push({ id: "ghost", attributes: [] });
    definition.actions[0].effects.push({
      kind: "spawn",
      target: { kind: "token", id: "ghost" },
      toZone: "board",
    });

    const repaired = repairGenome({ definition });

    assert.ok(repaired);
    const spawnEffect = repaired.definition.actions[0].effects.find(
      (e) => e.kind === "spawn" && e.toZone === "board"
    );
    assert.ok(spawnEffect);
    // No zone matches ghost, so token type should switch to board's tokenType
    assert.equal(spawnEffect.target.id, "pawn", "should switch token type to match zone");
  });

  it("removes unreachable termination conditions", () => {
    const definition = cloneDefinition(baseDefinition);
    // Add a variable "gauge" that no effect touches
    definition.state.variables.push({
      id: "gauge",
      scope: "global",
      type: { kind: "int", min: 0, max: 10 },
      initial: 0,
    });
    // Add a termination on gauge (unreachable)
    definition.termination.conditions.push({
      condition: {
        kind: "cmp",
        op: ">=",
        left: { kind: "ref", ref: { kind: "var", id: "gauge" } },
        right: { kind: "value", value: 5 },
      },
      outcome: { type: "lose", players: "active" },
    });

    const repaired = repairGenome({ definition });

    assert.ok(repaired);
    assert.equal(repaired.definition.termination.conditions.length, 1);
    // The reachable score condition should remain
    const remaining = repaired.definition.termination.conditions[0];
    assert.equal(remaining.condition.left.ref.id, "score");
  });

  it("preserves at least one termination when all are unreachable", () => {
    const definition = cloneDefinition(baseDefinition);
    // Remove all effects that touch score
    definition.actions[0].effects = [
      { kind: "spawn", target: { kind: "token", id: "pawn" }, toZone: "board" },
    ];
    // Now score is unmodified but it's the only termination

    const repaired = repairGenome({ definition });

    assert.ok(repaired);
    assert.equal(
      repaired.definition.termination.conditions.length,
      1,
      "should keep at least one condition"
    );
  });

  it("strips unused action params after repair", () => {
    const definition = cloneDefinition(baseDefinition);
    // The baseDefinition has a "piece" param but the only effect is inc(score)
    // which doesn't reference "piece" token type
    // Verify that unused param is stripped
    const repaired = repairGenome({ definition });

    assert.ok(repaired);
    const action = repaired.definition.actions[0];
    // "piece" param references token id "pawn" via selector, but the effects
    // don't use "piece" as a token target — it uses "score" var
    // The param id is "piece", effects target {kind:"var", id:"score"}
    // So "piece" should be stripped
    assert.equal(action.params, undefined, "should strip unreferenced params");
  });
});
