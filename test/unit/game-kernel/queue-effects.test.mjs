import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../../../src/game-kernel/state.js";
import { applyEffect, buildVariableIndex } from "../../../src/game-kernel/effects.js";

const baseDefinition = {
  version: "1.0",
  players: { count: 2 },
  state: {
    variables: [
      { id: "score", scope: "global", type: { kind: "int", min: 0, max: 100 }, initial: 0 },
    ],
    tokenTypes: [
      {
        id: "action_card",
        attributes: [
          { id: "priority", scope: "global", type: { kind: "int", min: 0, max: 10 }, initial: 0 },
        ],
      },
    ],
    zones: [
      { id: "queue", tokenType: "action_card", scope: "global", order: "ordered", visibility: "public" },
      { id: "discard", tokenType: "action_card", scope: "global", order: "ordered", visibility: "public" },
      { id: "player_queue", tokenType: "action_card", scope: "per_player", order: "ordered", visibility: "public" },
      { id: "player_discard", tokenType: "action_card", scope: "per_player", order: "ordered", visibility: "public" },
    ],
  },
  actions: [],
  turn: { scheduler: "round_robin" },
  termination: { conditions: [] },
};

function makeContext(state, playerId = 1) {
  return {
    state,
    playerId,
    definition: baseDefinition,
    variableIndex: buildVariableIndex(baseDefinition),
  };
}

function spawnToken(state, id, zoneId, playerId) {
  state.tokens[id] = {
    id,
    type: "action_card",
    attributes: { priority: 0 },
    revealed: true,
    flags: {},
  };
  const zone = state.zones[zoneId];
  if (zone.scope === "per_player" && playerId != null) {
    zone.tokensByPlayer[playerId] = [...(zone.tokensByPlayer[playerId] ?? []), id];
  } else {
    zone.tokens = [...(zone.tokens ?? []), id];
  }
}

describe("queue_push effect", () => {
  it("appends token to end of ordered global zone", () => {
    const state = createInitialState(baseDefinition);
    spawnToken(state, "tA", "discard", undefined);
    const ctx = makeContext(state);

    const result = applyEffect(
      state,
      { kind: "queue_push", target: { kind: "token", id: "tA" }, toZone: "queue" },
      ctx
    );

    assert.equal(result.ok, true);
    assert.equal(result.appliedEffect.kind, "queue_push");
    assert.equal(result.appliedEffect.tokenId, "tA");
    assert.deepStrictEqual(state.zones.queue.tokens, ["tA"]);
    // Token removed from source zone
    assert.ok(!state.zones.discard.tokens.includes("tA"));
  });

  it("appends multiple tokens preserving order", () => {
    const state = createInitialState(baseDefinition);
    spawnToken(state, "tA", "discard", undefined);
    spawnToken(state, "tB", "discard", undefined);
    const ctx = makeContext(state);

    applyEffect(
      state,
      { kind: "queue_push", target: { kind: "token", id: "tA" }, toZone: "queue" },
      ctx
    );
    applyEffect(
      state,
      { kind: "queue_push", target: { kind: "token", id: "tB" }, toZone: "queue" },
      ctx
    );

    assert.deepStrictEqual(state.zones.queue.tokens, ["tA", "tB"]);
  });

  it("works with per_player zones", () => {
    const state = createInitialState(baseDefinition);
    spawnToken(state, "pA", "player_discard", 1);
    const ctx = makeContext(state, 1);

    const result = applyEffect(
      state,
      { kind: "queue_push", target: { kind: "token", id: "pA" }, toZone: "player_queue" },
      ctx
    );

    assert.equal(result.ok, true);
    assert.deepStrictEqual(state.zones.player_queue.tokensByPlayer[1], ["pA"]);
    assert.ok(!state.zones.player_discard.tokensByPlayer[1].includes("pA"));
  });

  it("returns error for missing params", () => {
    const state = createInitialState(baseDefinition);
    const ctx = makeContext(state);

    const result = applyEffect(
      state,
      { kind: "queue_push", target: { kind: "var", id: "score" }, toZone: "queue" },
      ctx
    );
    assert.equal(result.ok, false);
    assert.equal(result.reason, "missing-queue-push-params");
  });

  it("returns error for unknown token", () => {
    const state = createInitialState(baseDefinition);
    const ctx = makeContext(state);

    const result = applyEffect(
      state,
      { kind: "queue_push", target: { kind: "token", id: "nonexistent" }, toZone: "queue" },
      ctx
    );
    assert.equal(result.ok, false);
    assert.equal(result.reason, "token-not-found");
  });

  it("returns error for unknown zone", () => {
    const state = createInitialState(baseDefinition);
    spawnToken(state, "tA", "discard", undefined);
    const ctx = makeContext(state);

    const result = applyEffect(
      state,
      { kind: "queue_push", target: { kind: "token", id: "tA" }, toZone: "nonexistent" },
      ctx
    );
    assert.equal(result.ok, false);
    assert.equal(result.reason, "unknown-zone");
  });
});

describe("queue_pop effect", () => {
  it("removes first token from ordered global zone (destroys when no toZone)", () => {
    const state = createInitialState(baseDefinition);
    spawnToken(state, "tA", "queue", undefined);
    spawnToken(state, "tB", "queue", undefined);
    const ctx = makeContext(state);

    const result = applyEffect(
      state,
      { kind: "queue_pop", fromZone: "queue" },
      ctx
    );

    assert.equal(result.ok, true);
    assert.equal(result.appliedEffect.kind, "queue_pop");
    assert.equal(result.appliedEffect.tokenId, "tA");
    assert.equal(result.appliedEffect.popped, true);
    assert.deepStrictEqual(state.zones.queue.tokens, ["tB"]);
    // Token destroyed
    assert.equal(state.tokens.tA, undefined);
  });

  it("moves popped token to toZone when specified", () => {
    const state = createInitialState(baseDefinition);
    spawnToken(state, "tA", "queue", undefined);
    const ctx = makeContext(state);

    const result = applyEffect(
      state,
      { kind: "queue_pop", fromZone: "queue", toZone: "discard" },
      ctx
    );

    assert.equal(result.ok, true);
    assert.equal(result.appliedEffect.tokenId, "tA");
    assert.deepStrictEqual(state.zones.queue.tokens, []);
    assert.deepStrictEqual(state.zones.discard.tokens, ["tA"]);
    // Token still exists
    assert.ok(state.tokens.tA);
  });

  it("is a no-op on empty zone", () => {
    const state = createInitialState(baseDefinition);
    const ctx = makeContext(state);

    const result = applyEffect(
      state,
      { kind: "queue_pop", fromZone: "queue" },
      ctx
    );

    assert.equal(result.ok, true);
    assert.equal(result.appliedEffect.popped, false);
  });

  it("preserves FIFO ordering: push A, push B, pop → A, pop → B", () => {
    const state = createInitialState(baseDefinition);
    spawnToken(state, "tA", "discard", undefined);
    spawnToken(state, "tB", "discard", undefined);
    const ctx = makeContext(state);

    // Push A then B
    applyEffect(
      state,
      { kind: "queue_push", target: { kind: "token", id: "tA" }, toZone: "queue" },
      ctx
    );
    applyEffect(
      state,
      { kind: "queue_push", target: { kind: "token", id: "tB" }, toZone: "queue" },
      ctx
    );

    assert.deepStrictEqual(state.zones.queue.tokens, ["tA", "tB"]);

    // Pop → A
    const pop1 = applyEffect(
      state,
      { kind: "queue_pop", fromZone: "queue", toZone: "discard" },
      ctx
    );
    assert.equal(pop1.appliedEffect.tokenId, "tA");

    // Pop → B
    const pop2 = applyEffect(
      state,
      { kind: "queue_pop", fromZone: "queue", toZone: "discard" },
      ctx
    );
    assert.equal(pop2.appliedEffect.tokenId, "tB");

    assert.deepStrictEqual(state.zones.queue.tokens, []);
    assert.deepStrictEqual(state.zones.discard.tokens, ["tA", "tB"]);
  });

  it("conserves token count when moving between zones", () => {
    const state = createInitialState(baseDefinition);
    spawnToken(state, "tA", "queue", undefined);
    spawnToken(state, "tB", "queue", undefined);
    spawnToken(state, "tC", "queue", undefined);
    const ctx = makeContext(state);

    const totalBefore = Object.keys(state.tokens).length;

    applyEffect(state, { kind: "queue_pop", fromZone: "queue", toZone: "discard" }, ctx);
    applyEffect(state, { kind: "queue_pop", fromZone: "queue", toZone: "discard" }, ctx);

    const totalAfter = Object.keys(state.tokens).length;
    assert.equal(totalAfter, totalBefore);
    assert.equal(state.zones.queue.tokens.length, 1);
    assert.equal(state.zones.discard.tokens.length, 2);
  });

  it("works with per_player zones", () => {
    const state = createInitialState(baseDefinition);
    spawnToken(state, "pA", "player_queue", 1);
    spawnToken(state, "pB", "player_queue", 1);
    const ctx = makeContext(state, 1);

    const result = applyEffect(
      state,
      { kind: "queue_pop", fromZone: "player_queue", toZone: "player_discard" },
      ctx
    );

    assert.equal(result.ok, true);
    assert.equal(result.appliedEffect.tokenId, "pA");
    assert.deepStrictEqual(state.zones.player_queue.tokensByPlayer[1], ["pB"]);
    assert.deepStrictEqual(state.zones.player_discard.tokensByPlayer[1], ["pA"]);
  });

  it("returns error for missing fromZone", () => {
    const state = createInitialState(baseDefinition);
    const ctx = makeContext(state);

    const result = applyEffect(state, { kind: "queue_pop" }, ctx);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "missing-queue-pop-params");
  });

  it("returns error for unknown fromZone", () => {
    const state = createInitialState(baseDefinition);
    const ctx = makeContext(state);

    const result = applyEffect(
      state,
      { kind: "queue_pop", fromZone: "nonexistent" },
      ctx
    );
    assert.equal(result.ok, false);
    assert.equal(result.reason, "unknown-zone");
  });

  it("returns error for unknown toZone", () => {
    const state = createInitialState(baseDefinition);
    spawnToken(state, "tA", "queue", undefined);
    const ctx = makeContext(state);

    const result = applyEffect(
      state,
      { kind: "queue_pop", fromZone: "queue", toZone: "nonexistent" },
      ctx
    );
    assert.equal(result.ok, false);
    assert.equal(result.reason, "unknown-zone");
  });
});
