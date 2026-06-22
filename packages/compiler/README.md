![voltra-banner](https://use-voltra.dev/voltra-baner.jpg)

### Shared source analysis utilities for Voltra

[![mit licence][license-badge]][license] [![npm downloads][npm-downloads-badge]][npm-downloads] [![PRs Welcome][prs-welcome-badge]][prs-welcome]

`@use-voltra/compiler` contains the source analysis helpers that power Voltra's widget toolchain. It parses JavaScript and TypeScript files and returns widget records for build-time tooling. Widget registration now comes from `app.json` and the platform manifests written during prebuild.

## Features

- **Source analysis**: Inspect function declarations, function expressions, and arrow functions when build tooling needs source metadata or validation.

- **Export-aware analysis**: Match widget entry points to named and default exports so only real widget entry points are returned.

- **TypeScript and JSX support**: Parse common React and React Native source formats, including `.ts`, `.tsx`, `.js`, and `.jsx` files.

- **Shared by Voltra tooling**: Powers `@use-voltra/metro` and other build-time widget workflows.

## Documentation

This package is an internal building block for Voltra's widget toolchain. Relevant topics:

- [Getting Started](https://use-voltra.dev/getting-started/installation)
- [iOS Widgets](https://use-voltra.dev/ios/development/developing-widgets)
- [Android Widgets](https://use-voltra.dev/android/development/developing-widgets)

## Getting started

`@use-voltra/compiler` is usually installed as a transitive dependency of the Metro package, but you can install it directly if you want to build custom tooling on top of Voltra's source scanner.

```sh
npm install @use-voltra/compiler
```

The compiler package is intended for build-time tooling that needs to analyze widget source files alongside the `app.json` widget manifest. Consult the package API for the available analysis helpers.

## Platform compatibility

This package is runtime-agnostic and works in Node.js or build-time tooling that needs to analyze Voltra widget source code.

## Authors

Voltra is an open source collaboration between [Saúl Sharma](https://github.com/saulsharma) and [Szymon Chmal](https://github.com/szymonchmal) at [Callstack][callstack-readme-with-love].

If you think it's cool, please star it 🌟. This project will always remain free to use.

[Callstack][callstack-readme-with-love] is a group of React and React Native geeks, contact us at [hello@callstack.com](mailto:hello@callstack.com) if you need any help with these or just want to say hi!

Like the project? ⚛️ [Join the Callstack team](https://callstack.com/careers/?utm_campaign=Senior_RN&utm_source=github&utm_medium=readme) who does amazing stuff for clients and drives React Native Open Source! 🔥

[callstack-readme-with-love]: https://callstack.com/?utm_source=github.com&utm_medium=referral&utm_campaign=voltra&utm_term=readme-with-love
[license-badge]: https://img.shields.io/npm/l/@use-voltra/compiler?style=for-the-badge
[license]: https://github.com/callstackincubator/voltra/blob/main/LICENSE.txt
[npm-downloads-badge]: https://img.shields.io/npm/dm/@use-voltra/compiler?style=for-the-badge
[npm-downloads]: https://www.npmjs.com/package/@use-voltra/compiler
[prs-welcome-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge
[prs-welcome]: ../../CONTRIBUTING.md
