import React from "react";
import { TreeApi } from "../interfaces/tree-api.js";
import { focusNextElement, focusPrevElement } from "../utils.js";

let focusSearchTerm = "";
let timeoutId: ReturnType<typeof setTimeout> | null = null;

function isEditableTarget(target: EventTarget | null, currentTarget: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target !== currentTarget &&
    Boolean(
      target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])"),
    )
  );
}

function handleBackspace<T>(tree: TreeApi<T>) {
  if (!tree.props.onDelete) return;
  const ids = Array.from(tree.selectedIds);
  if (ids.length > 1) {
    let nextFocus = tree.mostRecentNode;
    while (nextFocus && nextFocus.isSelected) {
      nextFocus = nextFocus.nextSibling;
    }
    if (!nextFocus) nextFocus = tree.lastNode;
    tree.focus(nextFocus, { scroll: false });
    tree.delete(Array.from(ids));
    return;
  }

  const node = tree.focusedNode;
  if (!node) return;
  const sib = node.nextSibling;
  const parent = node.parent;
  tree.focus(sib || parent, { scroll: false });
  tree.delete(node);
}

function handleArrowDown<T>(e: React.KeyboardEvent<HTMLDivElement>, tree: TreeApi<T>) {
  e.preventDefault();
  const next = tree.nextNode;

  if (e.metaKey) {
    tree.select(tree.focusedNode);
    tree.activate(tree.focusedNode);
    return;
  }

  if (!e.shiftKey || tree.props.disableMultiSelection) {
    tree.focus(next);
    return;
  }

  if (!next) return;
  const current = tree.focusedNode;
  if (!current) {
    tree.focus(tree.firstNode);
  } else if (current.isSelected) {
    tree.selectContiguous(next);
  } else {
    tree.selectMulti(next);
  }
}

function handleArrowUp<T>(e: React.KeyboardEvent<HTMLDivElement>, tree: TreeApi<T>) {
  e.preventDefault();
  const prev = tree.prevNode;

  if (!e.shiftKey || tree.props.disableMultiSelection) {
    tree.focus(prev);
    return;
  }

  if (!prev) return;
  const current = tree.focusedNode;
  if (!current) {
    tree.focus(tree.lastNode);
  } else if (current.isSelected) {
    tree.selectContiguous(prev);
  } else {
    tree.selectMulti(prev);
  }
}

function handleArrowRight<T>(tree: TreeApi<T>) {
  const node = tree.focusedNode;
  if (!node) return;
  if (node.isInternal && node.isOpen) {
    tree.focus(tree.nextNode);
  } else if (node.isInternal) {
    tree.open(node.id);
  }
}

function handleArrowLeft<T>(tree: TreeApi<T>) {
  const node = tree.focusedNode;
  if (!node || node.isRoot) return;
  if (node.isInternal && node.isOpen) {
    tree.close(node.id);
  } else if (!node.parent?.isRoot) {
    tree.focus(node.parent);
  }
}

function handleSpace<T>(e: React.KeyboardEvent<HTMLDivElement>, tree: TreeApi<T>) {
  e.preventDefault();
  const node = tree.focusedNode;
  if (!node) return;
  if (node.isLeaf) {
    node.select();
    node.activate();
  } else {
    node.toggle();
  }
}

function handleEnter<T>(tree: TreeApi<T>) {
  const node = tree.focusedNode;
  if (!node || !node.isEditable || !tree.props.onRename) return;
  setTimeout(() => {
    if (node) tree.edit(node);
  });
}

function handleTypeahead<T>(key: string, tree: TreeApi<T>) {
  if (timeoutId) clearTimeout(timeoutId);
  focusSearchTerm += key;
  timeoutId = setTimeout(() => {
    focusSearchTerm = "";
  }, 600);

  const node = tree.visibleNodes.find((n) => {
    const name = (n.data as { name?: unknown })?.name;
    if (typeof name === "string") {
      return name.toLowerCase().startsWith(focusSearchTerm);
    }
    return false;
  });

  if (node) tree.focus(node.id);
}

export function handleTreeKeyDown<T>(e: React.KeyboardEvent<HTMLDivElement>, tree: TreeApi<T>) {
  if (tree.isEditing) return;
  if (isEditableTarget(e.target, e.currentTarget)) return;

  switch (e.key) {
    case "Backspace":
      handleBackspace(tree);
      return;
    case "Tab":
      e.preventDefault();
      if (e.shiftKey) {
        focusPrevElement(e.currentTarget);
      } else {
        focusNextElement(e.currentTarget);
      }
      return;
    case "ArrowDown":
      handleArrowDown(e, tree);
      return;
    case "ArrowUp":
      handleArrowUp(e, tree);
      return;
    case "ArrowRight":
      handleArrowRight(tree);
      return;
    case "ArrowLeft":
      handleArrowLeft(tree);
      return;
    case "a":
      if ((e.metaKey || e.ctrlKey) && !tree.props.disableMultiSelection) {
        e.preventDefault();
        tree.selectAll();
      } else if (!e.metaKey && !e.ctrlKey && tree.props.onCreate) {
        tree.createLeaf();
      }
      return;
    case "A":
      if (!e.metaKey && !e.ctrlKey && tree.props.onCreate) {
        tree.createInternal();
      }
      return;
    case "Home":
      e.preventDefault();
      tree.focus(tree.firstNode);
      return;
    case "End":
      e.preventDefault();
      tree.focus(tree.lastNode);
      return;
    case "Enter":
      handleEnter(tree);
      return;
    case " ":
      handleSpace(e, tree);
      return;
    case "*": {
      const node = tree.focusedNode;
      if (node) tree.openSiblings(node);
      return;
    }
    case "PageUp":
      e.preventDefault();
      tree.pageUp();
      return;
    case "PageDown":
      e.preventDefault();
      tree.pageDown();
      return;
    default:
      handleTypeahead(e.key, tree);
  }
}
