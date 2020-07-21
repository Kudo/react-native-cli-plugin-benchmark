/**
 * @format
 */

import ObjcPatcher from '../ObjcPatcher';
import fs from 'fs';

jest.mock('fs');

describe('ObjcPatcher', () => {
  test('addImport() will append imports', () => {
    const beforePatch = `\
#import <UIKit/UIKit.h>
#import <React/RCTRootView.h>

@implementation AppDelegate
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  return NO;
}
`;

    const afterPatch = `\
/* Patched by ObjcPatcher: foo */
#import <UIKit/UIKit.h>
#import <React/RCTRootView.h>
#import <React/Foo.h>

@implementation AppDelegate
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  return NO;
}
`;
    fs.readFileSync = jest.fn().mockReturnValueOnce(beforePatch);

    fs.writeFileSync = jest.fn();

    const patcher = new ObjcPatcher('/foo', 'foo');
    patcher.addImport('<React/Foo.h>').write('/bar');
    expect(fs.writeFileSync.mock.calls[0][0]).toBe('/bar');
    expect(fs.writeFileSync.mock.calls[0][1]).toBe(afterPatch);
  });

  test('addImport() will append imports for specified searchPattern', () => {
    const beforePatch = `\
#import <UIKit/UIKit.h>
#import <React/RCTRootView.h>

#if DEBUG
#import <FlipperKit/FlipperClient.h>
#endif

@implementation AppDelegate
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  return NO;
}
`;

    const afterPatch = `\
/* Patched by ObjcPatcher: foo */
#import <UIKit/UIKit.h>
#import <React/RCTRootView.h>
#import <React/Foo.h>

#if DEBUG
#import <FlipperKit/FlipperClient.h>
#endif

@implementation AppDelegate
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  return NO;
}
`;
    fs.readFileSync = jest.fn().mockReturnValueOnce(beforePatch);

    fs.writeFileSync = jest.fn();

    const patcher = new ObjcPatcher('/foo', 'foo');
    patcher
      .addImport('<React/Foo.h>', '\n#import <React/RCTRootView.h>')
      .write('/bar');
    expect(fs.writeFileSync.mock.calls[0][0]).toBe('/bar');
    expect(fs.writeFileSync.mock.calls[0][1]).toBe(afterPatch);
  });

  test('isPatched() returns false if the file has not been patched', () => {
    const beforePatch = `\
#import <UIKit/UIKit.h>
#import <React/RCTRootView.h>

@implementation AppDelegate
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  return NO;
}
`;

    fs.readFileSync = jest.fn().mockReturnValueOnce(beforePatch);
    const patcher = new ObjcPatcher('/foo', 'foo');
    expect(patcher.isPatched()).toBe(false);
  });

  test('isPatched() returns true if the file has been patched', () => {
    const afterPatch = `\
/* Patched by ObjcPatcher: foo */
#import <UIKit/UIKit.h>
#import <React/RCTRootView.h>

@implementation AppDelegate
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  return NO;
}
`;

    fs.readFileSync = jest.fn().mockReturnValueOnce(afterPatch);
    const patcher = new ObjcPatcher('/foo', 'foo');
    expect(patcher.isPatched()).toBe(true);
  });

  test('addFunction() will add code block before last @end', () => {
    const beforePatch = `\
#import <UIKit/UIKit.h>
#import <React/RCTRootView.h>

@implementation AppDelegate
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.window.rootViewController = rootViewController;
  return NO;
}
@end
`;

    const afterPatch = `\
/* Patched by ObjcPatcher: foo */
#import <UIKit/UIKit.h>
#import <React/RCTRootView.h>

@implementation AppDelegate
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.window.rootViewController = rootViewController;
  return NO;
}

- (void)foo
{
}
@end
`;

    fs.readFileSync = jest.fn().mockReturnValueOnce(beforePatch);

    fs.writeFileSync = jest.fn();

    const patcher = new ObjcPatcher('/foo', 'foo');
    const addCode = `
- (void)foo
{
}`;
    patcher.addFunction(addCode).write('/bar');
    expect(fs.writeFileSync.mock.calls[0][1]).toBe(afterPatch);
  });

  test('replace() is simply passthrough String.replace', () => {
    const beforePatch = `\
#import <UIKit/UIKit.h>
#import <React/RCTRootView.h>

@implementation AppDelegate
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.window.rootViewController = rootViewController;
  return NO;
}
`;

    const afterPatch = `\
/* Patched by ObjcPatcher: foo */
#import <UIKit/UIKit.h>
#import <React/RCTRootView.h>

@implementation AppDelegate
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.window.rootViewController = rootViewController;
  dispatch_async(dispatch_get_main_queue(), ^{
      NSLog(@"AsyncTask");
  });
  return NO;
}
`;

    fs.readFileSync = jest.fn().mockReturnValueOnce(beforePatch);

    fs.writeFileSync = jest.fn();

    const patcher = new ObjcPatcher('/foo', 'foo');
    const patchCode = `\
  dispatch_async(dispatch_get_main_queue(), ^{
      NSLog(@"AsyncTask");
  });`;
    patcher
      .replace(
        /(^\s*self.window.rootViewController = rootViewController;\s*$)/m,
        `$1\n${patchCode}`,
      )
      .write('/bar');
    expect(fs.writeFileSync.mock.calls[0][1]).toBe(afterPatch);
  });
});
