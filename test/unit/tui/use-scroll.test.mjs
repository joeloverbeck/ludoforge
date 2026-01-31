import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createScrollState,
  scrollUp,
  scrollDown,
} from "../../../src/tui/hooks/use-scroll.js";

describe("createScrollState", () => {
  it("sets scrollOffset to max when total exceeds visible", () => {
    const s = createScrollState(20, 5);
    assert.equal(s.scrollOffset, 15);
    assert.equal(s.maxOffset, 15);
  });

  it("sets scrollOffset to 0 when total <= visible", () => {
    const s = createScrollState(3, 5);
    assert.equal(s.scrollOffset, 0);
    assert.equal(s.maxOffset, 0);
  });

  it("sets scrollOffset to 0 when total equals visible", () => {
    const s = createScrollState(5, 5);
    assert.equal(s.scrollOffset, 0);
    assert.equal(s.maxOffset, 0);
  });

  it("handles 0 total items", () => {
    const s = createScrollState(0, 5);
    assert.equal(s.scrollOffset, 0);
    assert.equal(s.maxOffset, 0);
  });
});

describe("scrollUp", () => {
  it("scrolls up by pageSize", () => {
    assert.equal(scrollUp(10, 5), 5);
  });

  it("clamps at 0", () => {
    assert.equal(scrollUp(3, 5), 0);
  });

  it("returns 0 when already at 0", () => {
    assert.equal(scrollUp(0, 5), 0);
  });
});

describe("scrollDown", () => {
  it("scrolls down by pageSize", () => {
    assert.equal(scrollDown(0, 5, 15), 5);
  });

  it("clamps at maxOffset", () => {
    assert.equal(scrollDown(12, 5, 15), 15);
  });

  it("returns maxOffset when already at maxOffset", () => {
    assert.equal(scrollDown(15, 5, 15), 15);
  });

  it("handles maxOffset of 0", () => {
    assert.equal(scrollDown(0, 5, 0), 0);
  });
});
