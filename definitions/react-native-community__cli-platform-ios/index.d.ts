/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

declare module '@react-native-community/cli-platform-ios/build/commands/runIOS' {
  import {Config} from '@react-native-community/cli-types';

  type FlagsT = {
    simulator?: string;
    configuration: string;
    scheme?: string;
    projectPath: string;
    device?: string | true;
    udid?: string;
    packager: boolean;
    verbose: boolean;
    port: number;
    terminal: string | undefined;
  };

  function runIOS(
    _: Array<string>,
    ctx: Config,
    args: FlagsT,
  ): void | Promise<void>;

  export const _default: {
    name: string;
    description: string;
    func: typeof runIOS;
    examples: {
      desc: string;
      cmd: string;
    }[];
    options: (
      | {
          name: string;
          description: string;
          default: string;
          parse?: undefined;
        }
      | {
          name: string;
          description: string;
          default?: undefined;
          parse?: undefined;
        }
      | {
          name: string;
          default: string | number;
          parse: (val: string) => number;
          description?: undefined;
        }
      | {
          name: string;
          description: string;
          default: () => string | undefined;
          parse?: undefined;
        }
    )[];
  };

  export default _default;
}

declare module '@react-native-community/cli-platform-ios/build/commands/runIOS/findXcodeProject' {
  export type ProjectInfo = {
    name: string;
    isWorkspace: boolean;
  };
  function findXcodeProject(files: Array<string>): ProjectInfo | null;
  export default findXcodeProject;
}

declare module '@react-native-community/cli-platform-ios/build/link/warnAboutPodInstall' {
  import {Config} from '@react-native-community/cli-types';
  export default function warnAboutPodInstall(config: Config): void;
}

declare module '@react-native-community/cli-platform-ios/build/link/warnAboutManuallyLinkedLibs' {
  import {Config} from '@react-native-community/cli-types';
  export default function warnAboutManuallyLinkedLibs(
    config: Config,
    platform?: string,
    linkConfig?: ReturnType<Config['platforms']['ios']['linkConfig']>,
  ): void;
}
