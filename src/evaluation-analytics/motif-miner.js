/**
 * Mines recurring edge-label n-gram patterns (motifs) from a Labelled Transition System.
 * @module evaluation-analytics/motif-miner
 */

/**
 * Build an adjacency list from sorted LTS edges.
 * @param {Array<{ from: string, to: string, label: string }>} edges
 * @returns {Map<string, Array<{ to: string, label: string }>>}
 */
function buildAdjacency(edges) {
  const adj = new Map();
  for (const edge of edges) {
    if (!adj.has(edge.from)) {
      adj.set(edge.from, []);
    }
    adj.get(edge.from).push({ to: edge.to, label: edge.label });
  }
  return adj;
}

/**
 * Collect all contiguous n-grams of edge labels by walking every path
 * of length `n` in the LTS graph.
 *
 * @param {Map<string, Array<{ to: string, label: string }>>} adjacency
 * @param {string[]} nodes
 * @param {number} n
 * @returns {Map<string, Array<{ fromNode: string, path: string[] }>>}
 *   Map from signature → list of occurrences
 */
function collectNgrams(adjacency, nodes, n) {
  /** @type {Map<string, Array<{ fromNode: string, path: string[] }>>} */
  const occurrences = new Map();

  for (const startNode of nodes) {
    const outgoing = adjacency.get(startNode);
    if (!outgoing) {
      continue;
    }

    // BFS/DFS to enumerate all paths of exactly n edges starting from startNode
    /** @type {Array<{ node: string, labels: string[] }>} */
    const stack = outgoing.map((edge) => ({
      node: edge.to,
      labels: [edge.label],
    }));

    while (stack.length > 0) {
      const current = stack.pop();

      if (current.labels.length === n) {
        const signature = current.labels.join(" → ");
        if (!occurrences.has(signature)) {
          occurrences.set(signature, []);
        }
        occurrences.get(signature).push({
          fromNode: startNode,
          path: current.labels,
        });
        continue;
      }

      const nextEdges = adjacency.get(current.node);
      if (!nextEdges) {
        continue;
      }
      for (const edge of nextEdges) {
        stack.push({
          node: edge.to,
          labels: [...current.labels, edge.label],
        });
      }
    }
  }

  return occurrences;
}

/**
 * Mine recurring edge-label n-gram motifs from an LTS.
 *
 * @param {{ nodes: string[], edges: Array<{ from: string, to: string, label: string }> }} lts
 * @param {{ ngramSizes: number[], minSupport: number, maxMotifLength: number }} config
 * @returns {Array<{ signature: string, ngramSize: number, support: number, exampleOccurrences: Array<{ fromNode: string, path: string[] }> }>}
 */
export function mineMotifs(lts, config) {
  const { ngramSizes, minSupport, maxMotifLength } = config;
  const adjacency = buildAdjacency(lts.edges);

  /** @type {Array<{ signature: string, ngramSize: number, support: number, exampleOccurrences: Array<{ fromNode: string, path: string[] }> }>} */
  const motifs = [];

  for (const n of ngramSizes) {
    if (n > maxMotifLength) {
      continue;
    }

    const occurrences = collectNgrams(adjacency, lts.nodes, n);

    for (const [signature, examples] of occurrences) {
      if (examples.length < minSupport) {
        continue;
      }

      motifs.push({
        signature,
        ngramSize: n,
        support: examples.length,
        exampleOccurrences: examples,
      });
    }
  }

  motifs.sort((a, b) => {
    const supportDiff = b.support - a.support;
    if (supportDiff !== 0) {
      return supportDiff;
    }
    return a.signature.localeCompare(b.signature);
  });

  return motifs;
}
