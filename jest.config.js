module.exports = {
  projects: [
    {
      displayName: 'Expo Module',
      preset: 'expo-module-scripts',
      testEnvironment: 'node',
      transformIgnorePatterns: [
        'node_modules/(?!(expo-module-scripts|jest-expo|@react-native|react-native|react-clone-referenced-element|@expo)/)',
      ],
      testMatch: ['<rootDir>/src/**/*.expo.test.ts?(x)'],
    },
    {
      displayName: 'Node.js',
      preset: 'react-native',
      testEnvironment: 'node',
      transformIgnorePatterns: [
        'node_modules/(?!(jest-expo|@react-native|react-native|react-clone-referenced-element|@expo)/)',
      ],
      testMatch: ['<rootDir>/src/**/*.node.test.ts?(x)'],
    },
  ],
}
