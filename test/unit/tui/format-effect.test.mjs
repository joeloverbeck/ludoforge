import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatEffect } from "../../../src/tui/utils/format-effect.js";

describe("formatEffect", () => {
  it("formats set effect", () => {
    assert.equal(
      formatEffect({ kind: "set", target: { kind: "var", id: "score" }, value: 10 }),
      "score = 10",
    );
  });

  it("formats inc effect with explicit amount", () => {
    assert.equal(
      formatEffect({ kind: "inc", target: { kind: "var", id: "energy" }, amount: 3 }),
      "energy +3",
    );
  });

  it("formats inc effect with default amount", () => {
    assert.equal(
      formatEffect({ kind: "inc", target: { kind: "var", id: "energy" } }),
      "energy +1",
    );
  });

  it("formats dec effect", () => {
    assert.equal(
      formatEffect({ kind: "dec", target: { kind: "var", id: "health" }, amount: 2 }),
      "health -2",
    );
  });

  it("formats dec effect with default amount", () => {
    assert.equal(
      formatEffect({ kind: "dec", target: { kind: "var", id: "health" } }),
      "health -1",
    );
  });

  it("formats spawn effect", () => {
    assert.equal(
      formatEffect({ kind: "spawn", target: { kind: "token", id: "warrior" }, toZone: "barracks" }),
      "spawn warrior in barracks",
    );
  });

  it("formats move effect with toZone", () => {
    assert.equal(
      formatEffect({ kind: "move", target: { kind: "token", id: "t1" }, toZone: "field" }),
      "move t1 to field",
    );
  });

  it("formats move effect with toPlayer", () => {
    assert.equal(
      formatEffect({ kind: "move", target: { kind: "token", id: "card" }, toPlayer: "opponent" }),
      "move card to opponent",
    );
  });

  it("formats destroy effect", () => {
    assert.equal(
      formatEffect({ kind: "destroy", target: { kind: "token", id: "t1" } }),
      "destroy t1",
    );
  });

  it("formats reveal effect", () => {
    assert.equal(
      formatEffect({ kind: "reveal", target: { kind: "token", id: "t2" } }),
      "reveal t2",
    );
  });

  it("formats hide effect", () => {
    assert.equal(
      formatEffect({ kind: "hide", target: { kind: "token", id: "t3" } }),
      "hide t3",
    );
  });

  it("formats move_spatial effect", () => {
    assert.equal(
      formatEffect({
        kind: "move_spatial",
        target: { kind: "token", id: "knight" },
        zone: "board",
        toNode: "castle",
      }),
      "move_spatial knight in board to castle",
    );
  });

  it("formats move_spatial effect without toNode", () => {
    assert.equal(
      formatEffect({
        kind: "move_spatial",
        target: { kind: "token", id: "knight" },
        zone: "board",
      }),
      "move_spatial knight in board",
    );
  });

  it("formats shuffle effect", () => {
    assert.equal(
      formatEffect({ kind: "shuffle", target: { kind: "zone", id: "deck" } }),
      "shuffle deck",
    );
  });

  it("formats conditional effect", () => {
    assert.equal(
      formatEffect({
        kind: "conditional",
        condition: { kind: "value", value: true },
        then: [{ kind: "inc", target: { kind: "var", id: "x" } }],
      }),
      "if met: 1 effects",
    );
  });

  it("formats repeat effect", () => {
    assert.equal(
      formatEffect({
        kind: "repeat",
        count: 3,
        effects: [
          { kind: "inc", target: { kind: "var", id: "x" } },
          { kind: "dec", target: { kind: "var", id: "y" } },
        ],
      }),
      "repeat \u00d73: 2 effects",
    );
  });

  it("formats rng_choose effect", () => {
    assert.equal(
      formatEffect({
        kind: "rng_choose",
        options: [
          [{ kind: "inc", target: { kind: "var", id: "x" } }],
          [{ kind: "dec", target: { kind: "var", id: "y" } }],
        ],
      }),
      "random: 2 options",
    );
  });

  it("formats queue_push effect", () => {
    assert.equal(
      formatEffect({ kind: "queue_push", target: { kind: "token", id: "card" }, toZone: "discard" }),
      "queue_push card to discard",
    );
  });

  it("formats queue_pop effect with toZone", () => {
    assert.equal(
      formatEffect({ kind: "queue_pop", fromZone: "deck", toZone: "hand" }),
      "queue_pop from deck to hand",
    );
  });

  it("formats queue_pop effect without toZone", () => {
    assert.equal(
      formatEffect({ kind: "queue_pop", fromZone: "deck" }),
      "queue_pop from deck",
    );
  });

  it("formats set_flag effect with duration", () => {
    assert.equal(
      formatEffect({
        kind: "set_flag",
        target: { kind: "token", id: "warrior" },
        flag: "stunned",
        duration: "turn",
      }),
      "set_flag stunned on warrior (turn)",
    );
  });

  it("formats set_flag effect without duration", () => {
    assert.equal(
      formatEffect({
        kind: "set_flag",
        target: { kind: "token", id: "warrior" },
        flag: "active",
      }),
      "set_flag active on warrior",
    );
  });

  it("formats set_turn_order effect", () => {
    assert.equal(
      formatEffect({ kind: "set_turn_order", order: "by_variable", variable: "speed", direction: "desc" }),
      "set_turn_order by speed desc",
    );
  });

  it("handles unknown effect kind gracefully", () => {
    const result = formatEffect({ kind: "future_kind" });
    assert.ok(result.includes("unknown effect"));
  });
});
