import assert from "node:assert/strict";

function toLines(output) {
  const chunks = Array.isArray(output) ? output : [output];
  return chunks
    .flatMap((chunk) => String(chunk).split("\n"))
    .map((line) => line.trimEnd());
}

function matches(line, expectation) {
  if (expectation instanceof RegExp) {
    return expectation.test(line);
  }
  return line.includes(String(expectation));
}

export function expectOutput(output, expectations, options = {}) {
  const lines = toLines(output);
  const ordered = options.ordered === true;

  if (ordered) {
    let cursor = 0;
    for (const expectation of expectations) {
      let found = false;
      for (; cursor < lines.length; cursor += 1) {
        if (matches(lines[cursor], expectation)) {
          found = true;
          cursor += 1;
          break;
        }
      }
      assert.ok(
        found,
        `Expected output to include ${String(expectation)} in order, but it was missing.`,
      );
    }
    return;
  }

  for (const expectation of expectations) {
    const found = lines.some((line) => matches(line, expectation));
    assert.ok(
      found,
      `Expected output to include ${String(expectation)}, but it was missing.`,
    );
  }
}
