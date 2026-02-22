/**
 * Mock implementation of vscode module for testing
 */

export class Disposable {
  constructor(private callOnDispose: () => void) {}

  dispose(): void {
    this.callOnDispose();
  }
}

export const window = {
  showInformationMessage: (message: string) => Promise.resolve(message),
  showErrorMessage: (message: string) => Promise.resolve(message),
  showWarningMessage: (message: string) => Promise.resolve(message),
};

export const commands = {
  registerCommand: (command: string, callback: (...args: unknown[]) => unknown) => {
    return new Disposable(() => {});
  },
  executeCommand: (command: string, ...args: unknown[]) => Promise.resolve(),
};

export const workspace = {
  getConfiguration: () => ({
    get: (key: string) => undefined,
    update: (key: string, value: unknown) => Promise.resolve(),
  }),
};
