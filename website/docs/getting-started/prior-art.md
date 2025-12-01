# Prior Art

Voltra stands on the shoulders of giants and wouldn't be possible without the incredible work of the open-source community. This page acknowledges the libraries and projects that inspired and informed our approach to bridging JavaScript and native iOS Live Activities.

## Inspiration

### Dynamic UI

The core concept of describing SwiftUI layouts through JSON configuration was pioneered by Wesley de Groot's [Dynamic UI](https://github.com/0xWDG/DynamicUI). His library demonstrated how to create flexible, data-driven user interfaces by mapping JSON structures to SwiftUI components. Dynamic UI became a vital part of our proof-of-concept work and served as a blueprint for developing our custom solution. The idea of declarative UI construction through structured data was fundamental to making Voltra's component system possible.

### Expo Live Activity

The breakthrough insight of combining JavaScript-driven development with iOS Live Activities came from Software Mansion's [Expo Live Activity](https://github.com/software-mansion-labs/expo-live-activity). Their pioneering work showed how to integrate Live Activities into the Expo/React Native ecosystem, proving that JavaScript developers could create dynamic, interactive Live Activities without deep native iOS knowledge. This became the foundation for conceiving Voltra - taking their approach further to create a UI framework specifically designed for Live Activities. Their open-source Expo plugin logic was invaluable during our development, allowing us to reuse proven patterns and focus on building Voltra's unique features.

## Thank You

We extend our heartfelt gratitude to:

- **Wesley de Groot** for creating Dynamic UI and demonstrating the power of JSON-driven SwiftUI interfaces. Your library's approach to declarative UI construction was exactly what we needed to explore our initial concepts.

- **Software Mansion** for their groundbreaking Expo Live Activity library. Their work not only inspired the fundamental concept behind Voltra but also provided practical, reusable code that accelerated our development significantly. The Expo plugin architecture they established became a cornerstone of our implementation.

- **Expo** for creating such a delightful framework and Expo Modules system to work with. The developer experience and tooling around native modules integration made building Voltra an absolute pleasure.

- **The broader open-source community** for all the libraries, tools, and ideas that make innovative projects like Voltra possible in the first place.

Voltra is our contribution back to this amazing ecosystem. We hope it helps developers create more engaging and interactive Live Activities for their iOS applications.

---

_If you're working on something that builds upon Voltra, we'd love to hear about it! Feel free to reach out and let us know how you're using it._
