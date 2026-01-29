export function clearFlags(state, duration) {
  for (const token of Object.values(state.tokens ?? {})) {
    if (token.flags) {
      for (const [key, value] of Object.entries(token.flags)) {
        if (value?.duration === duration) {
          delete token.flags[key];
        }
      }
    }
  }
  for (const agent of state.agents ?? []) {
    if (agent.flags) {
      for (const [key, value] of Object.entries(agent.flags)) {
        if (value?.duration === duration) {
          delete agent.flags[key];
        }
      }
    }
  }
}
