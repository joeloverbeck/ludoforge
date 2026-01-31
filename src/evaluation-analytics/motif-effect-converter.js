/**
 * Convert mined motifs to DSL-compatible effect sequences.
 * @module evaluation-analytics/motif-effect-converter
 */

import { canonicalLabel } from "./lts-builder.js";

/**
 * Build a Map from canonical label strings to their first-seen applied effects.
 *
 * @param {object[][]} trajectories - arrays of trajectory step objects
 * @returns {Map<string, object[]>}
 */
export function buildEffectMap(trajectories) {
  const effectMap = new Map();

  for (const stepArray of trajectories) {
    for (const step of stepArray) {
      const effects = step.appliedEffects;
      if (!Array.isArray(effects) || effects.length === 0) {
        continue;
      }
      const label = canonicalLabel(effects);
      if (!effectMap.has(label)) {
        effectMap.set(label, effects);
      }
    }
  }

  return effectMap;
}

const DSL_EFFECT_FIELDS = new Set([
  "kind",
  "target",
  "amount",
  "value",
  "toZone",
  "tokenType",
  "count",
  "condition",
  "then",
  "else",
]);

const DSL_TARGET_FIELDS = new Set(["kind", "id"]);

/**
 * Strip runtime-only fields from an applied effect, producing a DSL-compatible effect.
 *
 * @param {object} appliedEffect
 * @returns {object}
 */
export function toDslEffect(appliedEffect) {
  const result = {};

  for (const key of Object.keys(appliedEffect)) {
    if (!DSL_EFFECT_FIELDS.has(key)) {
      continue;
    }
    if (key === "target" && appliedEffect.target != null) {
      const cleanTarget = {};
      for (const tKey of Object.keys(appliedEffect.target)) {
        if (DSL_TARGET_FIELDS.has(tKey)) {
          cleanTarget[tKey] = appliedEffect.target[tKey];
        }
      }
      result.target = cleanTarget;
    } else {
      result[key] = appliedEffect[key];
    }
  }

  return result;
}

/**
 * Convert mined motifs to arrays of DSL effect sequences.
 *
 * Each motif has a `path` of canonical label strings. For each label in the
 * path, look up the corresponding applied effects in `effectMap`, convert
 * them to DSL effects via `toDslEffect`, and flatten into a single sequence.
 *
 * @param {Array<{ exampleOccurrences: Array<{ path: string[] }> }>} motifs
 * @param {Map<string, object[]>} effectMap
 * @returns {Array<object[]>} - array of effect sequences
 */
export function convertMotifsToEffects(motifs, effectMap) {
  const sequences = [];

  for (const motif of motifs) {
    const occurrences = motif.exampleOccurrences;
    if (!Array.isArray(occurrences) || occurrences.length === 0) {
      continue;
    }

    // Use the first occurrence's path as representative
    const path = occurrences[0].path;
    if (!Array.isArray(path) || path.length === 0) {
      continue;
    }

    const effectSequence = [];
    let allFound = true;

    for (const label of path) {
      const effects = effectMap.get(label);
      if (!effects) {
        allFound = false;
        break;
      }
      for (const effect of effects) {
        effectSequence.push(toDslEffect(effect));
      }
    }

    if (allFound && effectSequence.length > 0) {
      sequences.push(effectSequence);
    }
  }

  return sequences;
}
