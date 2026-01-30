import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { createUsage } from "../../../src/cli/usage.js";

describe("createUsage", () => {
  it("returns string containing key flag names", () => {
    const usage = createUsage();
    assert.equal(typeof usage, "string");
    assert.ok(usage.includes("--config"));
    assert.ok(usage.includes("--seeds"));
    assert.ok(usage.includes("--resume"));
    assert.ok(usage.includes("--dry-run"));
    assert.ok(usage.includes("--help"));
    assert.ok(usage.includes("--run-id"));
    assert.ok(usage.includes("--out"));
  });
});
