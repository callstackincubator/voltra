# Introduction

Voltra is a library that brings new "platforms" to React Native. Up until now, creating features like iOS Live Activities, Dynamic Island layouts, or Android Home Screen Widgets required writing native code in Swift or Kotlin.

Voltra changes this by providing a JavaScript-based API and JSX components that get automatically converted to native primitives (SwiftUI on iOS, Jetpack Compose Glance on Android).

## Why Voltra?

- **React Native Everywhere:** Extend your React Native app with native platform features using the same JSX syntax you already know.
- **No Native Code Required:** Build complex widget layouts and live activities without touching Xcode or Android Studio for UI code.
- **Unified Components:** Use a shared set of components that render idiomatically on both iOS and Android.
- **Real-time Updates:** Stream updates to your activities and widgets via push notifications (APNS/FCM) from any JavaScript runtime.

## How it works

Voltra works by serializing your JSX components into a lightweight JSON format that the native platform extensions can interpret. This enables features like hot reloading during development and server-side rendering for push updates.

Ready to get started? Head over to the [Installation](./installation) guide.
