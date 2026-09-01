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
  // The lookahead scans the whole remaining path (`.*`) rather than just the
  // next segment: under pnpm these live at
  // `node_modules/.pnpm/react-dnd@16.0.1_.../node_modules/react-dnd/...`, so a
  // next-segment-only pattern sees `.pnpm` and excludes them from transform.
  transformIgnorePatterns: [
    "/node_modules/(?!.*(react-dnd|react-dnd-html5-backend|dnd-core|@react-dnd)/)",
  ],

  rootDir: "./src",
  testEnvironment: "jsdom",

  // Only consulted for dependencies that ship an `exports` map — nothing in this
  // tree does today, so this mainly keeps the config aligned with the recipe the
  // README publishes. "require" picks CJS builds. "browser" is restated because
  // this list *replaces* jsdom's default rather than extending it. Do not add
  // "node": package `exports` maps match in the package's own key order, so
  // including "node" makes a package that lists "node" before "browser" resolve
  // its Node build under jsdom.
  testEnvironmentOptions: {
    customExportConditions: ["browser", "require", "default"],
  },
};

module.exports = config;
