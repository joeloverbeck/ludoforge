import { randomUUID } from "node:crypto";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";

const RUN_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isPathWithin(rootDir, targetPath) {
  const relativePath = relative(rootDir, targetPath);
  if (!relativePath) {
    return true;
  }

  if (relativePath === ".." || relativePath.startsWith(`..${sep}`)) {
    return false;
  }

  return true;
}

export function createRunId() {
  return randomUUID();
}

export function isValidRunId(runId) {
  return typeof runId === "string" && RUN_ID_PATTERN.test(runId);
}

export function assertValidRunId(runId) {
  if (!isValidRunId(runId)) {
    throw new Error(`Invalid run ID: ${runId}`);
  }
}

export function resolveRunsRoot(baseDir = process.cwd()) {
  return resolve(baseDir, "runs");
}

export function resolveRunDir(baseDir, runId) {
  assertValidRunId(runId);
  return resolve(resolveRunsRoot(baseDir), runId);
}

export function resolveRunPath(runDir, ...segments) {
  const root = resolve(runDir);
  const target = resolve(root, ...segments);

  if (!isPathWithin(root, target)) {
    throw new Error("Resolved path escapes run directory");
  }

  return target;
}

export async function writeRunMetadata(baseDir, runId, metadata = {}) {
  if (metadata === null || typeof metadata !== "object") {
    throw new Error("Run metadata must be an object");
  }

  const runDir = resolveRunDir(baseDir, runId);
  const filePath = resolveRunPath(runDir, "run.json");
  const payload = {
    ...metadata,
    runId,
    createdAt: metadata.createdAt ?? new Date().toISOString(),
  };

  await mkdir(runDir, { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  return filePath;
}

export async function listRuns(baseDir = process.cwd()) {
  const runsRoot = resolveRunsRoot(baseDir);
  let entries;
  try {
    entries = await readdir(runsRoot, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => isValidRunId(name))
    .sort((left, right) => left.localeCompare(right));
}
