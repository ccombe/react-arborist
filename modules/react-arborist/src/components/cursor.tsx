import { useDndContext, useTreeApi } from "../context.js";
import { DefaultCursor } from "./default-cursor.js";

export function Cursor() {
  const tree = useTreeApi();
  const state = useDndContext();
  const cursor = state.cursor;
  if (!cursor || cursor.type !== "line") return null;
  const indent = tree.indent;
  const top =
    tree.rowTopPosition(cursor.index) + (tree.props.padding ?? tree.props.paddingTop ?? 0);
  const left = indent * cursor.level;
  const Cursor = tree.props.renderCursor || DefaultCursor;
  return <Cursor {...{ top, left, indent }} />;
}
