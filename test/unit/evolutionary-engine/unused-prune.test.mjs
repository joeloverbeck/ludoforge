import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { unusedElementPruneRepair } from "../../../src/evolutionary-engine/repair/unused-prune.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

describe("unusedElementPruneRepair", () => {
  it("has the expected name", () => {
    assert.equal(unusedElementPruneRepair.name, "unused-element-prune");
  });

  it("leaves fully-wired definition unchanged", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };

    const repaired = unusedElementPruneRepair.repair(genome);

    assert.ok(repaired);
    assert.equal(repaired.definition.state.variables.length, 1);
    assert.equal(repaired.definition.state.tokenTypes.length, 1);
    assert.equal(repaired.definition.state.zones.length, 1);
  });

  it("prunes unused variables", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.state.variables.push({
      id: "orphan_var",
      scope: "global",
      type: { kind: "int", min: 0, max: 5 },
      initial: 0,
    });
    const genome = { definition };

    const repaired = unusedElementPruneRepair.repair(genome);

    assert.ok(repaired);
    const varIds = repaired.definition.state.variables.map((v) => v.id);
    assert.ok(varIds.includes("score"));
    assert.ok(!varIds.includes("orphan_var"));
  });

  it("prunes unused token types", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.state.tokenTypes.push({
      id: "orphan_token",
      attributes: [
        { id: "v", scope: "global", type: { kind: "int", min: 0, max: 5 }, initial: 0 },
      ],
    });
    const genome = { definition };

    const repaired = unusedElementPruneRepair.repair(genome);

    assert.ok(repaired);
    const ttIds = repaired.definition.state.tokenTypes.map((t) => t.id);
    assert.ok(ttIds.includes("pawn"));
    assert.ok(!ttIds.includes("orphan_token"));
  });

  it("prunes unused zones", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.state.zones.push({
      id: "orphan_zone",
      tokenType: "pawn",
      scope: "global",
      order: "ordered",
      visibility: "public",
    });
    const genome = { definition };

    const repaired = unusedElementPruneRepair.repair(genome);

    assert.ok(repaired);
    const zoneIds = repaired.definition.state.zones.map((z) => z.id);
    assert.ok(zoneIds.includes("board"));
    assert.ok(!zoneIds.includes("orphan_zone"));
  });

  it("cascades: prunes zones whose tokenType was pruned", () => {
    const definition = cloneDefinition(baseDefinition);
    // Add an unused token type + a zone that references it
    definition.state.tokenTypes.push({
      id: "ghost",
      attributes: [
        { id: "v", scope: "global", type: { kind: "int", min: 0, max: 3 }, initial: 0 },
      ],
    });
    definition.state.zones.push({
      id: "graveyard",
      tokenType: "ghost",
      scope: "global",
      order: "unordered",
      visibility: "public",
    });
    const genome = { definition };

    const repaired = unusedElementPruneRepair.repair(genome);

    assert.ok(repaired);
    const ttIds = repaired.definition.state.tokenTypes.map((t) => t.id);
    const zoneIds = repaired.definition.state.zones.map((z) => z.id);
    assert.ok(!ttIds.includes("ghost"));
    assert.ok(!zoneIds.includes("graveyard"));
  });

  it("keeps at least 1 variable even if all are unused", () => {
    const definition = cloneDefinition(baseDefinition);
    // Remove all references to score
    definition.actions = [
      { id: "noop", actor: "player", effects: [{ kind: "noop" }] },
    ];
    definition.termination.conditions = [
      {
        condition: { kind: "value", value: true },
        outcome: { type: "draw" },
      },
    ];
    definition.state.variables = [
      { id: "orphan1", scope: "global", type: { kind: "int", min: 0, max: 5 }, initial: 0 },
      { id: "orphan2", scope: "global", type: { kind: "int", min: 0, max: 5 }, initial: 0 },
    ];
    const genome = { definition };

    const repaired = unusedElementPruneRepair.repair(genome);

    assert.ok(repaired);
    assert.ok(repaired.definition.state.variables.length >= 1);
  });

  it("keeps at least 1 zone even if all are unused", () => {
    const definition = cloneDefinition(baseDefinition);
    // Remove param selectors that reference board
    definition.actions[0] = {
      id: "move",
      actor: "player",
      effects: [
        { kind: "inc", target: { kind: "var", id: "score" }, amount: 1 },
      ],
    };
    definition.state.zones = [
      { id: "z1", tokenType: "pawn", scope: "global", order: "ordered", visibility: "public" },
      { id: "z2", tokenType: "pawn", scope: "global", order: "ordered", visibility: "public" },
    ];
    const genome = { definition };

    const repaired = unusedElementPruneRepair.repair(genome);

    assert.ok(repaired);
    assert.ok(repaired.definition.state.zones.length >= 1);
  });

  it("does not mutate input genome", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.state.variables.push({
      id: "orphan",
      scope: "global",
      type: { kind: "int", min: 0, max: 5 },
      initial: 0,
    });
    const genome = { definition };
    const originalJson = JSON.stringify(genome);

    unusedElementPruneRepair.repair(genome);

    assert.equal(JSON.stringify(genome), originalJson);
  });

  it("handles definition with no state gracefully", () => {
    const definition = {
      version: "1.0",
      players: { count: 2 },
      actions: [],
      turn: {},
      termination: { conditions: [], maxTurns: 10 },
    };
    const genome = { definition };

    const repaired = unusedElementPruneRepair.repair(genome);

    assert.ok(repaired);
  });

  it("skips pruning when only 1 element of each type exists", () => {
    const definition = cloneDefinition(baseDefinition);
    const genome = { definition };

    const repaired = unusedElementPruneRepair.repair(genome);

    assert.ok(repaired);
    // Even if the single element were unreferenced, we'd keep it
    assert.equal(repaired.definition.state.variables.length, 1);
    assert.equal(repaired.definition.state.tokenTypes.length, 1);
    assert.equal(repaired.definition.state.zones.length, 1);
  });
});
