import type { Config } from 'jest';

const config: Config = {
  projects: [
    '<rootDir>/test/unit/jest.config.ts',
    '<rootDir>/test/integration/jest.config.ts',
    '<rootDir>/test/e2e/jest.config.ts',
  ],
};

export default config;
