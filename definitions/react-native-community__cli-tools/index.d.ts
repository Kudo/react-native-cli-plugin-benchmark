/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

declare module '@react-native-community/cli-tools' {
  export const logger: {
    success: (...messages: string[]) => void;
    info: (...messages: string[]) => void;
    warn: (...messages: string[]) => void;
    error: (...messages: string[]) => void;
    debug: (...messages: string[]) => void;
    log: (...messages: string[]) => void;
    setVerbose: (level: boolean) => void;
    isVerbose: () => boolean;
    disable: () => void;
    enable: () => void;
  };

  export class CLIError extends Error {
    constructor(msg: string, originalError?: Error | string);
  }
}
