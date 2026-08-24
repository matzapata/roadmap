import type { AlignMode, DistributeMode } from "./FlowMap";

export type ContextMenuState = {
  x: number;
  y: number;
  selectedCount: number;
  canUngroup: boolean;
  canRename: boolean;
};

type Props = {
  menu: ContextMenuState;
  onClose: () => void;
  onAlign: (mode: AlignMode) => void;
  onDistribute: (mode: DistributeMode) => void;
  onEqualize: (mode: "width" | "height") => void;
  onGroup: () => void;
  onUngroup: () => void;
  onDelete: () => void;
  onRename: () => void;
  onUndo: () => void;
  canUndo: boolean;
};

export function EditContextMenu({
  menu,
  onClose,
  onAlign,
  onDistribute,
  onEqualize,
  onGroup,
  onUngroup,
  onDelete,
  onRename,
  onUndo,
  canUndo,
}: Props) {
  const run = (fn: () => void) => {
    fn();
    onClose();
  };

  return (
    <>
      <div className="ctx-backdrop" onClick={onClose} onContextMenu={(e) => e.preventDefault()} />
      <div
        className="ctx-menu"
        style={{ left: menu.x, top: menu.y }}
        role="menu"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" role="menuitem" disabled={!canUndo} onClick={() => run(onUndo)}>
          Undo
          <kbd>⌘Z</kbd>
        </button>
        <button type="button" role="menuitem" disabled={!menu.canRename} onClick={() => run(onRename)}>
          Edit text
          <kbd>Dbl-click</kbd>
        </button>
        <hr />
        <p className="ctx-label">Align</p>
        <div className="ctx-row">
          <button type="button" disabled={menu.selectedCount < 2} onClick={() => run(() => onAlign("left"))}>
            Left
          </button>
          <button type="button" disabled={menu.selectedCount < 2} onClick={() => run(() => onAlign("center"))}>
            Center
          </button>
          <button type="button" disabled={menu.selectedCount < 2} onClick={() => run(() => onAlign("right"))}>
            Right
          </button>
        </div>
        <div className="ctx-row">
          <button type="button" disabled={menu.selectedCount < 2} onClick={() => run(() => onAlign("top"))}>
            Top
          </button>
          <button type="button" disabled={menu.selectedCount < 2} onClick={() => run(() => onAlign("middle"))}>
            Middle
          </button>
          <button type="button" disabled={menu.selectedCount < 2} onClick={() => run(() => onAlign("bottom"))}>
            Bottom
          </button>
        </div>
        <p className="ctx-label">Distribute</p>
        <div className="ctx-row">
          <button
            type="button"
            disabled={menu.selectedCount < 3}
            onClick={() => run(() => onDistribute("horizontal"))}
          >
            Horizontal
          </button>
          <button
            type="button"
            disabled={menu.selectedCount < 3}
            onClick={() => run(() => onDistribute("vertical"))}
          >
            Vertical
          </button>
        </div>
        <p className="ctx-label">Size</p>
        <div className="ctx-row">
          <button
            type="button"
            disabled={menu.selectedCount < 2}
            onClick={() => run(() => onEqualize("width"))}
          >
            Width
          </button>
          <button
            type="button"
            disabled={menu.selectedCount < 2}
            onClick={() => run(() => onEqualize("height"))}
          >
            Height
          </button>
        </div>
        <hr />
        <button type="button" role="menuitem" disabled={menu.selectedCount < 2} onClick={() => run(onGroup)}>
          Group
        </button>
        <button type="button" role="menuitem" disabled={!menu.canUngroup} onClick={() => run(onUngroup)}>
          Ungroup
        </button>
        <button type="button" role="menuitem" className="danger" disabled={menu.selectedCount < 1} onClick={() => run(onDelete)}>
          Delete
        </button>
      </div>
    </>
  );
}
