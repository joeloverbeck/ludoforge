import React from "react";
import { Text } from "ink";

/**
 * Color-coded token display showing `id:type`.
 *
 * @param {{ tokenId: string, tokenType: string, color: string, hidden?: boolean }} props
 */
export function TokenBadge({ tokenId, tokenType, color, hidden }) {
  if (hidden) {
    return <Text dimColor>[hidden]</Text>;
  }
  return <Text color={color}>{tokenId}:{tokenType}</Text>;
}
