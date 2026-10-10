---
type: breaking
---
`react-dnd` and `react-dnd-html5-backend` are now **peer dependencies** instead of
bundled dependencies — install them alongside react-arborist (`npm install
react-arborist react-dnd react-dnd-html5-backend`). This fixes a global singleton
conflict (#319) where apps that also used react-dnd ended up with two independent
copies of the library, causing drag-and-drop to silently break or throw "Cannot have
two HTML5 backends at the same time." Both peers must be v16 (`^16`), and both are
required even when you pass your own `dndBackend` / `dndManager`, because the drag
preview calls into `react-dnd-html5-backend` on every drag. react-dnd v16 is ESM-only,
and react-arborist now ships a single ESM build too (the CommonJS `dist/main` build is
gone), so `import` and `require` load the same copy instead of two copies with
separate React contexts. `require("react-arborist")` from CommonJS relies on
`require(esm)`, unflagged from Node **22.12** — now the `engines.node` floor, which
package managers check at install time, so installing v4 requires Node ≥ 22.12 even
for bundler and browser consumers. CommonJS TypeScript projects on Node module
resolution need `module: "nodenext"` (TypeScript ≥ 5.8) or `"node20"` (TypeScript
≥ 5.9); `"node16"` and `"node18"` report TS1479. Jest users must add
`react-arborist` to the `transformIgnorePatterns` exception list alongside react-dnd
(see the README). The package also declares an `exports` map: `react-arborist` and
`react-arborist/package.json` resolve as before, but deep imports such as
`react-arborist/dist/module/...` are no longer resolvable. The `react` and `react-dom`
peer floor rises from 16.14 to **18**: the build now imports `react/jsx-runtime`
and `useSyncExternalStore` directly from React, which older versions can't provide
to ESM consumers.
