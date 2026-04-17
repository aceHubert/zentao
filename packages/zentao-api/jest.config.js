module.exports = {
  rootDir: "../..",
  roots: ["<rootDir>/packages/zentao-api"],
  testEnvironment: "node",
  watchman: false,
  testMatch: ["**/*.(spec|test).{ts,tsx,js,jsx}"],
  moduleFileExtensions: ["ts", "js", "json"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.jest.json",
        diagnostics: false,
      },
    ],
  },
  coveragePathIgnorePatterns: ["/node_modules/", "/dist/", "package.json"],
};
