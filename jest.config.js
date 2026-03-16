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
        '^@voltra/core$': '<rootDir>/packages/core/src/index.ts',
        '^@voltra/ios$': '<rootDir>/packages/ios/src/index.ts',
        '^@voltra/ios/client$': '<rootDir>/packages/ios/src/client.ts',
        '^@voltra/ios/server$': '<rootDir>/packages/ios/src/server.ts',
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
        '^@voltra/core$': '<rootDir>/packages/core/src/index.ts',
        '^@voltra/ios$': '<rootDir>/packages/ios/src/index.ts',
        '^@voltra/ios/client$': '<rootDir>/packages/ios/src/client.ts',
        '^@voltra/ios/server$': '<rootDir>/packages/ios/src/server.ts',
        voltra: '<rootDir>/src/server.ts',
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
    },
  ],
}
