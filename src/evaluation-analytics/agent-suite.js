import { loadConfigFile } from "../config/loader.js";

/**
 * @typedef {object} AgentDescriptor
 * @property {string} kind
 * @property {object} [options]
 */

/**
 * @typedef {object} AgentSuite
 * @property {string} id
 * @property {AgentDescriptor[]} agents
 * @property {"derive"|"fixed"} seedPolicy
 * @property {number} [seed]
 * @property {string} [notes]
 */

/**
 * Validates an array of agent suites.
 * Returns { valid: boolean, errors: string[] }.
 *
 * @param {unknown} suites
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateAgentSuites(suites) {
  const errors = [];

  if (!Array.isArray(suites)) {
    return { valid: false, errors: ["Agent suites must be an array"] };
  }

  const seenIds = new Set();

  for (let i = 0; i < suites.length; i += 1) {
    const suite = suites[i];
    const prefix = `suites[${i}]`;

    if (!suite || typeof suite !== "object") {
      errors.push(`${prefix}: must be an object`);
      continue;
    }

    if (typeof suite.id !== "string" || suite.id.length === 0) {
      errors.push(`${prefix}.id: must be a non-empty string`);
    } else if (seenIds.has(suite.id)) {
      errors.push(`${prefix}.id: duplicate id "${suite.id}"`);
    } else {
      seenIds.add(suite.id);
    }

    if (!Array.isArray(suite.agents) || suite.agents.length === 0) {
      errors.push(`${prefix}.agents: must be a non-empty array`);
    } else {
      for (let j = 0; j < suite.agents.length; j += 1) {
        const agent = suite.agents[j];
        if (!agent || typeof agent !== "object") {
          errors.push(`${prefix}.agents[${j}]: must be an object`);
          continue;
        }
        if (typeof agent.kind !== "string" || agent.kind.length === 0) {
          errors.push(`${prefix}.agents[${j}].kind: must be a non-empty string`);
        }
      }
    }

    if (suite.seedPolicy !== "derive" && suite.seedPolicy !== "fixed") {
      errors.push(`${prefix}.seedPolicy: must be "derive" or "fixed"`);
    }

    if (suite.seedPolicy === "fixed" && !Number.isInteger(suite.seed)) {
      errors.push(`${prefix}.seed: must be an integer when seedPolicy is "fixed"`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Loads the default agent suites config from configs/agent-suites.json.
 *
 * @returns {Promise<AgentSuite[]>}
 */
async function loadDefaultAgentSuites() {
  const result = await loadConfigFile({ name: "agent-suites" });
  if (!result.valid) {
    throw new Error(
      `Agent suites config validation failed:\n${result.errors.map((e) => e.message ?? e).join("\n")}`
    );
  }
  return result.config?.suites ?? [];
}

export { validateAgentSuites, loadDefaultAgentSuites };
