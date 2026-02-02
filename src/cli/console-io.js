import { createInterface } from "node:readline";

/**
 * @param {{ input?: import("node:stream").Readable, output?: import("node:stream").Writable }} [options]
 * @returns {{ io: import("../human-interface/prompt.js").HumanIO, close(): void }}
 */
export function createConsoleIO({ input, output } = {}) {
  const rl = createInterface({
    input: input ?? process.stdin,
    output: output ?? process.stderr,
  });

  // Forward SIGINT from readline to process (readline intercepts it by default)
  rl.on("SIGINT", () => {
    rl.close();
    process.kill(process.pid, "SIGINT");
  });

  /** @type {import("../human-interface/prompt.js").HumanIO} */
  const io = {
    readLine() {
      return new Promise((resolve, reject) => {
        const onClose = () => {
          reject(new Error("readline closed"));
        };
        rl.once("close", onClose);
        rl.question("", (answer) => {
          rl.removeListener("close", onClose);
          resolve(answer);
        });
      });
    },
    writeLine(line) {
      const out = output ?? process.stderr;
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
