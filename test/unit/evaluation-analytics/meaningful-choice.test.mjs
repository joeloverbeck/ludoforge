import assert from "node:assert/strict";
import test from "node:test";

import { computeMeaningfulChoice } from "../../../src/evaluation-analytics/metrics/extended.js";
import { createSimulationEngine } from "../../../src/simulation-engine/index.js";
import { createFirstActionAgent } from "../simulation-engine/fixtures.mjs";

function createMeaningfulChoiceDefinition() {
  return {
    version: "1.0",
    players: { count: 1 },
    state: {
      variables: [
        { id: "counter", scope: "global", type: { kind: "int" }, initial: 0 },
        { id: "score", scope: "per_player", type: { kind: "int" }, initial: 0 },
      ],
    },
    actions: [
      {
        id: "low",
        actor: "player",
        effects: [
          { kind: "set", target: { kind: "var", id: "score" }, value: 1 },
          { kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 },
        ],
      },
      {
        id: "high",
        actor: "player",
        effects: [
          { kind: "set", target: { kind: "var", id: "score" }, value: 3 },
          { kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 },
        ],
      },
    ],
    turn: { scheduler: "round_robin" },
    termination: {
      conditions: [
        {
          condition: {
            kind: "cmp",
            op: ">=",
            left: { kind: "ref", ref: { kind: "var", id: "counter" } },
            right: { kind: "value", value: 2 },
          },
          outcome: { type: "win", players: "active" },
        },
      ],
      scoring: { perPlayer: { kind: "ref", ref: { kind: "var", id: "score" } } },
    },
    triggers: [],
  };
}

function createSingleActionDefinition() {
  return {
    version: "1.0",
    players: { count: 1 },
    state: {
      variables: [{ id: "counter", scope: "global", type: { kind: "int" }, initial: 0 }],
    },
    actions: [
      {
        id: "only",
        actor: "player",
        effects: [{ kind: "inc", target: { kind: "var", id: "counter" }, amount: 1 }],
      },
    ],
    turn: { scheduler: "round_robin" },
    termination: {
      conditions: [
        {
          condition: {
            kind: "cmp",
            op: ">=",
            left: { kind: "ref", ref: { kind: "var", id: "counter" } },
            right: { kind: "value", value: 1 },
          },
          outcome: { type: "win", players: "active" },
        },
      ],
    },
    triggers: [],
  };
}

test("meaningful choice spread reflects action value differences", () => {
  const definition = createMeaningfulChoiceDefinition();
  const engine = createSimulationEngine({
    definition,
    agents: [createFirstActionAgent()],
  });
  const result = engine.run();

  const value = computeMeaningfulChoice(definition, [result], {
    enabled: true,
    decisionSamplesPerRun: 2,
    rolloutsPerAction: 1,
    rolloutMaxSteps: 4,
    maxRolloutsPerRun: 4,
    rolloutAgent: { kind: "random" },
    seed: 42,
  });

  assert.ok(Math.abs(value - 2) < 1e-9);
});

test("meaningful choice returns 0 when no valid decision points exist", () => {
  const definition = createSingleActionDefinition();
  const engine = createSimulationEngine({
    definition,
    agents: [createFirstActionAgent()],
  });
  const result = engine.run();

  const value = computeMeaningfulChoice(definition, [result], { enabled: true });

  assert.equal(value, 0);
});
