import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { choicesForAction, computeDecisionSpace } from "../../../src/simulation-engine/decision-space.js";

describe("choicesForAction", () => {
  it("returns 1 for an action with no params", () => {
    const action = { id: "noop" };
    assert.equal(choicesForAction(action, {}), 1);
  });

  it("returns 1 for an action with empty params array", () => {
    const action = { id: "noop", params: [] };
    assert.equal(choicesForAction(action, {}), 1);
  });

  it("returns domain size for a single-param action", () => {
    const action = { id: "attack", params: [{ id: "t", kind: "token", domain: {} }] };
    const domains = { t: ["a", "b", "c"] };
    assert.equal(choicesForAction(action, domains), 3);
  });

  it("returns product for multi-param action (3×4 = 12)", () => {
    const action = {
      id: "trade",
      params: [
        { id: "src", kind: "token", domain: {} },
        { id: "dst", kind: "zone", domain: {} },
      ],
    };
    const domains = { src: ["a", "b", "c"], dst: ["z1", "z2", "z3", "z4"] };
    assert.equal(choicesForAction(action, domains), 12);
  });

  it("returns 0 when any param domain is empty", () => {
    const action = {
      id: "move",
      params: [
        { id: "t", kind: "token", domain: {} },
        { id: "z", kind: "zone", domain: {} },
      ],
    };
    const domains = { t: ["a", "b"], z: [] };
    assert.equal(choicesForAction(action, domains), 0);
  });

  it("returns 0 when domain is missing for a param", () => {
    const action = { id: "x", params: [{ id: "t", kind: "token", domain: {} }] };
    assert.equal(choicesForAction(action, {}), 0);
  });
});

describe("computeDecisionSpace", () => {
  function makeDefinition(actions) {
    return {
      state: { variables: [] },
      turn: {},
      tokenTypes: [
        {
          id: "unit",
          attributes: [{ id: "hp", type: { kind: "int" }, initial: 10 }],
        },
      ],
      actions,
    };
  }

  function makeState(tokenIds, zoneName) {
    const tokens = {};
    const zoneTokens = [];
    for (const id of tokenIds) {
      tokens[id] = { type: "unit", attributes: { hp: 10 } };
      zoneTokens.push(id);
    }
    return {
      turn: { turn: 1, phase: null, currentPlayer: 1 },
      variables: {},
      tokens,
      zones: {
        [zoneName]: { scope: "shared", tokens: zoneTokens },
      },
    };
  }

  const baseContext = { playerId: 1, phase: null, turn: 1 };

  it("two actions (3-target, 2-target) produces count=5", () => {
    const state = makeState(["t1", "t2", "t3", "t4", "t5"], "board");
    // action1 has a selector matching 3 tokens, action2 matching 2 tokens
    // We make 5 tokens total but use different zones/types to get the right counts
    const action1 = {
      id: "a1",
      params: [{ id: "t", kind: "token", domain: { selector: { zone: "z3", tokenType: "unit" } } }],
    };
    const action2 = {
      id: "a2",
      params: [{ id: "t", kind: "token", domain: { selector: { zone: "z2", tokenType: "unit" } } }],
    };

    // Set up state with distinct zones
    const st = {
      turn: { turn: 1, phase: null, currentPlayer: 1 },
      variables: {},
      tokens: {
        t1: { type: "unit", attributes: { hp: 10 } },
        t2: { type: "unit", attributes: { hp: 10 } },
        t3: { type: "unit", attributes: { hp: 10 } },
        t4: { type: "unit", attributes: { hp: 10 } },
        t5: { type: "unit", attributes: { hp: 10 } },
      },
      zones: {
        z3: { scope: "shared", tokens: ["t1", "t2", "t3"] },
        z2: { scope: "shared", tokens: ["t4", "t5"] },
      },
    };
    const def = makeDefinition([action1, action2]);

    const result = computeDecisionSpace(def, st, [action1, action2], baseContext);
    assert.equal(result.legalActionCount, 5);
    assert.equal(result.decisionSpaceRaw, 5);
    assert.equal(result.decisionSpaceCapped, false);
  });

  it("one action with 3×4 params produces count=12", () => {
    const action = {
      id: "trade",
      params: [
        { id: "src", kind: "token", domain: { selector: { zone: "srcZone", tokenType: "unit" } } },
        { id: "dst", kind: "zone", domain: { values: ["z1", "z2", "z3", "z4"] } },
      ],
    };
    const st = {
      turn: { turn: 1, phase: null, currentPlayer: 1 },
      variables: {},
      tokens: {
        t1: { type: "unit", attributes: { hp: 10 } },
        t2: { type: "unit", attributes: { hp: 10 } },
        t3: { type: "unit", attributes: { hp: 10 } },
      },
      zones: {
        srcZone: { scope: "shared", tokens: ["t1", "t2", "t3"] },
      },
    };
    const def = makeDefinition([action]);

    const result = computeDecisionSpace(def, st, [action], baseContext);
    assert.equal(result.legalActionCount, 12);
    assert.equal(result.decisionSpaceRaw, 12);
    assert.equal(result.decisionSpaceCapped, false);
  });

  it("no-param action produces count=1", () => {
    const action = { id: "pass" };
    const st = {
      turn: { turn: 1, phase: null, currentPlayer: 1 },
      variables: {},
      tokens: {},
      zones: {},
    };
    const def = makeDefinition([action]);

    const result = computeDecisionSpace(def, st, [action], baseContext);
    assert.equal(result.legalActionCount, 1);
    assert.equal(result.decisionSpaceRaw, 1);
    assert.equal(result.decisionSpaceCapped, false);
  });

  it("cap behavior: raw > cap yields legalActionCount==cap and decisionSpaceCapped==true", () => {
    const action = {
      id: "big",
      params: [
        { id: "src", kind: "zone", domain: { values: ["a", "b", "c"] } },
        { id: "dst", kind: "zone", domain: { values: ["x", "y", "z"] } },
      ],
    };
    const st = {
      turn: { turn: 1, phase: null, currentPlayer: 1 },
      variables: {},
      tokens: {},
      zones: {},
    };
    const def = makeDefinition([action]);

    // raw = 3*3 = 9, cap at 5
    const result = computeDecisionSpace(def, st, [action], baseContext, { maxDecisionSpace: 5 });
    assert.equal(result.decisionSpaceRaw, 9);
    assert.equal(result.legalActionCount, 5);
    assert.equal(result.decisionSpaceCapped, true);
  });

  it("cap behavior: raw <= cap is not capped", () => {
    const action = { id: "pass" };
    const st = {
      turn: { turn: 1, phase: null, currentPlayer: 1 },
      variables: {},
      tokens: {},
      zones: {},
    };
    const def = makeDefinition([action]);

    const result = computeDecisionSpace(def, st, [action], baseContext, { maxDecisionSpace: 100 });
    assert.equal(result.decisionSpaceRaw, 1);
    assert.equal(result.legalActionCount, 1);
    assert.equal(result.decisionSpaceCapped, false);
  });

  it("mixed: parameterized + no-param actions sum correctly", () => {
    const paramAction = {
      id: "attack",
      params: [{ id: "t", kind: "zone", domain: { values: ["a", "b", "c"] } }],
    };
    const noParamAction = { id: "pass" };
    const st = {
      turn: { turn: 1, phase: null, currentPlayer: 1 },
      variables: {},
      tokens: {},
      zones: {},
    };
    const def = makeDefinition([paramAction, noParamAction]);

    // 3 choices for attack + 1 for pass = 4
    const result = computeDecisionSpace(def, st, [paramAction, noParamAction], baseContext);
    assert.equal(result.legalActionCount, 4);
    assert.equal(result.decisionSpaceRaw, 4);
  });
});
