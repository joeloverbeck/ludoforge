import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Test the withTimeout helper behavior extracted from the runner module.
 * Since withTimeout is not exported, we replicate it here to verify the
 * contract: promise resolution, timeout, and cleanup.
 */

function withTimeout(promise, ms, label) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return promise;
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve({ __timedOut: true, label });
    }, ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

describe("withTimeout helper", () => {
  it("resolves with the value when promise completes before timeout", async () => {
    const result = await withTimeout(
      Promise.resolve({ data: 42 }),
      5000,
      "test",
    );
    assert.deepStrictEqual(result, { data: 42 });
  });

  it("resolves with __timedOut when promise exceeds timeout", async () => {
    const neverResolves = new Promise(() => {});
    const result = await withTimeout(neverResolves, 50, "slow-op");
    assert.deepStrictEqual(result, { __timedOut: true, label: "slow-op" });
  });

  it("returns the original promise when ms is not finite", async () => {
    const original = Promise.resolve("pass-through");
    const result = await withTimeout(original, NaN, "test");
    assert.equal(result, "pass-through");
  });

  it("returns the original promise when ms is zero", async () => {
    const original = Promise.resolve("pass-through");
    const result = await withTimeout(original, 0, "test");
    assert.equal(result, "pass-through");
  });

  it("propagates rejection from the wrapped promise", async () => {
    await assert.rejects(
      withTimeout(Promise.reject(new Error("boom")), 5000, "test"),
      { message: "boom" },
    );
  });
});
