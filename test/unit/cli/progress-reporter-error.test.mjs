import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createProgressReporter } from "../../../src/cli/create-progress-reporter.js";

describe("progress reporter onRunComplete with error", () => {
  it("includes error text in stderr output when halted with error", () => {
    const chunks = [];
    const originalWrite = process.stderr.write;
    process.stderr.write = (chunk) => {
      chunks.push(chunk);
      return true;
    };

    try {
      const reporter = createProgressReporter();
      reporter.onRunComplete({
        runId: "test-run",
        generationsCompleted: 3,
        halted: true,
        error: "simulated crash",
      });

      const output = chunks.join("");
      assert.ok(output.includes("halted"), "should indicate halted status");
      assert.ok(output.includes("3 generation(s)"), "should show generation count");
      assert.ok(output.includes("simulated crash"), "should include error text");
    } finally {
      process.stderr.write = originalWrite;
    }
  });

  it("does not append error text when no error provided", () => {
    const chunks = [];
    const originalWrite = process.stderr.write;
    process.stderr.write = (chunk) => {
      chunks.push(chunk);
      return true;
    };

    try {
      const reporter = createProgressReporter();
      reporter.onRunComplete({
        runId: "test-run",
        generationsCompleted: 5,
        halted: false,
      });

      const output = chunks.join("");
      assert.ok(output.includes("completed"), "should indicate completed status");
      assert.ok(output.includes("5 generation(s)"), "should show generation count");
      assert.ok(!output.includes("(undefined)"), "should not have error text");
    } finally {
      process.stderr.write = originalWrite;
    }
  });
});
