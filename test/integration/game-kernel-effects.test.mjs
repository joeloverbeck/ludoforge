import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../../src/game-kernel/state.js";
import {
  applyEffect,
  buildVariableIndex,
  evaluateExpr,
} from "../../src/game-kernel/effects.js";

// ---------------------------------------------------------------------------
// Shared fixture helpers
// ---------------------------------------------------------------------------

function definitionWithVarsAndZones() {
  return {
    version: "1.0",
    players: { count: 2 },
    state: {
      variables: [
        { id: "score", scope: "global", type: { kind: "int", min: 0, max: 100 }, initial: 10 },
        { id: "hp", scope: "per_player", type: { kind: "int", min: 0, max: 20 }, initial: 15 },
        { id: "flag_var", scope: "global", type: { kind: "bool" }, initial: false },
      ],
      tokenTypes: [
        { id: "pawn", attributes: [{ id: "color", scope: "global", type: { kind: "enum", values: ["red", "blue"] }, initial: "red" }] },
      ],
      zones: [
        { id: "board", tokenType: "pawn", scope: "global", order: "ordered", visibility: "public" },
        { id: "hand", tokenType: "pawn", scope: "per_player", order: "ordered", visibility: "private" },
      ],
    },
    actions: [],
    turn: { scheduler: "round_robin" },
    termination: { conditions: [] },
  };
}

function spatialDefinition() {
  return {
    version: "1.0",
    players: { count: 2 },
    state: {
      variables: [],
      tokenTypes: [{ id: "piece", attributes: [] }],
      zones: [
        {
          id: "grid",
          tokenType: "piece",
          scope: "global",
          order: "unordered",
          visibility: "public",
          spatial: {
            nodes: ["A", "B", "C"],
            edges: [["A", "B"], ["B", "C"]],
          },
        },
      ],
    },
    actions: [],
    turn: { scheduler: "round_robin" },
    termination: { conditions: [] },
  };
}

function makeContext(state, definition, playerId) {
  return {
    state,
    playerId,
    variableIndex: buildVariableIndex(definition),
    definition,
  };
}

// ---------------------------------------------------------------------------
// Suite 1 — Expression evaluation with reference resolution
// ---------------------------------------------------------------------------

describe("game-kernel effects integration", () => {
  describe("expression evaluation with reference resolution", () => {
    it("resolves variable ref in cmp expression", () => {
      const def = definitionWithVarsAndZones();
      const state = createInitialState(def);
      const ctx = makeContext(state, def, 1);

      const expr = {
        kind: "cmp",
        left: { kind: "ref", ref: { kind: "var", id: "score" } },
        right: { kind: "value", value: 10 },
        op: "==",
      };
      assert.equal(evaluateExpr(expr, ctx), true);
    });

    it("resolves zone_query count ref in expression", () => {
      const def = definitionWithVarsAndZones();
      const state = createInitialState(def);
      // Spawn a token into board zone manually
      state.tokens["t1"] = { id: "t1", type: "pawn", attributes: {}, revealed: true, flags: {} };
      state.zones.board.tokens.push("t1");

      const ctx = makeContext(state, def, 1);
      const expr = {
        kind: "cmp",
        left: { kind: "ref", ref: { kind: "zone_query", id: "board", query: "count" } },
        right: { kind: "value", value: 1 },
        op: "==",
      };
      assert.equal(evaluateExpr(expr, ctx), true);
    });

    it("resolves zone_query has_token ref in expression", () => {
      const def = definitionWithVarsAndZones();
      const state = createInitialState(def);
      const ctx = makeContext(state, def, 1);

      const expr = {
        kind: "cmp",
        left: { kind: "ref", ref: { kind: "zone_query", id: "board", query: "has_token" } },
        right: { kind: "value", value: false },
        op: "==",
      };
      assert.equal(evaluateExpr(expr, ctx), true);
    });

    it("resolves flag_query ref in expression", () => {
      const def = definitionWithVarsAndZones();
      const state = createInitialState(def);
      state.tokens["t1"] = { id: "t1", type: "pawn", attributes: {}, revealed: true, flags: { marked: { duration: "action" } } };

      const ctx = makeContext(state, def, 1);
      const expr = {
        kind: "ref",
        ref: { kind: "flag_query", id: "t1", flag: "marked" },
      };
      assert.equal(evaluateExpr(expr, ctx), true);
    });

    it("evaluates compound and/or with mixed ref types", () => {
      const def = definitionWithVarsAndZones();
      const state = createInitialState(def);
      const ctx = makeContext(state, def, 1);

      // score == 10 AND hp > 5 → true AND true → true
      const expr = {
        kind: "and",
        left: {
          kind: "cmp",
          left: { kind: "ref", ref: { kind: "var", id: "score" } },
          right: { kind: "value", value: 10 },
          op: "==",
        },
        right: {
          kind: "cmp",
          left: { kind: "ref", ref: { kind: "var", id: "hp" } },
          right: { kind: "value", value: 5 },
          op: ">",
        },
      };
      assert.equal(evaluateExpr(expr, ctx), true);

      // score == 10 OR score == 99 → true
      const orExpr = {
        kind: "or",
        left: {
          kind: "cmp",
          left: { kind: "ref", ref: { kind: "var", id: "score" } },
          right: { kind: "value", value: 10 },
          op: "==",
        },
        right: {
          kind: "cmp",
          left: { kind: "ref", ref: { kind: "var", id: "score" } },
          right: { kind: "value", value: 99 },
          op: "==",
        },
      };
      assert.equal(evaluateExpr(orExpr, ctx), true);
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 2 — Effect application with variable resolution
  // ---------------------------------------------------------------------------

  describe("effect application with variable resolution", () => {
    it("set/inc/dec effects mutate state correctly", () => {
      const def = definitionWithVarsAndZones();
      const state = createInitialState(def);
      const ctx = makeContext(state, def, 1);

      // set score to 50
      const setResult = applyEffect(state, { kind: "set", target: { kind: "var", id: "score" }, value: 50 }, ctx);
      assert.equal(setResult.ok, true);
      assert.equal(state.variables.global.score, 50);

      // inc score by 10
      const incResult = applyEffect(state, { kind: "inc", target: { kind: "var", id: "score" }, amount: 10 }, ctx);
      assert.equal(incResult.ok, true);
      assert.equal(state.variables.global.score, 60);

      // dec hp by 3 for player 1
      const decResult = applyEffect(state, { kind: "dec", target: { kind: "var", id: "hp" }, amount: 3 }, ctx);
      assert.equal(decResult.ok, true);
      assert.equal(state.variables.perPlayer[1].hp, 12);
    });

    it("bounds mode clamp works", () => {
      const def = definitionWithVarsAndZones();
      const state = createInitialState(def);
      const ctx = makeContext(state, def, 1);

      const result = applyEffect(
        state,
        { kind: "inc", target: { kind: "var", id: "hp" }, amount: 100 },
        ctx,
        { boundsMode: "clamp" }
      );
      assert.equal(result.ok, true);
      assert.equal(result.clamped, true);
      assert.equal(state.variables.perPlayer[1].hp, 20);
    });

    it("bounds mode reject works", () => {
      const def = definitionWithVarsAndZones();
      const state = createInitialState(def);
      const ctx = makeContext(state, def, 1);

      const result = applyEffect(
        state,
        { kind: "dec", target: { kind: "var", id: "hp" }, amount: 100 },
        ctx,
        { boundsMode: "reject" }
      );
      assert.equal(result.ok, false);
      assert.equal(result.reason, "bounds");
      assert.equal(state.variables.perPlayer[1].hp, 15); // unchanged
    });

    it("impact tracking records affected players and global", () => {
      const def = definitionWithVarsAndZones();
      const state = createInitialState(def);
      const impact = { affectedPlayerIds: new Set(), affectedGlobal: false };
      const ctx = { ...makeContext(state, def, 1), impact };

      applyEffect(state, { kind: "set", target: { kind: "var", id: "score" }, value: 99 }, ctx);
      assert.equal(impact.affectedGlobal, true);

      applyEffect(state, { kind: "set", target: { kind: "var", id: "hp" }, value: 5 }, ctx);
      assert.ok(impact.affectedPlayerIds.has(1));
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 3 — Effect application with token dispatch
  // ---------------------------------------------------------------------------

  describe("effect application with token dispatch", () => {
    it("token spawn through applyEffect dispatcher", () => {
      const def = definitionWithVarsAndZones();
      const state = createInitialState(def);
      const ctx = makeContext(state, def, 1);

      const result = applyEffect(
        state,
        { kind: "spawn", target: { kind: "token", id: "pawn" }, toZone: "board" },
        ctx
      );
      assert.equal(result.ok, true);
      assert.equal(result.appliedEffect.kind, "spawn");
      assert.ok(state.tokens[result.appliedEffect.tokenId]);
    });

    it("token move through applyEffect dispatcher", () => {
      const def = definitionWithVarsAndZones();
      const state = createInitialState(def);
      const ctx = makeContext(state, def, 1);

      // Spawn first
      applyEffect(state, { kind: "spawn", target: { kind: "token", id: "pawn" }, toZone: "board" }, ctx);
      const tokenId = Object.keys(state.tokens)[0];

      // Move to hand zone
      const result = applyEffect(
        state,
        { kind: "move", target: { kind: "token", id: tokenId }, toZone: "hand" },
        ctx
      );
      assert.equal(result.ok, true);
      assert.equal(result.appliedEffect.kind, "move");
    });

    it("token destroy through applyEffect dispatcher", () => {
      const def = definitionWithVarsAndZones();
      const state = createInitialState(def);
      const ctx = makeContext(state, def, 1);

      // Spawn first
      applyEffect(state, { kind: "spawn", target: { kind: "token", id: "pawn" }, toZone: "board" }, ctx);
      const tokenId = Object.keys(state.tokens)[0];

      const result = applyEffect(
        state,
        { kind: "destroy", target: { kind: "token", id: tokenId } },
        ctx
      );
      assert.equal(result.ok, true);
      assert.equal(result.appliedEffect.kind, "destroy");
      assert.equal(state.tokens[tokenId], undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 4 — Compound and special effects
  // ---------------------------------------------------------------------------

  describe("compound and special effects", () => {
    it("repeat effect with sub-effects (recursive dispatch)", () => {
      const def = definitionWithVarsAndZones();
      const state = createInitialState(def);
      const ctx = makeContext(state, def, 1);

      const result = applyEffect(
        state,
        {
          kind: "repeat",
          count: 3,
          effects: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }],
        },
        ctx
      );
      assert.equal(result.ok, true);
      assert.equal(result.appliedEffect.kind, "repeat");
      assert.equal(result.appliedEffect.count, 3);
      assert.equal(state.variables.global.score, 13); // 10 + 3*1
    });

    it("set_flag on token", () => {
      const def = definitionWithVarsAndZones();
      const state = createInitialState(def);
      state.tokens["t1"] = { id: "t1", type: "pawn", attributes: {}, revealed: true, flags: {} };
      const ctx = makeContext(state, def, 1);

      const result = applyEffect(
        state,
        {
          kind: "set_flag",
          target: { kind: "token", id: "t1" },
          flag: "activated",
          duration: "turn",
        },
        ctx
      );
      assert.equal(result.ok, true);
      assert.deepEqual(state.tokens.t1.flags.activated, { duration: "turn" });
    });

    it("set_flag on player", () => {
      const def = definitionWithVarsAndZones();
      const state = createInitialState(def);
      const ctx = makeContext(state, def, 1);

      const result = applyEffect(
        state,
        {
          kind: "set_flag",
          target: { kind: "player", id: "self" },
          flag: "has_acted",
        },
        ctx
      );
      assert.equal(result.ok, true);
      assert.ok(state.agents[0].flags.has_acted);
    });

    it("move_spatial with adjacency enforcement", () => {
      const def = spatialDefinition();
      const state = createInitialState(def);
      // Manually place token at node A
      state.tokens["t1"] = { id: "t1", type: "piece", attributes: {}, revealed: true, flags: {}, node: "A" };
      state.zones.grid.tokens.push("t1");
      const ctx = makeContext(state, def, 1);

      // A→B is adjacent
      const okResult = applyEffect(
        state,
        { kind: "move_spatial", target: { kind: "token", id: "t1" }, zone: "grid", toNode: "B" },
        ctx
      );
      assert.equal(okResult.ok, true);
      assert.equal(state.tokens.t1.node, "B");

      // B→C is adjacent but let's test non-adjacent: move to A is adjacent from B
      // Move to C first
      applyEffect(state, { kind: "move_spatial", target: { kind: "token", id: "t1" }, zone: "grid", toNode: "C" }, ctx);

      // C→A is NOT adjacent (only A-B and B-C edges)
      const failResult = applyEffect(
        state,
        { kind: "move_spatial", target: { kind: "token", id: "t1" }, zone: "grid", toNode: "A" },
        ctx
      );
      assert.equal(failResult.ok, false);
      assert.equal(failResult.reason, "not-adjacent");
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 5 — Full pipeline (expression check + effect apply)
  // ---------------------------------------------------------------------------

  describe("full pipeline: evaluate condition then apply effect", () => {
    it("mirrors triggers.js pattern: evaluate guard, then apply effect", () => {
      const def = definitionWithVarsAndZones();
      const state = createInitialState(def);
      const ctx = makeContext(state, def, 1);

      // Guard: score == 10
      const guard = {
        kind: "cmp",
        left: { kind: "ref", ref: { kind: "var", id: "score" } },
        right: { kind: "value", value: 10 },
        op: "==",
      };
      assert.equal(evaluateExpr(guard, ctx), true);

      // Effect: double the score
      const result = applyEffect(
        state,
        { kind: "set", target: { kind: "var", id: "score" }, value: 20 },
        ctx
      );
      assert.equal(result.ok, true);
      assert.equal(state.variables.global.score, 20);

      // Guard should now fail (score != 10)
      assert.equal(evaluateExpr(guard, ctx), false);
    });
  });
});
