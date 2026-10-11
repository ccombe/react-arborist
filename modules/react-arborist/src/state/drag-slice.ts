import { ActionTypes } from "../types/utils.js";
import { actions as dnd } from "./dnd-slice.js";
import { initialState } from "./initial.js";

/* Types */

export type DragSlice = {
  id: string | null;
  selectedIds: string[];
};

/* Reducer */

export function reducer(
  state: DragSlice = initialState().nodes.drag,
  action: ActionTypes<typeof dnd>,
): DragSlice {
  switch (action.type) {
    case "DND_DRAG_START":
      return { ...state, id: action.id, selectedIds: action.dragIds };
    case "DND_DRAG_END":
      return { ...state, id: null, selectedIds: [] };
    default:
      return state;
  }
}
