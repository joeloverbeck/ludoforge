import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { decideFeedbackPlan } from "../../../src/evolution-runner/feedback-plan.js";

function baseCalibration(overrides = {}) {
  return {
    enabled: true,
    everyGens: 10,
    samples: 2,
    ...overrides,
  };
}

function baseInput(overrides = {}) {
  return {
    controllerState: { mode: "learning", stableGenCount: 0 },
    calibration: baseCalibration(),
    generation: 5,
    lastCalibrationGen: null,
    adaptiveBudgetResult: { budget: 3, unfreezeRequired: false },
    baseMaxPerGen: 5,
    ...overrides,
  };
}

describe("decideFeedbackPlan — frozen mode", () => {
  it("returns shouldPrompt=false, budget=0 when frozen and not calibration gen", () => {
    const plan = decideFeedbackPlan(
      baseInput({
        controllerState: { mode: "frozen", stableGenCount: 5 },
        generation: 3,
        lastCalibrationGen: 0,
      }),
    );
    assert.strictEqual(plan.shouldPrompt, false);
    assert.strictEqual(plan.budget, 0);
    assert.ok(plan.reasonCodes.includes("frozen"));
    assert.ok(!plan.reasonCodes.includes("calibration_due"));
  });

  it("returns shouldPrompt=true with calibration budget when frozen and calibration due", () => {
    const plan = decideFeedbackPlan(
      baseInput({
        controllerState: { mode: "frozen", stableGenCount: 5 },
        calibration: baseCalibration({ everyGens: 10, samples: 2 }),
        generation: 20,
        lastCalibrationGen: 10,
      }),
    );
    assert.strictEqual(plan.shouldPrompt, true);
    assert.strictEqual(plan.budget, 2);
    assert.ok(plan.reasonCodes.includes("frozen"));
    assert.ok(plan.reasonCodes.includes("calibration_due"));
  });

  it("does not schedule calibration when calibration.enabled=false", () => {
    const plan = decideFeedbackPlan(
      baseInput({
        controllerState: { mode: "frozen", stableGenCount: 5 },
        calibration: baseCalibration({ enabled: false }),
        generation: 100,
        lastCalibrationGen: 0,
      }),
    );
    assert.strictEqual(plan.shouldPrompt, false);
    assert.strictEqual(plan.budget, 0);
    assert.ok(!plan.reasonCodes.includes("calibration_due"));
  });
});

describe("decideFeedbackPlan — learning mode", () => {
  it("uses adaptive budget result", () => {
    const plan = decideFeedbackPlan(
      baseInput({
        adaptiveBudgetResult: { budget: 7, unfreezeRequired: false },
        baseMaxPerGen: 5,
      }),
    );
    assert.strictEqual(plan.shouldPrompt, true);
    assert.strictEqual(plan.budget, 7);
    assert.ok(plan.reasonCodes.includes("learning"));
  });

  it("returns shouldPrompt=false when adaptive budget is 0", () => {
    const plan = decideFeedbackPlan(
      baseInput({
        adaptiveBudgetResult: { budget: 0, unfreezeRequired: false },
        baseMaxPerGen: 5,
      }),
    );
    assert.strictEqual(plan.shouldPrompt, false);
    assert.strictEqual(plan.budget, 0);
    assert.ok(plan.reasonCodes.includes("learning"));
  });

  it("includes high_uncertainty when budget exceeds baseMaxPerGen", () => {
    const plan = decideFeedbackPlan(
      baseInput({
        adaptiveBudgetResult: { budget: 8, unfreezeRequired: false },
        baseMaxPerGen: 5,
      }),
    );
    assert.ok(plan.reasonCodes.includes("high_uncertainty"));
  });

  it("does not include high_uncertainty when budget <= baseMaxPerGen", () => {
    const plan = decideFeedbackPlan(
      baseInput({
        adaptiveBudgetResult: { budget: 5, unfreezeRequired: false },
        baseMaxPerGen: 5,
      }),
    );
    assert.ok(!plan.reasonCodes.includes("high_uncertainty"));
  });

  it("includes calibration_due when calibration is scheduled in learning mode", () => {
    const plan = decideFeedbackPlan(
      baseInput({
        generation: 20,
        lastCalibrationGen: 10,
        calibration: baseCalibration({ everyGens: 10 }),
      }),
    );
    assert.ok(plan.reasonCodes.includes("calibration_due"));
    assert.ok(plan.reasonCodes.includes("learning"));
  });
});

describe("decideFeedbackPlan — calibration scheduling", () => {
  it("calibration due exactly at everyGens offset from lastCalibrationGen", () => {
    const plan = decideFeedbackPlan(
      baseInput({
        controllerState: { mode: "frozen", stableGenCount: 5 },
        generation: 30,
        lastCalibrationGen: 20,
        calibration: baseCalibration({ everyGens: 10 }),
      }),
    );
    assert.ok(plan.reasonCodes.includes("calibration_due"));
  });

  it("calibration not due one generation before everyGens offset", () => {
    const plan = decideFeedbackPlan(
      baseInput({
        controllerState: { mode: "frozen", stableGenCount: 5 },
        generation: 29,
        lastCalibrationGen: 20,
        calibration: baseCalibration({ everyGens: 10 }),
      }),
    );
    assert.ok(!plan.reasonCodes.includes("calibration_due"));
    assert.strictEqual(plan.budget, 0);
  });

  it("calibration due when lastCalibrationGen is null and generation >= everyGens", () => {
    const plan = decideFeedbackPlan(
      baseInput({
        controllerState: { mode: "frozen", stableGenCount: 5 },
        generation: 10,
        lastCalibrationGen: null,
        calibration: baseCalibration({ everyGens: 10 }),
      }),
    );
    assert.ok(plan.reasonCodes.includes("calibration_due"));
    assert.strictEqual(plan.budget, 2);
  });

  it("calibration not due when lastCalibrationGen is null and generation < everyGens", () => {
    const plan = decideFeedbackPlan(
      baseInput({
        controllerState: { mode: "frozen", stableGenCount: 5 },
        generation: 9,
        lastCalibrationGen: null,
        calibration: baseCalibration({ everyGens: 10 }),
      }),
    );
    assert.ok(!plan.reasonCodes.includes("calibration_due"));
    assert.strictEqual(plan.budget, 0);
  });

  it("calibration due beyond everyGens (e.g., 15 gens since last)", () => {
    const plan = decideFeedbackPlan(
      baseInput({
        controllerState: { mode: "frozen", stableGenCount: 5 },
        generation: 25,
        lastCalibrationGen: 10,
        calibration: baseCalibration({ everyGens: 10 }),
      }),
    );
    assert.ok(plan.reasonCodes.includes("calibration_due"));
  });
});

describe("decideFeedbackPlan — determinism", () => {
  it("produces identical output for identical inputs", () => {
    const input = baseInput({
      controllerState: { mode: "frozen", stableGenCount: 5 },
      generation: 20,
      lastCalibrationGen: 10,
    });

    const result1 = decideFeedbackPlan(input);
    const result2 = decideFeedbackPlan(input);

    assert.deepStrictEqual(result1, result2);
  });

  it("does not mutate input", () => {
    const input = baseInput();
    const inputCopy = JSON.parse(JSON.stringify(input));
    decideFeedbackPlan(input);
    assert.deepStrictEqual(input, inputCopy);
  });
});

describe("decideFeedbackPlan — edge cases", () => {
  it("frozen with calibration.samples=0 gives shouldPrompt=true but budget=0", () => {
    const plan = decideFeedbackPlan(
      baseInput({
        controllerState: { mode: "frozen", stableGenCount: 5 },
        calibration: baseCalibration({ samples: 0 }),
        generation: 10,
        lastCalibrationGen: 0,
      }),
    );
    // calibration is due but samples=0 means budget is 0
    assert.strictEqual(plan.shouldPrompt, true);
    assert.strictEqual(plan.budget, 0);
    assert.ok(plan.reasonCodes.includes("calibration_due"));
  });

  it("learning mode with budget=0 and calibration due still shows calibration_due", () => {
    const plan = decideFeedbackPlan(
      baseInput({
        adaptiveBudgetResult: { budget: 0, unfreezeRequired: false },
        generation: 10,
        lastCalibrationGen: 0,
        calibration: baseCalibration({ everyGens: 10 }),
      }),
    );
    assert.ok(plan.reasonCodes.includes("calibration_due"));
    assert.ok(plan.reasonCodes.includes("learning"));
    assert.strictEqual(plan.budget, 0);
  });

  it("everyGens=1 means calibration due every generation", () => {
    for (const gen of [1, 2, 5, 10]) {
      const plan = decideFeedbackPlan(
        baseInput({
          controllerState: { mode: "frozen", stableGenCount: 5 },
          calibration: baseCalibration({ everyGens: 1 }),
          generation: gen,
          lastCalibrationGen: gen - 1,
        }),
      );
      assert.ok(
        plan.reasonCodes.includes("calibration_due"),
        `calibration should be due at generation ${gen}`,
      );
    }
  });
});
