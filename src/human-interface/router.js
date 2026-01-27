import { listLegalActions } from "../game-kernel/actions.js";
import { renderState } from "./renderer.js";
import { promptForAction } from "./prompt.js";

function resolveActionProvider(provider) {
  if (typeof provider === "function") {
    return provider;
  }
  if (provider && typeof provider.selectAction === "function") {
    return provider.selectAction.bind(provider);
  }
  throw new Error("AI participant requires an action provider.");
}

function resolveActionSelection(selection, legalActions) {
  if (!selection) {
    throw new Error("Action provider did not return a selection.");
  }
  const selectionId = typeof selection === "string" ? selection : selection.id;
  const resolved = legalActions.find((action) => action.id === selectionId);
  if (!resolved) {
    throw new Error("Action provider returned an illegal action.");
  }
  return resolved;
}

function resolvePromptLabel(participant) {
  if (participant.promptLabel) {
    return participant.promptLabel;
  }
  if (participant.name) {
    return `Choose action for ${participant.name}`;
  }
  return undefined;
}

export async function routeTurn({
  definition,
  state,
  previousState,
  context = {},
  participants,
} = {}) {
  if (!definition || !state) {
    throw new Error("Router requires a definition and state.");
  }
  if (!Array.isArray(participants) || participants.length === 0) {
    throw new Error("Router requires at least one participant.");
  }
  const activePlayerId = state.turn?.currentPlayer;
  if (activePlayerId === undefined || activePlayerId === null) {
    throw new Error("Router requires an active player.");
  }

  const participant = participants.find((entry) => entry.playerId === activePlayerId);
  if (!participant) {
    throw new Error(`No participant configured for player ${activePlayerId}.`);
  }

  const actionContext = {
    playerId: activePlayerId,
    phase: state.turn?.phase ?? null,
    ...context,
  };
  const legalActions = listLegalActions(definition, state, actionContext);
  if (!legalActions || legalActions.length === 0) {
    throw new Error("No legal actions available.");
  }

  if (participant.kind === "human") {
    if (!participant.io) {
      throw new Error("Human participant requires IO bindings.");
    }
    participant.io.writeLine(
      renderState({ state, previousState, viewerPlayerId: activePlayerId }),
    );
    const result = await promptForAction({
      legalActions,
      io: participant.io,
      promptLabel: resolvePromptLabel(participant),
    });
    return {
      action: result.action,
      index: result.index,
      participant,
      legalActions,
    };
  }

  const actionProvider = resolveActionProvider(participant.actionProvider);
  const selection = actionProvider({
    definition,
    state,
    legalActions,
    context: actionContext,
  });
  const action = resolveActionSelection(selection, legalActions);
  return {
    action,
    index: legalActions.findIndex((candidate) => candidate.id === action.id),
    participant,
    legalActions,
  };
}
