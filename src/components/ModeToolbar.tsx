import { useEffect, useState } from "react";
import type { AddNodeKind } from "./FlowMap";

export type CanvasTool = "select" | "pan";

type Props = {
  layoutMode: boolean;
  canvasTool: CanvasTool;
  onCanvasTool: (tool: CanvasTool) => void;
  onEnterEdit: () => void;
  onExitEdit: () => void;
  onAdd: (kind: AddNodeKind) => void;
};

function IconCursor() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.93 4.59v13.26l3.43-3.67 2.19 5.15 2.02-.86-2.18-5.07H17.07L6.93 4.59Z"
      />
    </svg>
  );
}

function IconPan() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.5 11.5V7.8a1.3 1.3 0 0 1 2.6 0v3.2M11.1 10.8V6.5a1.3 1.3 0 0 1 2.6 0v4.8M13.7 11V7.6a1.3 1.3 0 0 1 2.6 0V14c0 2.8-1.6 5-4.3 5.5-2.2.4-4.2-.7-5.2-2.5L5.5 14.2a1.4 1.4 0 0 1 2.3-1.5l.7 1"
      />
    </svg>
  );
}

function IconTopic() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="6" width="16" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function IconSubtopic() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="6" y="8" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function IconLabel({ bordered }: { bordered?: boolean }) {
  return (
    <span className={`mode-icon-aa${bordered ? " bordered" : ""}`} aria-hidden="true">
      Aa
    </span>
  );
}

function IconPen() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m5 19 1.2-4.5L15.8 5a2.1 2.1 0 0 1 3 3L9.3 17.5 5 19Z"
      />
    </svg>
  );
}

function IconEye() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function ModeToolbar({
  layoutMode,
  canvasTool,
  onCanvasTool,
  onEnterEdit,
  onExitEdit,
  onAdd,
}: Props) {
  const [nextLabelBordered, setNextLabelBordered] = useState(false);

  useEffect(() => {
    if (!layoutMode) setNextLabelBordered(false);
  }, [layoutMode]);

  const add = (kind: AddNodeKind) => {
    if (kind !== "label" && kind !== "label-bordered") setNextLabelBordered(false);
    onAdd(kind);
  };

  return (
    <div className="mode-toolbar" role="toolbar" aria-label="Canvas mode">
      <button
        type="button"
        className={`mode-icon-btn${canvasTool === "select" ? " active" : ""}`}
        aria-label="Select"
        aria-pressed={canvasTool === "select"}
        data-tooltip="Select"
        onClick={() => onCanvasTool("select")}
      >
        <IconCursor />
      </button>
      <button
        type="button"
        className={`mode-icon-btn${canvasTool === "pan" ? " active" : ""}`}
        aria-label="Pan"
        aria-pressed={canvasTool === "pan"}
        data-tooltip="Pan"
        onClick={() => onCanvasTool("pan")}
      >
        <IconPan />
      </button>

      {layoutMode ? (
        <>
          <span className="mode-toolbar-sep" aria-hidden="true" />
          <button
            type="button"
            className="mode-icon-btn"
            aria-label="Add topic"
            data-tooltip="Add topic"
            onClick={() => add("topic")}
          >
            <IconTopic />
          </button>
          <button
            type="button"
            className="mode-icon-btn"
            aria-label="Add subtopic"
            data-tooltip="Add subtopic"
            onClick={() => add("subtopic")}
          >
            <IconSubtopic />
          </button>
          <span className="mode-toolbar-sep" aria-hidden="true" />
          <button
            type="button"
            className={`mode-icon-btn${nextLabelBordered ? " active" : ""}`}
            aria-label={nextLabelBordered ? "Add bordered label" : "Add label"}
            data-tooltip={nextLabelBordered ? "Add bordered label" : "Add label"}
            onClick={() => {
              add(nextLabelBordered ? "label-bordered" : "label");
              setNextLabelBordered((v) => !v);
            }}
          >
            <IconLabel bordered={nextLabelBordered} />
          </button>
        </>
      ) : null}

      <span className="mode-toolbar-sep" aria-hidden="true" />
      <button
        type="button"
        className={`mode-icon-btn mode-icon-btn-mode${layoutMode ? " active" : ""}`}
        aria-label={layoutMode ? "Switch to view mode" : "Switch to edit mode"}
        aria-pressed={layoutMode}
        data-tooltip={layoutMode ? "View mode" : "Edit mode"}
        onClick={layoutMode ? onExitEdit : onEnterEdit}
      >
        {layoutMode ? <IconEye /> : <IconPen />}
      </button>
    </div>
  );
}
