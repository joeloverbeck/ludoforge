import { getRandomIndex, pickDifferentValue } from "../random.js";
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

/**
 * Sub-mutation: swap the trigger's event to a different one.
 */
function swapEvent(trigger, _definition, rng) {
  const newEvent = pickDifferentValue(TRIGGER_EVENTS, trigger.event, rng);
  return { ...trigger, event: newEvent };
}

/**
 * Sub-mutation: add a condition to a trigger that has none,
 * or remove the condition from a trigger that has one.
 */
function toggleCondition(trigger, definition, rng) {
  if (trigger.condition) {
    const { condition: _, ...rest } = trigger;
    return rest;
  }
  const condition = buildThresholdCondition(definition, rng);
  if (!condition) return trigger;
  return { ...trigger, condition };
}

/**
 * Sub-mutation: insert a new effect into the trigger's effects list.
 */
function insertEffect(trigger, definition, rng) {
  const effects = Array.isArray(trigger.effects) ? [...trigger.effects] : [];
  const newEffect = buildRandomEffect(definition, rng);
  effects.push(newEffect);
  return { ...trigger, effects };
}

/**
 * Sub-mutation: delete one effect from the trigger's effects list.
 * No-op if only one or zero effects remain.
 */
function deleteEffect(trigger, _definition, rng) {
  const effects = Array.isArray(trigger.effects) ? trigger.effects : [];
  if (effects.length <= 1) return trigger;
  const removeIdx = getRandomIndex(effects.length, rng);
  if (removeIdx < 0) return trigger;
  return { ...trigger, effects: effects.filter((_, i) => i !== removeIdx) };
}

/**
 * Sub-mutation: reorder effects by swapping two random positions.
 * No-op if fewer than 2 effects.
 */
function reorderEffects(trigger, _definition, rng) {
  const effects = Array.isArray(trigger.effects) ? trigger.effects : [];
  if (effects.length < 2) return trigger;
  const newEffects = [...effects];
  const idxA = getRandomIndex(newEffects.length, rng);
  let idxB = getRandomIndex(newEffects.length, rng);
  if (idxA === idxB) {
    idxB = (idxA + 1) % newEffects.length;
  }
  [newEffects[idxA], newEffects[idxB]] = [newEffects[idxB], newEffects[idxA]];
  return { ...trigger, effects: newEffects };
}

const SUB_MUTATIONS = [
  swapEvent,
  toggleCondition,
  insertEffect,
  deleteEffect,
  reorderEffects,
];

export const triggerEditMutation = {
  name: "trigger-edit",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const triggers = Array.isArray(definition.triggers) ? definition.triggers : [];
    if (triggers.length === 0) {
      return { ...genome, definition };
    }

    const triggerIdx = getRandomIndex(triggers.length, rng);
    if (triggerIdx < 0) return { ...genome, definition };

    const subMutationIdx = getRandomIndex(SUB_MUTATIONS.length, rng);
    const subMutation = SUB_MUTATIONS[Math.max(0, subMutationIdx)];

    const editedTrigger = subMutation(triggers[triggerIdx], definition, rng);
    definition.triggers = triggers.map((t, i) => (i === triggerIdx ? editedTrigger : t));

    return { ...genome, definition };
  },
};
