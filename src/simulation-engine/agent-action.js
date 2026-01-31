/**
 * Agent resolution and action selection/validation.
 * @module simulation-engine/agent-action
 */

import { validateActionChoice, resolveParamDomains, buildVariableIndex } from "../game-kernel/index.js";

/**
 * Resolve the agent for the current player.
 *
 * Looks up by id first, then by role, finally falls back to
 * positional index.
 *
 * @param {object[]} agents
 * @param {object} state
 * @returns {object|undefined}
 */
export function resolveAgent(agents, state) {
  const playerId = state.turn.currentPlayer;
  const agentById = agents.find((agent) => agent.id === playerId);
  if (agentById) {
    return agentById;
  }
  const role = state.agents.find((agent) => agent.id === playerId)?.role;
  if (role) {
    const agentByRole = agents.find((agent) => agent.role === role);
    if (agentByRole) {
      return agentByRole;
    }
  }
  return agents[playerId - 1] ?? agents[0];
}

/**
 * Build enriched legal moves with param domains for each legal action.
 *
 * @param {object} definition
 * @param {object} state
 * @param {object[]} legalActions
 * @param {object} context
 * @returns {Array<{ action: object, domains: Record<string, Array> }>}
 */
export function buildLegalMoves(definition, state, legalActions, context) {
  const variableIndex = buildVariableIndex(definition);
  return legalActions.map((action) => {
    const params = action.params ?? [];
    const domains = resolveParamDomains(params, state, {
      ...context,
      variableIndex,
    });
    return { action, domains };
  });
}

/**
 * Select an action via the agent and validate it against legal actions
 * and the game kernel's action validator.
 *
 * @param {{ agents: object[], definition: object, state: object, legalActions: object[], context: object, rng: object|undefined }} opts
 * @returns {{ action: object, args: Record<string, any> }} The validated action and its args.
 * @throws {Error} If no agent is available, the selection is unknown, illegal, or invalid.
 */
export async function selectAndValidateAction({ agents, definition, state, legalActions, context, rng }) {
  const agent = resolveAgent(agents, state);
  if (!agent || typeof agent.selectAction !== "function") {
    throw new Error("No agent available to select an action.");
  }

  const legalMoves = buildLegalMoves(definition, state, legalActions, context);

  const selection = await agent.selectAction({
    definition,
    state,
    legalActions,
    legalMoves,
    context,
    rng,
  });

  let action;
  let args;

  if (selection != null && typeof selection === "object" && "actionId" in selection) {
    action = definition.actions.find((candidate) => candidate.id === selection.actionId);
    args = selection.args ?? {};
  } else {
    action =
      typeof selection === "string"
        ? definition.actions.find((candidate) => candidate.id === selection)
        : selection;
    args = {};
  }

  if (!action) {
    throw new Error("Agent selected an unknown action.");
  }
  const isLegal = legalActions.some((candidate) => candidate.id === action.id);
  if (!isLegal) {
    throw new Error(`Agent selected illegal action: ${action.id}`);
  }

  const hasArgs = Object.keys(args).length > 0;
  const validation = validateActionChoice(
    definition,
    state,
    action.id,
    context,
    hasArgs ? { args } : {},
  );
  if (!validation.ok) {
    throw new Error(`Agent selected invalid action: ${validation.reason ?? "unknown"}`);
  }
  return { action, args };
}
