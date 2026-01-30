import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createMockFitness } from "./helpers/mock-fitness.js";

const preferenceModelState = Object.freeze({
  version: 1,
  weights: { novelty: 2 },
  bias: 0,
  sampleCount: 10,
  history: [],
  learningRate: 0.1,
  maxHistory: 100,
  comparisonWeight: 1,
  ratingWeight: 0.25,
  weightDecay: 0,
  maxWeightAbs: 5,
  maxBiasAbs: 5,
});

describe("mock-fitness", () => {
  describe("deterministic mapping", () => {
    it("mock fitness deterministically maps evaluation artifacts", () => {
      const helper = createMockFitness({ preferenceModelState });
      const artifacts = {
        metrics: [
          { id: "novelty", value: 1 },
          { id: "variety", value: 0.2 },
        ],
        degeneracy: { flags: [] },
        descriptors: { length: 2 },
      };

      const first = helper.evaluate(artifacts);
      const second = helper.evaluate(artifacts);

      assert.deepEqual(first, second);
      assert.ok(Object.keys(first.featureVector).length > 0);
      assert.equal(first.descriptors.length, 2);
    });
  });

  describe("gating", () => {
    it("mock fitness can gate preference on degeneracy or safety", () => {
      const helper = createMockFitness({
        preferenceModelState,
        fitnessOptions: { preferenceCap: 1, preferenceWeight: 1 },
      });

      const degeneracyResult = helper.evaluate(
        {
          metrics: [{ id: "novelty", value: 1 }],
          degeneracy: { flags: ["loop"] },
        },
        {
          gatePreferenceOnDegeneracy: true,
          degeneracyFilters: { rejectFlags: ["loop"] },
        }
      );

      const safetyResult = helper.evaluate(
        {
          metrics: [{ id: "novelty", value: 1 }],
          degeneracy: { flags: [] },
          safetyFailures: [{ name: "mock-gate", reason: "blocked" }],
        },
        {
          gatePreferenceOnSafety: true,
        }
      );

      assert.equal(degeneracyResult.diagnostics.preferenceFitness.diagnostics.blend.preference, 0);
      assert.equal(safetyResult.diagnostics.preferenceFitness.diagnostics.blend.preference, 0);
      assert.ok(Array.isArray(safetyResult.diagnostics.safetyFailures));
    });
  });

  describe("preference uncertainty damping", () => {
    it("dampens preference contribution when uncertainty is high", () => {
      const artifacts = {
        metrics: [{ id: "novelty", value: 1 }],
        degeneracy: { flags: [] },
      };

      const lowUncertaintyState = {
        ...preferenceModelState,
        models: [
          { weights: { novelty: 2 }, bias: 0, sampleCount: 10 },
          { weights: { novelty: 2 }, bias: 0, sampleCount: 10 },
        ],
      };
      const highUncertaintyState = {
        ...preferenceModelState,
        models: [
          { weights: { novelty: 2 }, bias: 0, sampleCount: 10 },
          { weights: { novelty: 0 }, bias: 0, sampleCount: 10 },
        ],
      };

      const lowHelper = createMockFitness({
        preferenceModelState: lowUncertaintyState,
        fitnessOptions: { preferenceCap: 1, preferenceWeight: 1, preferenceBootstrapSamples: 0 },
      });
      const highHelper = createMockFitness({
        preferenceModelState: highUncertaintyState,
        fitnessOptions: { preferenceCap: 1, preferenceWeight: 1, preferenceBootstrapSamples: 0 },
      });

      const lowResult = lowHelper.evaluate(artifacts);
      const highResult = highHelper.evaluate(artifacts);

      const lowPreference = lowResult.diagnostics.preferenceFitness.diagnostics.blend.preference;
      const highPreference = highResult.diagnostics.preferenceFitness.diagnostics.blend.preference;
      assert.ok(Math.abs(highPreference) < Math.abs(lowPreference));
    });
  });

  describe("policyByFlag reject semantics", () => {
    it("reject semantics: loop flag causes rejection under default policy", () => {
      const helper = createMockFitness({
        preferenceModelState,
        fitnessOptions: { preferenceCap: 1, preferenceWeight: 1 },
      });

      const result = helper.evaluate(
        {
          metrics: [{ id: "novelty", value: 1 }],
          degeneracy: { flags: ["loop"] },
        },
        { gatePreferenceOnDegeneracy: true }
      );

      assert.equal(result.diagnostics.degeneracyDecision.allow, false,
        "loop must be rejected under default policyByFlag");
      assert.ok(result.diagnostics.degeneracyDecision.rejectedFlags.includes("loop"));
      assert.equal(result.diagnostics.preferenceFitness.diagnostics.blend.preference, 0,
        "preference must be gated when degeneracy rejects");
    });

    it("reject semantics: non-terminating flag causes rejection under default policy", () => {
      const helper = createMockFitness({
        preferenceModelState,
        fitnessOptions: { preferenceCap: 1, preferenceWeight: 1 },
      });

      const result = helper.evaluate(
        {
          metrics: [{ id: "novelty", value: 1 }],
          degeneracy: { flags: ["non-terminating"] },
        },
        { gatePreferenceOnDegeneracy: true }
      );

      assert.equal(result.diagnostics.degeneracyDecision.allow, false,
        "non-terminating must be rejected under default policyByFlag");
      assert.ok(result.diagnostics.degeneracyDecision.rejectedFlags.includes("non-terminating"));
      assert.equal(result.diagnostics.preferenceFitness.diagnostics.blend.preference, 0,
        "preference must be gated when degeneracy rejects");
    });
  });

  describe("policyByFlag penalize semantics", () => {
    it("penalize semantics: forced-move does NOT reject; fitness is penalized", () => {
      const helper = createMockFitness({
        preferenceModelState,
        fitnessOptions: { preferenceCap: 1, preferenceWeight: 1 },
      });

      const degeneracyReport = {
        flags: ["forced-move"],
        ratios: { "forced-move": 0.9 },
      };

      const result = helper.evaluate(
        {
          metrics: [{ id: "novelty", value: 1 }],
          degeneracy: { flags: ["forced-move"] },
        },
        {
          gatePreferenceOnDegeneracy: true,
          degeneracyReport,
        }
      );

      assert.equal(result.diagnostics.degeneracyDecision.allow, true,
        "forced-move must NOT be rejected under default policyByFlag");
      assert.deepEqual(result.diagnostics.degeneracyDecision.rejectedFlags, []);

      const penalty = result.diagnostics.preferenceFitness.diagnostics.degeneracyPenalty;
      assert.ok(penalty > 0, "forced-move must produce a positive degeneracy penalty");
    });

    it("penalize semantics: no-choices does NOT reject; fitness is penalized", () => {
      const helper = createMockFitness({
        preferenceModelState,
        fitnessOptions: { preferenceCap: 1, preferenceWeight: 1 },
      });

      const degeneracyReport = {
        flags: ["no-choices"],
        ratios: {},
      };

      const result = helper.evaluate(
        {
          metrics: [{ id: "novelty", value: 1 }],
          degeneracy: { flags: ["no-choices"] },
        },
        {
          gatePreferenceOnDegeneracy: true,
          degeneracyReport,
        }
      );

      assert.equal(result.diagnostics.degeneracyDecision.allow, true,
        "no-choices must NOT be rejected under default policyByFlag");
      assert.deepEqual(result.diagnostics.degeneracyDecision.rejectedFlags, []);

      const penalty = result.diagnostics.preferenceFitness.diagnostics.degeneracyPenalty;
      assert.ok(penalty > 0, "no-choices must produce a positive degeneracy penalty");
    });
  });
});
