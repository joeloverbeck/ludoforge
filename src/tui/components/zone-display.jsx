import React from "react";
import { Box, Text } from "ink";
import { TokenBadge } from "./token-badge.jsx";

/**
 * Render tokens for a flat token ID array.
 *
 * @param {{ tokenIds: string[], tokens: Record<string, { type: string }>, colorMap: Record<string, string>, hidden?: boolean }} props
 */
function TokenList({ tokenIds, tokens, colorMap, hidden }) {
  if (tokenIds.length === 0) {
    return <Text dimColor>(empty)</Text>;
  }
  return (
    <Box gap={1}>
      {tokenIds.map((tid) => {
        const token = tokens[tid];
        const type = token?.type ?? "?";
        return (
          <TokenBadge
            key={tid}
            tokenId={tid}
            tokenType={type}
            color={colorMap[type] ?? "white"}
            hidden={hidden}
          />
        );
      })}
    </Box>
  );
}

/**
 * Single zone display component.
 * Handles global, per-player, spatial, and empty zone variants.
 *
 * @param {{
 *   zone: object,
 *   zoneState: object,
 *   tokens: Record<string, { type: string }>,
 *   colorMap: Record<string, string>,
 *   playerAssignments?: Array<{ playerId: number, type: string }>,
 *   currentPlayerId?: number | null,
 *   isSpectator?: boolean,
 * }} props
 */
export function ZoneDisplay({
  zone,
  zoneState,
  tokens,
  colorMap,
  playerAssignments,
  currentPlayerId,
  isSpectator,
}) {
  const isPrivate = zone.visibility === "private";
  const spatial = zone.spatial;

  // Spatial zones: show tokens at node positions
  if (spatial?.nodes && Array.isArray(spatial.nodes)) {
    return (
      <Box flexDirection="column">
        <Text bold>[{zone.id}]</Text>
        {spatial.nodes.map((node) => {
          const nodeId = typeof node === "string" ? node : node.id;
          const allTokenIds = zoneState?.tokens ?? [];
          const nodeTokens = allTokenIds.filter((tid) => {
            const t = tokens[tid];
            return t?.location?.node === nodeId;
          });
          return (
            <Box key={nodeId} paddingLeft={2}>
              <Text>{nodeId}: </Text>
              {nodeTokens.length === 0 ? (
                <Text dimColor>(empty)</Text>
              ) : (
                <TokenList
                  tokenIds={nodeTokens}
                  tokens={tokens}
                  colorMap={colorMap}
                />
              )}
            </Box>
          );
        })}
      </Box>
    );
  }

  // Per-player zones: group by owner
  if (zoneState?.scope === "per_player" && zoneState.tokensByPlayer) {
    const players = playerAssignments ?? [];
    const entries = Object.entries(zoneState.tokensByPlayer);
    const allEmpty = entries.every(([, tIds]) => tIds.length === 0);

    if (allEmpty) {
      return (
        <Box>
          <Text>[{zone.id}] </Text>
          <Text dimColor>(empty)</Text>
        </Box>
      );
    }

    return (
      <Box flexDirection="column">
        <Text bold>[{zone.id}]</Text>
        {entries.map(([pid, tIds]) => {
          const pidNum = Number(pid);
          const assignment = players.find((a) => a.playerId === pidNum);
          const label = assignment
            ? `Player ${pidNum}`
            : `Player ${pidNum}`;
          const hideTokens =
            isPrivate && !isSpectator && pidNum !== currentPlayerId;
          return (
            <Box key={pid} paddingLeft={2}>
              <Text>{label}: </Text>
              {tIds.length === 0 ? (
                <Text dimColor>(empty)</Text>
              ) : (
                <TokenList
                  tokenIds={tIds}
                  tokens={tokens}
                  colorMap={colorMap}
                  hidden={hideTokens}
                />
              )}
            </Box>
          );
        })}
      </Box>
    );
  }

  // Global zones: flat token list
  const tokenIds = zoneState?.tokens ?? [];
  if (tokenIds.length === 0) {
    return (
      <Box>
        <Text>[{zone.id}] </Text>
        <Text dimColor>(empty)</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text>[{zone.id}] </Text>
      <TokenList tokenIds={tokenIds} tokens={tokens} colorMap={colorMap} />
    </Box>
  );
}
