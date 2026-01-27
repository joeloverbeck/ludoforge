export function createMockHumanIo(inputs = []) {
  const script = [...inputs];
  const outputs = [];

  return {
    outputs,
    io: {
      async readLine() {
        if (script.length === 0) {
          throw new Error("Mock human IO has no scripted input remaining.");
        }
        return script.shift();
      },
      writeLine(line) {
        outputs.push(String(line));
      },
    },
  };
}
