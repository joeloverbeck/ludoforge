import { listLegalActions } from "../game-kernel/actions.js";
import { promptForAction } from "./prompt.js";

export async function runHumanTurn({ definition, state, context = {}, io, promptLabel }) {
  const legalActions = listLegalActions(definition, state, context);
  return promptForAction({ legalActions, io, promptLabel });
}
