import assert from "node:assert/strict";
import test from "node:test";

import { computeComebackPotential } from "../../../src/evaluation-analytics/metrics/extended.js";
import { createInitialState } from "../../../src/game-kernel/index.js";

function createComebackDefinition({ withScoring }) {
  const definition = {
    version: "1.0",
    players: { count: 2 },
    state: {
      variables: [{ id: "score", scope: "per_player", type: { kind: "int" }, initial: 0 }],
    },
    actions: [],
    turn: { scheduler: "round_robin" },
    termination: { conditions: [] },
    triggers: [],
  };

  if (withScoring) {
    definition.termination.scoring = {
      perPlayer: { kind: "ref", ref: { kind: "var", id: "score" } },
    };
  }

  return definition;
}

function createScoreState(definition, scoresByPlayer) {
  const state = createInitialState(definition);
  for (const [playerId, score] of Object.entries(scoresByPlayer)) {
    state.variables.perPlayer[playerId].score = score;
  }
  return state;
}

function createRun(definition, earlyScores, outcomes) {
  const earlyState = createScoreState(definition, earlyScores);
  const steps = [
    { turn: 1, phase: null, playerId: 1, state: earlyState },
    { turn: 2, phase: null, playerId: 2, state: earlyState },
  ];
  return {
    trajectory: { steps },
    outcome: { terminated: true, outcomes },
  };
}

test("comeback potential returns 0 when early advantage perfectly predicts outcomes", () => {
  const definition = createComebackDefinition({ withScoring: true });
  const runs = [
    createRun(definition, { 1: 5, 2: 1 }, { 1: "win", 2: "lose" }),
    createRun(definition, { 1: 1, 2: 4 }, { 1: "win", 2: "lose" }),
  ];

  const value = computeComebackPotential(definition, runs, {
    enabled: true,
    earlyStepPercent: 0.5,
  });

  assert.equal(value, 0);
});

test("comeback potential returns 0 when scoring expressions are missing", () => {
  const definition = createComebackDefinition({ withScoring: false });
  const runs = [createRun(definition, { 1: 5, 2: 1 }, { 1: "win", 2: "lose" })];

  const value = computeComebackPotential(definition, runs, {
    enabled: true,
    earlyStepPercent: 0.5,
  });

  assert.equal(value, 0);
});
