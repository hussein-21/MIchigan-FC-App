/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  globalTeardown: '<rootDir>/tests/globalTeardown.js',
  testTimeout: 30000,
  verbose: true,
};
