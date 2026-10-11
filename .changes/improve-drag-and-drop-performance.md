---
type: fix
---
Dragging no longer makes the drag preview lag behind the pointer: hovers reach the store at most once per animation frame, and only rows whose drop highlight changes re-render. (The internal `tree.state.nodes.drag.destinationParentId` / `destinationIndex` fields moved to `tree.state.dnd`; use `tree.dragDestinationParent` / `tree.dragDestinationIndex` instead.)
