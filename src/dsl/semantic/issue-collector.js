export function createIssueCollector(options = {}) {
  const { classifySeverity } = options;
  const issues = [];
  const pushIssue = (path, message, rule, severity) => {
    const resolvedSeverity =
      severity ?? classifySeverity?.({ path, message, rule }) ?? "warning";
    issues.push({ path, message, rule, severity: resolvedSeverity });
  };
  return { issues, pushIssue };
}

export function joinPath(base, segment) {
  if (base === "") {
    return `/${segment}`;
  }
  return `${base}/${segment}`;
}

export function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}
