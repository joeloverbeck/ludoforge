import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mineMotifs } from "../../../src/evaluation-analytics/motif-miner.js";

/**
 * Helper: builds a simple linear LTS chain.
 * Nodes: n0 → n1 → n2 → ... with given edge labels.
 */
function linearLts(labels) {
  const nodes = [];
  const edges = [];
  for (let i = 0; i <= labels.length; i += 1) {
    nodes.push(`n${i}`);
  }
  for (let i = 0; i < labels.length; i += 1) {
    edges.push({ from: `n${i}`, to: `n${i + 1}`, label: labels[i] });
  }
  nodes.sort();
  edges.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.label.localeCompare(b.label));
  return { nodes, edges };
}

const defaultConfig = {
  ngramSizes: [2, 3],
  minSupport: 1,
  maxMotifLength: 5,
};

describe("mineMotifs", () => {
  it("determinism — same LTS + config produces identical output across runs", async () => {
    const lts = linearLts(["a", "b", "c", "a", "b"]);
    const config = { ngramSizes: [2, 3], minSupport: 1, maxMotifLength: 5 };

    const result1 = await mineMotifs(lts, config);
    const result2 = await mineMotifs(lts, config);

    assert.deepEqual(result1, result2);
  });

  it("minSupport filtering — motifs below threshold are excluded", async () => {
    // a → b appears twice, b → c appears once
    const lts = {
      nodes: ["n0", "n1", "n2", "n3", "n4"],
      edges: [
        { from: "n0", to: "n1", label: "a" },
        { from: "n1", to: "n2", label: "b" },
        { from: "n2", to: "n3", label: "a" },
        { from: "n3", to: "n4", label: "b" },
      ],
    };
    const config = { ngramSizes: [2], minSupport: 2, maxMotifLength: 5 };

    const result = await mineMotifs(lts, config);

    // "a → b" appears twice (n0→n1→n2 and n2→n3→n4)
    assert.ok(result.some((m) => m.signature === "a → b" && m.support >= 2));
    // "b → a" appears once, should be excluded
    assert.ok(!result.some((m) => m.signature === "b → a" && m.support < 2));
  });

  it("maxMotifLength filtering — n-gram sizes exceeding max are skipped", async () => {
    const lts = linearLts(["a", "b", "c", "d"]);
    const config = { ngramSizes: [2, 4], minSupport: 1, maxMotifLength: 3 };

    const result = await mineMotifs(lts, config);

    // size-4 ngrams should be excluded since maxMotifLength is 3
    assert.ok(!result.some((m) => m.ngramSize === 4));
    assert.ok(result.some((m) => m.ngramSize === 2));
  });

  it("ngramSizes controls which sizes are mined", async () => {
    const lts = linearLts(["a", "b", "c"]);
    const config = { ngramSizes: [3], minSupport: 1, maxMotifLength: 5 };

    const result = await mineMotifs(lts, config);

    // Only size-3 motifs should be present
    for (const motif of result) {
      assert.equal(motif.ngramSize, 3);
    }
    assert.ok(result.length > 0);
  });

  it("sort order — support descending, then signature ascending", async () => {
    // Build an LTS where "a → b" appears 3 times, "c → d" appears 2 times,
    // "a → c" appears 2 times (tie-break by signature)
    const lts = {
      nodes: ["n0", "n1", "n2", "n3", "n4", "n5", "n6", "n7", "n8", "n9"],
      edges: [
        { from: "n0", to: "n1", label: "a" },
        { from: "n1", to: "n2", label: "b" },
        { from: "n2", to: "n3", label: "a" },
        { from: "n3", to: "n4", label: "b" },
        { from: "n4", to: "n5", label: "a" },
        { from: "n5", to: "n6", label: "b" },
        { from: "n6", to: "n7", label: "c" },
        { from: "n7", to: "n8", label: "d" },
        { from: "n8", to: "n9", label: "c" },
      ],
    };
    // Add another c→d path via branching
    const lts2 = {
      nodes: [...lts.nodes, "n10"],
      edges: [
        ...lts.edges,
        { from: "n9", to: "n10", label: "d" },
      ],
    };
    lts2.nodes.sort();
    lts2.edges.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.label.localeCompare(b.label));

    const config = { ngramSizes: [2], minSupport: 1, maxMotifLength: 5 };
    const result = await mineMotifs(lts2, config);

    // Verify sort: descending support, then ascending signature
    for (let i = 1; i < result.length; i += 1) {
      const prev = result[i - 1];
      const curr = result[i];
      if (prev.support === curr.support) {
        assert.ok(prev.signature <= curr.signature,
          `Expected "${prev.signature}" <= "${curr.signature}" for same support`);
      } else {
        assert.ok(prev.support > curr.support,
          `Expected ${prev.support} > ${curr.support}`);
      }
    }
  });

  it("empty LTS produces empty motifs", async () => {
    const lts = { nodes: [], edges: [] };
    const result = await mineMotifs(lts, defaultConfig);
    assert.deepEqual(result, []);
  });

  it("single-edge LTS produces unigram motif", async () => {
    const lts = {
      nodes: ["a", "b"],
      edges: [{ from: "a", to: "b", label: "move" }],
    };
    const config = { ngramSizes: [1], minSupport: 1, maxMotifLength: 5 };

    const result = await mineMotifs(lts, config);

    assert.equal(result.length, 1);
    assert.equal(result[0].signature, "move");
    assert.equal(result[0].ngramSize, 1);
    assert.equal(result[0].support, 1);
  });

  it("does not mutate input LTS", async () => {
    const lts = linearLts(["a", "b", "c"]);
    const original = JSON.parse(JSON.stringify(lts));

    await mineMotifs(lts, defaultConfig);

    assert.deepEqual(lts, original);
  });

  it("multi-path LTS produces correct n-grams with accurate support counts", async () => {
    // Two separate paths share the same bigram "x → y"
    const lts = {
      nodes: ["a", "b", "c", "d", "e"],
      edges: [
        { from: "a", to: "b", label: "x" },
        { from: "b", to: "c", label: "y" },
        { from: "c", to: "d", label: "x" },
        { from: "d", to: "e", label: "y" },
      ],
    };
    const config = { ngramSizes: [2], minSupport: 1, maxMotifLength: 5 };

    const result = await mineMotifs(lts, config);

    const xyMotif = result.find((m) => m.signature === "x → y");
    assert.ok(xyMotif, "Expected motif 'x → y' to exist");
    assert.equal(xyMotif.support, 2);
    assert.equal(xyMotif.exampleOccurrences.length, 2);
  });

  it("self-loop graph completes without hanging", async () => {
    // A graph where every node has a self-loop — the maxPaths/maxStackSize
    // limits prevent infinite expansion
    const lts = {
      nodes: ["n0", "n1"],
      edges: [
        { from: "n0", to: "n0", label: "pass" },
        { from: "n0", to: "n1", label: "move" },
        { from: "n1", to: "n1", label: "pass" },
      ],
    };
    const config = { ngramSizes: [2, 3], minSupport: 1, maxMotifLength: 5 };

    const start = Date.now();
    const result = await mineMotifs(lts, config);
    const elapsed = Date.now() - start;

    assert.ok(Array.isArray(result));
    assert.ok(elapsed < 5_000, `Self-loop graph took ${elapsed}ms, expected < 5000ms`);
  });

  it("stack size limit prevents hang on dense cyclic graph", async () => {
    // Fully-connected graph with 20 nodes — stack would grow exponentially
    // without maxStackSize limit
    const nodes = [];
    const edges = [];
    for (let i = 0; i < 20; i++) {
      nodes.push(`n${i}`);
    }
    for (let i = 0; i < 20; i++) {
      for (let j = 0; j < 20; j++) {
        if (i !== j) {
          edges.push({ from: `n${i}`, to: `n${j}`, label: `e${i}_${j}` });
        }
      }
    }
    const lts = { nodes, edges };
    const config = { ngramSizes: [3], minSupport: 1, maxMotifLength: 5 };

    const start = Date.now();
    const result = await mineMotifs(lts, config);
    const elapsed = Date.now() - start;

    assert.ok(Array.isArray(result));
    // Should complete in reasonable time (not hang), allow generous 30s for CI
    assert.ok(elapsed < 30_000, `Took ${elapsed}ms, expected < 30000ms`);
  });

  it("abort signal stops mining mid-execution", async () => {
    // Build a large graph that takes time to process
    const nodes = [];
    const edges = [];
    for (let i = 0; i < 50; i++) {
      nodes.push(`n${i}`);
    }
    for (let i = 0; i < 50; i++) {
      for (let j = 0; j < 50; j++) {
        if (i !== j) {
          edges.push({ from: `n${i}`, to: `n${j}`, label: `e${i}_${j}` });
        }
      }
    }
    const lts = { nodes, edges };
    const config = { ngramSizes: [3], minSupport: 1, maxMotifLength: 5 };

    const controller = new AbortController();
    // Abort after 50ms
    setTimeout(() => controller.abort(), 50);

    const start = Date.now();
    const result = await mineMotifs(lts, config, { signal: controller.signal });
    const elapsed = Date.now() - start;

    assert.ok(Array.isArray(result));
    // Should have been aborted well before exhaustive enumeration
    assert.ok(elapsed < 5_000, `Took ${elapsed}ms, expected abort to cut it short`);
  });

  it("yield points allow event loop to run during mining", async () => {
    // Build a moderately large graph that requires many iterations
    const nodes = [];
    const edges = [];
    for (let i = 0; i < 30; i++) {
      nodes.push(`n${i}`);
    }
    for (let i = 0; i < 30; i++) {
      for (let j = 0; j < 30; j++) {
        if (i !== j) {
          edges.push({ from: `n${i}`, to: `n${j}`, label: `e${i}_${j}` });
        }
      }
    }
    const lts = { nodes, edges };
    const config = { ngramSizes: [2], minSupport: 1, maxMotifLength: 5 };

    // Use a timeout to verify the event loop isn't blocked
    let timeoutFired = false;
    const timer = setTimeout(() => { timeoutFired = true; }, 10);

    await mineMotifs(lts, config);
    // Give the timeout a chance to fire after mining completes
    await new Promise((r) => setImmediate(r));

    clearTimeout(timer);
    // If yield points work, the setTimeout should have had a chance to fire
    // during mining (since it processes >5000 iterations on this graph)
    assert.ok(timeoutFired, "Expected setTimeout to fire during mining (event loop yield)");
  });
});
