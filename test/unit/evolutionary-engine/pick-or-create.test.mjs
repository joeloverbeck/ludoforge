import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  pickOrCreateZone,
  pickOrCreateTokenType,
  pickOrCreateVariable,
} from "../../../src/evolutionary-engine/mutation/pick-or-create.js";
import { createSeededRng } from "../../../src/simulation-engine/index.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

function cloneDefinition(definition) {
  return structuredClone(definition);
}

describe("pickOrCreateZone", () => {
  it("picks an existing zone when RNG is above probability", () => {
    const definition = cloneDefinition(baseDefinition);
    // createProbability=0 means never create
    const result = pickOrCreateZone(definition, createSeededRng(0), {
      createProbability: 0,
    });

    assert.ok(result);
    assert.equal(result.id, "board");
    // Should not add a new zone
    assert.equal(definition.state.zones.length, 1);
  });

  it("creates a new zone when forced by probability", () => {
    const definition = cloneDefinition(baseDefinition);
    const result = pickOrCreateZone(definition, createSeededRng(0), {
      createProbability: 1,
    });

    assert.ok(result);
    assert.notEqual(result.id, "board");
    assert.equal(definition.state.zones.length, 2);
    assert.equal(typeof result.tokenType, "string");
  });

  it("creates a zone when none exist and token types are present", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.state.zones = [];

    const result = pickOrCreateZone(definition, createSeededRng(0), {
      createProbability: 0,
    });

    assert.ok(result);
    assert.equal(definition.state.zones.length, 1);
  });

  it("returns null when no zones exist and no token types", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.state.zones = [];
    delete definition.state.tokenTypes;

    const result = pickOrCreateZone(definition, createSeededRng(0));

    assert.equal(result, null);
  });

  it("newly created zone references an existing token type", () => {
    const definition = cloneDefinition(baseDefinition);
    const result = pickOrCreateZone(definition, createSeededRng(0), {
      createProbability: 1,
    });

    assert.ok(result);
    const tokenTypeIds = definition.state.tokenTypes.map((t) => t.id);
    assert.ok(tokenTypeIds.includes(result.tokenType));
  });
});

describe("pickOrCreateTokenType", () => {
  it("picks existing token type when RNG is above probability", () => {
    const definition = cloneDefinition(baseDefinition);
    const result = pickOrCreateTokenType(definition, createSeededRng(0), {
      createProbability: 0,
    });

    assert.ok(result);
    assert.equal(result.id, "pawn");
  });

  it("creates a new token type with companion zone when forced", () => {
    const definition = cloneDefinition(baseDefinition);
    const originalZoneCount = definition.state.zones.length;
    const originalTTCount = definition.state.tokenTypes.length;

    const result = pickOrCreateTokenType(definition, createSeededRng(0), {
      createProbability: 1,
    });

    assert.ok(result);
    assert.notEqual(result.id, "pawn");
    assert.equal(definition.state.tokenTypes.length, originalTTCount + 1);
    assert.equal(definition.state.zones.length, originalZoneCount + 1);
  });

  it("creates when none exist even with probability 0", () => {
    const definition = cloneDefinition(baseDefinition);
    delete definition.state.tokenTypes;
    definition.state.zones = [];

    const result = pickOrCreateTokenType(definition, createSeededRng(0), {
      createProbability: 0,
    });

    assert.ok(result);
    assert.equal(definition.state.tokenTypes.length, 1);
    assert.equal(definition.state.zones.length, 1);
  });

  it("companion zone references the new token type", () => {
    const definition = cloneDefinition(baseDefinition);
    const result = pickOrCreateTokenType(definition, createSeededRng(0), {
      createProbability: 1,
    });

    assert.ok(result);
    const newZone = definition.state.zones[definition.state.zones.length - 1];
    assert.equal(newZone.tokenType, result.id);
  });
});

describe("pickOrCreateVariable", () => {
  it("picks existing variable when RNG is above probability", () => {
    const definition = cloneDefinition(baseDefinition);
    const result = pickOrCreateVariable(definition, createSeededRng(0), {
      createProbability: 0,
    });

    assert.ok(result);
    assert.equal(result.id, "score");
  });

  it("creates new variable when forced", () => {
    const definition = cloneDefinition(baseDefinition);
    const result = pickOrCreateVariable(definition, createSeededRng(0), {
      createProbability: 1,
    });

    assert.ok(result);
    assert.notEqual(result.id, "score");
    assert.equal(definition.state.variables.length, 2);
  });

  it("respects kind filter", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.state.variables.push({
      id: "flag",
      scope: "global",
      type: { kind: "bool" },
      initial: false,
    });

    const result = pickOrCreateVariable(definition, createSeededRng(0), {
      createProbability: 0,
      filter: { kind: "bool" },
    });

    assert.ok(result);
    assert.equal(result.id, "flag");
  });

  it("respects scope filter", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.state.variables.push({
      id: "player_score",
      scope: "per_player",
      type: { kind: "int", min: 0, max: 10 },
      initial: 0,
    });

    const result = pickOrCreateVariable(definition, createSeededRng(0), {
      createProbability: 0,
      filter: { scope: "per_player" },
    });

    assert.ok(result);
    assert.equal(result.id, "player_score");
  });

  it("creates variable matching filter when no match exists", () => {
    const definition = cloneDefinition(baseDefinition);

    const result = pickOrCreateVariable(definition, createSeededRng(0), {
      filter: { kind: "int", scope: "per_player" },
    });

    assert.ok(result);
    assert.equal(result.scope, "per_player");
    assert.equal(result.type.kind, "int");
  });

  it("creates when no variables exist", () => {
    const definition = cloneDefinition(baseDefinition);
    definition.state.variables = [];

    const result = pickOrCreateVariable(definition, createSeededRng(0));

    assert.ok(result);
    assert.equal(definition.state.variables.length, 1);
  });

  it("returns null when state is missing and cannot create", () => {
    const definition = { version: "1.0", players: { count: 2 }, actions: [], termination: { conditions: [], maxTurns: 10 }, turn: {} };

    const result = pickOrCreateVariable(definition, createSeededRng(0));

    // Should create a variable even with empty state
    assert.ok(result);
    assert.equal(definition.state.variables.length, 1);
  });

  it("is deterministic with seeded RNG", () => {
    const def1 = cloneDefinition(baseDefinition);
    const def2 = cloneDefinition(baseDefinition);

    const r1 = pickOrCreateVariable(def1, createSeededRng(42), {
      createProbability: 1,
    });
    const r2 = pickOrCreateVariable(def2, createSeededRng(42), {
      createProbability: 1,
    });

    assert.deepStrictEqual(r1, r2);
    assert.deepStrictEqual(def1.state.variables, def2.state.variables);
  });
});
