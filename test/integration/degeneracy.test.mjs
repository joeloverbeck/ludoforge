import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { adaptSimulationLog, LOG_ADAPTER_VERSION } from "../../src/evaluation-analytics/log-adapter.js";
import { createSimulationEngine } from "../../src/simulation-engine/index.js";
import {
  detectDegeneracy,
  applyDegeneracyFilters,
  computeDegeneracyPenalty,
} from "../../src/evaluation-analytics/degeneracy.js";

function createTrivialWinDefinition() {
  return {
    version: "1.0",
    players: { count: 1 },
    state: {
      variables: [{ id: "done", scope: "global", type: { kind: "int" }, initial: 0 }],
    },
    actions: [
      {
        id: "win-now",
        actor: "player",
        effects: [
          { kind: "set", target: { kind: "var", id: "done" }, value: 1 },
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
            left: { kind: "ref", ref: { kind: "var", id: "done" } },
            right: { kind: "value", value: 1 },
          },
          outcome: { type: "win", players: "active" },
        },
      ],
    },
    triggers: [],
  };
}

function createNonTrivialDefinition() {
  return {
    version: "1.0",
    players: { count: 1 },
    state: {
      variables: [{ id: "result", scope: "global", type: { kind: "int" }, initial: 0 }],
    },
    actions: [
      {
        id: "win",
        actor: "player",
        effects: [
          { kind: "set", target: { kind: "var", id: "result" }, value: 1 },
        ],
      },
      {
        id: "lose",
        actor: "player",
        effects: [
          { kind: "set", target: { kind: "var", id: "result" }, value: -1 },
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
            left: { kind: "ref", ref: { kind: "var", id: "result" } },
            right: { kind: "value", value: 1 },
          },
          outcome: { type: "win", players: "active" },
        },
        {
          condition: {
            kind: "cmp",
            op: "<=",
            left: { kind: "ref", ref: { kind: "var", id: "result" } },
            right: { kind: "value", value: -1 },
          },
          outcome: { type: "lose", players: "active" },
        },
      ],
    },
    triggers: [],
  };
}

function createFirstActionAgent() {
  return {
    selectAction({ legalActions }) {
      return legalActions[0]?.id;
    },
  };
}

function createLastActionAgent() {
  return {
    selectAction({ legalActions }) {
      return legalActions[legalActions.length - 1]?.id;
    },
  };
}

function buildSummaries(definition, agents, count) {
  const engine = createSimulationEngine({ definition, agents });
  const results = [];
  for (let i = 0; i < count; i += 1) {
    results.push(engine.run());
  }
  const logResult = adaptSimulationLog({
    version: LOG_ADAPTER_VERSION,
    log: { definition, results },
  });
  assert.ok(logResult.ok, logResult.ok ? undefined : logResult.error?.message);
  return logResult.value.trajectorySummaries;
}

describe("degeneracy integration", () => {
  it("trivial game triggers forced-move flag", () => {
    const definition = createTrivialWinDefinition();
    const summaries = buildSummaries(definition, [createFirstActionAgent()], 5);

    const report = detectDegeneracy(summaries);
    assert.ok(report.flags.includes("forced-move"),
      `Expected forced-move flag, got: ${JSON.stringify(report.flags)}`);
  });

  it("non-degenerate game produces no reject-policy flags", () => {
    const definition = createNonTrivialDefinition();
    const summariesA = buildSummaries(definition, [createFirstActionAgent()], 3);
    const summariesB = buildSummaries(definition, [createLastActionAgent()], 3);
    const summaries = [...summariesA, ...summariesB];

    const report = detectDegeneracy(summaries);
    const rejectSet = new Set(["loop", "stalemate", "non-terminating"]);
    const rejectFlags = report.flags.filter((f) => rejectSet.has(f));
    assert.deepEqual(rejectFlags, [],
      `Expected no reject flags, got: ${JSON.stringify(rejectFlags)}`);
  });

  it("filter and penalty round-trip on real data", () => {
    const definition = createTrivialWinDefinition();
    const summaries = buildSummaries(definition, [createFirstActionAgent()], 3);

    const report = detectDegeneracy(summaries);
    const decision = applyDegeneracyFilters(report);
    assert.equal(typeof decision.allow, "boolean");
    assert.ok(Array.isArray(decision.rejectedFlags));

    const penalty = computeDegeneracyPenalty(report);
    assert.ok(Number.isFinite(penalty), `penalty must be finite, got ${penalty}`);
    assert.ok(penalty >= 0, `penalty must be non-negative, got ${penalty}`);
  });

  it("determinism: same simulation produces deepEqual reports", () => {
    const definition = createTrivialWinDefinition();
    const agents = [createFirstActionAgent()];

    const summaries1 = buildSummaries(definition, agents, 3);
    const summaries2 = buildSummaries(definition, agents, 3);

    const report1 = detectDegeneracy(summaries1);
    const report2 = detectDegeneracy(summaries2);

    assert.deepEqual(report1, report2,
      "identical simulations must produce identical degeneracy reports");
  });
});
