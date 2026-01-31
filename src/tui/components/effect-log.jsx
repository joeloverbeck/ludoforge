import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { scrollUp, scrollDown } from "../hooks/use-scroll.js";

const DEFAULT_VISIBLE_ROWS = 5;

/**
 * Scrollable effect log panel. Newest entries at bottom.
 * PgUp/PgDn scrolls the log.
 *
 * @param {{ effectLog: Array<{ turn: number, playerId: number | string, message: string }>, visibleRows?: number }} props
 */
export function EffectLog({ effectLog, visibleRows = DEFAULT_VISIBLE_ROWS }) {
  const [offset, setOffset] = useState(0);

  const total = effectLog.length;
  const maxOffset = Math.max(0, total - visibleRows);

  // Auto-scroll to bottom when new entries arrive
  const effectiveOffset = offset > maxOffset ? maxOffset : offset;

  // Keep pinned to bottom when already at bottom or when total <= visible
  const pinnedToBottom = total <= visibleRows || effectiveOffset >= maxOffset;

  useInput((_input, key) => {
    if (key.pageUp) {
      setOffset((prev) => scrollUp(prev, visibleRows));
    }
    if (key.pageDown) {
      setOffset((prev) => scrollDown(prev, visibleRows, maxOffset));
    }
  });

  // Auto-scroll to bottom when new entries appear and we were pinned
  React.useEffect(() => {
    if (pinnedToBottom) {
      setOffset(maxOffset);
    }
  }, [total, maxOffset, pinnedToBottom]);

  const visibleEntries = effectLog.slice(effectiveOffset, effectiveOffset + visibleRows);

  return (
    <Box
      flexGrow={1}
      flexDirection="column"
      borderStyle="single"
      paddingX={1}
    >
      <Text bold underline>EFFECT LOG</Text>
      {visibleEntries.length === 0 ? (
        <Text dimColor>(no effects yet)</Text>
      ) : (
        visibleEntries.map((entry, i) => (
          <Text key={effectiveOffset + i}>
            [T{entry.turn}] P{entry.playerId}: {entry.message}
          </Text>
        ))
      )}
      {total > visibleRows && (
        <Text dimColor>[scroll: PgUp/PgDn]</Text>
      )}
    </Box>
  );
}
