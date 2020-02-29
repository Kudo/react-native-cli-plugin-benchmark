/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import fs from 'fs';
import {spawn} from 'child_process';
import glob from 'glob';
import {Config, IOSProjectConfig} from '@react-native-community/cli-types';
import {CLIError} from '@react-native-community/cli-tools';
import ObjcPatcher from './common/ObjcPatcher';
import runIOS from '@react-native-community/cli-platform-ios/build/commands/runIOS';
import {logger} from '@react-native-community/cli-tools';

function patchProject(projectConfig: IOSProjectConfig, patchTag: string) {
  const appDelegates = glob.sync(`${projectConfig.sourceDir}/**/AppDelegate.m`);

  const addFunctionGetRssMemory = `\
// Refer from React/CoreModules/RCTPerfMonitor.mm
static vm_size_t RCTGetResidentMemorySize(void)
{
  vm_size_t memoryUsageInByte = 0;
  task_vm_info_data_t vmInfo;
  mach_msg_type_number_t count = TASK_VM_INFO_COUNT;
  kern_return_t kernelReturn = task_info(mach_task_self(), TASK_VM_INFO, (task_info_t) &vmInfo, &count);
  if(kernelReturn == KERN_SUCCESS) {
    memoryUsageInByte = (vm_size_t) vmInfo.phys_footprint;
  }
  return memoryUsageInByte;
}
`;

  const searchPatternWithinDidFinishLaunchingWithOptions = new RegExp(
    /(^\s*self.window.rootViewController = rootViewController;\s*$)/m,
  );
  const addCodeMeasureAfterFiveSeconds = `
  dispatch_after(
    dispatch_time(DISPATCH_TIME_NOW, (int64_t)(5 * NSEC_PER_SEC)),
    dispatch_get_main_queue(),
    ^{
      // Begin
      NSLog(@"{{tag}}.LOG_BEGIN=");

      // PerformanceLogger
      NSLog(@"{{tag}}.duration.RCTPLScriptDownload=%lld", [bridge.performanceLogger durationForTag:RCTPLScriptDownload]);
      NSLog(@"{{tag}}.duration.RCTPLScriptExecution=%lld", [bridge.performanceLogger durationForTag:RCTPLScriptExecution]);
      NSLog(@"{{tag}}.duration.RCTPLRAMBundleLoad=%lld", [bridge.performanceLogger durationForTag:RCTPLRAMBundleLoad]);
      NSLog(@"{{tag}}.duration.RCTPLRAMStartupCodeSize=%lld", [bridge.performanceLogger durationForTag:RCTPLRAMStartupCodeSize]);
      NSLog(@"{{tag}}.duration.RCTPLRAMStartupNativeRequires=%lld", [bridge.performanceLogger durationForTag:RCTPLRAMStartupNativeRequires]);
      NSLog(@"{{tag}}.duration.RCTPLRAMStartupNativeRequiresCount=%lld", [bridge.performanceLogger durationForTag:RCTPLRAMStartupNativeRequiresCount]);
      NSLog(@"{{tag}}.duration.RCTPLRAMNativeRequires=%lld", [bridge.performanceLogger durationForTag:RCTPLRAMNativeRequires]);
      NSLog(@"{{tag}}.duration.RCTPLRAMNativeRequiresCount=%lld", [bridge.performanceLogger durationForTag:RCTPLRAMNativeRequiresCount]);
      NSLog(@"{{tag}}.duration.RCTPLNativeModuleInit=%lld", [bridge.performanceLogger durationForTag:RCTPLNativeModuleInit]);
      NSLog(@"{{tag}}.duration.RCTPLNativeModuleMainThread=%lld", [bridge.performanceLogger durationForTag:RCTPLNativeModuleMainThread]);
      NSLog(@"{{tag}}.duration.RCTPLNativeModulePrepareConfig=%lld", [bridge.performanceLogger durationForTag:RCTPLNativeModulePrepareConfig]);
      NSLog(@"{{tag}}.duration.RCTPLNativeModuleMainThreadUsesCount=%lld", [bridge.performanceLogger durationForTag:RCTPLNativeModuleMainThreadUsesCount]);
      NSLog(@"{{tag}}.duration.RCTPLNativeModuleSetup=%lld", [bridge.performanceLogger durationForTag:RCTPLNativeModuleSetup]);
      NSLog(@"{{tag}}.duration.RCTPLTurboModuleSetup=%lld", [bridge.performanceLogger durationForTag:RCTPLTurboModuleSetup]);
      NSLog(@"{{tag}}.duration.RCTPLJSCWrapperOpenLibrary=%lld", [bridge.performanceLogger durationForTag:RCTPLJSCWrapperOpenLibrary]);
      NSLog(@"{{tag}}.duration.RCTPLBridgeStartup=%lld", [bridge.performanceLogger durationForTag:RCTPLBridgeStartup]);
      NSLog(@"{{tag}}.duration.RCTPLTTI=%lld", [bridge.performanceLogger durationForTag:RCTPLTTI]);
      NSLog(@"{{tag}}.duration.RCTPLBundleSize=%lld", [bridge.performanceLogger durationForTag:RCTPLBundleSize]);

      // Memory
      NSLog(@"{{tag}}.memory=%lu", (unsigned long) RCTGetResidentMemorySize());

      // End
      NSLog(@"{{tag}}.LOG_END=");
  });
  `.replace(/\{\{tag\}\}/g, patchTag);
  for (const appDelegate of appDelegates) {
    const patcher = new ObjcPatcher(appDelegate, patchTag);
    if (patcher.isPatched()) {
      continue;
    }
    patcher
      .addImport('<mach/mach.h>')
      .addFunction(addFunctionGetRssMemory)
      .addImport('<React/RCTPerformanceLogger.h>')
      .replace(
        searchPatternWithinDidFinishLaunchingWithOptions,
        `$1\n${addCodeMeasureAfterFiveSeconds}`,
      )
      .write(appDelegate + 'm');
  }

  const content = fs
    .readFileSync(projectConfig.pbxprojPath)
    .toString()
    .replace(
      /(AppDelegate.m[^m].*\slastKnownFileType = )sourcecode\.c\.objc;/g,
      '$1sourcecode.c.objcpp;',
    )
    .replace(/(AppDelegate.m)([^m])/g, '$1m$2');
  fs.writeFileSync(projectConfig.pbxprojPath, content);
}

async function waitSimulatorLog(patchTag: string) {
  return new Promise(resolve => {
    const result: {[key: string]: string} = {};
    const child = spawn('xcrun', [
      'simctl',
      'spawn',
      'booted',
      'log',
      'stream',
      '--predicate',
      `eventMessage contains "${patchTag}."`,
    ]);

    child.stdout.on('data', (data: Buffer) => {
      const lines = data.toString().split(/\r?\n/);
      const pattern = new RegExp(`\\s(${patchTag})\\.(.+?)=(.*)`);
      for (const line of lines) {
        const matches = line.match(pattern);
        if (matches) {
          const key = matches[2];
          const value = matches[3];
          if (key == 'LOG_BEGIN') {
            // nop
          } else if (key == 'LOG_END') {
            child.kill();
            resolve(result);
          } else {
            result[key] = value;
          }
        }
      }
    });
  });
}

async function measure(_argv: Array<string>, ctx: Config, args: any) {
  const projectConfig = ctx.project.ios;
  if (projectConfig == null) {
    throw new CLIError(`iOS platform project config is null`);
  }

  const patchTag = 'measure-ios';
  patchProject(projectConfig, patchTag);

  await runIOS.func([], ctx, args);
  const result = await waitSimulatorLog(patchTag);
  logger.info(`Measurement result:\n${JSON.stringify(result, null, 4)}`);
}

/**
 * @format
 */

export default {
  name: 'measure-ios',
  description: 'measure from run-ios output',
  func: measure,
  options: runIOS.options,
};
