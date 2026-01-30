import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createRunCache } from "../../../src/simulation-engine/run-cache.js";

describe("run-cache", () => {
  describe("createRunCache", () => {
    it("returns identical object reference on second call with same key", () => {
      const cache = createRunCache();
      const result1 = cache.getOrRun("key-a", () => ({ value: 42 }));
      const result2 = cache.getOrRun("key-a", () => ({ value: 99 }));
      assert.equal(result1, result2, "should return same object reference");
      assert.equal(result1.value, 42);
    });

    it("calls runFn exactly once per unique key", () => {
      const cache = createRunCache();
      let callCount = 0;
      const runFn = () => {
        callCount += 1;
        return callCount;
      };

      cache.getOrRun("key-a", runFn);
      cache.getOrRun("key-a", runFn);
      cache.getOrRun("key-a", runFn);

      assert.equal(callCount, 1, "runFn should be called exactly once");
    });

    it("different keys invoke runFn independently", () => {
      const cache = createRunCache();
      let callCount = 0;
      const runFn = () => {
        callCount += 1;
        return callCount;
      };

      const r1 = cache.getOrRun("key-a", runFn);
      const r2 = cache.getOrRun("key-b", runFn);

      assert.equal(callCount, 2, "runFn should be called once per unique key");
      assert.notEqual(r1, r2, "different keys should return different results");
    });

    it("returns the result of runFn", () => {
      const cache = createRunCache();
      const result = cache.getOrRun("key", () => "hello");
      assert.equal(result, "hello");
    });

    it("caches null and undefined return values", () => {
      const cache = createRunCache();
      let callCount = 0;

      cache.getOrRun("null-key", () => {
        callCount += 1;
        return null;
      });
      const result = cache.getOrRun("null-key", () => {
        callCount += 1;
        return "fallback";
      });

      assert.equal(callCount, 1);
      assert.equal(result, null);
    });
  });
});
