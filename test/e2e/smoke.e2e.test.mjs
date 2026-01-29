import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("smoke", () => {
  it("e2e runner executes a basic smoke test", () => {
    assert.equal(typeof process.pid, "number");
  });
});
