function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === "object") {
    const sorted = {};
    const keys = Object.keys(value).sort();
    for (const key of keys) {
      sorted[key] = canonicalize(value[key]);
    }
    return sorted;
  }

  return value;
}

export function serializeGameDefinition(definition) {
  return JSON.stringify(canonicalize(definition));
}
