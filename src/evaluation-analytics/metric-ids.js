import { readFileSync } from "node:fs";

const metricIdsPath = new URL(
  "../../schemas/shared/metric-id.schema.json",
  import.meta.url,
).pathname;

/** @type {readonly string[]} */
export const METRIC_IDS = Object.freeze(
  JSON.parse(readFileSync(metricIdsPath, "utf8")).enum,
);
