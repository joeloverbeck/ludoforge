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

export function stableStringify(value) {
  return JSON.stringify(canonicalize(value));
}

export function stringifyJsonl(records) {
  if (!records.length) {
    return "";
  }

  return `${records.map(stableStringify).join("\n")}\n`;
}

export function parseJsonl(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const records = [];

  for (const line of lines) {
    if (!line) {
      continue;
    }
    records.push(JSON.parse(line));
  }

  return records;
}
