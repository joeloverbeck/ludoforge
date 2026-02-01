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
 * Guards against hang on dense/cyclic graphs:
 * - maxStackSize caps DFS memory usage
 * - setImmediate yield every YIELD_INTERVAL iterations keeps event loop alive
 * - AbortSignal allows external cancellation (e.g. timeout)
 *
 * @param {Map<string, Array<{ to: string, label: string }>>} adjacency
 * @param {string[]} nodes
 * @param {number} n
 * @param {{ maxPaths?: number, maxStackSize?: number, signal?: AbortSignal | null }} [options]
 * @returns {Promise<Map<string, Array<{ fromNode: string, path: string[] }>>>}
 *   Map from signature → list of occurrences
 */
async function collectNgrams(adjacency, nodes, n, { maxPaths = 50_000, maxStackSize = 100_000, signal = null } = {}) {
  /** @type {Map<string, Array<{ fromNode: string, path: string[] }>>} */
  const occurrences = new Map();
  let pathsExplored = 0;
  let iterations = 0;
  const YIELD_INTERVAL = 5_000;

  for (const startNode of nodes) {
    if (pathsExplored >= maxPaths || signal?.aborted) {
      break;
    }

    const outgoing = adjacency.get(startNode);
    if (!outgoing) {
      continue;
    }

    // DFS to enumerate all paths of exactly n edges starting from startNode
    /** @type {Array<{ node: string, labels: string[] }>} */
    const stack = outgoing.map((edge) => ({
      node: edge.to,
      labels: [edge.label],
    }));

    while (stack.length > 0) {
      if (pathsExplored >= maxPaths || stack.length > maxStackSize || signal?.aborted) {
        break;
      }

      iterations++;
      if (iterations % YIELD_INTERVAL === 0) {
        await new Promise((r) => setImmediate(r));
      }

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
        pathsExplored++;
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
 * @param {{ signal?: AbortSignal | null }} [options]
 * @returns {Promise<Array<{ signature: string, ngramSize: number, support: number, exampleOccurrences: Array<{ fromNode: string, path: string[] }> }>>}
 */
export async function mineMotifs(lts, config, { signal = null } = {}) {
  const { ngramSizes, minSupport, maxMotifLength } = config;
  const adjacency = buildAdjacency(lts.edges);

  /** @type {Array<{ signature: string, ngramSize: number, support: number, exampleOccurrences: Array<{ fromNode: string, path: string[] }> }>} */
  const motifs = [];

  for (const n of ngramSizes) {
    if (n > maxMotifLength || signal?.aborted) {
      continue;
    }

    const occurrences = await collectNgrams(adjacency, lts.nodes, n, { signal });

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
