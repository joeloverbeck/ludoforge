export function diffVariables(prevVariables, nextVariables) {
  if (!prevVariables || !nextVariables) {
    return [];
  }
  const changes = [];
  const keys = new Set([...Object.keys(prevVariables), ...Object.keys(nextVariables)]);
  for (const key of keys) {
    if (prevVariables[key] !== nextVariables[key]) {
      changes.push({ key, from: prevVariables[key], to: nextVariables[key] });
    }
  }
  return changes;
}

export function diffZoneTokens(prevTokens, nextTokens) {
  const prevList = prevTokens ?? [];
  const nextList = nextTokens ?? [];
  const prevSet = new Set(prevList);
  const nextSet = new Set(nextList);
  const added = [];
  const removed = [];
  for (const tokenId of nextSet) {
    if (!prevSet.has(tokenId)) {
      added.push(tokenId);
    }
  }
  for (const tokenId of prevSet) {
    if (!nextSet.has(tokenId)) {
      removed.push(tokenId);
    }
  }
  return { added, removed };
}
