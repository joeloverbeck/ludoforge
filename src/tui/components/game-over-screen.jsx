import React from "react";
import { Box, Text } from "ink";
import { playerColor } from "../utils/color-scheme.js";

/**
 * Format a player outcome label (WIN / LOSE / DRAW / unknown).
 * @param {string} result
 * @returns {string}
 */
function outcomeLabel(result) {
  if (result === "win") return "WIN";
  if (result === "lose") return "LOSE";
  if (result === "draw") return "DRAW";
  return String(result).toUpperCase();
}

/**
 * Color for an outcome label.
 * @param {string} result
 * @returns {string}
 */
function outcomeColor(result) {
  if (result === "win") return "green";
  if (result === "lose") return "red";
  return "yellow";
}

/**
 * Game over screen showing per-player outcomes, scores, termination reason,
 * and turn count. Displays [q] quit and [r] replay controls.
 *
 * @param {{
 *   outcome: {
 *     outcomes?: Record<number, string>,
 *     scores?: Record<number, number>,
 *     terminationReason?: string,
 *     error?: string,
 *   } | null,
 *   playerAssignments: Array<{ playerId: number, type: string }>,
 *   gameState: object | null,
 *   showQuitConfirm: boolean,
 * }} props
 */
export function GameOverScreen({ outcome, playerAssignments, gameState, showQuitConfirm }) {
  const outcomes = outcome?.outcomes ?? {};
  const scores = outcome?.scores ?? {};
  const reason = outcome?.terminationReason ?? null;
  const error = outcome?.error ?? null;
  const turnCount = gameState?.turn?.turn ?? null;
  const hasScores = Object.keys(scores).length > 0;

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Box borderStyle="double" flexDirection="column" paddingX={2} paddingY={1}>
        <Text bold>GAME OVER</Text>
        <Text> </Text>

        {error && (
          <Text color="red">Error: {error}</Text>
        )}

        {playerAssignments.map((a) => {
          const result = outcomes[a.playerId];
          const typeLabel = a.type === "human" ? "Human" : `AI ${a.type}`;
          return (
            <Text key={a.playerId}>
              <Text color={playerColor(a.playerId - 1)}>Player {a.playerId}</Text>
              <Text> ({typeLabel}): </Text>
              {result
                ? <Text color={outcomeColor(result)} bold>{outcomeLabel(result)}</Text>
                : <Text dimColor>—</Text>
              }
            </Text>
          );
        })}

        {hasScores && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold>Final Scores:</Text>
            {playerAssignments.map((a) => {
              const score = scores[a.playerId];
              return (
                <Text key={`score-${a.playerId}`}>
                  {"  "}
                  <Text color={playerColor(a.playerId - 1)}>Player {a.playerId}</Text>
                  : {score ?? "—"}
                </Text>
              );
            })}
          </Box>
        )}

        <Text> </Text>

        {turnCount != null && (
          <Text dimColor>Ended: turn {turnCount}{reason ? `, ${reason}` : ""}</Text>
        )}
        {turnCount == null && reason && (
          <Text dimColor>Reason: {reason}</Text>
        )}

        <Text> </Text>

        {showQuitConfirm ? (
          <Text>Quit? <Text bold color="yellow">[y]</Text> yes  <Text bold>[n]</Text> cancel</Text>
        ) : (
          <Text dimColor>[q] quit  [r] replay</Text>
        )}
      </Box>
    </Box>
  );
}
