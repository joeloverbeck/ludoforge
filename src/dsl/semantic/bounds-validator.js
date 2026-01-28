export function validateIntBounds({ subject, path, initialPath }) {
  const issues = [];
  if (!subject || !subject.type || subject.type.kind !== "int") {
    return issues;
  }
  const { min, max } = subject.type;
  if (typeof min !== "number" || typeof max !== "number") {
    issues.push({
      path,
      message: "Int types must declare both min and max bounds",
      rule: "int-bounds",
    });
    return issues;
  }
  if (min > max) {
    issues.push({
      path,
      message: "Int bounds must satisfy min <= max",
      rule: "int-bounds",
    });
    return issues;
  }
  if (typeof initialPath === "string") {
    const initial = subject.initial;
    if (typeof initial !== "number") {
      issues.push({
        path: initialPath,
        message: "Int initial values must be numbers",
        rule: "int-initial-type",
      });
      return issues;
    }
    if (initial < min || initial > max) {
      issues.push({
        path: initialPath,
        message: "Int initial values must be within declared bounds",
        rule: "int-initial-bounds",
      });
    }
  }
  return issues;
}
