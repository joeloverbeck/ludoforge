import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../../../src/game-kernel/state.js";
import { isActionLegal, listLegalActions, validateActionChoice } from "../../../src/game-kernel/actions.js";
import { applyTokenSpawn } from "../../../src/game-kernel/token-effects.js";

const baseDefinition = {
  version: "1.0",
  players: {
    count: 2,
    roles: ["north", "south"],
    teams: [["north"], ["south"]],
  },
  state: {
    variables: [
      { id: "score", scope: "global", type: { kind: "int", min: 0, max: 10 }, initial: 5 },
      { id: "health", scope: "per_player", type: { kind: "int", min: 0, max: 10 }, initial: 9 },
      { id: "flag", scope: "global", type: { kind: "bool" }, initial: true },
    ],
    tokenTypes: [],
    zones: [],
  },
  actions: [
    {
      id: "heal",
      actor: "player",
      preconditions: {
        kind: "cmp",
        op: "<",
        left: { kind: "ref", ref: { kind: "var", id: "health" } },
        right: { kind: "value", value: 10 },
      },
      effects: [{ kind: "inc", target: { kind: "var", id: "health" }, amount: 1 }],
      metadata: { phase: "main" },
    },
    {
      id: "role-action",
      actor: "role",
      actorRole: "north",
      effects: [{ kind: "dec", target: { kind: "var", id: "score" }, amount: 1 }],
      metadata: { phase: "main" },
    },
    {
      id: "overheal",
      actor: "player",
      effects: [{ kind: "inc", target: { kind: "var", id: "health" }, amount: 5 }],
      metadata: { phase: "main" },
    },
    {
      id: "set-score",
      actor: "player",
      effects: [{ kind: "set", target: { kind: "var", id: "score" }, value: 20 }],
      metadata: { phase: "main" },
    },
    {
      id: "env-only",
      actor: "environment",
      effects: [{ kind: "set", target: { kind: "var", id: "score" }, value: 1 }],
    },
  ],
  turn: { scheduler: "round_robin", phases: ["setup", "main"] },
  termination: { conditions: [] },
};

describe("actions", () => {
  describe("listLegalActions", () => {
    it("respects phase and actor role", () => {
      const state = createInitialState(baseDefinition);

      const mainActions = listLegalActions(baseDefinition, state, { playerId: 1, phase: "main" }).map(
        (action) => action.id
      );
      assert.ok(mainActions.includes("heal"));
      assert.ok(mainActions.includes("role-action"));
      assert.ok(mainActions.includes("overheal"));
      assert.ok(mainActions.includes("set-score"));
      assert.ok(!mainActions.includes("env-only"));

      const southActions = listLegalActions(baseDefinition, state, { playerId: 2, phase: "main" }).map(
        (action) => action.id
      );
      assert.ok(!southActions.includes("role-action"));

      const setupActions = listLegalActions(baseDefinition, state, { playerId: 1, phase: "setup" });
      assert.equal(setupActions.length, 0);
    });
  });

  describe("validateActionChoice", () => {
    it("enforces bounds with reject or clamp", () => {
      const state = createInitialState(baseDefinition);

      const rejectResult = validateActionChoice(baseDefinition, state, "overheal", {
        playerId: 1,
        phase: "main",
      });
      assert.equal(rejectResult.ok, false);
      assert.equal(rejectResult.reason, "bounds");

      const clampResult = validateActionChoice(
        baseDefinition,
        state,
        "overheal",
        { playerId: 1, phase: "main" },
        { bounds: "clamp" }
      );
      assert.equal(clampResult.ok, true);
      assert.equal(clampResult.clamped, true);

      assert.equal(state.variables.perPlayer[1].health, 9);
    });

    it("rejects illegal actions", () => {
      const state = createInitialState(baseDefinition);
      state.variables.perPlayer[1].health = 10;

      const preconditionResult = validateActionChoice(baseDefinition, state, "heal", {
        playerId: 1,
        phase: "main",
      });
      assert.equal(preconditionResult.ok, false);
      assert.equal(preconditionResult.reason, "illegal-action");

      const roleResult = validateActionChoice(baseDefinition, state, "role-action", {
        playerId: 2,
        phase: "main",
      });
      assert.equal(roleResult.ok, false);
      assert.equal(roleResult.reason, "illegal-action");
    });
  });
});

// --- Parameterized action fixtures ---

const paramDefinition = {
  version: "1.0",
  players: { count: 2 },
  state: {
    variables: [
      { id: "score", scope: "global", type: { kind: "int", min: 0, max: 100 }, initial: 0 },
    ],
    tokenTypes: [
      { id: "unit", attributes: [] },
    ],
    zones: [
      { id: "board", tokenType: "unit", scope: "global", order: "ordered", visibility: "public" },
    ],
  },
  actions: [
    {
      id: "attack",
      actor: "player",
      params: [
        {
          id: "t",
          kind: "token",
          domain: { selector: { zone: "board", tokenType: "unit" } },
        },
      ],
      effects: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }],
    },
    {
      id: "multi-select",
      actor: "player",
      params: [
        {
          id: "targets",
          kind: "token",
          domain: { selector: { zone: "board", tokenType: "unit" } },
          count: 2,
          unique: true,
        },
      ],
      effects: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }],
    },
    {
      id: "no-params",
      actor: "player",
      effects: [{ kind: "inc", target: { kind: "var", id: "score" }, amount: 1 }],
    },
  ],
  turn: { scheduler: "round_robin" },
  termination: { conditions: [], maxTurns: 10 },
};

function spawnUnit(state) {
  const ctx = { state, playerId: 1, definition: paramDefinition };
  const result = applyTokenSpawn(
    state,
    { kind: "spawn", target: { kind: "token", id: "unit" }, toZone: "board" },
    ctx
  );
  return result.appliedEffect.tokenId;
}

describe("isActionLegal with params (domain emptiness)", () => {
  it("returns true when param domain is non-empty", () => {
    const state = createInitialState(paramDefinition);
    spawnUnit(state);
    const action = paramDefinition.actions.find((a) => a.id === "attack");
    assert.equal(isActionLegal(paramDefinition, state, action, { playerId: 1 }), true);
  });

  it("returns false when param domain is empty (no matching tokens)", () => {
    const state = createInitialState(paramDefinition);
    // No tokens spawned — domain is empty
    const action = paramDefinition.actions.find((a) => a.id === "attack");
    assert.equal(isActionLegal(paramDefinition, state, action, { playerId: 1 }), false);
  });

  it("includes parameterized action in listLegalActions when domain non-empty", () => {
    const state = createInitialState(paramDefinition);
    spawnUnit(state);
    const legal = listLegalActions(paramDefinition, state, { playerId: 1 });
    const ids = legal.map((a) => a.id);
    assert.ok(ids.includes("attack"));
  });

  it("excludes parameterized action from listLegalActions when domain empty", () => {
    const state = createInitialState(paramDefinition);
    const legal = listLegalActions(paramDefinition, state, { playerId: 1 });
    const ids = legal.map((a) => a.id);
    assert.ok(!ids.includes("attack"));
    assert.ok(ids.includes("no-params"));
  });
});

describe("validateActionChoice with args", () => {
  it("accepts valid single-target token arg", () => {
    const state = createInitialState(paramDefinition);
    const t1 = spawnUnit(state);
    const t2 = spawnUnit(state);
    const t3 = spawnUnit(state);

    // Each token ID should be accepted
    for (const tid of [t1, t2, t3]) {
      const result = validateActionChoice(
        paramDefinition, state, "attack", { playerId: 1 }, { args: { t: tid } }
      );
      assert.equal(result.ok, true, `token ${tid} should be accepted`);
    }
  });

  it("rejects arg not in domain", () => {
    const state = createInitialState(paramDefinition);
    spawnUnit(state);
    const result = validateActionChoice(
      paramDefinition, state, "attack", { playerId: 1 }, { args: { t: "nonexistent-id" } }
    );
    assert.equal(result.ok, false);
    assert.equal(result.reason, "arg-not-in-domain");
    assert.equal(result.paramId, "t");
  });

  it("rejects missing arg", () => {
    const state = createInitialState(paramDefinition);
    spawnUnit(state);
    const result = validateActionChoice(
      paramDefinition, state, "attack", { playerId: 1 }, { args: {} }
    );
    assert.equal(result.ok, false);
    assert.equal(result.reason, "missing-arg");
    assert.equal(result.paramId, "t");
  });

  it("accepts valid multi-select with count=2, unique=true", () => {
    const state = createInitialState(paramDefinition);
    const t1 = spawnUnit(state);
    const t2 = spawnUnit(state);
    spawnUnit(state);

    const result = validateActionChoice(
      paramDefinition, state, "multi-select", { playerId: 1 },
      { args: { targets: [t1, t2] } }
    );
    assert.equal(result.ok, true);
  });

  it("rejects duplicate args when unique=true", () => {
    const state = createInitialState(paramDefinition);
    const t1 = spawnUnit(state);
    spawnUnit(state);
    spawnUnit(state);

    const result = validateActionChoice(
      paramDefinition, state, "multi-select", { playerId: 1 },
      { args: { targets: [t1, t1] } }
    );
    assert.equal(result.ok, false);
    assert.equal(result.reason, "duplicate-arg");
  });

  it("rejects wrong count for multi-select", () => {
    const state = createInitialState(paramDefinition);
    const t1 = spawnUnit(state);
    spawnUnit(state);
    spawnUnit(state);

    const result = validateActionChoice(
      paramDefinition, state, "multi-select", { playerId: 1 },
      { args: { targets: [t1] } }
    );
    assert.equal(result.ok, false);
    assert.equal(result.reason, "wrong-arg-count");
  });

  it("rejects non-array for multi-select param", () => {
    const state = createInitialState(paramDefinition);
    const t1 = spawnUnit(state);
    spawnUnit(state);
    spawnUnit(state);

    const result = validateActionChoice(
      paramDefinition, state, "multi-select", { playerId: 1 },
      { args: { targets: t1 } }
    );
    assert.equal(result.ok, false);
    assert.equal(result.reason, "invalid-arg-type");
  });

  it("still works without args for parameterless actions (backwards compat)", () => {
    const state = createInitialState(paramDefinition);
    const result = validateActionChoice(
      paramDefinition, state, "no-params", { playerId: 1 }
    );
    assert.equal(result.ok, true);
  });

  it("still works without args option for parameterized actions (no arg validation)", () => {
    const state = createInitialState(paramDefinition);
    spawnUnit(state);
    // No args passed — skips arg validation (backwards compat with callers)
    const result = validateActionChoice(
      paramDefinition, state, "attack", { playerId: 1 }
    );
    assert.equal(result.ok, true);
  });
});
