import React from "react";
import { Box, Text, useInput } from "ink";
import { formatAction } from "../utils/format-action.js";

/**
 * Cursor-selectable list of legal actions for a human player.
 *
 * j/k (or arrow keys) navigate, Enter confirms selection.
 *
 * @param {{
 *   legalActions: Array<object>,
 *   selectedIndex: number,
 *   onMove: (delta: number) => void,
 *   onConfirm: (action: object) => void,
 *   isFocused?: boolean,
 * }} props
 */
export function ActionList({ legalActions, selectedIndex, onMove, onConfirm, isFocused = true }) {
  useInput((input, key) => {
    if (!isFocused) return;

    if (input === "j" || key.downArrow) {
      onMove(1);
      return;
    }
    if (input === "k" || key.upArrow) {
      onMove(-1);
      return;
    }
    if (key.return) {
      const action = legalActions[selectedIndex];
      if (action) {
        onConfirm(action);
      }
    }
  });

  if (legalActions.length === 0) {
    return (
      <Box flexDirection="column">
        <Text dimColor>No actions available</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold>ACTIONS</Text>
      {legalActions.map((action, idx) => {
        const isSelected = idx === selectedIndex;
        const cursor = isSelected ? "> " : "  ";
        return (
          <Text key={action.id} inverse={isSelected}>
            {cursor}{formatAction(action)}
          </Text>
        );
      })}
      <Text dimColor>[j/k] navigate  [Enter] select</Text>
    </Box>
  );
}
