/**
 * Builds a Labelled Transition System (LTS) from simulation trajectory steps.
 * @module evaluation-analytics/lts-builder
 */

/**
 * Normalise a single applied effect into a canonical string fragment.
 * @param {object} effect
 * @returns {string}
 */
function normalizeEffect(effect) {
  const target = effect.target ?? {};
  let fragment = `${effect.kind}:${target.scope ?? ""}:${target.id ?? ""}:${effect.source ?? ""}`;
  if (effect.amount !== undefined) {
    fragment += `:amt=${effect.amount}`;
  }
  if (effect.value !== undefined) {
    fragment += `:val=${JSON.stringify(effect.value)}`;
  }
  return fragment;
}

/**
 * Produce a deterministic label string from an array of applied effects.
 * Empty effects yield `"pass"`.
 * @param {object[]} appliedEffects
 * @returns {string}
 */
export function canonicalLabel(appliedEffects) {
  if (appliedEffects.length === 0) {
    return "pass";
  }
  const fragments = appliedEffects.map(normalizeEffect);
  fragments.sort();
  return fragments.join(";");
}

/**
 * Build a Labelled Transition System from trajectory step arrays.
 *
 * Each element of `trajectories` is a `TrajectoryStep[]` (the `.steps`
 * array extracted from a simulation result trajectory).
 *
 * @param {object[][]} trajectories
 * @returns {{ nodes: string[], edges: Array<{ from: string, to: string, label: string }> }}
 */
export function buildLts(trajectories) {
  const nodeSet = new Set();
  const edgeSet = new Set();
  const edges = [];

  for (const stepArray of trajectories) {
    for (let i = 0; i < stepArray.length; i += 1) {
      const step = stepArray[i];
      if (!step.stateHash) {
        continue;
      }
      nodeSet.add(step.stateHash);

      const effects = step.appliedEffects ?? [];
      if (effects.length === 0) {
        const key = `${step.stateHash}\0${step.stateHash}\0pass`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({ from: step.stateHash, to: step.stateHash, label: "pass" });
        }
      } else if (i > 0 && stepArray[i - 1].stateHash) {
        const from = stepArray[i - 1].stateHash;
        const label = canonicalLabel(effects);
        const key = `${from}\0${step.stateHash}\0${label}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({ from, to: step.stateHash, label });
        }
      }
    }
  }

  const nodes = Array.from(nodeSet).sort();
  edges.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.label.localeCompare(b.label));

  return { nodes, edges };
}
