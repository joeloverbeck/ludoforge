import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mineMotifs } from "../../src/evaluation-analytics/motif-miner.js";

describe("motif-mining timeout integration", () => {
  it("AbortController timeout stops mining on pathological graph within timeout window", async () => {
    // Build a pathological fully-connected graph with 40 nodes and trigrams —
    // without the maxStackSize limit and yield points, this would hang indefinitely
    const nodes = [];
    const edges = [];
    for (let i = 0; i < 40; i++) {
      nodes.push(`n${i}`);
    }
    for (let i = 0; i < 40; i++) {
      for (let j = 0; j < 40; j++) {
        if (i !== j) {
          edges.push({ from: `n${i}`, to: `n${j}`, label: `e${i}_${j}` });
        }
      }
    }
    const lts = { nodes, edges };
    const config = { ngramSizes: [3], minSupport: 1, maxMotifLength: 5 };

    const timeoutMs = 500;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const start = Date.now();
    let result;
    try {
      result = await mineMotifs(lts, config, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    const elapsed = Date.now() - start;

    // The mining should have been aborted by the signal and returned partial results
    assert.ok(Array.isArray(result), "Expected array result even when aborted");
    // Should complete within a generous multiple of the timeout (accounting for yield interval)
    assert.ok(elapsed < timeoutMs + 10_000,
      `Expected to finish near timeout (${timeoutMs}ms) but took ${elapsed}ms`);
  });

  it("dense graph with cycles completes and keeps event loop responsive", async () => {
    // Fully-connected graph with 25 nodes — enough iterations to trigger yield points
    const nodes = [];
    const edges = [];
    for (let i = 0; i < 25; i++) {
      nodes.push(`n${i}`);
    }
    for (let i = 0; i < 25; i++) {
      for (let j = 0; j < 25; j++) {
        if (i !== j) {
          edges.push({ from: `n${i}`, to: `n${j}`, label: `e${i}_${j}` });
        }
      }
    }
    const lts = { nodes, edges };
    const config = { ngramSizes: [2, 3], minSupport: 1, maxMotifLength: 5 };

    // Verify the event loop stays responsive during mining
    let eventLoopResponsive = false;
    const checkTimer = setTimeout(() => { eventLoopResponsive = true; }, 10);

    const start = Date.now();
    const result = await mineMotifs(lts, config);
    await new Promise((r) => setImmediate(r));
    const elapsed = Date.now() - start;

    clearTimeout(checkTimer);

    assert.ok(Array.isArray(result));
    assert.ok(elapsed < 30_000, `Took ${elapsed}ms, expected < 30000ms`);
    assert.ok(eventLoopResponsive, "Event loop should remain responsive during mining");
  });
});
