![voltra-banner](https://use-voltra.dev/voltra-baner.jpg)

### Voltra for Android — JSX and rendering

[![mit licence][license-badge]][license] [![npm downloads][npm-downloads-badge]][npm-downloads] [![PRs Welcome][prs-welcome-badge]][prs-welcome]

`@use-voltra/android` contains the Android JSX namespace (`VoltraAndroid`), dynamic colors, payload rendering, and the `@use-voltra/android/server` entry for Node.js.

**React Native apps** should install [`@use-voltra/android-client`](../android-client) only. The client package depends on this one and re-exports everything you need for app code, including `VoltraAndroid`.

Use `@use-voltra/android` directly when you need server rendering (`@use-voltra/android-server` builds on top of it) or when working inside the monorepo.

See [use-voltra.dev](https://use-voltra.dev/android/setup) for app setup.

## Authors

Voltra is an open source collaboration between [Saúl Sharma](https://github.com/saulsharma) and [Szymon Chmal](https://github.com/szymonchmal) at [Callstack][callstack-readme-with-love].

If you think it's cool, please star it 🌟. This project will always remain free to use.

[Callstack][callstack-readme-with-love] is a group of React and React Native geeks, contact us at [hello@callstack.com](mailto:hello@callstack.com) if you need any help with these or just want to say hi!

Like the project? ⚛️ [Join the Callstack team](https://callstack.com/careers/?utm_campaign=Senior_RN&utm_source=github&utm_medium=readme) who does amazing stuff for clients and drives React Native Open Source! 🔥

[callstack-readme-with-love]: https://callstack.com/?utm_source=github.com&utm_medium=referral&utm_campaign=voltra&utm_term=readme-with-love
[license-badge]: https://img.shields.io/npm/l/@use-voltra/android?style=for-the-badge
[license]: https://github.com/callstackincubator/voltra/blob/main/LICENSE.txt
[npm-downloads-badge]: https://img.shields.io/npm/dm/@use-voltra/android?style=for-the-badge
[npm-downloads]: https://www.npmjs.com/package/@use-voltra/android
[prs-welcome-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge
[prs-welcome]: ../../CONTRIBUTING.md
