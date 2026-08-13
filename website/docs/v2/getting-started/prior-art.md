# Prior Art

Voltra wouldn't be possible without the incredible work of the open-source community. This page acknowledges the libraries and projects that inspired and informed our approach to bridging JavaScript and native iOS Live Activities.

## Inspiration

### Dynamic UI

The core concept of describing SwiftUI layouts through JSON configuration was pioneered by Wesley de Groot's [Dynamic UI](https://github.com/0xWDG/DynamicUI).

### Expo Live Activity

The insight of combining JavaScript-driven development with iOS Live Activities came from Software Mansion's [Expo Live Activity](https://github.com/software-mansion-labs/expo-live-activity). Referencing their open-source Expo config plugin logic was helpful during early development.

### Expo Widgets

Voltra spawns a secondary JS runtime to drive native widget and Live Activity rendering. That's not just a theoretical option — Expo's own [`expo-widgets`](https://docs.expo.dev/versions/latest/sdk/widgets/) module does the same thing in production: when the system asks for a widget timeline or starts a Live Activity, your component runs in a separate JS runtime and produces a native layout tree. Seeing this pattern work at Expo-SDK scale, across both iOS and Android, was a strong signal that it's a practical foundation to build on, not just a corner case.

## Thank You

We extend our gratitude to the following organizations and individuals:

- **Wesley de Groot** for creating Dynamic UI and demonstrating the power of JSON-driven SwiftUI interfaces.

- **Software Mansion** for open-sourcing their Expo Live Activity library.

- **Expo** for building Expo Modules that power Voltra behind the scenes.

- **The broader open-source community** for all the libraries, tools, and ideas that make innovative projects like Voltra possible in the first place.

Voltra is our contribution back to the broader React Native community. We hope it helps developers create more engaging and interactive Live Activities and Widgets for their iOS applications.

---

_If you're working on something that builds upon Voltra, we'd love to hear about it! Feel free to reach out and let us know how you're using it._
