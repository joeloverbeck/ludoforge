/**
 * Tests for semantic validation in generateSeedPopulation.
 *
 * Uses mock.module() to intercept grammar-generator.js, so this file
 * MUST be separate from the main test file (mock.module() must be called
 * before the module under test is imported).
 *
 * Run with: node --experimental-test-module-mocks --test test/unit/seed-generation/generate-seed-population-semantic.test.mjs
 */

import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

// ── Crafted definitions ────────────────────────────────────────────

/**
 * Schema-valid, clean definition (no semantic issues at all).
 * Uses a counter to vary maxTurns so each call produces a unique genome ID.
 */
function makeCleanDefinition(counter) {
  return {
    version: "1.0",
    players: { count: 2 },
    state: {
      variables: [
        { id: "hp", scope: "global", type: { kind: "int", min: 0, max: 10 }, initial: 5 },
      ],
    },
    actions: [
      {
        id: "hit",
        actor: "player",
        effects: [
          { kind: "dec", target: { kind: "var", id: "hp" }, amount: 1 },
        ],
        preconditions: {
          kind: "cmp",
          op: ">",
          left: { kind: "ref", ref: { kind: "var", id: "hp" } },
          right: { kind: "value", value: 0 },
        },
      },
    ],
    turn: { scheduler: "round_robin" },
    termination: {
      conditions: [
        {
          condition: {
            kind: "cmp",
            op: "<=",
            left: { kind: "ref", ref: { kind: "var", id: "hp" } },
            right: { kind: "value", value: 0 },
          },
          outcome: { type: "win", players: "active" },
        },
      ],
      maxTurns: 20 + counter,
    },
  };
}

/**
 * Schema-valid, semantically INVALID definition.
 * Termination condition references non-existent variable "ghost",
 * which triggers ref-unknown at /termination/conditions/ — error severity.
 */
function makeSemanticErrorDefinition(counter) {
  return {
    version: "1.0",
    players: { count: 2 },
    state: {
      variables: [
        { id: "hp", scope: "global", type: { kind: "int", min: 0, max: 10 }, initial: 5 },
      ],
    },
    actions: [
      {
        id: "hit",
        actor: "player",
        effects: [
          { kind: "dec", target: { kind: "var", id: "hp" }, amount: 1 },
        ],
        preconditions: {
          kind: "cmp",
          op: ">",
          left: { kind: "ref", ref: { kind: "var", id: "hp" } },
          right: { kind: "value", value: 0 },
        },
      },
    ],
    turn: { scheduler: "round_robin" },
    termination: {
      conditions: [
        {
          condition: {
            kind: "cmp",
            op: "<=",
            left: { kind: "ref", ref: { kind: "var", id: "ghost" } },
            right: { kind: "value", value: 0 },
          },
          outcome: { type: "win", players: "active" },
        },
      ],
      maxTurns: 20 + counter,
    },
  };
}

/**
 * Schema-valid, semantically valid with an unused variable
 * (warning-only, severity = "warning"). Should NOT be rejected.
 */
function makeWarningOnlyDefinition(counter) {
  return {
    version: "1.0",
    players: { count: 2 },
    state: {
      variables: [
        { id: "hp", scope: "global", type: { kind: "int", min: 0, max: 10 }, initial: 5 },
        { id: "unused", scope: "global", type: { kind: "int", min: 0, max: 5 }, initial: 0 },
      ],
    },
    actions: [
      {
        id: "hit",
        actor: "player",
        effects: [
          { kind: "dec", target: { kind: "var", id: "hp" }, amount: 1 },
        ],
        preconditions: {
          kind: "cmp",
          op: ">",
          left: { kind: "ref", ref: { kind: "var", id: "hp" } },
          right: { kind: "value", value: 0 },
        },
      },
    ],
    turn: { scheduler: "round_robin" },
    termination: {
      conditions: [
        {
          condition: {
            kind: "cmp",
            op: "<=",
            left: { kind: "ref", ref: { kind: "var", id: "hp" } },
            right: { kind: "value", value: 0 },
          },
          outcome: { type: "win", players: "active" },
        },
      ],
      maxTurns: 20 + counter,
    },
  };
}

// ── Mock setup ─────────────────────────────────────────────────────

/** @type {(counter: number) => object} */
let definitionFactory = (counter) => makeCleanDefinition(counter);

let globalCallCount = 0;

mock.module("../../../src/seed-generation/grammar-generator.js", {
  namedExports: {
    generateGameDefinition: () => {
      globalCallCount++;
      return definitionFactory(globalCallCount);
    },
  },
});

const { generateSeedPopulation } = await import(
  "../../../src/seed-generation/generate-seed-population.js"
);

const mapElitesConfig = {
  descriptors: [{ id: "axis", min: 0, max: 1, bins: 2 }],
};

const baseEvaluator = () => ({ fitness: 0.5, descriptors: { axis: 0.5 } });

// ── Tests ──────────────────────────────────────────────────────────

describe("generateSeedPopulation semantic validation", () => {
  beforeEach(() => {
    globalCallCount = 0;
    definitionFactory = (counter) => makeCleanDefinition(counter);
  });

  it("rejects definitions with error-level semantic issues as semantic-invalid", async () => {
    definitionFactory = (counter) => {
      if (counter <= 5) {
        return makeSemanticErrorDefinition(counter);
      }
      return makeCleanDefinition(counter);
    };

    const result = await generateSeedPopulation({
      populationSize: 2,
      maxAttempts: 200,
      rngSeed: 42,
      evaluator: baseEvaluator,
      mapElitesConfig,
    });

    assert.equal(result.genomes.length, 2);
    assert.ok(
      (result.report.rejectedByReason["semantic-invalid"] ?? 0) >= 5,
      `expected at least 5 semantic-invalid rejections, got ${result.report.rejectedByReason["semantic-invalid"] ?? 0}`
    );
  });

  it("accepts definitions with only warning-level semantic issues", async () => {
    definitionFactory = (counter) => makeWarningOnlyDefinition(counter);

    const result = await generateSeedPopulation({
      populationSize: 3,
      maxAttempts: 200,
      rngSeed: 99,
      evaluator: baseEvaluator,
      mapElitesConfig,
    });

    assert.equal(result.genomes.length, 3);
    assert.equal(
      result.report.rejectedByReason["semantic-invalid"] ?? 0,
      0,
      "warning-only definitions should not be rejected as semantic-invalid"
    );
  });

  it("valid definitions produce no semantic-invalid rejections", async () => {
    const result = await generateSeedPopulation({
      populationSize: 3,
      maxAttempts: 200,
      rngSeed: 77,
      evaluator: baseEvaluator,
      mapElitesConfig,
    });

    assert.equal(result.genomes.length, 3);
    assert.equal(
      result.report.rejectedByReason["semantic-invalid"],
      undefined,
      "valid definitions should have no semantic-invalid key"
    );
  });
});
