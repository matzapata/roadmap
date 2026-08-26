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
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
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
  onRedo,
  canUndo,
  canRedo,
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
        <button type="button" role="menuitem" disabled={!canRedo} onClick={() => run(onRedo)}>
          Redo
          <kbd>⇧⌘Z</kbd>
        </button>
        <button type="button" role="menuitem" disabled={!menu.canRename} onClick={() => run(onRename)}>
          Edit text
          <kbd>Dbl-click</kbd>
        </button>
        <hr />
        <div className={`ctx-submenu-wrap${menu.selectedCount < 2 ? " disabled" : ""}`} role="none">
          <button
            type="button"
            className="ctx-submenu-trigger"
            role="menuitem"
            aria-haspopup="menu"
            disabled={menu.selectedCount < 2}
          >
            Align
            <span className="ctx-chevron" aria-hidden="true">
              &rsaquo;
            </span>
          </button>
          <div className="ctx-submenu" role="menu">
            <button type="button" role="menuitem" onClick={() => run(() => onAlign("left"))}>
              Left
            </button>
            <button type="button" role="menuitem" onClick={() => run(() => onAlign("center"))}>
              Center
            </button>
            <button type="button" role="menuitem" onClick={() => run(() => onAlign("right"))}>
              Right
            </button>
            <button type="button" role="menuitem" onClick={() => run(() => onAlign("top"))}>
              Top
            </button>
            <button type="button" role="menuitem" onClick={() => run(() => onAlign("middle"))}>
              Middle
            </button>
            <button type="button" role="menuitem" onClick={() => run(() => onAlign("bottom"))}>
              Bottom
            </button>
          </div>
        </div>
        <div className={`ctx-submenu-wrap${menu.selectedCount < 3 ? " disabled" : ""}`} role="none">
          <button
            type="button"
            className="ctx-submenu-trigger"
            role="menuitem"
            aria-haspopup="menu"
            disabled={menu.selectedCount < 3}
          >
            Distribute
            <span className="ctx-chevron" aria-hidden="true">
              &rsaquo;
            </span>
          </button>
          <div className="ctx-submenu" role="menu">
            <button type="button" role="menuitem" onClick={() => run(() => onDistribute("horizontal"))}>
              Horizontal
            </button>
            <button type="button" role="menuitem" onClick={() => run(() => onDistribute("vertical"))}>
              Vertical
            </button>
          </div>
        </div>
        <div className={`ctx-submenu-wrap${menu.selectedCount < 2 ? " disabled" : ""}`} role="none">
          <button
            type="button"
            className="ctx-submenu-trigger"
            role="menuitem"
            aria-haspopup="menu"
            disabled={menu.selectedCount < 2}
          >
            Size
            <span className="ctx-chevron" aria-hidden="true">
              &rsaquo;
            </span>
          </button>
          <div className="ctx-submenu" role="menu">
            <button type="button" role="menuitem" onClick={() => run(() => onEqualize("width"))}>
              Width
            </button>
            <button type="button" role="menuitem" onClick={() => run(() => onEqualize("height"))}>
              Height
            </button>
          </div>
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
