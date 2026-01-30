import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateAgentSuites } from "../../../src/evaluation-analytics/agent-suite.js";

describe("agent-suite", () => {
  describe("validateAgentSuites", () => {
    it("accepts valid suites", () => {
      const suites = [
        {
          id: "random-only",
          agents: [{ kind: "random" }, { kind: "random" }],
          seedPolicy: "derive",
        },
        {
          id: "random-greedy",
          agents: [{ kind: "random" }, { kind: "greedy" }],
          seedPolicy: "derive",
        },
      ];

      const result = validateAgentSuites(suites);
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });

    it("accepts suite with fixed seed policy and seed", () => {
      const suites = [
        {
          id: "fixed-suite",
          agents: [{ kind: "random" }],
          seedPolicy: "fixed",
          seed: 42,
        },
      ];

      const result = validateAgentSuites(suites);
      assert.equal(result.valid, true);
    });

    it("rejects non-array input", () => {
      const result = validateAgentSuites("not-an-array");
      assert.equal(result.valid, false);
      assert.ok(result.errors.length > 0);
    });

    it("rejects suite with missing id", () => {
      const suites = [
        {
          agents: [{ kind: "random" }],
          seedPolicy: "derive",
        },
      ];

      const result = validateAgentSuites(suites);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes("id")));
    });

    it("rejects suite with empty id", () => {
      const suites = [
        {
          id: "",
          agents: [{ kind: "random" }],
          seedPolicy: "derive",
        },
      ];

      const result = validateAgentSuites(suites);
      assert.equal(result.valid, false);
    });

    it("rejects suite with empty agents array", () => {
      const suites = [
        {
          id: "empty-agents",
          agents: [],
          seedPolicy: "derive",
        },
      ];

      const result = validateAgentSuites(suites);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes("agents")));
    });

    it("rejects suite with invalid seedPolicy", () => {
      const suites = [
        {
          id: "bad-policy",
          agents: [{ kind: "random" }],
          seedPolicy: "invalid",
        },
      ];

      const result = validateAgentSuites(suites);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes("seedPolicy")));
    });

    it("rejects suite with fixed policy but no seed", () => {
      const suites = [
        {
          id: "no-seed",
          agents: [{ kind: "random" }],
          seedPolicy: "fixed",
        },
      ];

      const result = validateAgentSuites(suites);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes("seed")));
    });

    it("rejects duplicate suite ids", () => {
      const suites = [
        {
          id: "dupe",
          agents: [{ kind: "random" }],
          seedPolicy: "derive",
        },
        {
          id: "dupe",
          agents: [{ kind: "greedy" }],
          seedPolicy: "derive",
        },
      ];

      const result = validateAgentSuites(suites);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes("duplicate")));
    });

    it("rejects agent without kind", () => {
      const suites = [
        {
          id: "bad-agent",
          agents: [{ notKind: "random" }],
          seedPolicy: "derive",
        },
      ];

      const result = validateAgentSuites(suites);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes("kind")));
    });

    it("accepts suites with optional notes field", () => {
      const suites = [
        {
          id: "with-notes",
          agents: [{ kind: "random" }],
          seedPolicy: "derive",
          notes: "Baseline suite",
        },
      ];

      const result = validateAgentSuites(suites);
      assert.equal(result.valid, true);
    });
  });
});
