import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../../../src/game-kernel/state.js";
import { applyTokenSpawn } from "../../../src/game-kernel/token-effects.js";
import { buildVariableIndex } from "../../../src/game-kernel/effects.js";
import { resolveParamDomains } from "../../../src/game-kernel/selectors.js";

const baseDefinition = {
  version: "1.0",
  players: { count: 2 },
  state: {
    variables: [
      { id: "score", scope: "global", type: { kind: "int", min: 0, max: 10 }, initial: 0 },
    ],
    tokenTypes: [
      {
        id: "card",
        attributes: [
          { id: "cost", scope: "global", type: { kind: "int", min: 0, max: 5 }, initial: 1 },
        ],
      },
      {
        id: "piece",
        attributes: [],
      },
    ],
    zones: [
      { id: "hand", tokenType: "card", scope: "per_player", order: "ordered", visibility: "private" },
      { id: "board", tokenType: "card", scope: "global", order: "ordered", visibility: "public" },
    ],
  },
  actions: [],
  turn: { scheduler: "round_robin" },
  termination: { conditions: [], maxTurns: 10 },
};

function makeContext(state, playerId = 1) {
  return {
    state,
    playerId,
    definition: baseDefinition,
    variableIndex: buildVariableIndex(baseDefinition),
  };
}

function spawnToken(state, toZone, playerId = 1, typeId = "card") {
  const ctx = { state, playerId, definition: baseDefinition };
  const result = applyTokenSpawn(
    state,
    { kind: "spawn", target: { kind: "token", id: typeId }, toZone },
    ctx
  );
  return result.appliedEffect.tokenId;
}

describe("resolveParamDomains", () => {
  describe("token params", () => {
    it("returns all matching token IDs from a selector", () => {
      const state = createInitialState(baseDefinition);
      const t1 = spawnToken(state, "board");
      const t2 = spawnToken(state, "board");
      const t3 = spawnToken(state, "board");

      const params = [
        { id: "target", kind: "token", domain: { selector: { zone: "board" } } },
      ];

      const domains = resolveParamDomains(params, state, makeContext(state));
      assert.deepEqual(domains.target, [t1, t2, t3]);
    });

    it("filters by tokenType in selector", () => {
      const state = createInitialState(baseDefinition);
      const t1 = spawnToken(state, "board", 1, "card");
      spawnToken(state, "board", 1, "piece");

      const params = [
        { id: "chosen", kind: "token", domain: { selector: { zone: "board", tokenType: "card" } } },
      ];

      const domains = resolveParamDomains(params, state, makeContext(state));
      assert.deepEqual(domains.chosen, [t1]);
    });

    it("returns empty array when no tokens match", () => {
      const state = createInitialState(baseDefinition);

      const params = [
        { id: "target", kind: "token", domain: { selector: { zone: "board" } } },
      ];

      const domains = resolveParamDomains(params, state, makeContext(state));
      assert.deepEqual(domains.target, []);
    });

    it("returns empty array when zone does not exist", () => {
      const state = createInitialState(baseDefinition);

      const params = [
        { id: "target", kind: "token", domain: { selector: { zone: "nonexistent" } } },
      ];

      const domains = resolveParamDomains(params, state, makeContext(state));
      assert.deepEqual(domains.target, []);
    });

    it("respects player: self in selector for per_player zone", () => {
      const state = createInitialState(baseDefinition);
      const t1 = spawnToken(state, "hand", 1);
      spawnToken(state, "hand", 2);

      const params = [
        { id: "myCard", kind: "token", domain: { selector: { zone: "hand", player: "self" } } },
      ];

      const domains = resolveParamDomains(params, state, makeContext(state, 1));
      assert.deepEqual(domains.myCard, [t1]);
    });
  });

  describe("player params", () => {
    it("returns opponent player IDs for domain.values: 'opponent'", () => {
      const state = {
        agents: [{ id: 1 }, { id: 2 }, { id: 3 }],
        zones: {},
        tokens: {},
      };

      const params = [
        { id: "victim", kind: "player", domain: { values: "opponent" } },
      ];

      const domains = resolveParamDomains(params, state, makeContext(state, 1));
      assert.deepEqual(domains.victim, [2, 3]);
    });

    it("returns self player ID for domain.values: 'self'", () => {
      const state = {
        agents: [{ id: 1 }, { id: 2 }],
        zones: {},
        tokens: {},
      };

      const params = [
        { id: "me", kind: "player", domain: { values: "self" } },
      ];

      const domains = resolveParamDomains(params, state, makeContext(state, 1));
      assert.deepEqual(domains.me, [1]);
    });

    it("returns all player IDs for domain.values: 'any'", () => {
      const state = {
        agents: [{ id: 1 }, { id: 2 }, { id: 3 }],
        zones: {},
        tokens: {},
      };

      const params = [
        { id: "anyone", kind: "player", domain: { values: "any" } },
      ];

      const domains = resolveParamDomains(params, state, makeContext(state, 1));
      assert.deepEqual(domains.anyone, [1, 2, 3]);
    });

    it("returns explicit integer IDs for domain.values as array", () => {
      const state = {
        agents: [{ id: 1 }, { id: 2 }, { id: 3 }],
        zones: {},
        tokens: {},
      };

      const params = [
        { id: "specific", kind: "player", domain: { values: [1, 3] } },
      ];

      const domains = resolveParamDomains(params, state, makeContext(state, 2));
      assert.deepEqual(domains.specific, [1, 3]);
    });

    it("returns empty array when no agents match opponent", () => {
      const state = {
        agents: [{ id: 1 }],
        zones: {},
        tokens: {},
      };

      const params = [
        { id: "victim", kind: "player", domain: { values: "opponent" } },
      ];

      const domains = resolveParamDomains(params, state, makeContext(state, 1));
      assert.deepEqual(domains.victim, []);
    });
  });

  describe("zone params", () => {
    it("returns specified zone IDs", () => {
      const state = createInitialState(baseDefinition);

      const params = [
        { id: "destination", kind: "zone", domain: { values: ["hand", "board"] } },
      ];

      const domains = resolveParamDomains(params, state, makeContext(state));
      assert.deepEqual(domains.destination, ["hand", "board"]);
    });

    it("returns empty array for empty values", () => {
      const state = createInitialState(baseDefinition);

      const params = [
        { id: "destination", kind: "zone", domain: { values: [] } },
      ];

      const domains = resolveParamDomains(params, state, makeContext(state));
      assert.deepEqual(domains.destination, []);
    });
  });

  describe("mixed params", () => {
    it("resolves multiple params of different kinds", () => {
      const state = {
        agents: [{ id: 1 }, { id: 2 }],
        zones: {
          board: {
            scope: "global",
            tokens: ["t1", "t2"],
          },
        },
        tokens: {
          t1: { id: "t1", type: "card" },
          t2: { id: "t2", type: "card" },
        },
      };

      const params = [
        { id: "target", kind: "token", domain: { selector: { zone: "board" } } },
        { id: "victim", kind: "player", domain: { values: "opponent" } },
        { id: "dest", kind: "zone", domain: { values: ["hand"] } },
      ];

      const domains = resolveParamDomains(params, state, makeContext(state, 1));
      assert.deepEqual(domains.target, ["t1", "t2"]);
      assert.deepEqual(domains.victim, [2]);
      assert.deepEqual(domains.dest, ["hand"]);
    });
  });

  describe("edge cases", () => {
    it("returns empty object for null params", () => {
      const state = createInitialState(baseDefinition);
      const domains = resolveParamDomains(null, state, makeContext(state));
      assert.deepEqual(domains, {});
    });

    it("returns empty object for undefined params", () => {
      const state = createInitialState(baseDefinition);
      const domains = resolveParamDomains(undefined, state, makeContext(state));
      assert.deepEqual(domains, {});
    });

    it("returns empty object for empty params array", () => {
      const state = createInitialState(baseDefinition);
      const domains = resolveParamDomains([], state, makeContext(state));
      assert.deepEqual(domains, {});
    });

    it("skips params with missing id", () => {
      const state = createInitialState(baseDefinition);

      const params = [
        { kind: "zone", domain: { values: ["board"] } },
      ];

      const domains = resolveParamDomains(params, state, makeContext(state));
      assert.deepEqual(domains, {});
    });

    it("skips params with missing domain", () => {
      const state = createInitialState(baseDefinition);

      const params = [
        { id: "target", kind: "token" },
      ];

      const domains = resolveParamDomains(params, state, makeContext(state));
      assert.deepEqual(domains, {});
    });

    it("produces deterministic output across repeated calls", () => {
      const state = createInitialState(baseDefinition);
      spawnToken(state, "board");
      spawnToken(state, "board");

      const params = [
        { id: "target", kind: "token", domain: { selector: { zone: "board" } } },
      ];

      const ctx = makeContext(state);
      const d1 = resolveParamDomains(params, state, ctx);
      const d2 = resolveParamDomains(params, state, ctx);
      assert.deepEqual(d1, d2);
    });
  });
});
