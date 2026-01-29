import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeExtendedMetrics } from "../../../src/evaluation-analytics/metrics/extended.js";
import { computeSkillExpressionMetric } from "../../../src/evaluation-analytics/metrics/skill-expression.js";
import { createFirstActionAgent } from "../simulation-engine/fixtures.mjs";

function createTierSeparationDefinition() {
  return {
    version: "1.0",
    players: { count: 2 },
    state: {
      variables: [{ id: "flag", scope: "global", type: { kind: "int" }, initial: 0 }],
    },
    actions: [
      {
        id: "burn",
        actor: "player",
        effects: [{ kind: "set", target: { kind: "var", id: "flag" }, value: -1 }],
      },
      {
        id: "boost",
        actor: "player",
        effects: [{ kind: "set", target: { kind: "var", id: "flag" }, value: 1 }],
      },
    ],
    turn: { scheduler: "round_robin" },
    termination: {
      conditions: [
        {
          condition: {
            kind: "cmp",
            op: ">=",
            left: { kind: "ref", ref: { kind: "var", id: "flag" } },
            right: { kind: "value", value: 1 },
          },
          outcome: { type: "win", players: "active" },
        },
        {
          condition: {
            kind: "cmp",
            op: "<=",
            left: { kind: "ref", ref: { kind: "var", id: "flag" } },
            right: { kind: "value", value: -1 },
          },
          outcome: { type: "lose", players: "active" },
        },
      ],
    },
    triggers: [],
  };
}

function createSeatBiasDefinition() {
  return {
    version: "1.0",
    players: { count: 2 },
    state: {
      variables: [{ id: "flag", scope: "global", type: { kind: "int" }, initial: 1 }],
    },
    actions: [],
    turn: { scheduler: "round_robin" },
    termination: {
      conditions: [
        {
          condition: {
            kind: "cmp",
            op: ">=",
            left: { kind: "ref", ref: { kind: "var", id: "flag" } },
            right: { kind: "value", value: 1 },
          },
          outcome: { type: "win", players: "active" },
        },
      ],
    },
    triggers: [],
  };
}

const baselineAgent = createFirstActionAgent();
const strongAgent = {
  selectAction({ legalActions }) {
    return legalActions[legalActions.length - 1]?.id;
  },
};

describe("skill-expression", () => {
  describe("computeSkillExpressionMetric", () => {
    it("detects tier separation", () => {
      const definition = createTierSeparationDefinition();
      const value = computeSkillExpressionMetric(definition, {
        enabled: true,
        agentTiers: [baselineAgent, strongAgent],
        matchesPerSeat: 2,
        seed: 5,
      });

      assert.ok(Math.abs(value - 1) < 1e-9);
    });

    it("returns 0 when tiers are identical", () => {
      const definition = createTierSeparationDefinition();
      const value = computeSkillExpressionMetric(definition, {
        enabled: true,
        agentTiers: [baselineAgent, baselineAgent],
        matchesPerSeat: 2,
        seed: 7,
      });

      assert.ok(Math.abs(value) < 1e-9);
    });

    it("cancels seat bias", () => {
      const definition = createSeatBiasDefinition();
      const value = computeSkillExpressionMetric(definition, {
        enabled: true,
        agentTiers: [baselineAgent, strongAgent],
        matchesPerSeat: 2,
        seed: 11,
      });

      assert.ok(Math.abs(value) < 1e-9);
    });
  });

  describe("computeExtendedMetrics integration", () => {
    it("only emits skill_expression when enabled", () => {
      const definition = createTierSeparationDefinition();
      const disabled = computeExtendedMetrics(definition, [], {});
      assert.equal(
        disabled.some((metric) => metric.id === "skill_expression"),
        false
      );

      const enabled = computeExtendedMetrics(definition, [], {
        skillExpression: {
          enabled: true,
          agentTiers: [baselineAgent, strongAgent],
          matchesPerSeat: 1,
          seed: 13,
        },
      });
      const entry = enabled.find((metric) => metric.id === "skill_expression");
      assert.ok(entry);
      assert.ok(Math.abs(entry.value - 1) < 1e-9);
    });
  });
});
