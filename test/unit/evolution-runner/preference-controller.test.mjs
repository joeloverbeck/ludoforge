import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  createInitialControllerState,
  advanceController,
} from "../../../src/evolution-runner/preference-controller.js";

function baseFreezeConfig(overrides = {}) {
  return {
    enabled: true,
    minTotalSamples: 10,
    freezeAfterStableGens: 3,
    stableUncertaintyThreshold: 0.15,
    requireNoNewMetricIds: true,
    ...overrides,
  };
}

function baseDriftConfig(overrides = {}) {
  return {
    enabled: true,
    unfreezeUncertaintyThreshold: 0.4,
    minCalibrationAccuracy: 0.6,
    ood: { enabled: true, maxOodRate: 0.2 },
    ...overrides,
  };
}

function baseInput(overrides = {}) {
  return {
    state: createInitialControllerState(),
    freeze: baseFreezeConfig(),
    drift: baseDriftConfig(),
    totalSamples: 20,
    meanUncertainty: 0.05,
    hasNewMetricIds: false,
    oodRate: null,
    calibrationAccuracy: null,
    ...overrides,
  };
}

describe("createInitialControllerState", () => {
  it("returns learning mode with zero stable count", () => {
    const state = createInitialControllerState();
    assert.deepStrictEqual(state, { mode: "learning", stableGenCount: 0 });
  });
});

describe("advanceController — freeze conditions", () => {
  it("freezes when all conditions met (totalSamples, stableGens, uncertainty)", () => {
    // Build up stableGenCount to freezeAfterStableGens - 1 = 2
    let state = createInitialControllerState();
    for (let i = 0; i < 2; i++) {
      const result = advanceController(baseInput({ state }));
      state = result.nextState;
      assert.strictEqual(result.froze, false);
    }
    assert.strictEqual(state.stableGenCount, 2);

    // Third advance should trigger freeze
    const result = advanceController(baseInput({ state }));
    assert.strictEqual(result.froze, true);
    assert.strictEqual(result.unfroze, false);
    assert.strictEqual(result.nextState.mode, "frozen");
    assert.ok(result.reasonCodes.includes("freeze_triggered"));
  });

  it("does not freeze when totalSamples < minTotalSamples", () => {
    const state = { mode: "learning", stableGenCount: 5 };
    const result = advanceController(
      baseInput({ state, totalSamples: 3 }),
    );
    assert.strictEqual(result.froze, false);
    assert.strictEqual(result.nextState.mode, "learning");
    assert.ok(result.reasonCodes.includes("insufficient_samples"));
  });

  it("does not freeze when freeze.enabled is false", () => {
    const state = { mode: "learning", stableGenCount: 10 };
    const result = advanceController(
      baseInput({
        state,
        freeze: baseFreezeConfig({ enabled: false }),
      }),
    );
    assert.strictEqual(result.froze, false);
    assert.strictEqual(result.nextState.mode, "learning");
    assert.ok(result.reasonCodes.includes("freeze_disabled"));
  });

  it("blocks freeze when new metric IDs detected and requireNoNewMetricIds=true", () => {
    const state = { mode: "learning", stableGenCount: 5 };
    const result = advanceController(
      baseInput({ state, hasNewMetricIds: true }),
    );
    assert.strictEqual(result.froze, false);
    assert.ok(result.reasonCodes.includes("new_metric_ids"));
  });

  it("allows freeze with new metric IDs when requireNoNewMetricIds=false", () => {
    const state = { mode: "learning", stableGenCount: 5 };
    const result = advanceController(
      baseInput({
        state,
        hasNewMetricIds: true,
        freeze: baseFreezeConfig({ requireNoNewMetricIds: false }),
      }),
    );
    assert.strictEqual(result.froze, true);
    assert.strictEqual(result.nextState.mode, "frozen");
  });

  it("resets stableGenCount when uncertainty rises above threshold", () => {
    const state = { mode: "learning", stableGenCount: 2 };
    const result = advanceController(
      baseInput({ state, meanUncertainty: 0.3 }),
    );
    assert.strictEqual(result.froze, false);
    assert.strictEqual(result.nextState.stableGenCount, 0);
  });

  it("increments stableGenCount when uncertainty below threshold but not enough gens yet", () => {
    const state = { mode: "learning", stableGenCount: 0 };
    const result = advanceController(baseInput({ state }));
    assert.strictEqual(result.nextState.stableGenCount, 1);
    assert.strictEqual(result.froze, false);
  });
});

describe("advanceController — unfreeze conditions", () => {
  it("unfreezes on uncertainty spike", () => {
    const state = { mode: "frozen", stableGenCount: 5 };
    const result = advanceController(
      baseInput({ state, meanUncertainty: 0.5 }),
    );
    assert.strictEqual(result.unfroze, true);
    assert.strictEqual(result.froze, false);
    assert.strictEqual(result.nextState.mode, "learning");
    assert.strictEqual(result.nextState.stableGenCount, 0);
    assert.ok(result.reasonCodes.includes("uncertainty_spike"));
  });

  it("unfreezes on oodRate > maxOodRate", () => {
    const state = { mode: "frozen", stableGenCount: 5 };
    const result = advanceController(
      baseInput({ state, oodRate: 0.3 }),
    );
    assert.strictEqual(result.unfroze, true);
    assert.strictEqual(result.nextState.mode, "learning");
    assert.ok(result.reasonCodes.includes("ood_rate_spike"));
  });

  it("unfreezes on calibrationAccuracy < minCalibrationAccuracy", () => {
    const state = { mode: "frozen", stableGenCount: 5 };
    const result = advanceController(
      baseInput({ state, calibrationAccuracy: 0.4 }),
    );
    assert.strictEqual(result.unfroze, true);
    assert.strictEqual(result.nextState.mode, "learning");
    assert.ok(result.reasonCodes.includes("calibration_accuracy_drop"));
  });

  it("stableGenCount resets to 0 on unfreeze", () => {
    const state = { mode: "frozen", stableGenCount: 5 };
    const result = advanceController(
      baseInput({ state, meanUncertainty: 0.5 }),
    );
    assert.strictEqual(result.nextState.stableGenCount, 0);
  });

  it("stays frozen when no drift triggers fire", () => {
    const state = { mode: "frozen", stableGenCount: 5 };
    const result = advanceController(
      baseInput({ state, meanUncertainty: 0.05 }),
    );
    assert.strictEqual(result.unfroze, false);
    assert.strictEqual(result.froze, false);
    assert.strictEqual(result.nextState.mode, "frozen");
    assert.ok(result.reasonCodes.includes("frozen"));
  });

  it("stays frozen when drift.enabled=false even with high uncertainty", () => {
    const state = { mode: "frozen", stableGenCount: 5 };
    const result = advanceController(
      baseInput({
        state,
        meanUncertainty: 0.9,
        oodRate: 0.9,
        calibrationAccuracy: 0.1,
        drift: baseDriftConfig({ enabled: false }),
      }),
    );
    assert.strictEqual(result.unfroze, false);
    assert.strictEqual(result.nextState.mode, "frozen");
  });

  it("does not trigger ood unfreeze when ood.enabled=false", () => {
    const state = { mode: "frozen", stableGenCount: 5 };
    const result = advanceController(
      baseInput({
        state,
        meanUncertainty: 0.05,
        oodRate: 0.9,
        drift: baseDriftConfig({ ood: { enabled: false, maxOodRate: 0.2 } }),
      }),
    );
    assert.strictEqual(result.unfroze, false);
    assert.strictEqual(result.nextState.mode, "frozen");
  });

  it("reports multiple unfreeze reasons when multiple triggers fire", () => {
    const state = { mode: "frozen", stableGenCount: 5 };
    const result = advanceController(
      baseInput({
        state,
        meanUncertainty: 0.5,
        oodRate: 0.3,
        calibrationAccuracy: 0.4,
      }),
    );
    assert.strictEqual(result.unfroze, true);
    assert.ok(result.reasonCodes.includes("uncertainty_spike"));
    assert.ok(result.reasonCodes.includes("ood_rate_spike"));
    assert.ok(result.reasonCodes.includes("calibration_accuracy_drop"));
  });
});

describe("advanceController — determinism", () => {
  it("produces identical output for identical inputs", () => {
    const input = baseInput({
      state: { mode: "learning", stableGenCount: 2 },
    });

    const result1 = advanceController(input);
    const result2 = advanceController(input);

    assert.deepStrictEqual(result1, result2);
  });

  it("does not mutate input state", () => {
    const state = { mode: "learning", stableGenCount: 1 };
    const stateCopy = { ...state };
    advanceController(baseInput({ state }));
    assert.deepStrictEqual(state, stateCopy);
  });
});

describe("advanceController — edge cases", () => {
  it("handles non-finite meanUncertainty as not stable", () => {
    const state = { mode: "learning", stableGenCount: 2 };
    const result = advanceController(
      baseInput({ state, meanUncertainty: NaN }),
    );
    assert.strictEqual(result.froze, false);
    assert.strictEqual(result.nextState.stableGenCount, 0);
  });

  it("does not unfreeze on null oodRate", () => {
    const state = { mode: "frozen", stableGenCount: 5 };
    const result = advanceController(
      baseInput({ state, meanUncertainty: 0.05, oodRate: null }),
    );
    assert.strictEqual(result.unfroze, false);
  });

  it("does not unfreeze on null calibrationAccuracy", () => {
    const state = { mode: "frozen", stableGenCount: 5 };
    const result = advanceController(
      baseInput({
        state,
        meanUncertainty: 0.05,
        calibrationAccuracy: null,
      }),
    );
    assert.strictEqual(result.unfroze, false);
  });

  it("freezeAfterStableGens=1 freezes on first stable generation", () => {
    const state = createInitialControllerState();
    const result = advanceController(
      baseInput({
        state,
        freeze: baseFreezeConfig({ freezeAfterStableGens: 1 }),
      }),
    );
    assert.strictEqual(result.froze, true);
    assert.strictEqual(result.nextState.mode, "frozen");
  });

  it("meanUncertainty exactly at stableUncertaintyThreshold is not stable", () => {
    const state = { mode: "learning", stableGenCount: 5 };
    const result = advanceController(
      baseInput({ state, meanUncertainty: 0.15 }),
    );
    // 0.15 is NOT < 0.15, so not stable → stableGenCount resets
    assert.strictEqual(result.nextState.stableGenCount, 0);
    assert.strictEqual(result.froze, false);
  });

  it("meanUncertainty exactly at unfreezeUncertaintyThreshold triggers unfreeze", () => {
    const state = { mode: "frozen", stableGenCount: 5 };
    const result = advanceController(
      baseInput({ state, meanUncertainty: 0.4 }),
    );
    // 0.4 >= 0.4 → triggers unfreeze
    assert.strictEqual(result.unfroze, true);
  });

  it("oodRate exactly at maxOodRate does not trigger unfreeze", () => {
    const state = { mode: "frozen", stableGenCount: 5 };
    const result = advanceController(
      baseInput({ state, meanUncertainty: 0.05, oodRate: 0.2 }),
    );
    // 0.2 > 0.2 is false → no unfreeze
    assert.strictEqual(result.unfroze, false);
  });

  it("calibrationAccuracy exactly at minCalibrationAccuracy does not trigger unfreeze", () => {
    const state = { mode: "frozen", stableGenCount: 5 };
    const result = advanceController(
      baseInput({
        state,
        meanUncertainty: 0.05,
        calibrationAccuracy: 0.6,
      }),
    );
    // 0.6 < 0.6 is false → no unfreeze
    assert.strictEqual(result.unfroze, false);
  });
});
