/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import child_process, {ChildProcess} from 'child_process';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import {Config} from '@react-native-community/cli-types';
import findXcodeProject, {
  ProjectInfo,
} from '@react-native-community/cli-platform-ios/build/commands/runIOS/findXcodeProject';
import warnAboutManuallyLinkedLibs from '@react-native-community/cli-platform-ios/build/link/warnAboutManuallyLinkedLibs';
import warnAboutPodInstall from '@react-native-community/cli-platform-ios/build/link/warnAboutPodInstall';
import {logger, CLIError} from '@react-native-community/cli-tools';

type Options = {
  sdk: string;
  configuration: string;
  scheme?: string;
  projectPath: string;
  verbose: boolean;
};

async function getAppSize(_argv: Array<string>, ctx: Config, args: Options) {
  if (!fs.existsSync(args.projectPath)) {
    throw new CLIError(
      'iOS project folder not found. Are you sure this is a React Native project?',
    );
  }

  warnAboutManuallyLinkedLibs(ctx);
  warnAboutPodInstall(ctx);

  process.chdir(args.projectPath);

  const xcodeProject = findXcodeProject(fs.readdirSync('.'));
  if (!xcodeProject) {
    throw new CLIError(
      `Could not find Xcode project files in "${args.projectPath}" folder`,
    );
  }

  const inferredSchemeName = path.basename(
    xcodeProject.name,
    path.extname(xcodeProject.name),
  );
  const scheme = args.scheme || inferredSchemeName;

  logger.info(
    `Found Xcode ${
      xcodeProject.isWorkspace ? 'workspace' : 'project'
    } "${chalk.bold(xcodeProject.name)}"`,
  );

  const appName = await buildProject(xcodeProject, scheme, args);

  const appPath = getBuildPath(
    xcodeProject,
    args.configuration,
    appName,
    args.sdk,
    scheme,
  );

  const size = Number(
    child_process
      .execFileSync('du', ['-s', appPath], {
        encoding: 'utf8',
      })
      .split('\t')[0],
  );

  logger.info(`Generated app size:\n${JSON.stringify({[appPath]: size})}`);
}

function buildProject(
  xcodeProject: ProjectInfo,
  scheme: string,
  args: Options,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let extraArgs = [];

    if (args.sdk.startsWith('iphoneos')) {
      extraArgs.push(
        'CODE_SIGN_IDENTITY=""',
        'CODE_SIGNING_REQUIRED=NO',
        'CODE_SIGNING_ALLOWED=NO',
      );
    }

    const xcodebuildArgs = [
      xcodeProject.isWorkspace ? '-workspace' : '-project',
      xcodeProject.name,
      '-configuration',
      args.configuration,
      '-scheme',
      scheme,
      '-sdk',
      args.sdk,
      ...extraArgs,
    ];
    logger.info(
      `Building ${chalk.dim(
        `(using "xcodebuild ${xcodebuildArgs.join(' ')}")`,
      )}`,
    );
    let xcpretty: ChildProcess | any;
    if (args.verbose) {
      xcpretty =
        xcprettyAvailable() &&
        child_process.spawn('xcpretty', [], {
          stdio: ['pipe', process.stdout, process.stderr],
        });
    }
    const buildProcess = child_process.spawn(
      'xcodebuild',
      xcodebuildArgs,
      getProcessOptions(),
    );
    let buildOutput = '';
    let errorOutput = '';
    buildProcess.stdout.on('data', (data: Buffer) => {
      const stringData = data.toString();
      buildOutput += stringData;
      if (xcpretty) {
        xcpretty.stdin.write(data);
      } else {
        if (logger.isVerbose()) {
          logger.debug(stringData);
        } else if (args.verbose) {
          process.stdout.write('.');
        }
      }
    });
    buildProcess.stderr.on('data', (data: Buffer) => {
      errorOutput += data;
    });
    buildProcess.on('close', (code: number) => {
      if (xcpretty) {
        xcpretty.stdin.end();
      } else if (args.verbose) {
        process.stdout.write('\n');
      }
      if (code !== 0) {
        reject(
          new CLIError(
            `
            Failed to build iOS project.

            We ran "xcodebuild" command but it exited with error code ${code}. To debug build
            logs further, consider building your app with Xcode.app, by opening
            ${xcodeProject.name}.
          `,
            buildOutput + '\n' + errorOutput,
          ),
        );
        return;
      }
      resolve(getProductName(buildOutput) || scheme);
    });
  });
}

function getTargetBuildDir(buildSettings: string) {
  const targetBuildMatch = /TARGET_BUILD_DIR = (.+)$/m.exec(buildSettings);
  return targetBuildMatch && targetBuildMatch[1]
    ? targetBuildMatch[1].trim()
    : null;
}

function getBuildPath(
  xcodeProject: ProjectInfo,
  configuration: string,
  appName: string,
  sdk: string,
  scheme: string,
) {
  const buildSettings = child_process.execFileSync(
    'xcodebuild',
    [
      xcodeProject.isWorkspace ? '-workspace' : '-project',
      xcodeProject.name,
      '-scheme',
      scheme,
      '-sdk',
      sdk,
      '-configuration',
      configuration,
      '-showBuildSettings',
    ],
    {encoding: 'utf8'},
  );
  const targetBuildDir = getTargetBuildDir(buildSettings);
  if (!targetBuildDir) {
    throw new CLIError('Failed to get the target build directory.');
  }

  return `${targetBuildDir}/${appName}.app`;
}

function getProductName(buildOutput: string) {
  const productNameMatch = /export FULL_PRODUCT_NAME="?(.+).app"?$/m.exec(
    buildOutput,
  );
  return productNameMatch ? productNameMatch[1] : null;
}

function xcprettyAvailable() {
  try {
    child_process.execSync('xcpretty --version', {
      stdio: [0, 'pipe', 'ignore'],
    });
  } catch (error) {
    return false;
  }
  return true;
}

function getProcessOptions() {
  return {
    env: {
      ...process.env,
      RCT_NO_LAUNCH_PACKAGER: 'true',
    },
  };
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
