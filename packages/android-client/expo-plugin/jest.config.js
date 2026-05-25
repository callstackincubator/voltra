/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.node.test.ts'],
  modulePathIgnorePatterns: ['<rootDir>/build'],
  moduleNameMapper: {
    '^@use-voltra/expo-plugin$': '<rootDir>/../../expo-plugin/src/index.ts',
    '^@use-voltra/expo-plugin/(.*)$': '<rootDir>/../../expo-plugin/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.jest.json',
      },
    ],
  },
}
