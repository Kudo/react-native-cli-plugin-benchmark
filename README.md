[![npm version](https://badge.fury.io/js/react-native-cli-plugin-benchmark.svg)](https://badge.fury.io/js/react-native-cli-plugin-benchmark)
![GitHub Actions CI](https://github.com/Kudo/react-native-cli-plugin-benchmark/workflows/Build/badge.svg)

# react-native-cli-plugin-benchmark
React Native CLI Plugin for Benchmark Regression

## Installation
```sh
$ yarn add react-native-cli-plugin-benchmark
```

## Supported Commands

### react-native get-appsize-ios
Get the generated IPA size from run-ios output

```sh
$ react-native get-appsize-ios --configuration Release --sdk iphoneos 
info Found Xcode workspace "RNApp.xcworkspace"
info Building (using "xcodebuild -workspace RNApp.xcworkspace -configuration Release -scheme RNApp -sdk iphoneos CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO CODE_SIGNING_ALLOWED=NO")
info Generated app size:
{"/Users/kudo/Library/Developer/Xcode/DerivedData/RNApp-auhfmjezpdwqwhasqmpbigmosgfe/Build/Products/Release-iphoneos/RNApp.app":37632}
```

### react-native get-appsize-android
Get the generated APK size from run-android output

```sh
$ react-native get-appsize-android --variant release
info Running jetifier to migrate libraries to AndroidX. You can disable it using "--no-jetifier" flag.
info Building the app...
info Generated app size:
{"/Users/kudo/RNApp/android/app/build/outputs/apk/release/app-release.apk":19603464}
```

### react-native measure-ios
Measure from run-ios output
Note that the command in fact to patch AppDelegate to log some information after 5 seconds from launch.
The information are from RCTPerformanceLogger and task memory.

```sh
$ react-native measure-ios --configuration Release --no-packager
info Found Xcode workspace "RNApp.xcworkspace"
info Launching iPhone X (iOS 12.4)
info Building (using "xcodebuild -workspace RNApp.xcworkspace -configuration Release -scheme RNApp -destination id=6FF18363-C213-4E59-9A83-3117EE7AE6FE")
▸ Compiling diy-fp.cc   
▸ Compiling bignum.cc     
▸ Compiling cached-powers.cc                                        
▸ Compiling double-conversion.cc
...
info Launching "org.reactjs.native.example.RNApp"
success Successfully launched the app on the simulator
info Measurement result:
{
    "duration.RCTPLScriptDownload": "2",
    "duration.RCTPLScriptExecution": "181",
    "duration.RCTPLRAMBundleLoad": "0",
    "duration.RCTPLRAMStartupCodeSize": "0",
    "duration.RCTPLRAMStartupNativeRequires": "0",
    "duration.RCTPLRAMStartupNativeRequiresCount": "0",
    "duration.RCTPLRAMNativeRequires": "0",
    "duration.RCTPLRAMNativeRequiresCount": "0",
    "duration.RCTPLNativeModuleInit": "2",
    "duration.RCTPLNativeModuleMainThread": "56",
    "duration.RCTPLNativeModulePrepareConfig": "0",
    "duration.RCTPLNativeModuleMainThreadUsesCount": "4",
    "duration.RCTPLNativeModuleSetup": "0",
    "duration.RCTPLTurboModuleSetup": "0",
    "duration.RCTPLJSCWrapperOpenLibrary": "0",
    "duration.RCTPLBridgeStartup": "284",
    "duration.RCTPLTTI": "474",
    "duration.RCTPLBundleSize": "652466",
    "memory": "55541760"
}
```
