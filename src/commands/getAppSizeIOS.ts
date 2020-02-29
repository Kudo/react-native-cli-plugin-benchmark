/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import child_process from 'child_process';
import {build} from './common/buildIOS';
import {Config} from '@react-native-community/cli-types';
import {logger} from '@react-native-community/cli-tools';

type Options = {
  sdk: string;
  configuration: string;
  scheme?: string;
  projectPath: string;
  verbose: boolean;
};

async function getAppSize(_argv: Array<string>, ctx: Config, args: Options) {
  const appPath = await build(ctx, args);

  const size = Number(
    child_process
      .execFileSync('du', ['-s', appPath], {
        encoding: 'utf8',
      })
      .split('\t')[0],
  );

  logger.info(`Generated app size:\n${JSON.stringify({[appPath]: size})}`);
}

export default {
  name: 'get-appsize-ios',
  description: 'get the generated IPA size from run-ios output',
  func: getAppSize,
  options: [
    {
      name: '--sdk [string]',
      description:
        'Setup SDK to build the code, e.g. "iphoneos" or "iphonesimulator"',
      default: 'iphonesimulator',
    },
    {
      name: '--configuration [string]',
      description: 'Explicitly set the scheme configuration to use',
      default: 'Debug',
    },
    {
      name: '--scheme [string]',
      description: 'Explicitly set Xcode scheme to use',
    },
    {
      name: '--project-path [string]',
      description:
        'Path relative to project root where the Xcode project ' +
        '(.xcodeproj) lives.',
      default: 'ios',
    },
    {
      name: '--verbose',
      description: 'Show build log',
    },
  ],
};
