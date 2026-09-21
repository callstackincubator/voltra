/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/setup.node.js'],
  testMatch: [
    '<rootDir>/tests/dynamic-widget/**/*.node.test.ts',
    '<rootDir>/tests/dynamic-live-activity/**/*.node.test.ts',
  ],
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
