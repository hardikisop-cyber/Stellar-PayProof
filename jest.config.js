module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["**/__tests__/**/*.test.js"],
  collectCoverageFrom: [
    "lib/**/*.js",
    "app/**/*.js",
    "!app/**/page.js",
    "!**/node_modules/**",
  ],
  transform: {
    "^.+\\.(js|jsx)$": ["babel-jest", { presets: ["next/babel"] }],
  },
};
