import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

import {
  applyDegeneracyFilters,
  computeDegeneracyPenalty,
  detectDegeneracy,
} from "../../../src/evaluation-analytics/degeneracy.js";
import { validateConfig } from "../../../src/config/validator.js";

async function readJson(relativePath) {
  const fileUrl = new URL(relativePath, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

const SCHEMA_URL = new URL(
  "../../../schemas/config/degeneracy.schema.json",
  import.meta.url
);

describe("degeneracy", () => {
  describe("detectDegeneracy", () => {
    it("flags loops when repeated states or loop detection occurs", () => {
      const summaries = [
        {
          stepCount: 6,
          turnCount: 6,
          terminalOutcome: {},
          terminationReason: "loop-detected",
          terminated: false,
          uniqueStateCount: 3,
          keySteps: [],
        },
      ];

      const report = detectDegeneracy(summaries);
      assert.ok(report.flags.includes("loop"));
      assert.ok(report.details?.loop?.includes("loop_detected=1"));
    });

    it("only flags stalemate when outcome is draw-for-all", () => {
      const summaries = [
        {
          stepCount: 4,
          turnCount: 4,
          terminationReason: "stalemate",
          terminated: true,
          terminalOutcome: { outcomes: { 1: "win", 2: "lose" } },
        },
      ];

      const report = detectDegeneracy(summaries);
      assert.equal(report.flags.includes("stalemate"), false);
    });

    it("treats no-legal-actions draw as stalemate", () => {
      const summaries = [
        {
          stepCount: 2,
          turnCount: 2,
          terminationReason: "no-legal-actions",
          terminated: true,
          terminalOutcome: { outcomes: { 1: "draw", 2: "draw" } },
        },
      ];

      const report = detectDegeneracy(summaries);
      assert.ok(report.flags.includes("stalemate"));
      assert.ok(report.details?.stalemate?.includes("count=1"));
    });

    it("flags non-terminating for cutoff reasons", () => {
      const summaries = [
        {
          stepCount: 5,
          turnCount: 5,
          terminationReason: "max-steps",
          terminated: true,
          terminalOutcome: {},
        },
      ];

      const report = detectDegeneracy(summaries);
      assert.ok(report.flags.includes("non-terminating"));
      assert.ok(report.details?.["non-terminating"]?.includes("max_steps=1"));
    });

    it("flags forced-move dominance and no-choices", () => {
      const summaries = [
        {
          stepCount: 3,
          turnCount: 3,
          terminalOutcome: {},
          terminated: true,
          keySteps: [
            { turn: 1, phase: null, playerId: 1, legalActionCount: 1 },
            { turn: 2, phase: null, playerId: 2, legalActionCount: 1 },
            { turn: 3, phase: null, playerId: 1, legalActionCount: 1 },
          ],
        },
      ];

      const report = detectDegeneracy(summaries, { minStepsForNoChoices: 3 });
      assert.ok(report.flags.includes("forced-move"));
      assert.ok(report.flags.includes("no-choices"));
      assert.ok(report.details?.["forced-move"]?.includes("forced_steps=3"));
    });

    it("flags dominant-action for overwhelming action share", () => {
      const summaries = [
        {
          stepCount: 12,
          turnCount: 12,
          terminalOutcome: {},
          terminated: true,
          actionCounts: { pass: 10, take: 2 },
        },
      ];

      const report = detectDegeneracy(summaries);
      assert.ok(report.flags.includes("dominant-action"));
      assert.ok(report.details?.["dominant-action"]?.includes("action=pass"));
    });

    it("flags trivial-win for quick, consistent winners", () => {
      const outcome = { outcomes: { 1: "win", 2: "lose" } };
      const summaries = [
        { stepCount: 2, turnCount: 2, terminalOutcome: outcome, terminated: true },
        { stepCount: 2, turnCount: 2, terminalOutcome: outcome, terminated: true },
        { stepCount: 2, turnCount: 2, terminalOutcome: outcome, terminated: true },
      ];

      const report = detectDegeneracy(summaries);
      assert.ok(report.flags.includes("trivial-win"));
      assert.ok(report.details?.["trivial-win"]?.includes("winner=1"));
    });

    it("populates ratios field for forced-move", () => {
      const summaries = [
        {
          stepCount: 4,
          turnCount: 4,
          terminalOutcome: {},
          terminated: true,
          keySteps: [
            { turn: 1, phase: null, playerId: 1, legalActionCount: 1 },
            { turn: 2, phase: null, playerId: 2, legalActionCount: 2 },
            { turn: 3, phase: null, playerId: 1, legalActionCount: 1 },
            { turn: 4, phase: null, playerId: 2, legalActionCount: 3 },
          ],
        },
      ];

      const report = detectDegeneracy(summaries);
      assert.ok(report.ratios, "report must have ratios");
      assert.equal(report.ratios["forced-move"], 0.5);
    });
  });

  describe("minStepsForNoChoices guard", () => {
    it("short game does not trigger no-choices", () => {
      const summaries = [
        {
          stepCount: 3,
          turnCount: 3,
          terminalOutcome: {},
          terminated: true,
          keySteps: [
            { turn: 1, phase: null, playerId: 1, legalActionCount: 1 },
            { turn: 2, phase: null, playerId: 2, legalActionCount: 1 },
            { turn: 3, phase: null, playerId: 1, legalActionCount: 1 },
          ],
        },
      ];

      const report = detectDegeneracy(summaries);
      assert.equal(report.flags.includes("no-choices"), false,
        "no-choices must not fire when forcedSamples < minStepsForNoChoices");
      assert.ok(report.flags.includes("forced-move"));
    });

    it("exact threshold triggers no-choices", () => {
      const steps = Array.from({ length: 10 }, (_, i) => ({
        turn: i + 1,
        phase: null,
        playerId: (i % 2) + 1,
        legalActionCount: 1,
      }));
      const summaries = [
        {
          stepCount: 10,
          turnCount: 10,
          terminalOutcome: {},
          terminated: true,
          keySteps: steps,
        },
      ];

      const report = detectDegeneracy(summaries, { minStepsForNoChoices: 10 });
      assert.ok(report.flags.includes("no-choices"),
        "no-choices must fire when forcedSamples == minStepsForNoChoices");
    });

    it("single choice step prevents no-choices", () => {
      const steps = Array.from({ length: 11 }, (_, i) => ({
        turn: i + 1,
        phase: null,
        playerId: (i % 2) + 1,
        legalActionCount: i === 10 ? 2 : 1,
      }));
      const summaries = [
        {
          stepCount: 11,
          turnCount: 11,
          terminalOutcome: {},
          terminated: true,
          keySteps: steps,
        },
      ];

      const report = detectDegeneracy(summaries, { minStepsForNoChoices: 1 });
      assert.equal(report.flags.includes("no-choices"), false,
        "no-choices must be false if any step has legalActionCount > 1");
    });
  });

  describe("determinism invariant", () => {
    it("identical inputs produce identical outputs", () => {
      const summaries = [
        {
          stepCount: 5,
          turnCount: 5,
          terminationReason: "natural",
          terminated: true,
          terminalOutcome: { outcomes: { 1: "win", 2: "lose" } },
          uniqueStateCount: 5,
          keySteps: [
            { turn: 1, phase: null, playerId: 1, legalActionCount: 1 },
            { turn: 2, phase: null, playerId: 2, legalActionCount: 3 },
            { turn: 3, phase: null, playerId: 1, legalActionCount: 1 },
            { turn: 4, phase: null, playerId: 2, legalActionCount: 2 },
            { turn: 5, phase: null, playerId: 1, legalActionCount: 1 },
          ],
          actionCounts: { move: 3, pass: 2 },
        },
      ];
      const thresholds = { minStepsForNoChoices: 5 };

      const report1 = detectDegeneracy(summaries, thresholds);
      const report2 = detectDegeneracy(summaries, thresholds);

      assert.deepEqual(report1, report2,
        "identical summaries + thresholds must produce identical output");
    });
  });

  describe("applyDegeneracyFilters", () => {
    it("rejects reports with reject-policy flags", () => {
      const decision = applyDegeneracyFilters({
        flags: ["loop", "non-terminating"],
        details: {},
      });

      assert.equal(decision.allow, false);
      assert.deepEqual(decision.rejectedFlags.sort(), ["loop", "non-terminating"]);
    });

    it("allows penalize-policy flags through", () => {
      const decision = applyDegeneracyFilters({
        flags: ["forced-move"],
        details: {},
      });

      assert.equal(decision.allow, true);
      assert.deepEqual(decision.rejectedFlags, []);
    });

    it("defaults derive rejectFlags from policyByFlag", async () => {
      const config = await readJson("../../../configs/degeneracy.json");
      assert.ok(config.policyByFlag, "config must have policyByFlag");
      assert.equal(config.rejectOn, undefined, "config must not have rejectOn");

      assert.equal(config.policyByFlag.loop, "reject");
      const decision = applyDegeneracyFilters({ flags: ["loop"], details: {} });
      assert.equal(decision.allow, false);
      assert.deepEqual(decision.rejectedFlags, ["loop"]);
    });
  });

  describe("schema validation", () => {
    it("degeneracy config validates against the v2 schema", async () => {
      const config = await readJson("../../../configs/degeneracy.json");
      const result = await validateConfig(config, SCHEMA_URL);
      assert.equal(result.valid, true, `Schema validation failed: ${JSON.stringify(result.errors)}`);
    });

    it("old config with rejectOn fails v2 schema validation", async () => {
      const oldConfig = {
        version: 1,
        thresholds: {
          loop: { repeatedStateRatio: 0.25, minRepeatedStates: 1 },
          forcedMove: { ratio: 0.8 },
          dominantAction: { ratio: 0.8, minSamples: 10 },
          trivialWin: { winRate: 0.9, maxAvgSteps: 3, minSamples: 3 },
        },
        flags: ["loop", "stalemate"],
        rejectOn: ["loop"],
      };
      const result = await validateConfig(oldConfig, SCHEMA_URL);
      assert.equal(result.valid, false, "Old config with rejectOn must fail validation");
    });

    it("config missing policyByFlag fails v2 schema validation", async () => {
      const incomplete = {
        version: 2,
        thresholds: {
          loop: { repeatedStateRatio: 0.25, minRepeatedStates: 1 },
          forcedMove: { ratio: 0.8 },
          dominantAction: { ratio: 0.8, minSamples: 10 },
          trivialWin: { winRate: 0.9, maxAvgSteps: 3, minSamples: 3 },
        },
        enabledFlags: ["loop"],
        penalties: {},
      };
      const result = await validateConfig(incomplete, SCHEMA_URL);
      assert.equal(result.valid, false, "Config missing policyByFlag must fail validation");
    });
  });

  describe("computeDegeneracyPenalty", () => {
    it("returns 0 for empty report", () => {
      const report = { flags: [] };
      assert.equal(computeDegeneracyPenalty(report), 0);
    });

    it("returns 0 for reject-only flags", () => {
      const report = { flags: ["loop", "non-terminating"] };
      assert.equal(computeDegeneracyPenalty(report), 0);
    });

    it("applies binary weight for no-choices", () => {
      const report = { flags: ["no-choices"] };
      const penalty = computeDegeneracyPenalty(report);
      assert.equal(penalty, 0.5);
    });

    it("applies forced-move formula with freeRatio", () => {
      const report = { flags: ["forced-move"], ratios: { "forced-move": 0.9 } };
      const penalty = computeDegeneracyPenalty(report);
      assert.ok(Math.abs(penalty - 0.21) < 1e-9);
    });

    it("returns 0 for forced-move when ratio below freeRatio", () => {
      const report = { flags: ["forced-move"], ratios: { "forced-move": 0.1 } };
      const penalty = computeDegeneracyPenalty(report);
      assert.equal(penalty, 0);
    });

    it("sums multiple penalize flags", () => {
      const report = {
        flags: ["forced-move", "no-choices", "dominant-action"],
        ratios: { "forced-move": 1.0 },
      };
      const penalty = computeDegeneracyPenalty(report);
      assert.ok(Math.abs(penalty - 0.94) < 1e-9);
    });

    it("ignores 'ignore' policy flags", () => {
      const report = { flags: ["stalemate"] };
      const config = {
        policyByFlag: { stalemate: "ignore" },
        penalties: { stalemate: { weight: 999 } },
      };
      assert.equal(computeDegeneracyPenalty(report, config), 0);
    });

    it("uses config defaults when no penaltyConfig", () => {
      const report = { flags: ["forced-move"], ratios: { "forced-move": 0.5 } };
      const penalty = computeDegeneracyPenalty(report);
      assert.ok(Math.abs(penalty - 0.09) < 1e-9);
    });
  });
});
