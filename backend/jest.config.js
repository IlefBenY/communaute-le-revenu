/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  testTimeout: 60000,
  globalSetup: '<rootDir>/tests/helpers/global-setup.ts',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json', diagnostics: false }],
  },
  modulePathIgnorePatterns: ['<rootDir>/dist', '<rootDir>/.strapi'],
};
