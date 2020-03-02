const common = {testEnvironment: 'node'};

module.exports = {
  projects: [
    {
      ...common,
      displayName: 'unit',
      // setupFiles: ['<rootDir>/jest/setupUnitTests.js'],
      testMatch: ['<rootDir>/**/__tests__/*{.,-}test.[jt]s'],
    },
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!**/__mocks__/**',
    '!**/__tests__/**',
    '!**/build/**',
  ],
};
