import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const bundle = readFileSync("dist/tui/ludoforge-play.js", "utf8");

describe("board-panel build integration", () => {
  it("bundle contains BoardPanel component", () => {
    assert.ok(bundle.includes("BoardPanel"), "should contain BoardPanel");
  });

  it("bundle contains ZoneDisplay component", () => {
    assert.ok(bundle.includes("ZoneDisplay"), "should contain ZoneDisplay");
  });

  it("bundle contains TokenBadge component", () => {
    assert.ok(bundle.includes("TokenBadge"), "should contain TokenBadge");
  });

  it("bundle contains EffectLog component", () => {
    assert.ok(bundle.includes("EffectLog"), "should contain EffectLog");
  });

  it("bundle contains scrollUp from use-scroll", () => {
    assert.ok(bundle.includes("scrollUp"), "should contain scrollUp");
  });

  it("bundle contains scrollDown from use-scroll", () => {
    assert.ok(bundle.includes("scrollDown"), "should contain scrollDown");
  });

  it("bundle contains EFFECT LOG header text", () => {
    assert.ok(bundle.includes("EFFECT LOG"), "should contain EFFECT LOG header");
  });

  it("bundle contains BOARD header text", () => {
    assert.ok(bundle.includes("BOARD"), "should contain BOARD header");
  });
});
