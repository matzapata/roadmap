import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AlignMode, DistributeMode, SelectionMeta } from "./FlowMap";

type Props = {
  layoutMode: boolean;
  canUndo: boolean;
  canRedo: boolean;
  selection: SelectionMeta;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onAlign: (mode: AlignMode) => void;
  onDistribute: (mode: DistributeMode) => void;
  onEqualize: (mode: "width" | "height") => void;
  onGroup: () => void;
  onUngroup: () => void;
};

function IconUndo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 8H5.5A6.5 6.5 0 1 1 5.6 17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M8.5 4.5 5 8l3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconRedo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M16 8h2.5A6.5 6.5 0 1 0 18.4 17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M15.5 4.5 19 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 7h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 7V5h4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 7v11.5A1.5 1.5 0 0 0 9 20h6a1.5 1.5 0 0 0 1.5-1.5V7" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10 11v5M14 11v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconMore() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="6" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="18" r="1.5" fill="currentColor" />
    </svg>
  );
}

function IconAlignLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 4v16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="8" y="7" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function IconAlignCenterH() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4v16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="6.5" y="7" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function IconAlignRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M19 4v16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="5" y="7" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function IconDistributeH() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 5v14M12 5v14M20 5v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconAlignTop() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 5h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="7" y="8" width="10" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function IconAlignMiddle() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="7" y="6.5" width="10" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function IconAlignBottom() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 19h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="7" y="5" width="10" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function IconDistributeV() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 4h14M5 12h14M5 20h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconEqualizeW() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="8" width="6" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="6" width="6" height="12" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M11 12h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconEqualizeH() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="6" y="4" width="12" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="8" y="14" width="8" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 11v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconGroup() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4.5" y="4.5" width="15" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" strokeDasharray="3 2.5" />
    </svg>
  );
}

function IconUngroup() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="6.5" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="10.5" y="7.5" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

type MoreAction = {
  key: string;
  label: string;
  shortcut?: string;
  disabled: boolean;
  onClick: () => void;
  icon: ReactNode;
};

export function CanvasActionBar({
  layoutMode,
  canUndo,
  canRedo,
  selection,
  onUndo,
  onRedo,
  onDelete,
  onAlign,
  onDistribute,
  onEqualize,
  onGroup,
  onUngroup,
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!layoutMode) setMoreOpen(false);
  }, [layoutMode]);

  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: MouseEvent) => {
      if (moreRef.current?.contains(e.target as Node)) return;
      setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    const id = window.setTimeout(() => {
      window.addEventListener("mousedown", onDown);
    }, 0);
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  const canDelete = layoutMode && selection.selectedCount > 0;
  const canAlign = layoutMode && selection.alignCount >= 2;
  const canDistribute = layoutMode && selection.alignCount >= 3;
  const canGroup = layoutMode && selection.groupCount >= 2;
  const canUngroup = layoutMode && selection.canUngroup;

  const run = (fn: () => void) => {
    fn();
    setMoreOpen(false);
  };

  const moreActions: MoreAction[] = [
    { key: "left", label: "Align left", disabled: !canAlign, onClick: () => run(() => onAlign("left")), icon: <IconAlignLeft /> },
    { key: "center", label: "Align horizontal center", disabled: !canAlign, onClick: () => run(() => onAlign("center")), icon: <IconAlignCenterH /> },
    { key: "right", label: "Align right", disabled: !canAlign, onClick: () => run(() => onAlign("right")), icon: <IconAlignRight /> },
    { key: "dist-h", label: "Distribute horizontally", disabled: !canDistribute, onClick: () => run(() => onDistribute("horizontal")), icon: <IconDistributeH /> },
    { key: "top", label: "Align top", disabled: !canAlign, onClick: () => run(() => onAlign("top")), icon: <IconAlignTop /> },
    { key: "middle", label: "Align vertical center", disabled: !canAlign, onClick: () => run(() => onAlign("middle")), icon: <IconAlignMiddle /> },
    { key: "bottom", label: "Align bottom", disabled: !canAlign, onClick: () => run(() => onAlign("bottom")), icon: <IconAlignBottom /> },
    { key: "dist-v", label: "Distribute vertically", disabled: !canDistribute, onClick: () => run(() => onDistribute("vertical")), icon: <IconDistributeV /> },
    { key: "eq-w", label: "Equalize width", disabled: !canAlign, onClick: () => run(() => onEqualize("width")), icon: <IconEqualizeW /> },
    { key: "eq-h", label: "Equalize height", disabled: !canAlign, onClick: () => run(() => onEqualize("height")), icon: <IconEqualizeH /> },
    { key: "group", label: "Group", shortcut: "⌘G", disabled: !canGroup, onClick: () => run(onGroup), icon: <IconGroup /> },
    { key: "ungroup", label: "Ungroup", shortcut: "⇧⌘G", disabled: !canUngroup, onClick: () => run(onUngroup), icon: <IconUngroup /> },
  ];

  return (
    <div
      className="canvas-action-bar"
      role="toolbar"
      aria-label="Canvas actions"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="mode-icon-btn"
        aria-label="Undo"
        data-tooltip="Undo — ⌘Z"
        disabled={!canUndo}
        onClick={onUndo}
      >
        <IconUndo />
      </button>
      <button
        type="button"
        className="mode-icon-btn"
        aria-label="Redo"
        data-tooltip="Redo — ⇧⌘Z"
        disabled={!canRedo}
        onClick={onRedo}
      >
        <IconRedo />
      </button>
      <button
        type="button"
        className="mode-icon-btn"
        aria-label="Delete"
        data-tooltip="Delete"
        disabled={!canDelete}
        onClick={onDelete}
      >
        <IconTrash />
      </button>
      <div className="canvas-more-wrap" ref={moreRef}>
        <button
          type="button"
          className={`mode-icon-btn${moreOpen ? " menu-open" : ""}`}
          aria-label="Align and arrange"
          aria-haspopup="menu"
          aria-expanded={moreOpen}
          data-tooltip={moreOpen ? undefined : "Align and arrange"}
          disabled={!layoutMode}
          onClick={() => setMoreOpen((v) => !v)}
        >
          <IconMore />
        </button>
        {moreOpen ? (
          <div className="canvas-more-menu" role="menu" aria-label="Align and arrange">
            {moreActions.map((action) => (
              <button
                key={action.key}
                type="button"
                role="menuitem"
                className="mode-icon-btn"
                aria-label={action.label}
                data-tooltip={action.shortcut ? `${action.label} — ${action.shortcut}` : action.label}
                disabled={action.disabled}
                onClick={action.onClick}
              >
                {action.icon}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
