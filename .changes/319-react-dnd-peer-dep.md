---
type: breaking
---
`react-dnd` and `react-dnd-html5-backend` are now **peer dependencies** instead of
bundled dependencies. Install them alongside react-arborist:

```bash
npm install react-arborist react-dnd react-dnd-html5-backend
```

This fixes a global singleton conflict (#319) where apps that also used react-dnd
ended up with two independent copies of the library, causing drag-and-drop to silently
break or throw "Cannot have two HTML5 backends at the same time."

Requires react-dnd **v16** (`^16`) and `react-dnd-html5-backend` **v16** (`^16`). Both
peers are required even when you pass your own `dndBackend` / `dndManager`, because the
drag preview calls into `react-dnd-html5-backend` on every drag.

react-dnd v16 is ESM-only, so `require("react-arborist")` from CommonJS relies on
`require(esm)`, unflagged from Node **22.12** — now the `engines.node` floor. Bundler
and browser consumers don't take that path.

The package now declares an `exports` map. `react-arborist` and
`react-arborist/package.json` resolve as before, but deep imports such as
`react-arborist/dist/module/...` are no longer resolvable.
