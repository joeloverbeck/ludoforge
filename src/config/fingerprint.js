import { createHash } from "node:crypto";

export function normalizeConfig(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeConfig(entry));
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, normalizeConfig(entry)]);
    return Object.fromEntries(entries);
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(normalizeConfig(value));
}

export function createConfigFingerprint(value) {
  const payload = stableStringify(value);
  const hash = createHash("sha256").update(payload).digest("hex");
  return `sha256:${hash}`;
}
