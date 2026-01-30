/**
 * In-memory simulation run cache keyed by composite string key.
 * Scoped per evaluator invocation (not cross-genome).
 *
 * @returns {{ getOrRun: (key: string, runFn: () => any) => any }}
 */
function createRunCache() {
  const cache = new Map();

  function getOrRun(key, runFn) {
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = runFn();
    cache.set(key, result);
    return result;
  }

  return { getOrRun };
}

export { createRunCache };
