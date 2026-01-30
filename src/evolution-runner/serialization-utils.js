export function serializeMapElites(mapElites) {
  if (!mapElites || typeof mapElites !== "object") {
    return mapElites;
  }

  const elites = mapElites.elites;
  const serializedElites =
    elites instanceof Map
      ? Array.from(elites.entries()).map(([nicheId, member]) => ({ nicheId, member }))
      : elites;

  return {
    ...mapElites,
    elites: serializedElites,
  };
}

export function defaultPreferenceModelSnapshot({ runId, generation, seed }) {
  const createdAt = new Date(generation * 1000).toISOString();
  return {
    id: `${runId}-pref-${generation}`,
    version: "v1",
    createdAt,
    ...(Number.isFinite(seed) ? { seed } : {}),
    trainingWindow: { size: 0 },
    hyperparams: {},
    metrics: {},
    models: [{ weights: {}, bias: 0, sampleCount: 0 }],
    ensemble: { size: 1, method: "online-bagging" },
  };
}

export function resolveSnapshotProvider(provider) {
  if (typeof provider === "function") {
    return provider;
  }
  if (Array.isArray(provider)) {
    return () => provider;
  }
  return null;
}

export function resolveFeedbackProvider(provider) {
  if (typeof provider === "function") {
    return provider;
  }
  if (Array.isArray(provider)) {
    return () => provider;
  }
  return null;
}
