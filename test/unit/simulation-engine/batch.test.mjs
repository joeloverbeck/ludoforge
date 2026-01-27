import { test } from "node:test";
import assert from "node:assert/strict";
import { runBatchSimulations } from "../../../src/simulation-engine/index.js";
import {
  createBaseDefinition,
  createIncrementAction,
  createNoopAction,
  createFirstActionAgent,
} from "./fixtures.mjs";

test("runBatchSimulations preserves order and aggregates metrics", () => {
  const incrementDefinition = createBaseDefinition();
  incrementDefinition.actions = [createIncrementAction()];
  incrementDefinition.termination.conditions = [
    {
      condition: {
        kind: "cmp",
        op: ">=",
        left: { kind: "ref", ref: { kind: "var", id: "counter" } },
        right: { kind: "value", value: 1 },
      },
      outcome: { type: "win", players: "active" },
    },
  ];

  const maxTurnDefinition = createBaseDefinition();
  maxTurnDefinition.actions = [createNoopAction()];
  maxTurnDefinition.termination.conditions = [];

  const perStep = [];
  const stepOrder = [];
  const terminalOrder = [];

  const { results, metrics } = runBatchSimulations(
    [
      {
        definition: incrementDefinition,
        agents: [createFirstActionAgent()],
        stepControl: {
          onStep(step) {
            perStep.push(step.actionId);
          },
        },
      },
      {
        definition: maxTurnDefinition,
        agents: [createFirstActionAgent()],
        maxTurns: 1,
      },
    ],
    {
      initialMetrics: { totalSteps: 0, reasons: {} },
      onStep(step, context) {
        stepOrder.push([context.index, step.actionId]);
      },
      onTerminal(result, context) {
        terminalOrder.push([context.index, result.terminationReason]);
      },
      reduceMetrics(metrics, result) {
        metrics.totalSteps += result.trajectory.steps.length;
        const reason = result.terminationReason ?? "unknown";
        metrics.reasons[reason] = (metrics.reasons[reason] ?? 0) + 1;
        return metrics;
      },
    },
  );

  assert.equal(results.length, 2);
  assert.equal(results[0].terminationReason, "condition");
  assert.equal(results[1].terminationReason, "max-turns");

  assert.deepEqual(stepOrder, [
    [0, "tick"],
    [1, "noop"],
  ]);
  assert.deepEqual(terminalOrder, [
    [0, "condition"],
    [1, "max-turns"],
  ]);
  assert.deepEqual(perStep, ["tick"]);

  assert.equal(metrics.totalSteps, 2);
  assert.deepEqual(metrics.reasons, { "condition": 1, "max-turns": 1 });
});
