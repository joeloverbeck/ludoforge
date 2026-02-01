import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { distillTasteVector } from "../../../src/evaluation-analytics/taste-vector.js";

describe("distillTasteVector", () => {
  it("returns empty features for state with no models", () => {
    const result = distillTasteVector({ models: [] });
    assert.deepStrictEqual(result, {
      features: {},
      topPositive: [],
      topNegative: [],
    });
  });

  it("returns empty features when models is undefined", () => {
    const result = distillTasteVector({});
    assert.deepStrictEqual(result, {
      features: {},
      topPositive: [],
      topNegative: [],
    });
  });

  it("returns stddev=0 for a single model", () => {
    const state = {
      models: [
        { weights: { playability: 0.8, balance: -0.3 }, bias: 0, sampleCount: 10 },
      ],
    };
    const result = distillTasteVector(state);
    assert.equal(result.features.playability.meanWeight, 0.8);
    assert.equal(result.features.playability.stddevWeight, 0);
    assert.equal(result.features.balance.meanWeight, -0.3);
    assert.equal(result.features.balance.stddevWeight, 0);
  });

  it("computes arithmetic mean across ensemble models", () => {
    const state = {
      models: [
        { weights: { a: 1, b: -2 }, bias: 0, sampleCount: 5 },
        { weights: { a: 3, b: -4 }, bias: 0, sampleCount: 5 },
      ],
    };
    const result = distillTasteVector(state);
    assert.equal(result.features.a.meanWeight, 2); // (1+3)/2
    assert.equal(result.features.b.meanWeight, -3); // (-2+-4)/2
  });

  it("computes population stddev (not sample stddev)", () => {
    // models with weights: 1, 3 → mean=2, pop stddev=sqrt(((1-2)^2+(3-2)^2)/2)=sqrt(1)=1
    const state = {
      models: [
        { weights: { x: 1 }, bias: 0, sampleCount: 5 },
        { weights: { x: 3 }, bias: 0, sampleCount: 5 },
      ],
    };
    const result = distillTasteVector(state);
    assert.equal(result.features.x.stddevWeight, 1);
  });

  it("computes population stddev with 3 models", () => {
    // weights: 2, 4, 6 → mean=4, pop stddev=sqrt(((2-4)^2+(4-4)^2+(6-4)^2)/3)=sqrt(8/3)
    const state = {
      models: [
        { weights: { y: 2 }, bias: 0, sampleCount: 1 },
        { weights: { y: 4 }, bias: 0, sampleCount: 1 },
        { weights: { y: 6 }, bias: 0, sampleCount: 1 },
      ],
    };
    const result = distillTasteVector(state);
    assert.equal(result.features.y.meanWeight, 4);
    const expected = Math.sqrt(8 / 3);
    assert.ok(
      Math.abs(result.features.y.stddevWeight - expected) < 1e-12,
      `expected stddev ~${expected}, got ${result.features.y.stddevWeight}`,
    );
  });

  it("sorts topPositive descending by meanWeight", () => {
    const state = {
      models: [
        { weights: { a: 1, b: 3, c: 2, d: -1 }, bias: 0, sampleCount: 1 },
      ],
    };
    const result = distillTasteVector(state);
    assert.deepStrictEqual(
      result.topPositive.map((e) => e.featureId),
      ["b", "c", "a"],
    );
  });

  it("sorts topNegative ascending by meanWeight (most negative first)", () => {
    const state = {
      models: [
        { weights: { a: -5, b: -1, c: -3, d: 2 }, bias: 0, sampleCount: 1 },
      ],
    };
    const result = distillTasteVector(state);
    assert.deepStrictEqual(
      result.topNegative.map((e) => e.featureId),
      ["a", "c", "b"],
    );
  });

  it("respects topK option", () => {
    const state = {
      models: [
        { weights: { a: 5, b: 4, c: 3, d: 2, e: 1, f: -1 }, bias: 0, sampleCount: 1 },
      ],
    };
    const result = distillTasteVector(state, { topK: 2 });
    assert.equal(result.topPositive.length, 2);
    assert.deepStrictEqual(
      result.topPositive.map((e) => e.featureId),
      ["a", "b"],
    );
  });

  it("defaults topK to 5", () => {
    const weights = {};
    for (let i = 0; i < 10; i++) {
      weights[`f${i}`] = i + 1;
    }
    const state = { models: [{ weights, bias: 0, sampleCount: 1 }] };
    const result = distillTasteVector(state);
    assert.equal(result.topPositive.length, 5);
  });

  it("handles models with disjoint feature sets (missing key treated as 0)", () => {
    const state = {
      models: [
        { weights: { a: 4 }, bias: 0, sampleCount: 1 },
        { weights: { b: 6 }, bias: 0, sampleCount: 1 },
      ],
    };
    const result = distillTasteVector(state);
    // a: model1=4, model2=0 → mean=2
    assert.equal(result.features.a.meanWeight, 2);
    // b: model1=0, model2=6 → mean=3
    assert.equal(result.features.b.meanWeight, 3);
  });

  it("excludes zero-mean features from topPositive and topNegative", () => {
    const state = {
      models: [
        { weights: { a: 1, b: -1, zero: 0 }, bias: 0, sampleCount: 1 },
      ],
    };
    const result = distillTasteVector(state);
    const allIds = [
      ...result.topPositive.map((e) => e.featureId),
      ...result.topNegative.map((e) => e.featureId),
    ];
    assert.ok(!allIds.includes("zero"));
  });

  it("is a pure function (does not mutate input)", () => {
    const model = { weights: { a: 1 }, bias: 0, sampleCount: 1 };
    const state = { models: [model] };
    const weightsBefore = JSON.stringify(model.weights);
    distillTasteVector(state);
    assert.equal(JSON.stringify(model.weights), weightsBefore);
  });

  it("each topPositive/topNegative entry includes meanWeight and stddevWeight", () => {
    const state = {
      models: [
        { weights: { x: 2, y: -3 }, bias: 0, sampleCount: 1 },
        { weights: { x: 4, y: -1 }, bias: 0, sampleCount: 1 },
      ],
    };
    const result = distillTasteVector(state);
    for (const entry of [...result.topPositive, ...result.topNegative]) {
      assert.ok("featureId" in entry);
      assert.ok("meanWeight" in entry);
      assert.ok("stddevWeight" in entry);
    }
  });
});
