/** @type {import('jest').Config} */
const config = {
  // Use jsdom so DOM APIs (localStorage, document, etc.) are available in tests
  testEnvironment: 'jest-environment-jsdom',

  // Look for tests in a __tests__ folder or files ending in .test.js
  testMatch: [
    '**/__tests__/**/*.js',
    '**/*.test.js',
  ],

  // CommonJS — no transform needed for vanilla JS
  transform: {},

  // Collect coverage from the app JS file
  collectCoverageFrom: [
    'js/app.js',
  ],

  // Optional: clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
};

module.exports = config;
