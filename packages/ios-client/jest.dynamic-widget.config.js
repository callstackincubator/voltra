/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/dynamic-widget/**/*.node.test.ts'],
  modulePathIgnorePatterns: ['<rootDir>/build'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.dynamic-widget.jest.json',
      },
    ],
  },
}
