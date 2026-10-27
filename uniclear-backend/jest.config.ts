import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          types: ['node', 'jest'],
        },
      },
    ],
  },
  testMatch: ['**/*.spec.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/modules/**/*.service.ts',
    'src/modules/**/*.repository.ts',
    'src/core/**/*.ts',
    '!src/**/*.types.ts',
    '!src/**/*.schema.ts',
  ],
  clearMocks: true,
  testTimeout: 20000,
  maxWorkers: '50%',
}

export default config
