import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatAction } from "../../../src/tui/utils/format-action.js";

describe("formatAction", () => {
  it("formats a simple action with just an id", () => {
    assert.equal(formatAction({ id: "deployWarrior", effects: [] }), "deployWarrior");
  });

  it("shows param names when action has params", () => {
    const action = {
      id: "marchWarrior",
      effects: [],
      params: [{ id: "unit", kind: "token", domain: { selector: {} } }],
    };
    assert.equal(formatAction(action), "marchWarrior (select unit)");
  });

  it("shows multiple param names", () => {
    const action = {
      id: "trade",
      effects: [],
      params: [
        { id: "source", kind: "token", domain: { selector: {} } },
        { id: "dest", kind: "zone", domain: { values: [] } },
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

  it("shows both params and costs", () => {
    const action = {
      id: "attack",
      effects: [],
      params: [{ id: "enemy", kind: "token", domain: { selector: {} } }],
      costs: [{ kind: "dec", target: { kind: "var", id: "mana" }, amount: 3 }],
    };
    assert.equal(formatAction(action), "attack (select enemy) (cost: mana -3)");
  });

  it("handles empty params array as no-params", () => {
    const action = { id: "pass", effects: [], params: [] };
    assert.equal(formatAction(action), "pass");
  });

  it("handles empty costs array as no-costs", () => {
    const action = { id: "pass", effects: [], costs: [] };
    assert.equal(formatAction(action), "pass");
  });

  it("handles action with no params or costs properties", () => {
    const action = { id: "skip", effects: [] };
    assert.equal(formatAction(action), "skip");
  });
});
