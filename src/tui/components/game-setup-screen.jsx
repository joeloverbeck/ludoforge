import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { playerColor } from "../utils/color-scheme.js";

const PLAYER_TYPES = ["human", "random", "greedy"];

/**
 * Setup screen: lets the user assign each player slot to Human / AI Random / AI Greedy.
 * Navigation: j/k within a slot, Tab to next slot, Shift+Tab to prev slot, s to start.
 *
 * @param {{
 *   definition: object,
 *   playerAssignments: Array<{ playerId: number, type: string }>,
 *   onAssign: (playerId: number, type: string) => void,
 *   onStart: () => void,
 * }} props
 */
export function GameSetupScreen({ definition, playerAssignments, onAssign, onStart }) {
  const [activeSlot, setActiveSlot] = useState(0);
  const slotCount = playerAssignments.length;

  useInput((input, key) => {
    if (input === "s") {
      onStart();
      return;
    }

    if (key.tab) {
      if (key.shift) {
        setActiveSlot((prev) => (prev - 1 + slotCount) % slotCount);
      } else {
        setActiveSlot((prev) => (prev + 1) % slotCount);
      }
      return;
    }

    if (input === "j" || key.downArrow) {
      cycleType(1);
      return;
    }
    if (input === "k" || key.upArrow) {
      cycleType(-1);
      return;
    }
  });

  function cycleType(delta) {
    const assignment = playerAssignments[activeSlot];
    if (!assignment) return;
    const currentIdx = PLAYER_TYPES.indexOf(assignment.type);
    const nextIdx = (currentIdx + delta + PLAYER_TYPES.length) % PLAYER_TYPES.length;
    onAssign(assignment.playerId, PLAYER_TYPES[nextIdx]);
  }

  const gameName = definition.id ?? definition.name ?? "Game";

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Box borderStyle="double" flexDirection="column" paddingX={2} paddingY={1}>
        <Text bold>GAME: {gameName}</Text>
        <Text>Players: {slotCount}</Text>
        <Text> </Text>

        {playerAssignments.map((a, idx) => (
          <Box key={a.playerId} flexDirection="column" marginBottom={1}>
            <Text bold color={playerColor(a.playerId - 1)}>
              Player {a.playerId}:
            </Text>
            {PLAYER_TYPES.map((t) => {
              const isSelected = a.type === t;
              const isActiveRow = idx === activeSlot;
              const cursor = isActiveRow && isSelected ? "> " : "  ";
              return (
                <Text
                  key={t}
                  bold={isSelected}
                  inverse={isActiveRow && isSelected}
                >
                  {cursor}{formatTypeLabel(t)}
                </Text>
              );
            })}
          </Box>
        ))}

        <Text> </Text>
        <Text dimColor>[j/k] navigate  [Tab] next player  [s] start game</Text>
      </Box>
    </Box>
  );
}

/** @param {string} type */
function formatTypeLabel(type) {
  switch (type) {
    case "human": return "Human";
    case "random": return "AI (Random)";
    case "greedy": return "AI (Greedy)";
    default: return type;
  }
}
