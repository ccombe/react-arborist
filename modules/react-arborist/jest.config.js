/** @type {import('jest').Config} */
const config = {
  clearMocks: true,
  coverageProvider: "v8",

  // react-dnd@16, react-dnd-html5-backend@16, dnd-core@16, and @react-dnd/* ship
  // ESM-only. Jest's CJS runtime can't load them directly, so they're transpiled
  // via ts-jest (hence `allowJs`). (Node 22.12+ supports require(esm) natively,
  // but Jest uses its own module system independent of Node's native loader.)
  //
  // `isolatedModules` is required, not just faster: ts-jest's type-checking path
  // builds a TS program and won't emit for these out-of-program node_modules
  // files. Test files are still type-checked — tsc covers them during `yarn build`.
  preset: "ts-jest",
  transform: {
    "^.+\\.[jt]sx?$": ["ts-jest", { tsconfig: { allowJs: true, isolatedModules: true } }],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(react-dnd|react-dnd-html5-backend|dnd-core|@react-dnd)/)",
  ],

  rootDir: "./src",
  testEnvironment: "jsdom",

  // "node" preserves Jest's standard Node.js resolution as the baseline;
  // "require" selects CJS builds for packages with dual exports maps.
  testEnvironmentOptions: {
    customExportConditions: ["node", "require", "default"],
  },
};

module.exports = config;
