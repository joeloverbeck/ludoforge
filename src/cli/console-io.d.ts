import type { HumanIO } from "../human-interface/prompt.js";

export interface ConsoleIOOptions {
  input?: { on(event: string, listener: (...args: unknown[]) => void): void };
  output?: { write(data: string): boolean };
}

export interface ConsoleIOResult {
  io: HumanIO;
  close(): void;
}

export function createConsoleIO(options?: ConsoleIOOptions): ConsoleIOResult;
