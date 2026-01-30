export function applySetFlag(state, effect, context) {
  const targetRef = effect.target;
  const flag = effect.flag;
  const duration = effect.duration ?? "action";
  if (!targetRef || !flag) {
    return { ok: false, reason: "missing-flag-params" };
  }
  let entity;
  if (targetRef.kind === "token") {
    const resolvedId = context.bindings?.[targetRef.id] ?? targetRef.id;
    entity = state.tokens?.[resolvedId];
  } else if (targetRef.kind === "player") {
    const playerId = targetRef.id === "self" ? context.playerId : targetRef.id;
    entity = state.agents?.find((a) => String(a.id) === String(playerId));
  }
  if (!entity) {
    return { ok: false, reason: "entity-not-found" };
  }
  if (!entity.flags) {
    entity.flags = {};
  }
  entity.flags[flag] = { duration };
  return {
    ok: true,
    appliedEffect: {
      kind: "set_flag",
      target: targetRef,
      flag,
      duration,
    },
  };
}
