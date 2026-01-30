/**
 * Agent resolution and action selection/validation.
 * @module simulation-engine/agent-action
 */

import { validateActionChoice } from "../game-kernel/index.js";

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
 * Select an action via the agent and validate it against legal actions
 * and the game kernel's action validator.
 *
 * @param {{ agents: object[], definition: object, state: object, legalActions: object[], context: object, rng: object|undefined }} opts
 * @returns {object} The validated action object from the definition.
 * @throws {Error} If no agent is available, the selection is unknown, illegal, or invalid.
 */
export function selectAndValidateAction({ agents, definition, state, legalActions, context, rng }) {
  const agent = resolveAgent(agents, state);
  if (!agent || typeof agent.selectAction !== "function") {
    throw new Error("No agent available to select an action.");
  }

  const selection = agent.selectAction({
    definition,
    state,
    legalActions,
    context,
    rng,
  });
  const action =
    typeof selection === "string"
      ? definition.actions.find((candidate) => candidate.id === selection)
      : selection;
  if (!action) {
    throw new Error("Agent selected an unknown action.");
  }
  const isLegal = legalActions.some((candidate) => candidate.id === action.id);
  if (!isLegal) {
    throw new Error(`Agent selected illegal action: ${action.id}`);
  }
  const validation = validateActionChoice(definition, state, action.id, context);
  if (!validation.ok) {
    throw new Error(`Agent selected invalid action: ${validation.reason ?? "unknown"}`);
  }
  return action;
}
