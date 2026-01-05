import type { Config } from 'jest';

const config: Config = {
  displayName: 'integration',
  testMatch: ['<rootDir>/src/**/*.integration.spec.ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testTimeout: 30000,
};

export default config;
