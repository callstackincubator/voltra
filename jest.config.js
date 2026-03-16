module.exports = {
  projects: [
    {
      displayName: 'Expo Module',
      preset: 'expo-module-scripts',
      testEnvironment: 'node',
      transformIgnorePatterns: [
        'node_modules/(?!(expo-module-scripts|jest-expo|@react-native|react-native|react-clone-referenced-element|@expo|@voltra)/)',
      ],
      moduleNameMapper: {
        '^@voltra/android$': '<rootDir>/packages/android/src/index.ts',
        '^@voltra/android/client$': '<rootDir>/packages/android/src/client.ts',
        '^@voltra/android/server$': '<rootDir>/packages/android/src/server.ts',
        '^@voltra/android-server$': '<rootDir>/packages/android-server/src/index.ts',
        '^@voltra/core$': '<rootDir>/packages/core/src/index.ts',
        '^@voltra/ios$': '<rootDir>/packages/ios/src/index.ts',
        '^@voltra/ios/client$': '<rootDir>/packages/ios/src/client.ts',
        '^@voltra/ios/server$': '<rootDir>/packages/ios/src/server.ts',
        '^@voltra/ios-server$': '<rootDir>/packages/ios-server/src/index.ts',
        '^@voltra/server$': '<rootDir>/packages/server/src/index.ts',
      },
      testMatch: ['<rootDir>/src/**/*.expo.test.ts?(x)'],
    },
    {
      displayName: 'Node.js',
      preset: 'react-native',
      testEnvironment: 'node',
      transformIgnorePatterns: [
        'node_modules/(?!(jest-expo|@react-native|react-native|react-clone-referenced-element|@expo|@voltra)/)',
      ],
      testMatch: ['<rootDir>/src/**/*.node.test.ts?(x)'],
      moduleNameMapper: {
        '^@voltra/android$': '<rootDir>/packages/android/src/index.ts',
        '^@voltra/android/client$': '<rootDir>/packages/android/src/client.ts',
        '^@voltra/android/server$': '<rootDir>/packages/android/src/server.ts',
        '^@voltra/android-server$': '<rootDir>/packages/android-server/src/index.ts',
        '^@voltra/core$': '<rootDir>/packages/core/src/index.ts',
        '^@voltra/ios$': '<rootDir>/packages/ios/src/index.ts',
        '^@voltra/ios/client$': '<rootDir>/packages/ios/src/client.ts',
        '^@voltra/ios/server$': '<rootDir>/packages/ios/src/server.ts',
        '^@voltra/ios-server$': '<rootDir>/packages/ios-server/src/index.ts',
        '^@voltra/server$': '<rootDir>/packages/server/src/index.ts',
        voltra: '<rootDir>/src/server.ts',
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
    },
  ],
}
