import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../../../src/game-kernel/state.js";
import { applyEffect, buildVariableIndex } from "../../../src/game-kernel/effects.js";
import { createSeededRng } from "../../../src/simulation-engine/rng.js";

const baseDefinition = {
  version: "1.0",
  players: { count: 2 },
  state: {
    variables: [
      { id: "score", scope: "global", type: { kind: "int", min: 0, max: 100 }, initial: 0 },
    ],
    tokenTypes: [
      {
        id: "card",
        attributes: [
          { id: "value", scope: "global", type: { kind: "int", min: 0, max: 10 }, initial: 0 },
        ],
      },
    ],
    zones: [
      { id: "deck", tokenType: "card", scope: "global", order: "ordered", visibility: "public" },
      { id: "hand", tokenType: "card", scope: "per_player", order: "ordered", visibility: "private" },
    ],
  },
  actions: [],
  turn: { scheduler: "round_robin" },
  termination: { conditions: [] },
};

function makeContext(state, playerId = 1, rng = undefined) {
  return {
    state,
    playerId,
    definition: baseDefinition,
    variableIndex: buildVariableIndex(baseDefinition),
    rng,
  };
}

function spawnTokensIntoGlobalZone(state, zoneId, count) {
  const ids = [];
  for (let i = 0; i < count; i += 1) {
    const tokenId = `t${i + 1}`;
    state.tokens[tokenId] = { id: tokenId, type: "card", attributes: { value: i + 1 }, revealed: true, flags: {} };
    ids.push(tokenId);
  }
  state.zones[zoneId].tokens = ids;
  return ids;
}

function spawnTokensIntoPlayerZone(state, zoneId, playerId, count) {
  const ids = [];
  for (let i = 0; i < count; i += 1) {
    const tokenId = `p${playerId}_t${i + 1}`;
    state.tokens[tokenId] = { id: tokenId, type: "card", attributes: { value: i + 1 }, revealed: true, flags: {} };
    ids.push(tokenId);
  }
  state.zones[zoneId].tokensByPlayer[playerId] = ids;
  return ids;
}

describe("shuffle effect", () => {
  it("randomises token order in an ordered global zone", () => {
    const state = createInitialState(baseDefinition);
    const original = spawnTokensIntoGlobalZone(state, "deck", 5);
    const rng = createSeededRng(42);
    const ctx = makeContext(state, 1, rng);

    const effect = { kind: "shuffle", target: { kind: "zone", id: "deck" } };
    const result = applyEffect(state, effect, ctx);

    assert.equal(result.ok, true);
    assert.equal(result.appliedEffect.kind, "shuffle");
    assert.equal(result.appliedEffect.shuffled, true);

    const after = state.zones.deck.tokens;
    assert.equal(after.length, original.length);
    // shuffled should contain the same tokens
    assert.deepStrictEqual([...after].sort(), [...original].sort());
  });

  it("same seed produces identical shuffle result", () => {
    const state1 = createInitialState(baseDefinition);
    const state2 = createInitialState(baseDefinition);
    spawnTokensIntoGlobalZone(state1, "deck", 6);
    spawnTokensIntoGlobalZone(state2, "deck", 6);

    const effect = { kind: "shuffle", target: { kind: "zone", id: "deck" } };

    const rng1 = createSeededRng(99);
    applyEffect(state1, effect, makeContext(state1, 1, rng1));

    const rng2 = createSeededRng(99);
    applyEffect(state2, effect, makeContext(state2, 1, rng2));

    assert.deepStrictEqual(state1.zones.deck.tokens, state2.zones.deck.tokens);
  });

  it("different seeds produce different orderings", () => {
    const state1 = createInitialState(baseDefinition);
    const state2 = createInitialState(baseDefinition);
    spawnTokensIntoGlobalZone(state1, "deck", 8);
    spawnTokensIntoGlobalZone(state2, "deck", 8);

    const effect = { kind: "shuffle", target: { kind: "zone", id: "deck" } };

    const rng1 = createSeededRng(1);
    applyEffect(state1, effect, makeContext(state1, 1, rng1));

    const rng2 = createSeededRng(999);
    applyEffect(state2, effect, makeContext(state2, 1, rng2));

    // With 8 tokens and very different seeds, the probability of identical order is negligible
    const same = state1.zones.deck.tokens.every((t, i) => t === state2.zones.deck.tokens[i]);
    assert.equal(same, false, "Different seeds should produce different orderings");
  });

  it("preserves zone token count after shuffle", () => {
    const state = createInitialState(baseDefinition);
    const original = spawnTokensIntoGlobalZone(state, "deck", 4);
    const rng = createSeededRng(7);
    const ctx = makeContext(state, 1, rng);

    const effect = { kind: "shuffle", target: { kind: "zone", id: "deck" } };
    applyEffect(state, effect, ctx);

    assert.equal(state.zones.deck.tokens.length, original.length);
  });

  it("shuffling an empty zone is a no-op", () => {
    const state = createInitialState(baseDefinition);
    const rng = createSeededRng(42);
    const ctx = makeContext(state, 1, rng);

    const effect = { kind: "shuffle", target: { kind: "zone", id: "deck" } };
    const result = applyEffect(state, effect, ctx);

    assert.equal(result.ok, true);
    assert.equal(result.appliedEffect.shuffled, false);
    assert.deepStrictEqual(state.zones.deck.tokens, []);
  });

  it("shuffling a single-token zone is a no-op", () => {
    const state = createInitialState(baseDefinition);
    spawnTokensIntoGlobalZone(state, "deck", 1);
    const rng = createSeededRng(42);
    const ctx = makeContext(state, 1, rng);

    const effect = { kind: "shuffle", target: { kind: "zone", id: "deck" } };
    const result = applyEffect(state, effect, ctx);

    assert.equal(result.ok, true);
    assert.equal(result.appliedEffect.shuffled, false);
    assert.deepStrictEqual(state.zones.deck.tokens, ["t1"]);
  });

  it("shuffles a per_player zone for the acting player", () => {
    const state = createInitialState(baseDefinition);
    const original = spawnTokensIntoPlayerZone(state, "hand", 2, 5);
    const rng = createSeededRng(42);
    const ctx = makeContext(state, 2, rng);

    const effect = { kind: "shuffle", target: { kind: "zone", id: "hand" } };
    const result = applyEffect(state, effect, ctx);

    assert.equal(result.ok, true);
    assert.equal(result.appliedEffect.shuffled, true);

    const after = state.zones.hand.tokensByPlayer[2];
    assert.equal(after.length, original.length);
    assert.deepStrictEqual([...after].sort(), [...original].sort());
  });

  it("returns error for non-zone target", () => {
    const state = createInitialState(baseDefinition);
    const ctx = makeContext(state);

    const effect = { kind: "shuffle", target: { kind: "var", id: "score" } };
    const result = applyEffect(state, effect, ctx);

    assert.equal(result.ok, false);
    assert.equal(result.reason, "missing-shuffle-params");
  });

  it("returns error for unknown zone", () => {
    const state = createInitialState(baseDefinition);
    const ctx = makeContext(state);

    const effect = { kind: "shuffle", target: { kind: "zone", id: "nonexistent" } };
    const result = applyEffect(state, effect, ctx);

    assert.equal(result.ok, false);
    assert.equal(result.reason, "unknown-zone");
  });
});
