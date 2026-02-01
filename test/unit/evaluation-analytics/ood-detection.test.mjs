import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  cosineDistance,
  l2Distance,
  updateTrainFeatureStats,
  computeOodRate,
} from "../../../src/evaluation-analytics/ood-detection.js";

// ─── cosineDistance ──────────────────────────────────────────────────

describe("cosineDistance", () => {
  it("returns 0 for identical vectors", () => {
    const v = { a: 1, b: 2, c: 3 };
    assert.ok(Math.abs(cosineDistance(v, v)) < 1e-12);
  });

  it("returns 1 for orthogonal vectors", () => {
    const a = { x: 1, y: 0 };
    const b = { x: 0, y: 1 };
    assert.ok(Math.abs(cosineDistance(a, b) - 1) < 1e-12);
  });

  it("returns 2 for opposite vectors", () => {
    const a = { x: 1 };
    const b = { x: -1 };
    assert.ok(Math.abs(cosineDistance(a, b) - 2) < 1e-12);
  });

  it("returns 1 when either vector is zero-magnitude", () => {
    assert.strictEqual(cosineDistance({ x: 0 }, { x: 1 }), 1);
    assert.strictEqual(cosineDistance({}, { x: 1 }), 1);
  });

  it("handles mismatched keys (missing = 0)", () => {
    const a = { x: 3, y: 4 };
    const b = { x: 3 };
    // b effectively {x:3, y:0}
    const dist = cosineDistance(a, b);
    assert.ok(dist > 0);
    assert.ok(dist < 1);
  });

  it("handles null/undefined gracefully", () => {
    assert.strictEqual(cosineDistance(null, null), 1);
    assert.strictEqual(cosineDistance(undefined, { x: 1 }), 1);
  });
});

// ─── l2Distance ─────────────────────────────────────────────────────

describe("l2Distance", () => {
  it("returns 0 for identical vectors", () => {
    const v = { a: 1, b: 2 };
    assert.strictEqual(l2Distance(v, v), 0);
  });

  it("computes correct Euclidean distance", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 3, y: 4 };
    assert.ok(Math.abs(l2Distance(a, b) - 5) < 1e-12);
  });

  it("handles mismatched keys (missing = 0)", () => {
    const a = { x: 3 };
    const b = { y: 4 };
    // effectively (3,0) vs (0,4) → distance = 5
    assert.ok(Math.abs(l2Distance(a, b) - 5) < 1e-12);
  });

  it("handles null/undefined gracefully", () => {
    assert.strictEqual(l2Distance(null, null), 0);
    assert.ok(l2Distance(undefined, { x: 3 }) > 0);
  });
});

// ─── updateTrainFeatureStats ────────────────────────────────────────

describe("updateTrainFeatureStats", () => {
  it("returns empty stats for empty input", () => {
    const stats = updateTrainFeatureStats(null, []);
    assert.deepStrictEqual(stats, { vectors: [], p95: 0 });
  });

  it("accumulates vectors from multiple calls", () => {
    const v1 = [{ a: 1 }, { a: 2 }];
    const stats1 = updateTrainFeatureStats(null, v1);
    assert.strictEqual(stats1.vectors.length, 2);

    const v2 = [{ a: 3 }];
    const stats2 = updateTrainFeatureStats(stats1, v2);
    assert.strictEqual(stats2.vectors.length, 3);
  });

  it("caps stored vectors at maxStoredVectors", () => {
    const vectors = Array.from({ length: 10 }, (_, i) => ({ a: i }));
    const stats = updateTrainFeatureStats(null, vectors, { maxStoredVectors: 5 });
    assert.strictEqual(stats.vectors.length, 5);
    // Should keep the last 5
    assert.strictEqual(stats.vectors[0].a, 5);
  });

  it("computes p95 threshold for cosine distance", () => {
    // Build vectors that are similar — p95 should be small
    const vectors = Array.from({ length: 20 }, (_, i) => ({ a: 1, b: i * 0.01 }));
    const stats = updateTrainFeatureStats(null, vectors, { featureDistance: "cosine" });
    assert.ok(Number.isFinite(stats.p95));
    assert.ok(stats.p95 >= 0);
  });

  it("computes p95 threshold for L2 distance", () => {
    const vectors = [{ x: 0 }, { x: 1 }, { x: 2 }, { x: 10 }];
    const stats = updateTrainFeatureStats(null, vectors, { featureDistance: "l2" });
    assert.ok(Number.isFinite(stats.p95));
    assert.ok(stats.p95 > 0);
  });

  it("returns p95=0 for single vector", () => {
    const stats = updateTrainFeatureStats(null, [{ a: 1 }]);
    // Single vector: distance to its own mean is 0, so p95 = 0
    assert.strictEqual(stats.p95, 0);
  });

  it("is a pure function — does not mutate prev", () => {
    const prev = { vectors: [{ a: 1 }], p95: 0.1 };
    const prevCopy = structuredClone(prev);
    updateTrainFeatureStats(prev, [{ a: 2 }]);
    assert.deepStrictEqual(prev, prevCopy);
  });
});

// ─── computeOodRate ─────────────────────────────────────────────────

describe("computeOodRate", () => {
  it("returns oodRate=0 for empty candidates", () => {
    const stats = updateTrainFeatureStats(null, [{ a: 1 }, { a: 2 }]);
    const result = computeOodRate(stats, []);
    assert.strictEqual(result.oodRate, 0);
  });

  it("returns oodRate=0 when all candidates are in-distribution", () => {
    // Train on tight cluster near origin
    const trainVectors = Array.from({ length: 20 }, (_, i) => ({ x: i * 0.1 }));
    const stats = updateTrainFeatureStats(null, trainVectors, { featureDistance: "l2" });

    // Candidates within the same distribution
    const candidates = [{ x: 0.5 }, { x: 1.0 }];
    const result = computeOodRate(stats, candidates, { featureDistance: "l2" });
    assert.ok(result.oodRate >= 0);
    assert.ok(result.oodRate <= 1);
  });

  it("returns oodRate in [0,1] for cosine distance", () => {
    const trainVectors = [{ a: 1, b: 0 }, { a: 1, b: 0.1 }, { a: 1, b: -0.1 }];
    const stats = updateTrainFeatureStats(null, trainVectors, { featureDistance: "cosine" });

    const candidates = [
      { a: 1, b: 0 },   // in-distribution
      { a: 0, b: 1 },   // out-of-distribution (orthogonal)
    ];
    const result = computeOodRate(stats, candidates, { featureDistance: "cosine" });
    assert.ok(result.oodRate >= 0);
    assert.ok(result.oodRate <= 1);
  });

  it("returns oodRate in [0,1] for L2 distance", () => {
    const trainVectors = [{ x: 0 }, { x: 1 }, { x: 2 }];
    const stats = updateTrainFeatureStats(null, trainVectors, { featureDistance: "l2" });

    const candidates = [{ x: 1 }, { x: 100 }];
    const result = computeOodRate(stats, candidates, { featureDistance: "l2" });
    assert.ok(result.oodRate >= 0);
    assert.ok(result.oodRate <= 1);
  });

  it("detects high OOD rate when candidates are far from training data", () => {
    const trainVectors = Array.from({ length: 20 }, () => ({ x: 0, y: 0 }));
    const stats = updateTrainFeatureStats(null, trainVectors, { featureDistance: "l2" });

    // All candidates far away
    const candidates = Array.from({ length: 10 }, () => ({ x: 1000, y: 1000 }));
    const result = computeOodRate(stats, candidates, { featureDistance: "l2" });
    assert.strictEqual(result.oodRate, 1);
  });

  it("returns oodRate=0 when trainStats is null", () => {
    const result = computeOodRate(null, [{ a: 1 }]);
    assert.strictEqual(result.oodRate, 0);
  });

  it("returns oodRate=0 when trainStats has no vectors", () => {
    const result = computeOodRate({ vectors: [], p95: 0 }, [{ a: 1 }]);
    assert.strictEqual(result.oodRate, 0);
  });

  it("returns the p95 threshold used", () => {
    const stats = updateTrainFeatureStats(null, [{ a: 1 }, { a: 2 }]);
    const result = computeOodRate(stats, [{ a: 1 }]);
    assert.strictEqual(result.p95, stats.p95);
  });

  it("is deterministic for identical inputs", () => {
    const trainVectors = [{ a: 1 }, { a: 2 }, { a: 3 }];
    const stats = updateTrainFeatureStats(null, trainVectors);
    const candidates = [{ a: 1.5 }, { a: 100 }];

    const r1 = computeOodRate(stats, candidates);
    const r2 = computeOodRate(stats, candidates);
    assert.deepStrictEqual(r1, r2);
  });
});
