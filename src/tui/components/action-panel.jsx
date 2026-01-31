import React from "react";
import { Box, Text } from "ink";
import { ActionList } from "./action-list.jsx";
import { TargetList } from "./target-list.jsx";

/**
 * Wrapper: shows ActionList during human turns, TargetList when picking params,
 * or a passive AI display when it's an AI turn.
 *
 * @param {{
 *   isHumanTurn: boolean,
 *   legalActions: Array<object>,
 *   selectedActionIndex: number,
 *   targetOptions: { paramId: string, candidates: Array<{ value: string|number, label: string }> } | null,
 *   selectedTargetIndex: number,
 *   lastAIAction: { playerId: number|string, actionId: string } | null,
 *   onMoveCursor: (delta: number) => void,
 *   onConfirmAction: (action: object) => void,
 *   onConfirmTarget: (value: string|number) => void,
 *   onCancelTarget: () => void,
 * }} props
 */
export function ActionPanel({
  isHumanTurn,
  legalActions,
  selectedActionIndex,
  targetOptions,
  selectedTargetIndex,
  lastAIAction,
  onMoveCursor,
  onConfirmAction,
  onConfirmTarget,
  onCancelTarget,
}) {
  if (!isHumanTurn) {
    return (
      <Box flexDirection="column" flexGrow={1} borderStyle="single" paddingX={1}>
        {lastAIAction ? (
          <Text>
            <Text dimColor>AI (P{lastAIAction.playerId}):</Text>{" "}
            <Text>{lastAIAction.actionId}</Text>
          </Text>
        ) : (
          <Text dimColor>Waiting for AI...</Text>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1} borderStyle="single" paddingX={1}>
      {targetOptions ? (
        <TargetList
          paramId={targetOptions.paramId}
          candidates={targetOptions.candidates}
          selectedIndex={selectedTargetIndex}
          onMove={onMoveCursor}
          onConfirm={onConfirmTarget}
          onCancel={onCancelTarget}
        />
      ) : (
        <ActionList
          legalActions={legalActions}
          selectedIndex={selectedActionIndex}
          onMove={onMoveCursor}
          onConfirm={onConfirmAction}
        />
      )}
    </Box>
  );
}
