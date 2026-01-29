import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultStateHasher, recordLoopHash } from "../../../src/simulation-engine/loop-detection.js";

describe("defaultStateHasher", () => {
  it("produces a stable hash for the same state", () => {
    const state = {
      variables: { hp: 10 },
      tokens: [],
      zones: [],
      turn: { currentPlayer: 1, phase: "main" },
    };
    const a = defaultStateHasher(state);
    const b = defaultStateHasher(state);
    assert.equal(a, b);
  });

  it("varies when currentPlayer changes", () => {
    const base = { variables: {}, tokens: [], zones: [], turn: { currentPlayer: 1, phase: null } };
    const other = { ...base, turn: { currentPlayer: 2, phase: null } };
    assert.notEqual(defaultStateHasher(base), defaultStateHasher(other));
  });

  it("varies when variables change", () => {
    const a = { variables: { x: 1 }, tokens: [], zones: [], turn: { currentPlayer: 1, phase: null } };
    const b = { variables: { x: 2 }, tokens: [], zones: [], turn: { currentPlayer: 1, phase: null } };
    assert.notEqual(defaultStateHasher(a), defaultStateHasher(b));
  });

  it("treats missing phase as null", () => {
    const withPhase = { variables: {}, tokens: [], zones: [], turn: { currentPlayer: 1, phase: null } };
    const noPhase = { variables: {}, tokens: [], zones: [], turn: { currentPlayer: 1 } };
    assert.equal(defaultStateHasher(withPhase), defaultStateHasher(noPhase));
  });
});

describe("recordLoopHash", () => {
  it("returns repeated: false when tracker is null", () => {
    const state = { variables: {}, tokens: [], zones: [], turn: { currentPlayer: 1, phase: null } };
    const result = recordLoopHash(state, null);
    assert.equal(result.repeated, false);
  });

  it("returns repeated: false on first occurrence", () => {
    const tracker = {
      maxRepeatedStates: 2,
      hasher: defaultStateHasher,
      counts: new Map(),
    };
    const state = { variables: {}, tokens: [], zones: [], turn: { currentPlayer: 1, phase: null } };
    const result = recordLoopHash(state, tracker);
    assert.equal(result.repeated, false);
  });

  it("returns repeated: true when threshold exceeded", () => {
    const tracker = {
      maxRepeatedStates: 1,
      hasher: defaultStateHasher,
      counts: new Map(),
    };
    const state = { variables: {}, tokens: [], zones: [], turn: { currentPlayer: 1, phase: null } };
    recordLoopHash(state, tracker); // count = 1, threshold = 1 → not exceeded
    const result = recordLoopHash(state, tracker); // count = 2 > 1 → exceeded
    assert.equal(result.repeated, true);
  });

  it("uses a custom hasher when provided", () => {
    let called = false;
    const customHasher = () => { called = true; return "fixed"; };
    const tracker = {
      maxRepeatedStates: 10,
      hasher: customHasher,
      counts: new Map(),
    };
    const state = { variables: {}, tokens: [], zones: [], turn: { currentPlayer: 1 } };
    recordLoopHash(state, tracker);
    assert.equal(called, true);
  });
});
