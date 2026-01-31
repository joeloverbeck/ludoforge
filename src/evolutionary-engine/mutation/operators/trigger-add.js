import { collectVariableTargets, collectTokenTypeTargets, collectZoneTargets } from "../targets.js";
import { buildRandomEffect } from "../effect-helpers.js";

const TRIGGER_EVENTS = [
  "start_turn",
  "end_turn",
  "start_phase",
  "end_phase",
  "start_round",
  "end_round",
  "after_action",
  "state_change",
  "threshold",
];

function buildThresholdCondition(definition, rng) {
  const variables = Array.isArray(definition?.state?.variables) ? definition.state.variables : [];
  const intVars = variables.filter((v) => v.type?.kind === "int");
  if (intVars.length === 0) return null;

  const varIdx = rng.nextInt(intVars.length);
  const variable = intVars[varIdx];
  const ops = [">=", "<=", ">", "<", "=="];
  const op = ops[rng.nextInt(ops.length)];
  const min = typeof variable.type.min === "number" ? variable.type.min : 0;
  const max = typeof variable.type.max === "number" ? variable.type.max : 10;
  const range = max - min;
  const value = range > 0 ? min + rng.nextInt(range) + 1 : min;

  return {
    kind: "cmp",
    op,
    left: { kind: "ref", ref: { kind: "var", id: variable.id } },
    right: { kind: "value", value },
  };
}

export const triggerAddMutation = {
  name: "trigger-add",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const variables = collectVariableTargets(definition);
    const tokenTypes = collectTokenTypeTargets(definition);
    const zones = collectZoneTargets(definition);

    if (variables.length === 0 && tokenTypes.length === 0 && zones.length === 0) {
      return { ...genome, definition };
    }

    const event = TRIGGER_EVENTS[rng.nextInt(TRIGGER_EVENTS.length)];
    const effectCount = 1 + rng.nextInt(2);
    const effects = [];
    for (let i = 0; i < effectCount; i++) {
      effects.push(buildRandomEffect(definition, rng));
    }

    const newTrigger = { event, effects };

    if (event === "threshold") {
      const condition = buildThresholdCondition(definition, rng);
      if (condition) {
        newTrigger.condition = condition;
      }
    }

    const existingTriggers = Array.isArray(definition.triggers)
      ? definition.triggers
      : [];
    definition.triggers = [...existingTriggers, newTrigger];

    return { ...genome, definition };
  },
};
