import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  collectZoneIds,
  collectVariableIds,
  collectTokenTypeIds,
  collectTokenAttributeIds,
  collectSpatialZoneNodes,
} from "../../src/evolutionary-engine/repair/id-collectors.js";
import {
  repairVariable,
  repairVariables,
  repairTokenTypes,
} from "../../src/evolutionary-engine/repair/variable-repair.js";
import {
  repairEffect,
  repairEffects,
} from "../../src/evolutionary-engine/repair/effect-repair.js";
import { exprReferencesMissingVariable } from "../../src/evolutionary-engine/repair/expression-repair.js";
import {
  repairActions,
  repairTriggers,
} from "../../src/evolutionary-engine/repair/action-repair.js";
import { baseDefinition } from "../unit/dsl/fixtures.mjs";

function cloneDef() {
  return structuredClone(baseDefinition);
}

describe("repair modules: ID Collectors", () => {
  it("collectZoneIds returns zone ids from definition", () => {
    const def = cloneDef();
    const ids = collectZoneIds(def);
    assert.ok(ids instanceof Set);
    assert.ok(ids.has("board"));
    assert.equal(ids.size, 1);
  });

  it("collectVariableIds returns variable ids from definition", () => {
    const def = cloneDef();
    const ids = collectVariableIds(def);
    assert.ok(ids.has("score"));
    assert.equal(ids.size, 1);
  });

  it("collectTokenTypeIds returns token type ids from definition", () => {
    const def = cloneDef();
    const ids = collectTokenTypeIds(def);
    assert.ok(ids.has("pawn"));
    assert.equal(ids.size, 1);
  });

  it("collectTokenAttributeIds returns map of tokenType → attribute ids", () => {
    const def = cloneDef();
    const map = collectTokenAttributeIds(def);
    assert.ok(map instanceof Map);
    assert.ok(map.has("pawn"));
    assert.ok(map.get("pawn").has("owner"));
  });

  it("collectSpatialZoneNodes returns empty map when no spatial zones exist", () => {
    const def = cloneDef();
    const map = collectSpatialZoneNodes(def);
    assert.ok(map instanceof Map);
    assert.equal(map.size, 0);
  });
});

describe("repair modules: Variable Repair", () => {
  it("clamps int initial to valid range", () => {
    const result = repairVariable({
      id: "hp",
      scope: "global",
      type: { kind: "int", min: 0, max: 10 },
      initial: 15,
    });
    assert.ok(result);
    assert.equal(result.initial, 10);
  });

  it("returns null for variable with invalid type", () => {
    const result = repairVariable({
      id: "x",
      scope: "global",
      type: null,
      initial: 0,
    });
    assert.equal(result, null);
  });

  it("resets enum initial to first value when invalid", () => {
    const result = repairVariable({
      id: "color",
      scope: "global",
      type: { kind: "enum", values: ["red", "blue"] },
      initial: "green",
    });
    assert.ok(result);
    assert.equal(result.initial, "red");
  });

  it("repairVariables returns null when cascade encounters invalid variable", () => {
    const result = repairVariables([
      { id: "ok", scope: "global", type: { kind: "int", min: 0, max: 5 }, initial: 0 },
      { id: "bad", scope: "global", type: null, initial: 0 },
    ]);
    assert.equal(result, null);
  });

  it("repairTokenTypes repairs attributes on token types", () => {
    const result = repairTokenTypes([
      {
        id: "piece",
        attributes: [
          { id: "hp", scope: "global", type: { kind: "int", min: 0, max: 5 }, initial: 99 },
        ],
      },
    ]);
    assert.ok(result);
    assert.equal(result[0].attributes[0].initial, 5);
  });

  it("repairTokenTypes returns null when attribute repair fails", () => {
    const result = repairTokenTypes([
      {
        id: "piece",
        attributes: [
          { id: "bad", scope: "global", type: null, initial: 0 },
        ],
      },
    ]);
    assert.equal(result, null);
  });
});

describe("repair modules: Effect Repair", () => {
  it("repairs effect referencing missing variable", () => {
    const def = cloneDef();
    const effect = { kind: "set", target: { kind: "var", id: "missing" }, value: 1 };
    const result = repairEffect(effect, def, 0);
    assert.ok(result);
    assert.equal(result.target.id, "score");
  });

  it("repairs spawn effect referencing missing token type", () => {
    const def = cloneDef();
    const effect = { kind: "spawn", target: { kind: "token", id: "ghost" }, toZone: "board" };
    const result = repairEffect(effect, def, 0);
    assert.ok(result);
    assert.equal(result.target.id, "pawn");
  });

  it("removes invalid attribute via destructuring (no mutation)", () => {
    const def = cloneDef();
    const effect = {
      kind: "spawn",
      target: { kind: "token", id: "ghost", attribute: "nonexistent" },
      toZone: "board",
    };
    const result = repairEffect(effect, def, 0);
    assert.ok(result);
    assert.equal(result.target.id, "pawn");
    assert.equal("attribute" in result.target, false);
  });

  it("repairs effect with missing toZone", () => {
    const def = cloneDef();
    const effect = { kind: "move", target: { kind: "token", id: "piece" }, toZone: "missing" };
    const result = repairEffect(effect, def, 0);
    assert.ok(result);
    assert.equal(result.toZone, "board");
  });

  it("returns null for move_spatial with no spatial zones", () => {
    const def = cloneDef();
    const effect = { kind: "move_spatial", zone: "nonexistent", toNode: "a" };
    const result = repairEffect(effect, def, 0);
    assert.equal(result, null);
  });

  it("clamps repeat count and recurses into sub-effects", () => {
    const def = cloneDef();
    const effect = {
      kind: "repeat",
      count: 50,
      effects: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }],
    };
    const result = repairEffect(effect, def, 0);
    assert.ok(result);
    assert.equal(result.count, 10);
    assert.equal(result.effects.length, 1);
  });

  it("repairs invalid set_flag duration", () => {
    const def = cloneDef();
    const effect = { kind: "set_flag", flag: "test", duration: "forever" };
    const result = repairEffect(effect, def, 0);
    assert.ok(result);
    assert.equal(result.duration, "action");
  });
});

describe("repair modules: Expression & Action Repair", () => {
  it("detects nested expression with missing variable ref", () => {
    const variableIds = new Set(["score"]);
    const expr = {
      kind: "and",
      left: { kind: "ref", ref: { kind: "var", id: "score" } },
      right: { kind: "ref", ref: { kind: "var", id: "missing" } },
    };
    assert.equal(exprReferencesMissingVariable(expr, variableIds), true);
  });

  it("repairActions removes preconditions with missing variable refs", () => {
    const def = cloneDef();
    def.actions[0].preconditions = {
      kind: "ref",
      ref: { kind: "var", id: "nonexistent" },
    };
    const result = repairActions(def);
    assert.equal("preconditions" in result[0], false);
  });

  it("repairActions repairs costs and effects", () => {
    const def = cloneDef();
    def.actions[0].costs = [
      { kind: "set", target: { kind: "var", id: "missing" }, value: 1 },
    ];
    const result = repairActions(def);
    assert.ok(result[0].costs.length === 0 || result[0].costs[0].target.id === "score");
  });

  it("repairTriggers repairs trigger effects", () => {
    const def = cloneDef();
    def.triggers = [
      {
        id: "t1",
        event: "turn_start",
        effects: [{ kind: "set", target: { kind: "var", id: "missing" }, value: 1 }],
      },
    ];
    const result = repairTriggers(def);
    assert.ok(result[0].effects.length === 0 || result[0].effects[0].target.id === "score");
  });
});

describe("repair modules: ID Context Caching", () => {
  it("repairEffect accepts optional idContext parameter", () => {
    const def = cloneDef();
    const idContext = {
      variableIds: collectVariableIds(def),
      tokenTypeIds: collectTokenTypeIds(def),
      tokenAttributeIds: collectTokenAttributeIds(def),
      zoneIds: collectZoneIds(def),
    };
    const effect = { kind: "set", target: { kind: "var", id: "missing" }, value: 1 };
    const result = repairEffect(effect, def, 0, idContext);
    assert.ok(result);
    assert.equal(result.target.id, "score");
  });
});
