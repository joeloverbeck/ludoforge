import React from "react";
import { Box } from "ink";
import { TurnHeader } from "./turn-header.jsx";
import { StatePanel } from "./state-panel.jsx";
import { BoardPanel } from "./board-panel.jsx";
import { EffectLog } from "./effect-log.jsx";
import { ActionPanel } from "./action-panel.jsx";

/**
 * Game screen shell: TurnHeader row + middle row (board | state panel) + bottom row (actions | effect log).
 *
 * @param {{
 *   gameState: object | null,
 *   definition: object | null,
 *   playerAssignments: Array<{ playerId: number, type: string }>,
 *   effectLog?: Array<{ turn: number, playerId: number | string, message: string }>,
 *   currentPlayerId?: number | null,
 *   isSpectator?: boolean,
 *   isHumanTurn?: boolean,
 *   legalActions?: Array<object>,
 *   selectedActionIndex?: number,
 *   targetOptions?: object | null,
 *   selectedTargetIndex?: number,
 *   lastAIAction?: object | null,
 *   onMoveCursor?: (delta: number) => void,
 *   onConfirmAction?: (action: object) => void,
 *   onConfirmTarget?: (value: string|number) => void,
 *   onCancelTarget?: () => void,
 * }} props
 */
export function GameScreen({
  gameState,
  definition,
  playerAssignments,
  effectLog = [],
  currentPlayerId,
  isSpectator,
  isHumanTurn = false,
  legalActions = [],
  selectedActionIndex = 0,
  targetOptions = null,
  selectedTargetIndex = 0,
  lastAIAction = null,
  onMoveCursor = () => {},
  onConfirmAction = () => {},
  onConfirmTarget = () => {},
  onCancelTarget = () => {},
}) {
  return (
    <Box flexDirection="column" width="100%" flexGrow={1}>
      <TurnHeader
        gameState={gameState}
        definition={definition}
        playerAssignments={playerAssignments}
      />

      <Box flexDirection="row" flexGrow={1}>
        <BoardPanel
          definition={definition}
          gameState={gameState}
          playerAssignments={playerAssignments}
          currentPlayerId={currentPlayerId}
          isSpectator={isSpectator}
        />

        <StatePanel
          gameState={gameState}
          definition={definition}
          playerAssignments={playerAssignments}
        />
      </Box>

      <Box flexDirection="row" height={8}>
        <ActionPanel
          isHumanTurn={isHumanTurn}
          legalActions={legalActions}
          selectedActionIndex={selectedActionIndex}
          targetOptions={targetOptions}
          selectedTargetIndex={selectedTargetIndex}
          lastAIAction={lastAIAction}
          onMoveCursor={onMoveCursor}
          onConfirmAction={onConfirmAction}
          onConfirmTarget={onConfirmTarget}
          onCancelTarget={onCancelTarget}
        />

        <EffectLog effectLog={effectLog} />
      </Box>
    </Box>
  );
}
