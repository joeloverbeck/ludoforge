import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const bundle = readFileSync("dist/tui/ludoforge-play.js", "utf8");

describe("action-panel build integration", () => {
  it("bundle contains ActionPanel component", () => {
    assert.ok(bundle.includes("ActionPanel"), "should contain ActionPanel");
  });

  it("bundle contains ActionList component", () => {
    assert.ok(bundle.includes("ActionList"), "should contain ActionList");
  });

  it("bundle contains TargetList component", () => {
    assert.ok(bundle.includes("TargetList"), "should contain TargetList");
  });

  it("bundle contains ACTIONS header text", () => {
    assert.ok(bundle.includes("ACTIONS"), "should contain ACTIONS header");
  });

  it("bundle contains formatAction import", () => {
    assert.ok(bundle.includes("formatAction"), "should contain formatAction");
  });

  it("bundle contains cursor navigation hint text", () => {
    assert.ok(
      bundle.includes("[j/k] navigate"),
      "should contain navigation hints",
    );
  });

  it("bundle contains Esc back hint for target list", () => {
    assert.ok(
      bundle.includes("[Esc] back"),
      "should contain escape-back hint",
    );
  });

  it("bundle contains AI display text", () => {
    assert.ok(
      bundle.includes("Waiting for AI"),
      "should contain AI waiting text",
    );
  });

  it("game-screen no longer contains placeholder text", () => {
    assert.ok(
      !bundle.includes("Actions (not yet implemented)"),
      "should not contain old placeholder text",
    );
  });
});
