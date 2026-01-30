export function applyShuffle(state, effect, context) {
  const zoneRef = effect.target;
  if (!zoneRef || zoneRef.kind !== "zone") {
    return { ok: false, reason: "missing-shuffle-params" };
  }
  const zone = state.zones?.[zoneRef.id];
  if (!zone) {
    return { ok: false, reason: "unknown-zone" };
  }
  const playerId = context.playerId;
  const tokens =
    zone.scope === "per_player" && playerId != null
      ? (zone.tokensByPlayer?.[playerId] ?? [])
      : (zone.tokens ?? []);

  if (tokens.length <= 1) {
    return { ok: true, appliedEffect: { kind: "shuffle", target: zoneRef, shuffled: false } };
  }

  const shuffled = [...tokens];
  const rng = context.rng;
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = rng?.nextInt
      ? rng.nextInt(i + 1)
      : Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }

  if (zone.scope === "per_player" && playerId != null) {
    zone.tokensByPlayer[playerId] = shuffled;
  } else {
    zone.tokens = shuffled;
  }

  return {
    ok: true,
    appliedEffect: { kind: "shuffle", target: zoneRef, shuffled: true },
  };
}
