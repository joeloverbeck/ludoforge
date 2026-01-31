import React from "react";
import { Box, Text, useInput } from "ink";

/**
 * Param candidate picker: displays candidates for the current param and
 * lets the user navigate and select one. Escape goes back to the action list.
 *
 * @param {{
 *   paramId: string,
 *   candidates: Array<{ value: string|number, label: string }>,
 *   selectedIndex: number,
 *   onMove: (delta: number) => void,
 *   onConfirm: (value: string|number) => void,
 *   onCancel: () => void,
 *   isFocused?: boolean,
 * }} props
 */
export function TargetList({ paramId, candidates, selectedIndex, onMove, onConfirm, onCancel, isFocused = true }) {
  useInput((input, key) => {
    if (!isFocused) return;

    if (key.escape) {
      onCancel();
      return;
    }
    if (input === "j" || key.downArrow) {
      onMove(1);
      return;
    }
    if (input === "k" || key.upArrow) {
      onMove(-1);
      return;
    }
    if (key.return) {
      const candidate = candidates[selectedIndex];
      if (candidate) {
        onConfirm(candidate.value);
      }
    }
  });

  if (candidates.length === 0) {
    return (
      <Box flexDirection="column">
        <Text dimColor>No candidates for {paramId}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold>Select {paramId}:</Text>
      {candidates.map((c, idx) => {
        const isSelected = idx === selectedIndex;
        const cursor = isSelected ? "> " : "  ";
        return (
          <Text key={String(c.value)} inverse={isSelected}>
            {cursor}{c.label}
          </Text>
        );
      })}
      <Text dimColor>[j/k] navigate  [Enter] select  [Esc] back</Text>
    </Box>
  );
}
