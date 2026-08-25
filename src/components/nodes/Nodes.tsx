import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import {
  Handle,
  NodeResizer,
  NodeResizeControl,
  Position,
  ResizeControlVariant,
  type NodeProps,
} from "@xyflow/react";
import type { TopicData } from "../../lib/types";
import { FlagSelect } from "../FlagSelect";

/** roadmap.sh handle ids: x=bottom, w=top, y=left, z=right */
export function RoadmapHandles({ connectable = false }: { connectable?: boolean }) {
  return (
    <>
      <Handle type="target" position={Position.Top} id="w1" className="rf-handle" isConnectable={connectable} />
      <Handle type="source" position={Position.Top} id="w2" className="rf-handle" isConnectable={connectable} />
      <Handle type="target" position={Position.Bottom} id="x1" className="rf-handle" isConnectable={connectable} />
      <Handle type="source" position={Position.Bottom} id="x2" className="rf-handle" isConnectable={connectable} />
      <Handle type="target" position={Position.Left} id="y1" className="rf-handle" isConnectable={connectable} />
      <Handle type="source" position={Position.Left} id="y2" className="rf-handle" isConnectable={connectable} />
      <Handle type="target" position={Position.Right} id="z1" className="rf-handle" isConnectable={connectable} />
      <Handle type="source" position={Position.Right} id="z2" className="rf-handle" isConnectable={connectable} />
    </>
  );
}

function statusClass(status?: string) {
  if (status === "learning") return "status-learning";
  if (status === "done") return "status-done";
  return "status-todo";
}

function FlagControl({ data }: { data: TopicData }) {
  const canEdit = !!data.topic && !!data.onSetFlag && !data.layoutMode;
  if (!data.flag && !canEdit) return null;
  return (
    <FlagSelect
      variant="dot"
      className="nodrag nopan"
      value={data.flag || null}
      disabled={!canEdit}
      onChange={(flag) => data.onSetFlag?.(data.topic!.id, flag)}
    />
  );
}

/** Corner-only resizer for boxes (edge lines hidden via CSS so they don't cover connection dots). */
function BoxResizer({
  selected,
  layoutMode,
  minWidth = 64,
  minHeight = 32,
}: {
  selected?: boolean;
  layoutMode?: boolean;
  minWidth?: number;
  minHeight?: number;
}) {
  return (
    <NodeResizer
      isVisible={!!layoutMode && !!selected}
      minWidth={minWidth}
      minHeight={minHeight}
      color="#4136d6"
      handleClassName="rf-resize-handle"
      lineClassName="rf-resize-line"
    />
  );
}

function EditableLabel({
  nodeId,
  label,
  layoutMode,
  onRename,
  className,
  renameNonce,
}: {
  nodeId: string;
  label: string;
  layoutMode?: boolean;
  onRename?: (nodeId: string, label: string) => void;
  className?: string;
  renameNonce?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastNonce = useRef(renameNonce ?? 0);

  useEffect(() => {
    setDraft(label);
  }, [label]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!layoutMode || !onRename) return;
    const n = renameNonce ?? 0;
    if (n > 0 && n !== lastNonce.current) {
      lastNonce.current = n;
      setEditing(true);
    }
  }, [renameNonce, layoutMode, onRename]);

  if (!layoutMode || !onRename) {
    return <span className={className}>{label}</span>;
  }

  if (editing) {
    const commit = () => {
      const next = draft.trim() || label;
      setEditing(false);
      if (next !== label) onRename(nodeId, next);
      else setDraft(label);
    };
    return (
      <input
        ref={inputRef}
        className="rf-rename nodrag nopan"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e: KeyboardEvent) => {
          e.stopPropagation();
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(label);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <span
      className={className || ""}
      onDoubleClick={(e: MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setEditing(true);
      }}
      title="Double-click to rename"
    >
      {label}
    </span>
  );
}

export function TopicNode({ id, data, selected }: NodeProps) {
  const d = data as TopicData;
  const clickable = !!d.topic && !d.layoutMode;
  return (
    <div
      className={`rf-box rf-topic ${statusClass(d.status)} ${clickable ? "clickable" : ""} ${
        d.dimmed ? "dimmed" : ""
      } ${selected ? "selected" : ""} ${d.flag ? "flagged" : ""}`}
      style={{
        width: "100%",
        height: "100%",
        textAlign: "center",
        justifyContent: "center",
      }}
      onClick={() => {
        if (d.topic && d.onSelect) d.onSelect(d.topic);
      }}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && d.topic && d.onSelect) {
          e.preventDefault();
          d.onSelect(d.topic);
        }
      }}
    >
      <BoxResizer selected={selected} layoutMode={d.layoutMode} />
      <RoadmapHandles connectable={!!d.layoutMode} />
      <FlagControl data={d} />
      <EditableLabel
        nodeId={id}
        label={d.label}
        layoutMode={d.layoutMode}
        onRename={d.onRename}
        renameNonce={d.renameNonce}
        className="rf-label"
      />
    </div>
  );
}

export function SubtopicNode({ id, data, selected }: NodeProps) {
  const d = data as TopicData;
  const clickable = !!d.topic && !d.layoutMode;
  return (
    <div
      className={`rf-box rf-subtopic ${statusClass(d.status)} ${clickable ? "clickable" : ""} ${
        d.dimmed ? "dimmed" : ""
      } ${selected ? "selected" : ""} ${d.flag ? "flagged" : ""}`}
      style={{
        width: "100%",
        height: "100%",
        textAlign: "center",
        justifyContent: "center",
      }}
      onClick={() => {
        if (d.topic && d.onSelect) d.onSelect(d.topic);
      }}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && d.topic && d.onSelect) {
          e.preventDefault();
          d.onSelect(d.topic);
        }
      }}
    >
      <BoxResizer selected={selected} layoutMode={d.layoutMode} />
      <RoadmapHandles connectable={!!d.layoutMode} />
      <FlagControl data={d} />
      <EditableLabel
        nodeId={id}
        label={d.label}
        layoutMode={d.layoutMode}
        onRename={d.onRename}
        renameNonce={d.renameNonce}
        className="rf-label"
      />
    </div>
  );
}

export function TitleNode({ id, data, selected }: NodeProps) {
  const d = data as TopicData;
  const fontSize = (d.style?.fontSize as number) || 28;
  return (
    <div
      className={`rf-title ${d.dimmed ? "dimmed" : ""} ${selected ? "selected" : ""}`}
      style={{ width: "100%", height: "100%", fontSize, textAlign: "center" }}
    >
      <BoxResizer selected={selected} layoutMode={d.layoutMode} minWidth={80} minHeight={36} />
      <RoadmapHandles connectable={!!d.layoutMode} />
      <EditableLabel
        nodeId={id}
        label={d.label}
        layoutMode={d.layoutMode}
        onRename={d.onRename}
        renameNonce={d.renameNonce}
      />
    </div>
  );
}

export function LabelNode({ id, data, selected }: NodeProps) {
  const d = data as TopicData;
  const color = (d.style?.color as string) || "#000000";
  const fontSize = (d.style?.fontSize as number) || 17;
  return (
    <div
      className={`rf-step-label ${d.dimmed ? "dimmed" : ""} ${selected ? "selected" : ""}`}
      style={{
        color,
        fontSize,
        width: "100%",
        height: "100%",
        textAlign: (d.style?.textAlign as CSSProperties["textAlign"]) || "center",
      }}
    >
      <BoxResizer selected={selected} layoutMode={d.layoutMode} minWidth={40} minHeight={20} />
      <RoadmapHandles connectable={!!d.layoutMode} />
      <EditableLabel
        nodeId={id}
        label={d.label}
        layoutMode={d.layoutMode}
        onRename={d.onRename}
        renameNonce={d.renameNonce}
      />
    </div>
  );
}

export function GroupNode({ id, data, selected }: NodeProps) {
  const d = data as TopicData;
  return (
    <div
      className={`rf-group ${selected ? "selected" : ""} ${d.dimmed ? "dimmed" : ""}`}
      style={{ width: "100%", height: "100%" }}
    >
      <BoxResizer selected={selected} layoutMode={d.layoutMode} minWidth={80} minHeight={60} />
      <RoadmapHandles connectable={!!d.layoutMode} />
      {d.label || d.layoutMode ? (
        <EditableLabel
          nodeId={id}
          label={d.label}
          layoutMode={d.layoutMode}
          onRename={d.onRename}
          renameNonce={d.renameNonce}
          className="rf-group-label"
        />
      ) : null}
    </div>
  );
}

export function SectionNode({ data, selected }: NodeProps) {
  const d = data as TopicData;
  const bg = (d.style?.backgroundColor as string) || "#fff";
  const border = (d.style?.borderColor as string) || "#000";
  return (
    <div
      className={`rf-section ${selected ? "selected" : ""} ${d.dimmed ? "dimmed" : ""}`}
      style={{
        width: "100%",
        height: "100%",
        background: d.dimmed ? "#ececec" : bg,
        borderColor: d.dimmed ? "#bdbdbd" : border,
      }}
    >
      <BoxResizer selected={selected} layoutMode={d.layoutMode} minWidth={80} minHeight={60} />
      <RoadmapHandles connectable={!!d.layoutMode} />
    </div>
  );
}

export function ParagraphNode({ id, data, selected }: NodeProps) {
  const d = data as TopicData;
  const bg = (d.style?.backgroundColor as string) || "transparent";
  const border = (d.style?.borderColor as string) || "transparent";
  const transparent =
    String(border).toLowerCase() === "transparent" &&
    (String(bg).toLowerCase() === "transparent" || !bg);
  return (
    <div
      className={`rf-paragraph ${transparent ? "bare" : ""} ${d.dimmed ? "dimmed" : ""} ${
        selected ? "selected" : ""
      }`}
      style={{
        width: "100%",
        height: "100%",
        background: transparent ? "transparent" : bg === "WHITe" || bg === "white" ? "#fff" : bg,
        borderColor: transparent ? "transparent" : border,
        fontSize: (d.style?.fontSize as number) || 17,
        textAlign: (d.style?.textAlign as CSSProperties["textAlign"]) || "center",
        justifyContent: "center",
      }}
    >
      <BoxResizer selected={selected} layoutMode={d.layoutMode} />
      <RoadmapHandles connectable={!!d.layoutMode} />
      {d.layoutMode && d.onRename ? (
        <EditableLabel
          nodeId={id}
          label={d.label}
          layoutMode={d.layoutMode}
          onRename={d.onRename}
          renameNonce={d.renameNonce}
        />
      ) : (
        d.label
      )}
    </div>
  );
}

export function ChecklistNode({ data, selected }: NodeProps) {
  const d = data as TopicData;
  return (
    <div
      className={`rf-checklist ${selected ? "selected" : ""}`}
      style={{ width: "100%", height: "100%" }}
    >
      <BoxResizer selected={selected} layoutMode={d.layoutMode} />
      <RoadmapHandles connectable={!!d.layoutMode} />
      <ul>
        {(d.checklists || []).map((item) => (
          <li key={item.id}>
            <span className="check-box" />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function VerticalNode({ data, selected }: NodeProps) {
  const d = data as TopicData;
  const style = d.style || {};
  const stroke = (style.stroke as string) || "#2B78E4";
  const width = Number(style.strokeWidth) || 3.5;
  const dash = style.strokeDasharray ? String(style.strokeDasharray) : undefined;
  const show = !!d.layoutMode && !!selected;
  return (
    <div className={`rf-line-node ${selected ? "selected" : ""} ${d.dimmed ? "dimmed" : ""}`} style={{ width: "100%", height: "100%" }}>
      {show ? (
        <>
          <NodeResizeControl
            position="top"
            variant={ResizeControlVariant.Line}
            minWidth={20}
            maxWidth={20}
            minHeight={20}
            color="#4136d6"
            className="rf-resize-line"
          />
          <NodeResizeControl
            position="bottom"
            variant={ResizeControlVariant.Line}
            minWidth={20}
            maxWidth={20}
            minHeight={20}
            color="#4136d6"
            className="rf-resize-line"
          />
        </>
      ) : null}
      <RoadmapHandles connectable={!!d.layoutMode} />
      <svg width="100%" height="100%" className="rf-line-svg" preserveAspectRatio="none">
        <line
          x1="50%"
          y1="0"
          x2="50%"
          y2="100%"
          stroke={stroke}
          strokeWidth={width}
          strokeLinecap="round"
          strokeDasharray={dash}
        />
      </svg>
    </div>
  );
}

export function HorizontalNode({ data, selected }: NodeProps) {
  const d = data as TopicData;
  const style = d.style || {};
  const stroke = (style.stroke as string) || "#000000";
  const width = Number(style.strokeWidth) || 3;
  const dash = style.strokeDasharray ? String(style.strokeDasharray) : undefined;
  const show = !!d.layoutMode && !!selected;
  return (
    <div className={`rf-line-node ${selected ? "selected" : ""} ${d.dimmed ? "dimmed" : ""}`} style={{ width: "100%", height: "100%" }}>
      {show ? (
        <>
          <NodeResizeControl
            position="left"
            variant={ResizeControlVariant.Line}
            minHeight={20}
            maxHeight={20}
            minWidth={40}
            color="#4136d6"
            className="rf-resize-line"
          />
          <NodeResizeControl
            position="right"
            variant={ResizeControlVariant.Line}
            minHeight={20}
            maxHeight={20}
            minWidth={40}
            color="#4136d6"
            className="rf-resize-line"
          />
        </>
      ) : null}
      <RoadmapHandles connectable={!!d.layoutMode} />
      <svg width="100%" height="100%" className="rf-line-svg" preserveAspectRatio="none">
        <line
          x1="0"
          y1="50%"
          x2="100%"
          y2="50%"
          stroke={stroke}
          strokeWidth={width}
          strokeLinecap="round"
          strokeDasharray={dash}
        />
      </svg>
    </div>
  );
}
