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

  it("produces dist/tui/parse-play-args.js", () => {
    assert.ok(
      existsSync("dist/tui/parse-play-args.js"),
      "dist/tui/parse-play-args.js must exist after build:tui",
    );
  });

  it("dist/tui/ludoforge-play.js has shebang", () => {
    const content = readFileSync("dist/tui/ludoforge-play.js", "utf8");
    assert.ok(content.startsWith("#!/usr/bin/env node"), "should start with shebang");
  });

  it("dist/tui/ludoforge-play.js imports parse-play-args", () => {
    const content = readFileSync("dist/tui/ludoforge-play.js", "utf8");
    assert.ok(
      content.includes("parse-play-args"),
      "should import parse-play-args module",
    );
  });
});
