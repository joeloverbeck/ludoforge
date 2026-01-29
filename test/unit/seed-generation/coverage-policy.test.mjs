import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  computeTotalBinCount,
  computeTargetPerBin,
  shouldAcceptCandidate,
} from "../../../src/seed-generation/coverage-policy.js";

describe("computeTotalBinCount", () => {
  it("returns product of bins for multiple descriptors", () => {
    const descriptors = [{ bins: 3 }, { bins: 4 }, { bins: 2 }];
    assert.equal(computeTotalBinCount(descriptors), 24);
  });

  it("returns bins for a single descriptor", () => {
    assert.equal(computeTotalBinCount([{ bins: 5 }]), 5);
  });

  it("throws for empty array", () => {
    assert.throws(() => computeTotalBinCount([]), /non-empty/);
  });

  it("throws for non-array", () => {
    assert.throws(() => computeTotalBinCount(null), /non-empty/);
  });
});

describe("computeTargetPerBin", () => {
  it("uniform-bins: ceil(populationSize / totalBinCount)", () => {
    assert.equal(computeTargetPerBin("uniform-bins", 10, 3), 4);
  });

  it("uniform-bins: exact division", () => {
    assert.equal(computeTargetPerBin("uniform-bins", 12, 4), 3);
  });

  it("underfilled-first: same as uniform-bins", () => {
    assert.equal(computeTargetPerBin("underfilled-first", 10, 3), 4);
  });

  it("random: returns Infinity", () => {
    assert.equal(computeTargetPerBin("random", 10, 3), Infinity);
  });

  it("throws for unknown strategy", () => {
    assert.throws(
      () => computeTargetPerBin("unknown", 10, 3),
      /Unknown coverage strategy/
    );
  });
});

describe("shouldAcceptCandidate", () => {
  it("random: always accepts", () => {
    const result = shouldAcceptCandidate({
      strategy: "random",
      nicheId: "x:0",
      binCounts: new Map([["x:0", 100]]),
      targetPerBin: 1,
      totalBinCount: 2,
    });
    assert.equal(result.accept, true);
  });

  it("uniform-bins: accepts when bin below target", () => {
    const result = shouldAcceptCandidate({
      strategy: "uniform-bins",
      nicheId: "x:0",
      binCounts: new Map([["x:0", 1]]),
      targetPerBin: 3,
      totalBinCount: 2,
    });
    assert.equal(result.accept, true);
  });

  it("uniform-bins: rejects when bin at target", () => {
    const result = shouldAcceptCandidate({
      strategy: "uniform-bins",
      nicheId: "x:0",
      binCounts: new Map([["x:0", 3]]),
      targetPerBin: 3,
      totalBinCount: 2,
    });
    assert.equal(result.accept, false);
    assert.equal(result.reason, "bin-full");
  });

  it("uniform-bins: accepts unseen bin (count 0)", () => {
    const result = shouldAcceptCandidate({
      strategy: "uniform-bins",
      nicheId: "x:1",
      binCounts: new Map(),
      targetPerBin: 3,
      totalBinCount: 2,
    });
    assert.equal(result.accept, true);
  });

  it("underfilled-first: accepts when bin below target", () => {
    const result = shouldAcceptCandidate({
      strategy: "underfilled-first",
      nicheId: "x:0",
      binCounts: new Map([["x:0", 1]]),
      targetPerBin: 3,
      totalBinCount: 2,
    });
    assert.equal(result.accept, true);
  });

  it("underfilled-first: rejects when at target and underfilled bins exist", () => {
    const result = shouldAcceptCandidate({
      strategy: "underfilled-first",
      nicheId: "x:0",
      binCounts: new Map([
        ["x:0", 3],
        ["x:1", 1],
      ]),
      targetPerBin: 3,
      totalBinCount: 2,
    });
    assert.equal(result.accept, false);
    assert.equal(result.reason, "underfilled-bins-available");
  });

  it("underfilled-first: rejects when at target and unoccupied bins exist", () => {
    const result = shouldAcceptCandidate({
      strategy: "underfilled-first",
      nicheId: "x:0",
      binCounts: new Map([["x:0", 3]]),
      targetPerBin: 3,
      totalBinCount: 4,
    });
    assert.equal(result.accept, false);
    assert.equal(result.reason, "underfilled-bins-available");
  });

  it("underfilled-first: accepts overflow when all bins at target", () => {
    const result = shouldAcceptCandidate({
      strategy: "underfilled-first",
      nicheId: "x:0",
      binCounts: new Map([
        ["x:0", 3],
        ["x:1", 3],
      ]),
      targetPerBin: 3,
      totalBinCount: 2,
    });
    assert.equal(result.accept, true);
  });

  it("throws for unknown strategy", () => {
    assert.throws(
      () =>
        shouldAcceptCandidate({
          strategy: "unknown",
          nicheId: "x:0",
          binCounts: new Map(),
          targetPerBin: 1,
          totalBinCount: 1,
        }),
      /Unknown coverage strategy/
    );
  });
});
