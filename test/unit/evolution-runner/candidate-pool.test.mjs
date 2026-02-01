import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createSeededRng } from "../../../src/simulation-engine/rng.js";
import { resolveCandidatePool } from "../../../src/evolution-runner/candidate-pool.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** @param {string} id @param {number} fitness */
function c(id, fitness) {
  return { genome: { id }, fitness };
}

const SEED = 42;

function defaults(overrides = {}) {
  return {
    source: "elites",
    focus: { strategy: "none" },
    maxCandidates: 100,
    evaluated: [],
    elites: [],
    shortlist: [],
    rng: createSeededRng(SEED),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Source selection
// ---------------------------------------------------------------------------

describe("resolveCandidatePool — source selection", () => {
  it('source="shortlist" returns shortlist items', () => {
    const shortlist = [c("s1", 5), c("s2", 3)];
    const elites = [c("e1", 10)];
    const result = resolveCandidatePool(
      defaults({ source: "shortlist", shortlist, elites }),
    );
    assert.deepStrictEqual(
      result.map((r) => r.genome.id),
      ["s1", "s2"],
    );
  });

  it('source="shortlist" falls back to elites when shortlist is empty', () => {
    const elites = [c("e1", 10), c("e2", 8)];
    const result = resolveCandidatePool(
      defaults({ source: "shortlist", shortlist: [], elites }),
    );
    assert.deepStrictEqual(
      result.map((r) => r.genome.id),
      ["e1", "e2"],
    );
  });

  it('source="elites" returns all elites', () => {
    const elites = [c("e1", 10), c("e2", 8), c("e3", 6)];
    const result = resolveCandidatePool(
      defaults({ source: "elites", elites }),
    );
    assert.deepStrictEqual(
      result.map((r) => r.genome.id),
      ["e1", "e2", "e3"],
    );
  });

  it('source="evaluated" returns all evaluated genomes', () => {
    const evaluated = [c("v1", 1), c("v2", 2), c("v3", 3)];
    const result = resolveCandidatePool(
      defaults({ source: "evaluated", evaluated }),
    );
    assert.deepStrictEqual(
      result.map((r) => r.genome.id),
      ["v1", "v2", "v3"],
    );
  });

  it('source="mixed" returns elites + seeded random sample of non-elite evaluated', () => {
    const elites = [c("e1", 10)];
    const evaluated = [c("e1", 10), c("v1", 5), c("v2", 3), c("v3", 1)];
    const result = resolveCandidatePool(
      defaults({ source: "mixed", elites, evaluated }),
    );
    // Must include all elites
    assert.ok(result.some((r) => r.genome.id === "e1"));
    // Must include non-elite evaluated items
    const ids = new Set(result.map((r) => r.genome.id));
    assert.ok(ids.has("v1") || ids.has("v2") || ids.has("v3"));
    // Elite should not be duplicated — appears exactly once
    assert.equal(
      result.filter((r) => r.genome.id === "e1").length,
      1,
    );
  });

  it('source="mixed" is seeded-deterministic', () => {
    const elites = [c("e1", 10)];
    const evaluated = [c("e1", 10), c("v1", 5), c("v2", 3), c("v3", 1), c("v4", 2)];
    const r1 = resolveCandidatePool(
      defaults({ source: "mixed", elites, evaluated, rng: createSeededRng(99) }),
    );
    const r2 = resolveCandidatePool(
      defaults({ source: "mixed", elites, evaluated, rng: createSeededRng(99) }),
    );
    assert.deepStrictEqual(
      r1.map((r) => r.genome.id),
      r2.map((r) => r.genome.id),
    );
  });

  it("throws on unknown source", () => {
    assert.throws(
      () => resolveCandidatePool(defaults({ source: "bogus" })),
      /unknown source "bogus"/,
    );
  });
});

// ---------------------------------------------------------------------------
// Focus strategies
// ---------------------------------------------------------------------------

describe("resolveCandidatePool — focus strategies", () => {
  it('focus.strategy="none" passes pool through unchanged', () => {
    const elites = [c("e1", 10), c("e2", 5)];
    const result = resolveCandidatePool(
      defaults({ source: "elites", elites, focus: { strategy: "none" } }),
    );
    assert.equal(result.length, 2);
  });

  it('focus.strategy="topQuantile" filters to top Q by fitness', () => {
    const evaluated = [
      c("a", 10), c("b", 8), c("c", 6), c("d", 4), c("e", 2),
    ];
    const result = resolveCandidatePool(
      defaults({
        source: "evaluated",
        evaluated,
        focus: { strategy: "topQuantile", topQuantile: 0.4 },
      }),
    );
    // 40% of 5 = 2
    assert.equal(result.length, 2);
    assert.equal(result[0].fitness, 10);
    assert.equal(result[1].fitness, 8);
  });

  it('focus.strategy="topQuantile" keeps at least 1 candidate', () => {
    const evaluated = [c("a", 10), c("b", 8), c("c", 6)];
    const result = resolveCandidatePool(
      defaults({
        source: "evaluated",
        evaluated,
        focus: { strategy: "topQuantile", topQuantile: 0.01 },
      }),
    );
    assert.ok(result.length >= 1);
  });

  it("topQuantile throws on invalid quantile value", () => {
    assert.throws(
      () =>
        resolveCandidatePool(
          defaults({
            source: "elites",
            elites: [c("e1", 10)],
            focus: { strategy: "topQuantile", topQuantile: 0 },
          }),
        ),
      /topQuantile must be in/,
    );
    assert.throws(
      () =>
        resolveCandidatePool(
          defaults({
            source: "elites",
            elites: [c("e1", 10)],
            focus: { strategy: "topQuantile", topQuantile: 1.5 },
          }),
        ),
      /topQuantile must be in/,
    );
  });

  it('focus.strategy="parentsAndOffspring" throws descriptive error', () => {
    assert.throws(
      () =>
        resolveCandidatePool(
          defaults({
            source: "elites",
            elites: [c("e1", 10)],
            focus: { strategy: "parentsAndOffspring" },
          }),
        ),
      /not yet implemented/,
    );
  });

  it("throws on unknown focus strategy", () => {
    assert.throws(
      () =>
        resolveCandidatePool(
          defaults({
            source: "elites",
            elites: [c("e1", 10)],
            focus: { strategy: "unknown" },
          }),
        ),
      /unknown focus strategy/,
    );
  });
});

// ---------------------------------------------------------------------------
// maxCandidates truncation
// ---------------------------------------------------------------------------

describe("resolveCandidatePool — truncation", () => {
  it("truncates to maxCandidates with seeded sampling", () => {
    const evaluated = Array.from({ length: 20 }, (_, i) => c(`g${i}`, i));
    const result = resolveCandidatePool(
      defaults({ source: "evaluated", evaluated, maxCandidates: 5 }),
    );
    assert.equal(result.length, 5);
  });

  it("truncation is seeded-deterministic", () => {
    const evaluated = Array.from({ length: 20 }, (_, i) => c(`g${i}`, i));
    const r1 = resolveCandidatePool(
      defaults({ source: "evaluated", evaluated, maxCandidates: 5, rng: createSeededRng(7) }),
    );
    const r2 = resolveCandidatePool(
      defaults({ source: "evaluated", evaluated, maxCandidates: 5, rng: createSeededRng(7) }),
    );
    assert.deepStrictEqual(
      r1.map((r) => r.genome.id),
      r2.map((r) => r.genome.id),
    );
  });

  it("does not truncate when pool is within limit", () => {
    const elites = [c("e1", 10), c("e2", 8)];
    const result = resolveCandidatePool(
      defaults({ source: "elites", elites, maxCandidates: 10 }),
    );
    assert.equal(result.length, 2);
  });
});

// ---------------------------------------------------------------------------
// Immutability
// ---------------------------------------------------------------------------

describe("resolveCandidatePool — immutability", () => {
  it("does not mutate input arrays", () => {
    const elites = [c("e1", 10), c("e2", 8), c("e3", 6)];
    const elitesCopy = [...elites];
    resolveCandidatePool(
      defaults({ source: "elites", elites, maxCandidates: 2 }),
    );
    assert.deepStrictEqual(elites, elitesCopy);
  });
});

// ---------------------------------------------------------------------------
// Combined: source + focus + truncation
// ---------------------------------------------------------------------------

describe("resolveCandidatePool — combined pipeline", () => {
  it("applies source → focus → truncation in order", () => {
    const evaluated = Array.from({ length: 10 }, (_, i) => c(`g${i}`, (i + 1) * 10));
    // topQuantile=0.5 → top 5 by fitness, then truncate to 3
    const result = resolveCandidatePool(
      defaults({
        source: "evaluated",
        evaluated,
        focus: { strategy: "topQuantile", topQuantile: 0.5 },
        maxCandidates: 3,
      }),
    );
    assert.equal(result.length, 3);
    // All returned candidates should be from the top 5 (fitness >= 60)
    for (const item of result) {
      assert.ok(item.fitness >= 60, `Expected fitness >= 60, got ${item.fitness}`);
    }
  });
});
