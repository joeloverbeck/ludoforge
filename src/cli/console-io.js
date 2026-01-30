import { createInterface } from "node:readline";

/**
 * @param {{ input?: import("node:stream").Readable, output?: import("node:stream").Writable }} [options]
 * @returns {{ io: import("../human-interface/prompt.js").HumanIO, close(): void }}
 */
export function createConsoleIO({ input, output } = {}) {
  const rl = createInterface({
    input: input ?? process.stdin,
    output: output ?? process.stdout,
  });

  /** @type {import("../human-interface/prompt.js").HumanIO} */
  const io = {
    readLine() {
      return new Promise((resolve) => {
        rl.question("", (answer) => {
          resolve(answer);
        });
      });
    },
    writeLine(line) {
      const out = output ?? process.stdout;
      out.write(`${line}\n`);
    },
  };

  return {
    io,
    close() {
      rl.close();
    },
  };
}
