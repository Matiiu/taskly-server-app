import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.(spec|test)\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^generated/(.*)$': '<rootDir>/../generated/$1',
    '^(\\.{1,2}/.+)\\.js$': '$1',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/*.dto.ts',
    '!**/*.input.ts',
    '!**/*.entity.ts',
    '!entities',
    '!**/*.type.ts',
    '!**/*.enum.ts',
    '!**/*.interface.ts',
    '!**/*.{spec,test}.ts',
    '!**/common/testing/**',
    '!**/*.config.ts',
    '!**/prisma.service.ts',
  ],
  coverageDirectory: '../coverage',
  coverageReporters: ['text', 'lcov', 'json', 'clover'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Resolver files contain GraphQL decorator type-factory lambdas (e.g. () => SomeType)
    // that are only invoked during schema compilation, not in unit tests.
    // They are excluded from the global threshold and evaluated separately.
    './src/**/*.resolver.ts': {
      functions: 25,
      branches: 65,
      lines: 65,
      statements: 65,
    },
  },
  testEnvironment: 'node',
  clearMocks: true,
};

export default config;
