/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */
import glob from 'glob';
import path from 'path';
import execa from 'execa';
import chalk from 'chalk';
import fs from 'fs';
import {Config} from '@react-native-community/cli-types';
import {logger, CLIError} from '@react-native-community/cli-tools';
import warnAboutManuallyLinkedLibs from '@react-native-community/cli-platform-android/build/link/warnAboutManuallyLinkedLibs';

// Verifies this is an Android project
function checkAndroid(root: string): boolean {
  return fs.existsSync(path.join(root, 'android/gradlew'));
}

// Validates that the package name is correct
function validatePackageName(packageName: string): boolean {
  return /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(packageName);
}

function performChecks(config: Config, args: Options): void {
  if (!checkAndroid(args.root)) {
    throw new CLIError(
      'Android project not found. Are you sure this is a React Native project?',
    );
  }

  // warn after we have done basic system checks
  warnAboutManuallyLinkedLibs(config);
}

function buildApk(gradlew: string, clean = true, verbose = false): void {
  try {
    // using '-x lint' in order to ignore linting errors while building the apk
    const gradleArgs = ['build', '-x', 'lint'];
    if (clean) {
      gradleArgs.unshift('clean');
    }
    logger.info('Building the app...');
    logger.debug(`Running command "${gradlew} ${gradleArgs.join(' ')}"`);
    execa.sync(gradlew, gradleArgs, {stdio: verbose ? 'inherit' : 'ignore'});
  } catch (error) {
    throw new CLIError('Failed to build the app.', error);
  }
}

async function build(
  config: Config,
  args: Options,
  verbose = false,
): Promise<void> {
  performChecks(config, args);

  if (args.jetifier) {
    logger.info(
      `Running ${chalk.bold(
        'jetifier',
      )} to migrate libraries to AndroidX. ${chalk.dim(
        'You can disable it using "--no-jetifier" flag.',
      )}`,
    );

    try {
      await execa(require.resolve('jetifier/bin/jetify'), {
        stdio: verbose ? 'inherit' : 'ignore',
      });
    } catch (error) {
      throw new CLIError('Failed to run jetifier.', error);
    }
  }

  process.chdir(path.join(args.root, 'android'));
  const cmd = process.platform.startsWith('win') ? 'gradlew.bat' : './gradlew';

  // "app" is usually the default value for Android apps with only 1 app
  const {appFolder} = args;
  const androidManifest = fs.readFileSync(
    `${appFolder}/src/main/AndroidManifest.xml`,
    'utf8',
  );

  const packageNameMatchArray = androidManifest.match(/package="(.+?)"/);
  if (!packageNameMatchArray || packageNameMatchArray.length === 0) {
    throw new CLIError(
      `Failed to build the app: No package name found. Found errors in ${chalk.underline.dim(
        `${appFolder}/src/main/AndroidManifest.xml`,
      )}`,
    );
  }

  const packageName = packageNameMatchArray[1];

  if (!validatePackageName(packageName)) {
    logger.warn(
      `Invalid application's package name "${chalk.bgRed(
        packageName,
      )}" in 'AndroidManifest.xml'. Read guidelines for setting the package name here: ${chalk.underline.dim(
        'https://developer.android.com/studio/build/application-id',
      )}`,
    ); // we can also directly add the package naming rules here
  }

  buildApk(cmd);
}

export interface Options {
  tasks?: Array<string>;
  root: string;
  variant: string;
  appFolder: string;
  jetifier: boolean;
}

/**
 * Get generated APK size from as `run-android`
 */
async function getApkSize(
  _argv: Array<string>,
  config: Config,
  args: Options,
): Promise<{[apk: string]: number}> {
  await build(config, args);

  const {appFolder} = args;
  const variant = args.variant.toLowerCase();
  const buildDirectory = `${appFolder}/build/outputs/apk/${variant}`;
  const apks = glob.sync(path.join(buildDirectory, '**/*.apk'), {nodir: true});

  type ApkWithSizeType = {[apk: string]: number};
  const apksWithSize = apks.reduce((map: ApkWithSizeType, apk) => {
    const {size} = fs.statSync(apk);
    const apkPath = path.resolve(apk);
    map[apkPath] = size;
    return map;
  }, {});
  logger.info(`Generated app size:\n${JSON.stringify(apksWithSize)}`);
  return apksWithSize;
}

export default {
  name: 'get-appsize-android',
  description: 'get the generated APK size from run-android output',
  func: getApkSize,
  options: [
    {
      name: '--root [string]',
      description:
        'Override the root directory for the android build (which contains the android directory)',
      default: '',
    },
    {
      name: '--variant [string]',
      description: "Specify your app's build variant",
      default: 'debug',
    },
    {
      name: '--appFolder [string]',
      description:
        'Specify a different application folder name for the android source. If not, we assume is "app"',
      default: 'app',
    },
    {
      name: '--tasks [list]',
      description: 'Run custom Gradle tasks. By default it\'s "installDebug"',
      parse: (val: string): Array<string> => val.split(','),
    },
    {
      name: '--no-jetifier',
      description:
        'Do not run "jetifier" – the AndroidX transition tool. By default it runs before Gradle to ease working with libraries that don\'t support AndroidX yet. See more at: https://www.npmjs.com/package/jetifier.',
      default: false,
    },
    {
      name: '--verbose',
      description: 'Show build log',
      default: false,
    },
  ],
};
