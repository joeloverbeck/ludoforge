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
];

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

    const existingTriggers = Array.isArray(definition.triggers)
      ? definition.triggers
      : [];
    definition.triggers = [...existingTriggers, newTrigger];

    return { ...genome, definition };
  },
};
