export class CLIError extends Error {
  /**
   * @param {string} message
   * @param {{ showUsage?: boolean, hint?: string }} [options]
   */
  constructor(message, { showUsage = false, hint = "" } = {}) {
    super(message);
    this.name = "CLIError";
    this.showUsage = showUsage;
    this.hint = hint;
  }
}
