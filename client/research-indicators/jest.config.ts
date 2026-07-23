import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/src/setup-jest.ts'],
  globalSetup: 'jest-preset-angular/global-setup',
  collectCoverage: true,
  collectCoverageFrom: ['./src/app/**/*.ts', './src/app/**/*.html', '!./src/app/**/*routing.ts', '!./src/app/**/*module.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/', '<rootDir>/src/app/shared/components/alert/alert.component.spec.ts'],
  coveragePathIgnorePatterns: [
    '<rootDir>/src/app/app.config.ts',
    '<rootDir>/src/app/app.routes.ts',
    '<rootDir>/src/app/shared/sockets/websocket.service.ts',
    '<rootDir>/src/app/shared/components/alert/alert.component.ts'
  ],
  coverageReporters: ['text','text-summary','cobertura', 'lcov'],
  coverageThreshold: {
    global: {
      statements: 40,
      branches: 20,
      lines: 45,
      functions: 30
    }
  },
  moduleNameMapper: {
    '@microsoft/clarity': '<rootDir>/tests/mocks/clarityMock.ts',
    '^@public/(.*)$': '<rootDir>/public/$1',
    '^@shared/(.*)$': '<rootDir>/src/app/shared/$1',
    '^@pages/(.*)$': '<rootDir>/src/app/pages/$1',
    '^@services/(.*)$': '<rootDir>/src/app/shared/services/$1',
    '^@interfaces/(.*)$': '<rootDir>/src/app/shared/interfaces/$1',
    '^@interceptors/(.*)$': '<rootDir>/src/app/shared/interceptors/$1',
    '^@components/(.*)$': '<rootDir>/src/app/shared/components/$1',
    '^@sockets/(.*)$': '<rootDir>/src/app/shared/sockets/$1',
    '^@platform/(.*)$': '<rootDir>/src/app/pages/platform/$1',
    '^@auth/(.*)$': '<rootDir>/src/app/pages/auth/$1',
    '^@landing/(.*)$': '<rootDir>/src/app/pages/landing/$1',
    '^@guards/(.*)$': '<rootDir>/src/app/shared/guards/$1',
    '^@envs/(.*)$': '<rootDir>/src/environments/$1',
    '^@utils/(.*)$': '<rootDir>/src/app/shared/utils/$1',
    '^src/app/testing/(.*)$': '<rootDir>/src/app/testing/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  transform: {
    '^.+\\.(ts|js|html|svg)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.html$',
        isolatedModules: true
      }
    ]
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons']
  }
};

export default config;
