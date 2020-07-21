/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

declare module '@react-native-community/cli-platform-android/build/link/warnAboutManuallyLinkedLibs' {
  import {Config} from '@react-native-community/cli-types';
  export default function warnAboutManuallyLinkedLibs(
    config: Config,
    platform?: string,
    linkConfig?: ReturnType<Config['platforms']['android']['linkConfig']>,
  ): void;
}
