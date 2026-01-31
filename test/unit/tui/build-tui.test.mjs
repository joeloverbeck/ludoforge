import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

describe("build:tui output", () => {
  it("produces dist/tui/ludoforge-play.js", () => {
    assert.ok(
      existsSync("dist/tui/ludoforge-play.js"),
      "dist/tui/ludoforge-play.js must exist after build:tui",
    );
  });

  it("dist/tui/ludoforge-play.js has shebang", () => {
    const content = readFileSync("dist/tui/ludoforge-play.js", "utf8");
    assert.ok(content.startsWith("#!/usr/bin/env node"), "should start with shebang");
  });

  it("dist/tui/ludoforge-play.js contains bundled parse-play-args logic", () => {
    const content = readFileSync("dist/tui/ludoforge-play.js", "utf8");
    assert.ok(
      content.includes("parsePlayArgs"),
      "should contain inlined parsePlayArgs function",
    );
  });

  it("dist/tui/ludoforge-play.js contains bundled app-reducer logic", () => {
    const content = readFileSync("dist/tui/ludoforge-play.js", "utf8");
    assert.ok(
      content.includes("appReducer"),
      "should contain inlined appReducer function",
    );
  });
});
