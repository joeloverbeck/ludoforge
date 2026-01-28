export function createIssueCollector() {
  const issues = [];
  const pushIssue = (path, message, rule) => {
    issues.push({ path, message, rule });
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
