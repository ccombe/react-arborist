---
type: fix
---
`@types/react-window` is now a regular dependency instead of a dev dependency.
react-arborist's public type declarations reference react-window types (`onScroll`,
`outerElementType`, `innerElementType`, `tree.list`, scroll alignment), so without it
TypeScript reported TS7016 under `skipLibCheck: false` and silently typed those as
`any` otherwise.
