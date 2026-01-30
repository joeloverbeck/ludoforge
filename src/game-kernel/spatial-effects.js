export function applyMoveSpatial(state, effect, context) {
  const tokenId = effect.target?.id;
  const zoneId = effect.zone;
  const toNode = effect.toNode;
  if (!tokenId || !zoneId || !toNode) {
    return { ok: false, reason: "missing-move-spatial-params" };
  }
  const resolvedId = context.bindings?.[tokenId] ?? tokenId;
  const token = state.tokens?.[resolvedId];
  if (!token) {
    return { ok: false, reason: "token-not-found" };
  }
  const zone = state.zones?.[zoneId];
  if (!zone?.spatial) {
    return { ok: false, reason: "zone-not-spatial" };
  }
  const currentNode = token.node;
  if (!currentNode) {
    return { ok: false, reason: "token-has-no-node" };
  }
  const edges = zone.spatial.edges ?? [];
  const isAdjacent = edges.some(
    (edge) =>
      (edge[0] === currentNode && edge[1] === toNode) ||
      (edge[1] === currentNode && edge[0] === toNode)
  );
  if (!isAdjacent) {
    return { ok: false, reason: "not-adjacent" };
  }
  token.node = toNode;
  return {
    ok: true,
    appliedEffect: {
      kind: "move_spatial",
      target: { kind: "token", id: tokenId },
      zone: zoneId,
      fromNode: currentNode,
      toNode,
      tokenId: resolvedId,
    },
  };
}
