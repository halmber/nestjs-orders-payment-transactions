import type { Config } from 'jest';

const config: Config = {
  displayName: 'unit',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
};

export default config;
