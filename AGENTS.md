## Package Rules

### `@use-voltra/core`

- Role: generic renderer engine only.
- Allowed dependencies: `react`.
- Forbidden dependencies: `expo`, `react-native`, platform packages, client packages, server packages.
- Must contain only the JSX factory, renderer internals, payload helpers, and generic serialized node types.
- Must not expose platform-specific traits.

### `@use-voltra/server`

- Role: generic server handler utilities only.
- Forbidden dependencies: `expo`, `react-native`, client packages.

### `@use-voltra/ios`

- Role: server-safe iOS package.
- Allowed dependencies: `@use-voltra/core`, `react`.
- Forbidden dependencies: `expo`, `react-native`.
- Contains JSX primitives, iOS renderer wrappers, iOS render/model types, and iOS style types.

### `@use-voltra/android`

- Role: server-safe Android package.
- Allowed dependencies: `@use-voltra/core`, `react`.
- Forbidden dependencies: `expo`, `react-native`.
- Contains JSX primitives, Android renderer wrappers, Android render/model types, Android style types, dynamic color types, and server-safe internal helpers already consumed by `voltra`.

### `@use-voltra/ios-client`

- Role: client-only iOS package.
- Allowed dependencies: `@use-voltra/ios`, `react`, `expo`, `react-native`.
- Contains the native bridge, RN preview components, events, preload APIs, widget client APIs, live activity client APIs, and client-only public types.

### `@use-voltra/android-client`

- Role: client-only Android package.
- Allowed dependencies: `@use-voltra/android`, `react`, `expo`, `react-native`.
- Contains the native bridge, RN preview components, events, preload APIs, widget client APIs, live update client APIs, and client-only public types.

### `@use-voltra/ios-server`

- Allowed dependencies: `@use-voltra/core`, `@use-voltra/server`, `@use-voltra/ios`, `react`.
- Forbidden dependencies: `expo`, `react-native`, `@use-voltra/ios-client`.

### `@use-voltra/android-server`

- Allowed dependencies: `@use-voltra/core`, `@use-voltra/server`, `@use-voltra/android`, `react`.
- Forbidden dependencies: `expo`, `react-native`, `@use-voltra/android-client`.

### `voltra`

- Role: compatibility facade package.
- May depend on all public Voltra packages.
- Must preserve the current user-facing export surface.
- Must not add new root or subpath exports in this refactor.
- Expo Module code stays here for now.
