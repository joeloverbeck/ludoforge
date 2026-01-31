import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { collectUsedIds } from "../../../src/dsl/semantic/used-id-collector.js";
import { baseDefinition } from "./fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

describe("collectUsedIds", () => {
  it("collects variable IDs from action effects", () => {
    const definition = cloneDefinition(baseDefinition);
    const { usedVariableIds } = collectUsedIds(definition);

    assert.ok(usedVariableIds.has("score"));
  });

  it("collects zone IDs from action param selectors", () => {
    const definition = cloneDefinition(baseDefinition);
    const { usedZoneIds } = collectUsedIds(definition);

    assert.ok(usedZoneIds.has("board"));
  });

  it("collects token type IDs from action param selectors", () => {
    const definition = cloneDefinition(baseDefinition);
    const { usedTokenTypeIds } = collectUsedIds(definition);

    assert.ok(usedTokenTypeIds.has("pawn"));
  });

  it("collects variable IDs from termination conditions", () => {
    const definition = cloneDefinition(baseDefinition);
    const { usedVariableIds } = collectUsedIds(definition);

    assert.ok(usedVariableIds.has("score"));
  });

  it("collects IDs from trigger effects", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.triggers = [
      {
        event: "start_turn",
        effects: [
          { kind: "inc", target: { kind: "var", id: "energy" }, amount: 1 },
        ],
      },
    ];
    const { usedVariableIds } = collectUsedIds(definition);

    assert.ok(usedVariableIds.has("energy"));
  });

  it("collects IDs from trigger conditions", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.triggers = [
      {
        event: "end_turn",
        condition: {
          kind: "cmp",
          op: ">=",
          left: { kind: "ref", ref: { kind: "var", id: "health" } },
          right: { kind: "value", value: 0 },
        },
        effects: [],
      },
    ];
    const { usedVariableIds } = collectUsedIds(definition);

    assert.ok(usedVariableIds.has("health"));
  });

  it("collects zone IDs from move/spawn toZone effects", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].effects.push({
      kind: "spawn",
      target: { kind: "token", id: "pawn" },
      toZone: "hand",
    });
    const { usedZoneIds } = collectUsedIds(definition);

    assert.ok(usedZoneIds.has("hand"));
    assert.ok(usedZoneIds.has("board"));
  });

  it("collects zone IDs from queue_pop fromZone", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].effects.push({
      kind: "queue_pop",
      fromZone: "deck",
    });
    const { usedZoneIds } = collectUsedIds(definition);

    assert.ok(usedZoneIds.has("deck"));
  });

  it("collects IDs from nested conditional effects", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].effects.push({
      kind: "conditional",
      condition: {
        kind: "cmp",
        op: ">",
        left: { kind: "ref", ref: { kind: "var", id: "gold" } },
        right: { kind: "value", value: 5 },
      },
      then: [
        { kind: "inc", target: { kind: "var", id: "power" }, amount: 1 },
      ],
      else: [
        { kind: "dec", target: { kind: "var", id: "stamina" }, amount: 1 },
      ],
    });
    const { usedVariableIds } = collectUsedIds(definition);

    assert.ok(usedVariableIds.has("gold"));
    assert.ok(usedVariableIds.has("power"));
    assert.ok(usedVariableIds.has("stamina"));
  });

  it("collects IDs from repeat sub-effects", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].effects.push({
      kind: "repeat",
      count: 3,
      effects: [
        { kind: "inc", target: { kind: "var", id: "xp" }, amount: 1 },
      ],
    });
    const { usedVariableIds } = collectUsedIds(definition);

    assert.ok(usedVariableIds.has("xp"));
  });

  it("collects variable ID from set_turn_order effect", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.triggers = [
      {
        event: "end_round",
        effects: [
          { kind: "set_turn_order", order: "by_variable", variable: "initiative", direction: "desc" },
        ],
      },
    ];
    const { usedVariableIds } = collectUsedIds(definition);

    assert.ok(usedVariableIds.has("initiative"));
  });

  it("collects variable ID from turn.orderBy", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.turn = { scheduler: "round_robin", orderBy: "speed" };
    const { usedVariableIds } = collectUsedIds(definition);

    assert.ok(usedVariableIds.has("speed"));
  });

  it("collects IDs from action costs", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].costs = [
      { kind: "dec", target: { kind: "var", id: "gold" }, amount: 2 },
    ];
    const { usedVariableIds } = collectUsedIds(definition);

    assert.ok(usedVariableIds.has("gold"));
  });

  it("collects IDs from action preconditions", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].preconditions = {
      kind: "cmp",
      op: ">=",
      left: { kind: "ref", ref: { kind: "var", id: "level" } },
      right: { kind: "value", value: 3 },
    };
    const { usedVariableIds } = collectUsedIds(definition);

    assert.ok(usedVariableIds.has("level"));
  });

  it("returns empty sets for null/undefined definition", () => {
    const result = collectUsedIds(null);

    assert.equal(result.usedZoneIds.size, 0);
    assert.equal(result.usedTokenTypeIds.size, 0);
    assert.equal(result.usedVariableIds.size, 0);
  });

  it("returns empty sets for definition with no actions/triggers", () => {
    const result = collectUsedIds({
      version: "1.0",
      players: { count: 2 },
      state: { variables: [] },
      actions: [],
      turn: {},
      termination: { conditions: [], maxTurns: 10 },
    });

    assert.equal(result.usedZoneIds.size, 0);
    assert.equal(result.usedTokenTypeIds.size, 0);
    assert.equal(result.usedVariableIds.size, 0);
  });

  it("does not include declared but unreferenced IDs", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.state.variables.push({
      id: "unused_var",
      scope: "global",
      type: { kind: "int", min: 0, max: 5 },
      initial: 0,
    });
    const { usedVariableIds } = collectUsedIds(definition);

    assert.ok(!usedVariableIds.has("unused_var"));
    assert.ok(usedVariableIds.has("score"));
  });

  it("collects zone IDs from rng_choose option sub-effects", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].effects = [
      {
        kind: "rng_choose",
        count: 1,
        options: [
          [
            {
              kind: "move",
              target: { kind: "token", id: "pawn" },
              toZone: "discard",
            },
          ],
          [
            {
              kind: "spawn",
              target: { kind: "token", id: "pawn" },
              toZone: "hand",
            },
          ],
        ],
      },
    ];
    const { usedZoneIds } = collectUsedIds(definition);

    assert.ok(usedZoneIds.has("discard"));
    assert.ok(usedZoneIds.has("hand"));
  });

  it("collects variable IDs from rng_choose option sub-effects", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].effects = [
      {
        kind: "rng_choose",
        count: 1,
        options: [
          [
            {
              kind: "inc",
              target: { kind: "var", id: "gold" },
              amount: 1,
            },
          ],
        ],
      },
    ];
    const { usedVariableIds } = collectUsedIds(definition);

    assert.ok(usedVariableIds.has("gold"));
  });

  it("collects tokenType from zone_query refs", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.actions[0].effects.push({
      kind: "move",
      target: { kind: "zone_query", id: "board", tokenType: "pawn" },
      toZone: "hand",
    });
    const { usedTokenTypeIds, usedZoneIds } = collectUsedIds(definition);

    assert.ok(usedTokenTypeIds.has("pawn"));
    assert.ok(usedZoneIds.has("board"));
    assert.ok(usedZoneIds.has("hand"));
  });
});
