import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { validateDescriptorKeys } from "../../../src/cli/validate-descriptor-keys.js";

describe("validateDescriptorKeys", () => {
  const available = ["agency", "variety", "strategic_depth"];

  it("returns valid when all IDs are known", () => {
    const result = validateDescriptorKeys(["agency", "variety"], available);

    assert.equal(result.valid, true);
    assert.deepEqual(result.unknownIds, []);
    assert.deepEqual(result.availableMetrics, available);
  });

  it("returns invalid with unknown IDs listed", () => {
    const result = validateDescriptorKeys(
      ["agency", "complexity", "randomness"],
      available,
    );

    assert.equal(result.valid, false);
    assert.deepEqual(result.unknownIds, ["complexity", "randomness"]);
  });

  it("returns invalid when all IDs are unknown", () => {
    const result = validateDescriptorKeys(["foo", "bar"], available);

    assert.equal(result.valid, false);
    assert.deepEqual(result.unknownIds, ["foo", "bar"]);
  });

  it("returns valid for empty descriptor list", () => {
    const result = validateDescriptorKeys([], available);

    assert.equal(result.valid, true);
    assert.deepEqual(result.unknownIds, []);
  });

  it("uses DEFAULT_FEATURE_ORDER when no availableMetrics supplied", () => {
    const result = validateDescriptorKeys(["agency", "variety"]);

    assert.equal(result.valid, true);
    assert.ok(result.availableMetrics.length > 0);
    assert.ok(result.availableMetrics.includes("agency"));
  });
});
