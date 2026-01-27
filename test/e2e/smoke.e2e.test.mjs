import { test } from "node:test";
import assert from "node:assert/strict";

test("e2e runner executes a basic smoke test", () => {
  assert.equal(typeof process.pid, "number");
});
