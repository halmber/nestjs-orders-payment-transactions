import type { Config } from 'jest';

const config: Config = {
  displayName: 'e2e',
  testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testTimeout: 60000,
};

export default config;
