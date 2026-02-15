module.exports = {
  projects: [
    {
      displayName: 'Expo Module',
      preset: 'jest-expo',
      testEnvironment: 'node',
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': [
          'ts-jest',
          {
            tsconfig: {
              jsx: 'react-jsx', // Use automatic JSX runtime (React 17+)
            },
            isolatedModules: true, // Skip type-checking for faster tests
          },
        ],
      },
      transformIgnorePatterns: [
        'node_modules/(?!(jest-expo|@react-native|react-native|react-clone-referenced-element|@expo)/)',
      ],
      testMatch: ['<rootDir>/src/**/*.expo.test.ts?(x)'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    },
    {
      displayName: 'Node.js',
      testEnvironment: 'node',
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': [
          'ts-jest',
          {
            tsconfig: {
              jsx: 'react-jsx', // Use automatic JSX runtime (React 17+)
            },
            isolatedModules: true, // Skip type-checking for faster tests
          },
        ],
      },
      transformIgnorePatterns: [
        'node_modules/(?!(jest-expo|@react-native|react-native|react-clone-referenced-element|@expo)/)',
      ],
      testMatch: ['<rootDir>/src/**/*.node.test.ts?(x)'],
      moduleNameMapper: {
        voltra: '<rootDir>/src/server.ts',
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    },
  ],
}
