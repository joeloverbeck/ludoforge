/**
 * Returns the set of neighbor nodes reachable from `node` respecting edge direction.
 * Edges are objects `{ from, to, direction? }`. Default direction is "both".
 * - "both": traversable in either direction
 * - "forward": traversable only from `from` to `to`
 * - "backward": traversable only from `to` to `from`
 * @param {Array<{from: string, to: string, direction?: string}>} edges
 * @param {string} node
 * @returns {string[]}
 */
function getNeighbors(edges, node) {
  const neighbors = [];
  for (const edge of edges) {
    const dir = edge.direction ?? "both";
    if (dir === "both") {
      if (edge.from === node) neighbors.push(edge.to);
      else if (edge.to === node) neighbors.push(edge.from);
    } else if (dir === "forward") {
      if (edge.from === node) neighbors.push(edge.to);
    } else if (dir === "backward") {
      if (edge.to === node) neighbors.push(edge.from);
    }
  }
  return neighbors;
}

/**
 * BFS from `startNode` to find all nodes reachable at exactly `distance` hops.
 * Returns the set of reachable node ids at that distance.
 * @param {Array<{from: string, to: string, direction?: string}>} edges
 * @param {string} startNode
 * @param {number} distance
 * @returns {Set<string>}
 */
function findNodesAtDistance(edges, startNode, distance) {
  let frontier = new Set([startNode]);
  const visited = new Set([startNode]);

  for (let hop = 0; hop < distance; hop++) {
    const nextFrontier = new Set();
    for (const node of frontier) {
      for (const neighbor of getNeighbors(edges, node)) {
        if (!visited.has(neighbor)) {
          nextFrontier.add(neighbor);
        }
      }
    }
    if (nextFrontier.size === 0) {
      return new Set();
    }
    for (const n of nextFrontier) {
      visited.add(n);
    }
    frontier = nextFrontier;
  }

  return frontier;
}

/**
 * BFS from `startNode` to `targetNode`. Returns true if reachable within `maxHops`.
 * @param {Array<{from: string, to: string, direction?: string}>} edges
 * @param {string} startNode
 * @param {string} targetNode
 * @param {number} maxHops
 * @returns {boolean}
 */
function isReachableWithin(edges, startNode, targetNode, maxHops) {
  if (startNode === targetNode) return maxHops >= 0;
  let frontier = new Set([startNode]);
  const visited = new Set([startNode]);

  for (let hop = 0; hop < maxHops; hop++) {
    const nextFrontier = new Set();
    for (const node of frontier) {
      for (const neighbor of getNeighbors(edges, node)) {
        if (neighbor === targetNode) return true;
        if (!visited.has(neighbor)) {
          nextFrontier.add(neighbor);
          visited.add(neighbor);
        }
      }
    }
    if (nextFrontier.size === 0) return false;
    frontier = nextFrontier;
  }

  return false;
}

export function applyMoveSpatial(state, effect, context) {
  const tokenId = effect.target?.id;
  const zoneId = effect.zone;
  const toNode = effect.toNode;
  const distance = effect.distance;

  if (!tokenId || !zoneId) {
    return { ok: false, reason: "missing-move-spatial-params" };
  }
  if (!toNode && !distance) {
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

  // Case 1: toNode specified, no distance (or distance=1) — adjacency check
  if (toNode && (!distance || distance === 1)) {
    const neighbors = getNeighbors(edges, currentNode);
    if (!neighbors.includes(toNode)) {
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

  // Case 2: toNode specified with distance > 1 — validate reachable within distance
  if (toNode && distance > 1) {
    if (!isReachableWithin(edges, currentNode, toNode, distance)) {
      return { ok: false, reason: "no-path" };
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
        distance,
        tokenId: resolvedId,
      },
    };
  }

  // Case 3: distance specified without toNode — move to any node at exactly that distance
  if (distance && !toNode) {
    const reachable = findNodesAtDistance(edges, currentNode, distance);
    if (reachable.size === 0) {
      return { ok: false, reason: "no-path" };
    }
    // Pick the first reachable node deterministically (sorted)
    const destination = [...reachable].sort()[0];
    token.node = destination;
    return {
      ok: true,
      appliedEffect: {
        kind: "move_spatial",
        target: { kind: "token", id: tokenId },
        zone: zoneId,
        fromNode: currentNode,
        toNode: destination,
        distance,
        tokenId: resolvedId,
      },
    };
  }

  return { ok: false, reason: "missing-move-spatial-params" };
}
