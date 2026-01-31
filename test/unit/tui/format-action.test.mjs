import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatAction } from "../../../src/tui/utils/format-action.js";

describe("formatAction", () => {
  it("formats a simple action with just an id", () => {
    assert.equal(formatAction({ id: "deployWarrior", effects: [] }), "deployWarrior");
  });

  it("shows target names when action has targets", () => {
    const action = {
      id: "marchWarrior",
      effects: [],
      targets: [{ id: "unit", kind: "token", selector: {} }],
    };
    assert.equal(formatAction(action), "marchWarrior (select unit)");
  });

  it("shows multiple target names", () => {
    const action = {
      id: "trade",
      effects: [],
      targets: [
        { id: "source", kind: "token", selector: {} },
        { id: "dest", kind: "zone", selector: {} },
      ],
    };
    assert.equal(formatAction(action), "trade (select source, dest)");
  });

  it("shows costs when action has costs", () => {
    const action = {
      id: "heal",
      effects: [],
      costs: [{ kind: "dec", target: { kind: "var", id: "energy" }, amount: 1 }],
    };
    assert.equal(formatAction(action), "heal (cost: energy -1)");
  });

  it("shows both targets and costs", () => {
    const action = {
      id: "attack",
      effects: [],
      targets: [{ id: "enemy", kind: "token", selector: {} }],
      costs: [{ kind: "dec", target: { kind: "var", id: "mana" }, amount: 3 }],
    };
    assert.equal(formatAction(action), "attack (select enemy) (cost: mana -3)");
  });

  it("handles empty targets array as no-targets", () => {
    const action = { id: "pass", effects: [], targets: [] };
    assert.equal(formatAction(action), "pass");
  });

  it("handles empty costs array as no-costs", () => {
    const action = { id: "pass", effects: [], costs: [] };
    assert.equal(formatAction(action), "pass");
  });

  it("handles action with no targets or costs properties", () => {
    const action = { id: "skip", effects: [] };
    assert.equal(formatAction(action), "skip");
  });
});
