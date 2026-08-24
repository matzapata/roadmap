import { useMemo, useCallback, useEffect, useRef, useState, type RefObject, type MouseEvent as ReactMouseEvent } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  ConnectionMode,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type NodeMouseHandler,
  type OnNodeDrag,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  TopicNode,
  SubtopicNode,
  TitleNode,
  LabelNode,
  ParagraphNode,
  ChecklistNode,
  SectionNode,
  VerticalNode,
  HorizontalNode,
  GroupNode,
} from "./nodes/Nodes";
import { EditContextMenu, type ContextMenuState } from "./EditContextMenu";
import type {
  BoundTopic,
  ChartEdge,
  ChartNode,
  ChartSnapshot,
  Lane,
  Progress,
  Status,
  TopicNode as TNode,
} from "../lib/types";
import type { MergedFlow } from "../lib/merge";
import { flattenTopics } from "../lib/merge";
import { FLAG_LABELS, FLAG_ORDER, flagMatches, type FlagColor, type FlagFilter } from "../lib/flags";

const nodeTypes = {
  topic: TopicNode,
  subtopic: SubtopicNode,
  title: TitleNode,
  label: LabelNode,
  paragraph: ParagraphNode,
  checklist: ChecklistNode,
  section: SectionNode,
  vertical: VerticalNode,
  horizontal: HorizontalNode,
  group: GroupNode,
};

const EDGE_STYLE = {
  stroke: "#2b78e4",
  strokeWidth: 3.5,
};

const DASHED_STROKE = "0.8 8";

function isTopicSubtopicPair(a?: string | null, b?: string | null): boolean {
  return (a === "topic" && b === "subtopic") || (a === "subtopic" && b === "topic");
}

function isTopicPair(a?: string | null, b?: string | null): boolean {
  return a === "topic" && b === "topic";
}

const RENAMEABLE_TYPES = new Set(["topic", "subtopic", "label", "title", "paragraph", "group"]);
const PAD = 16;
const GROUP_LABEL_H = 36;
const GROUP_LABEL_PAD = 4;

function derivedStatus(node: TNode, progress: Progress): Status {
  const self = (progress.nodes[node.id]?.status as Status) || "todo";
  if (!node.children?.length) return self;
  // Explicit parent status wins — otherwise a mix of done/todo children
  // forces "learning" and you cannot mark the parent done.
  if (self === "done") return "done";
  const childStatuses = node.children.map((c) => derivedStatus(c, progress));
  if (childStatuses.every((s) => s === "done")) return "done";
  if (self === "learning" || childStatuses.some((s) => s === "learning" || s === "done")) {
    return "learning";
  }
  return "todo";
}

function nodeBox(n: Node) {
  const w = Number(n.style?.width) || Number((n.data as { width?: number }).width) || 160;
  const h = Number(n.style?.height) || Number((n.data as { height?: number }).height) || 49;
  return { id: n.id, x: n.position.x, y: n.position.y, w, h, parentId: n.parentId };
}

function toFlowNodes(
  merged: MergedFlow,
  progress: Progress,
  lanes: Lane[],
  search: string,
  filter: string,
  flagFilter: FlagFilter,
  onSelect: (topic: BoundTopic) => void,
  onSetFlag: (topicId: string, flag: FlagColor | null) => void,
  layoutMode: boolean,
  onRename: (nodeId: string, label: string) => void,
  renameNonces: Record<string, number>,
): Node[] {
  const byOurId = new Map(flattenTopics(lanes).map((n) => [n.id, n]));
  const q = search.trim().toLowerCase();

  return merged.nodes.map((n) => {
    const w = n.width ?? n.measured?.width ?? (n.type === "group" ? 240 : 160);
    const h = n.height ?? n.measured?.height ?? (n.type === "group" ? 120 : 49);
    const bound = merged.binding.get(n.id) || null;
    const ours = bound ? byOurId.get(bound.id) : null;
    const status = ours ? derivedStatus(ours, progress) : undefined;
    const flag = bound ? progress.nodes[bound.id]?.flag || null : null;

    let dimmed = false;
    const filtering = !!(q || filter !== "all" || flagFilter);
    if (bound && filtering) {
      const titleHit =
        !q || bound.title.toLowerCase().includes(q) || n.data?.label?.toLowerCase().includes(q);
      const statusHit = filter === "all" || status === filter;
      const flagHit = flagMatches(flag, flagFilter);
      dimmed = !(titleHit && statusHit && flagHit);
    } else if (!bound && filtering) {
      if (n.type === "group" || n.type === "section" || n.type === "label" || n.type === "paragraph" || n.type === "title") {
        if (q) {
          const label = String(n.data?.label || "").toLowerCase();
          dimmed = !label.includes(q);
        } else {
          dimmed = true;
        }
      } else if (q) {
        const label = String(n.data?.label || "").toLowerCase();
        dimmed = !label.includes(q);
      } else if (flagFilter) {
        dimmed = true;
      }
    }

    const dataStyle = (n.data?.style && typeof n.data.style === "object" ? n.data.style : {}) as Record<
      string,
      unknown
    >;

    return {
      id: n.id,
      type: n.type,
      position: n.position,
      parentId: n.parentId,
      extent: n.parentId ? ("parent" as const) : undefined,
      draggable: layoutMode,
      selectable: layoutMode || !!bound,
      connectable: layoutMode && n.type !== "group" && n.type !== "section",
      deletable: layoutMode,
      data: {
        label: String(n.data?.label || ""),
        topicId: n.data?.topicId || bound?.id,
        topic: bound,
        status,
        flag,
        dimmed,
        style: dataStyle,
        checklists: n.data?.checklists,
        width: w,
        height: h,
        layoutMode,
        onSelect: bound && !layoutMode ? onSelect : undefined,
        onSetFlag: bound && !layoutMode ? onSetFlag : undefined,
        onRename: layoutMode ? onRename : undefined,
        renameNonce: renameNonces[n.id] || 0,
      },
      style: {
        width: w,
        height: h,
        ...(n.type === "group"
          ? { background: "transparent", border: "none", padding: 0 }
          : {}),
      },
      zIndex: n.type === "group" ? -1 : n.type === "section" ? -1 : n.type === "vertical" || n.type === "horizontal" ? 0 : 1,
    } as Node;
  });
}

/** Keep group caption labels pinned to the bottom of their parent after a resize. */
function pinGroupLabels(
  chartNodes: ChartNode[],
  resizedParentIds: Set<string>,
): ChartNode[] {
  if (!resizedParentIds.size) return chartNodes;
  const byId = new Map(chartNodes.map((n) => [n.id, n]));
  return chartNodes.map((n) => {
    if (!n.parentId || !resizedParentIds.has(n.parentId)) return n;
    if (n.type !== "label" && !n.id.endsWith("-label")) return n;
    const parent = byId.get(n.parentId);
    if (!parent) return n;
    const pw = parent.width ?? 240;
    const ph = parent.height ?? 120;
    const labelW = n.width ?? Math.min(160, Math.max(80, pw - 24));
    return {
      ...n,
      width: labelW,
      position: {
        x: (pw - labelW) / 2,
        y: ph - GROUP_LABEL_H + GROUP_LABEL_PAD,
      },
    };
  });
}

function toFlowEdges(merged: MergedFlow, layoutMode: boolean): Edge[] {
  const typeById = new Map(merged.nodes.map((n) => [n.id, n.type]));
  return merged.edges.map((e) => {
    const style = e.style || {};
    const srcType = typeById.get(e.source);
    const tgtType = typeById.get(e.target);
    let dash: string | undefined;
    let width = Number(style.strokeWidth) || EDGE_STYLE.strokeWidth;
    if (isTopicSubtopicPair(srcType, tgtType)) {
      dash = DASHED_STROKE;
      width = Number(style.strokeWidth) || 2.5;
    } else if (isTopicPair(srcType, tgtType)) {
      dash = undefined;
    } else {
      const stored = style.strokeDasharray || (e.data?.edgeStyle === "dashed" ? DASHED_STROKE : undefined);
      dash = stored && String(stored) !== "0" ? String(stored) : undefined;
    }
    const stroke = (style.stroke as string) || EDGE_STYLE.stroke;
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle || undefined,
      targetHandle: e.targetHandle || undefined,
      type: e.type === "smoothstep" ? "smoothstep" : "default",
      animated: false,
      selectable: layoutMode,
      deletable: layoutMode,
      // Keep arrows behind boxes. xyflow otherwise copies the connected
      // node z-index, so an edge can paint over an unrelated overlapping box.
      zIndex: 0,
      style: {
        stroke,
        strokeWidth: width,
        strokeDasharray: dash,
      },
    } as Edge;
  });
}

function connectionToEdge(
  c: Connection,
  sourceType?: string | null,
  targetType?: string | null,
): ChartEdge {
  const id = `edit-${c.source}-${c.target}-${c.sourceHandle || ""}-${c.targetHandle || ""}`;
  const dashed = isTopicSubtopicPair(sourceType, targetType);
  return {
    id,
    source: c.source!,
    target: c.target!,
    sourceHandle: c.sourceHandle,
    targetHandle: c.targetHandle,
    style: dashed
      ? { ...EDGE_STYLE, strokeWidth: 2.5, strokeDasharray: DASHED_STROKE }
      : { ...EDGE_STYLE },
    data: { edgeStyle: dashed ? "dashed" : "solid" },
  };
}

export type AddNodeKind = "topic" | "subtopic" | "label";
export type AlignMode = "left" | "center" | "right" | "top" | "middle" | "bottom";
export type DistributeMode = "horizontal" | "vertical";

type Props = {
  merged: MergedFlow;
  lanes: Lane[];
  progress: Progress;
  search: string;
  filter: string;
  flagFilter: FlagFilter;
  layoutMode: boolean;
  canvasTool?: "select" | "pan";
  flowRootRef?: RefObject<HTMLDivElement | null>;
  chart: ChartSnapshot;
  canUndo: boolean;
  onSelect: (topic: BoundTopic) => void;
  onSetFlag: (topicId: string, flag: FlagColor | null) => void;
  onChartChange: (chart: ChartSnapshot | ((prev: ChartSnapshot) => ChartSnapshot)) => void;
  onRename: (nodeId: string, label: string) => void;
  onRequestAdd: (kind: AddNodeKind, position: { x: number; y: number }) => void;
  onDeleteTopics: (topicIds: string[]) => void;
  onUndo: () => void;
  registerAddAtCenter?: (fn: ((kind: AddNodeKind) => void) | null) => void;
};

function FlowMapInner({
  merged,
  lanes,
  progress,
  search,
  filter,
  flagFilter,
  layoutMode,
  canvasTool = "select",
  flowRootRef,
  chart,
  canUndo,
  onSelect,
  onSetFlag,
  onChartChange,
  onRename,
  onRequestAdd,
  onDeleteTopics,
  onUndo,
  registerAddAtCenter,
}: Props) {
  const { screenToFlowPosition } = useReactFlow();
  const [renameNonces, setRenameNonces] = useState<Record<string, number>>({});
  const [ctx, setCtx] = useState<ContextMenuState | null>(null);
  const [viewCtx, setViewCtx] = useState<{
    x: number;
    y: number;
    topicId: string;
    flag: FlagColor | null;
  } | null>(null);

  const initialNodes = useMemo(
    () =>
      toFlowNodes(
        merged,
        progress,
        lanes,
        search,
        filter,
        flagFilter,
        onSelect,
        onSetFlag,
        layoutMode,
        onRename,
        renameNonces,
      ),
    [merged, progress, lanes, search, filter, flagFilter, onSelect, onSetFlag, layoutMode, onRename, renameNonces],
  );
  const initialEdges = useMemo(() => toFlowEdges(merged, layoutMode), [merged, layoutMode]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;
  const chartRef = useRef(chart);
  chartRef.current = chart;
  const bindingRef = useRef(merged.binding);
  bindingRef.current = merged.binding;

  useEffect(() => {
    setNodes((prev) => {
      const selected = new Set(prev.filter((n) => n.selected).map((n) => n.id));
      return toFlowNodes(
        merged,
        progress,
        lanes,
        search,
        filter,
        flagFilter,
        onSelect,
        onSetFlag,
        layoutMode,
        onRename,
        renameNonces,
      ).map((n) => (selected.has(n.id) ? { ...n, selected: true } : n));
    });
  }, [
    merged,
    progress,
    lanes,
    search,
    filter,
    flagFilter,
    onSelect,
    onSetFlag,
    layoutMode,
    onRename,
    renameNonces,
    setNodes,
  ]);

  useEffect(() => {
    setEdges(toFlowEdges(merged, layoutMode));
  }, [merged, layoutMode, setEdges]);

  useEffect(() => {
    if (!registerAddAtCenter) return;
    if (!layoutMode) {
      registerAddAtCenter(null);
      return;
    }
    registerAddAtCenter((kind) => {
      const el = document.querySelector(".flow-root") as HTMLElement | null;
      const rect = el?.getBoundingClientRect();
      const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
      const pos = screenToFlowPosition({ x: cx, y: cy });
      onRequestAdd(kind, { x: pos.x - 100, y: pos.y - 24 });
    });
    return () => registerAddAtCenter(null);
  }, [layoutMode, registerAddAtCenter, screenToFlowPosition, onRequestAdd]);

  const applyPositions = useCallback(
    (updates: Record<string, { x: number; y: number }>) => {
      if (!Object.keys(updates).length) return;
      setNodes((prev) => prev.map((n) => (updates[n.id] ? { ...n, position: updates[n.id] } : n)));
      onChartChange((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (updates[n.id] ? { ...n, position: updates[n.id] } : n)),
      }));
    },
    [onChartChange, setNodes],
  );

  const applySizes = useCallback(
    (updates: Record<string, { width: number; height: number }>) => {
      if (!Object.keys(updates).length) return;
      setNodes((prev) =>
        prev.map((n) => {
          const u = updates[n.id];
          if (!u) return n;
          return {
            ...n,
            style: { ...n.style, width: u.width, height: u.height },
            data: { ...n.data, width: u.width, height: u.height },
          };
        }),
      );
      onChartChange((prev) => {
        let nodes = prev.nodes.map((n) => {
          const u = updates[n.id];
          if (!u) return n;
          return { ...n, width: u.width, height: u.height };
        });
        nodes = pinGroupLabels(nodes, new Set(Object.keys(updates)));
        return { ...prev, nodes };
      });
    },
    [onChartChange, setNodes],
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      const finished = changes.filter(
        (c): c is Extract<NodeChange, { type: "dimensions" }> =>
          c.type === "dimensions" && c.resizing === false && !!c.dimensions,
      );
      if (!finished.length) return;

      const posFromBatch = new Map<string, { x: number; y: number }>();
      for (const c of changes) {
        if (c.type === "position" && c.position) posFromBatch.set(c.id, c.position);
      }
      const flowById = new Map(nodesRef.current.map((n) => [n.id, n]));

      onChartChange((prev) => {
        const resizedParents = new Set<string>();
        let nodes = prev.nodes.map((n) => {
          const change = finished.find((c) => c.id === n.id);
          if (!change?.dimensions) return n;
          resizedParents.add(n.id);
          const flow = flowById.get(n.id);
          let width = change.dimensions.width;
          let height = change.dimensions.height;
          if (n.type === "vertical") width = 20;
          if (n.type === "horizontal") height = 20;
          return {
            ...n,
            width,
            height,
            position: posFromBatch.get(n.id) || (flow ? { ...flow.position } : n.position),
          };
        });
        nodes = pinGroupLabels(nodes, resizedParents);
        return { ...prev, nodes };
      });
    },
    [onNodesChange, onChartChange],
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_evt, node) => {
      if (layoutMode) return;
      const topic = (node.data as { topic?: BoundTopic | null }).topic;
      if (topic) onSelect(topic);
    },
    [layoutMode, onSelect],
  );

  const onNodeDoubleClick: NodeMouseHandler = useCallback(
    (evt, node) => {
      if (!layoutMode || !RENAMEABLE_TYPES.has(node.type || "")) return;
      evt.stopPropagation();
      setRenameNonces((prev) => ({ ...prev, [node.id]: (prev[node.id] || 0) + 1 }));
    },
    [layoutMode],
  );

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_evt, node) => {
      applyPositions({ [node.id]: { x: node.position.x, y: node.position.y } });
    },
    [applyPositions],
  );

  const onSelectionDragStop = useCallback(
    (_evt: ReactMouseEvent, selected: Node[]) => {
      const updates: Record<string, { x: number; y: number }> = {};
      for (const n of selected) updates[n.id] = { x: n.position.x, y: n.position.y };
      applyPositions(updates);
    },
    [applyPositions],
  );

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      const ids = new Set(deleted.map((n) => n.id));
      const topicIds: string[] = [];
      for (const n of deleted) {
        const bound = bindingRef.current.get(n.id);
        const tid =
          bound?.id ||
          (typeof (n.data as { topicId?: string }).topicId === "string"
            ? (n.data as { topicId: string }).topicId
            : null);
        if (tid && (n.type === "topic" || n.type === "subtopic")) topicIds.push(tid);
      }

      onChartChange((prev) => {
        const byId = new Map(prev.nodes.map((n) => [n.id, n]));
        const nodes = prev.nodes
          .filter((n) => !ids.has(n.id))
          .map((n) => {
            if (!n.parentId || !ids.has(n.parentId)) return n;
            const parent = byId.get(n.parentId);
            if (!parent) return { ...n, parentId: undefined };
            return {
              ...n,
              parentId: undefined,
              position: {
                x: parent.position.x + n.position.x,
                y: parent.position.y + n.position.y,
              },
            };
          });
        return {
          nodes,
          edges: prev.edges.filter((e) => !ids.has(e.source) && !ids.has(e.target)),
        };
      });
      if (topicIds.length) onDeleteTopics([...new Set(topicIds)]);
    },
    [onChartChange, onDeleteTopics],
  );

  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target) return;
      const src = nodesRef.current.find((n) => n.id === c.source);
      const tgt = nodesRef.current.find((n) => n.id === c.target);
      const next = connectionToEdge(c, src?.type, tgt?.type);
      onChartChange((prev) => ({
        ...prev,
        edges: [...prev.edges.filter((e) => e.id !== next.id), next],
      }));
    },
    [onChartChange],
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      const ids = new Set(deleted.map((e) => e.id));
      onChartChange((prev) => ({
        ...prev,
        edges: prev.edges.filter((e) => !ids.has(e.id)),
      }));
    },
    [onChartChange],
  );

  const deleteSelected = useCallback(() => {
    const selectedNodes = nodesRef.current.filter((n) => n.selected);
    const selectedEdges = edgesRef.current.filter((e) => e.selected);
    if (selectedNodes.length) onNodesDelete(selectedNodes);
    if (selectedEdges.length) onEdgesDelete(selectedEdges);
    if (selectedNodes.length) {
      const ids = new Set(selectedNodes.map((n) => n.id));
      setNodes((prev) => prev.filter((n) => !ids.has(n.id)));
      setEdges((prev) => prev.filter((e) => !ids.has(e.source) && !ids.has(e.target)));
    }
    if (selectedEdges.length) {
      const ids = new Set(selectedEdges.map((e) => e.id));
      setEdges((prev) => prev.filter((e) => !ids.has(e.id)));
    }
  }, [onNodesDelete, onEdgesDelete, setNodes, setEdges]);

  const alignSelected = useCallback(
    (mode: AlignMode) => {
      const selected = nodesRef.current.filter((n) => n.selected && n.type !== "group");
      if (selected.length < 2) return;
      const boxes = selected.map(nodeBox);
      const minX = Math.min(...boxes.map((b) => b.x));
      const maxR = Math.max(...boxes.map((b) => b.x + b.w));
      const minY = Math.min(...boxes.map((b) => b.y));
      const maxB = Math.max(...boxes.map((b) => b.y + b.h));
      const midX = (minX + maxR) / 2;
      const midY = (minY + maxB) / 2;
      const updates: Record<string, { x: number; y: number }> = {};
      for (const b of boxes) {
        let x = b.x;
        let y = b.y;
        if (mode === "left") x = minX;
        else if (mode === "right") x = maxR - b.w;
        else if (mode === "center") x = midX - b.w / 2;
        else if (mode === "top") y = minY;
        else if (mode === "bottom") y = maxB - b.h;
        else if (mode === "middle") y = midY - b.h / 2;
        updates[b.id] = { x, y };
      }
      applyPositions(updates);
    },
    [applyPositions],
  );

  const distributeSelected = useCallback(
    (mode: DistributeMode) => {
      const selected = nodesRef.current.filter((n) => n.selected && n.type !== "group");
      if (selected.length < 3) return;
      const boxes = selected.map(nodeBox);
      const updates: Record<string, { x: number; y: number }> = {};

      if (mode === "horizontal") {
        const sorted = [...boxes].sort((a, b) => a.x - b.x);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const span = last.x + last.w - first.x;
        const totalW = sorted.reduce((s, b) => s + b.w, 0);
        const gap = (span - totalW) / (sorted.length - 1);
        let cursor = first.x;
        for (const b of sorted) {
          updates[b.id] = { x: cursor, y: b.y };
          cursor += b.w + gap;
        }
      } else {
        const sorted = [...boxes].sort((a, b) => a.y - b.y);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const span = last.y + last.h - first.y;
        const totalH = sorted.reduce((s, b) => s + b.h, 0);
        const gap = (span - totalH) / (sorted.length - 1);
        let cursor = first.y;
        for (const b of sorted) {
          updates[b.id] = { x: b.x, y: cursor };
          cursor += b.h + gap;
        }
      }
      applyPositions(updates);
    },
    [applyPositions],
  );

  const equalizeSelected = useCallback(
    (mode: "width" | "height") => {
      const selected = nodesRef.current.filter((n) => n.selected);
      if (selected.length < 2) return;
      const boxes = selected.map(nodeBox);
      const targetW = Math.max(...boxes.map((b) => b.w));
      const targetH = Math.max(...boxes.map((b) => b.h));
      const updates: Record<string, { width: number; height: number }> = {};
      for (const n of selected) {
        const b = boxes.find((x) => x.id === n.id)!;
        let width = b.w;
        let height = b.h;
        if (mode === "width") {
          if (n.type === "vertical") continue;
          width = targetW;
          if (n.type === "horizontal") height = 20;
        } else {
          if (n.type === "horizontal") continue;
          height = targetH;
          if (n.type === "vertical") width = 20;
        }
        updates[n.id] = { width, height };
      }
      applySizes(updates);
    },
    [applySizes],
  );

  const groupSelected = useCallback(() => {
    const selected = nodesRef.current.filter(
      (n) => n.selected && n.type !== "group" && n.type !== "section" && !n.parentId,
    );
    if (selected.length < 2) return;
    const boxes = selected.map(nodeBox);
    const minX = Math.min(...boxes.map((b) => b.x)) - PAD;
    const minY = Math.min(...boxes.map((b) => b.y)) - PAD;
    const maxR = Math.max(...boxes.map((b) => b.x + b.w)) + PAD;
    const maxB = Math.max(...boxes.map((b) => b.y + b.h)) + PAD;
    const width = maxR - minX;
    const height = maxB - minY + GROUP_LABEL_H;
    const gid = `edit-group-${Date.now().toString(36)}`;
    const groupNode: ChartNode = {
      id: gid,
      type: "section",
      position: { x: minX, y: minY },
      width,
      height,
      data: {
        style: { backgroundColor: "#ffffff", borderColor: "#000000" },
      },
    };
    const labelW = Math.min(160, Math.max(80, width - 24));
    const labelNode: ChartNode = {
      id: `${gid}-label`,
      type: "label",
      parentId: gid,
      position: { x: (width - labelW) / 2, y: height - GROUP_LABEL_H + 4 },
      width: labelW,
      height: 28,
      data: { label: "Group", style: { color: "#000000", fontSize: 17 } },
    };

    onChartChange((prev) => {
      const childIds = new Set(boxes.map((b) => b.id));
      const nodes = prev.nodes.map((n) => {
        if (!childIds.has(n.id)) return n;
        const b = boxes.find((x) => x.id === n.id)!;
        return {
          ...n,
          parentId: gid,
          position: { x: b.x - minX, y: b.y - minY },
        };
      });
      return { ...prev, nodes: [groupNode, ...nodes, labelNode] };
    });
  }, [onChartChange]);

  const ungroupSelected = useCallback(() => {
    const selected = nodesRef.current.filter((n) => n.selected);
    const parentIds = new Set(
      nodesRef.current.map((n) => n.parentId).filter(Boolean) as string[],
    );
    const groupIds = new Set(
      selected
        .filter((n) => n.type === "group" || parentIds.has(n.id))
        .map((n) => n.id)
        .concat(selected.map((n) => n.parentId).filter(Boolean) as string[]),
    );
    if (!groupIds.size) return;

    onChartChange((prev) => {
      const byId = new Map(prev.nodes.map((n) => [n.id, n]));
      const nodes = prev.nodes
        .filter((n) => !groupIds.has(n.id))
        .map((n) => {
          if (!n.parentId || !groupIds.has(n.parentId)) return n;
          const parent = byId.get(n.parentId);
          if (!parent) return { ...n, parentId: undefined };
          return {
            ...n,
            parentId: undefined,
            position: {
              x: parent.position.x + n.position.x,
              y: parent.position.y + n.position.y,
            },
          };
        });
      return { ...prev, nodes };
    });
  }, [onChartChange]);

  const renameSelected = useCallback(() => {
    const n = nodesRef.current.find((x) => x.selected && RENAMEABLE_TYPES.has(x.type || ""));
    if (!n) return;
    setRenameNonces((prev) => ({ ...prev, [n.id]: (prev[n.id] || 0) + 1 }));
  }, []);

  useEffect(() => {
    if (!layoutMode) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        deleteSelected();
        return;
      }
      const arrows: Record<string, { dx: number; dy: number }> = {
        ArrowLeft: { dx: -1, dy: 0 },
        ArrowRight: { dx: 1, dy: 0 },
        ArrowUp: { dx: 0, dy: -1 },
        ArrowDown: { dx: 0, dy: 1 },
      };
      const dir = arrows[e.key];
      if (!dir) return;
      const selected = nodesRef.current.filter((n) => n.selected);
      if (!selected.length) return;
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const updates: Record<string, { x: number; y: number }> = {};
      for (const n of selected) {
        updates[n.id] = {
          x: n.position.x + dir.dx * step,
          y: n.position.y + dir.dy * step,
        };
      }
      applyPositions(updates);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [layoutMode, deleteSelected, applyPositions]);

  const openContextMenu = useCallback(
    (clientX: number, clientY: number) => {
      if (!layoutMode) return;
      const selected = nodesRef.current.filter((n) => n.selected);
      const parentIds = new Set(
        nodesRef.current.map((n) => n.parentId).filter(Boolean) as string[],
      );
      const canUngroup = selected.some(
        (n) => n.type === "group" || !!n.parentId || parentIds.has(n.id),
      );
      const canRename = selected.some((n) => RENAMEABLE_TYPES.has(n.type || ""));
      setCtx({
        x: clientX,
        y: clientY,
        selectedCount: selected.length || edgesRef.current.filter((e) => e.selected).length,
        canUngroup,
        canRename,
      });
    },
    [layoutMode],
  );

  const panTool = canvasTool === "pan";

  return (
    <div
      ref={flowRootRef}
      className={`flow-root${layoutMode ? " layout-mode" : ""}${panTool ? " pan-tool" : ""}`}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onNodesDelete={onNodesDelete}
        onNodeDragStop={onNodeDragStop}
        onSelectionDragStop={onSelectionDragStop}
        onPaneContextMenu={(e) => {
          e.preventDefault();
          openContextMenu(e.clientX, e.clientY);
        }}
        onNodeContextMenu={(e, node) => {
          e.preventDefault();
          if (layoutMode) {
            if (!node.selected) {
              setNodes((prev) => prev.map((n) => ({ ...n, selected: n.id === node.id })));
            }
            openContextMenu(e.clientX, e.clientY);
            return;
          }
          const bound = bindingRef.current.get(node.id);
          if (!bound) return;
          setViewCtx({
            x: e.clientX,
            y: e.clientY,
            topicId: bound.id,
            flag: progress.nodes[bound.id]?.flag || null,
          });
        }}
        onSelectionContextMenu={(e) => {
          e.preventDefault();
          openContextMenu(e.clientX, e.clientY);
        }}
        nodesDraggable={layoutMode && !panTool}
        nodesConnectable={layoutMode && !panTool}
        edgesReconnectable={false}
        elementsSelectable={!panTool}
        edgesFocusable={layoutMode && !panTool}
        multiSelectionKeyCode="Shift"
        selectionOnDrag={layoutMode && !panTool}
        panOnDrag={panTool ? true : [1, 2]}
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={{ style: EDGE_STYLE, zIndex: 0 }}
        elevateEdgesOnSelect={false}
        zIndexMode="manual"
        connectionLineStyle={EDGE_STYLE}
        panOnScroll
        zoomOnScroll
        connectionRadius={28}
        minZoom={0.15}
        maxZoom={2}
        fitView
        fitViewOptions={{ padding: 0.08 }}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: false }}
      >
        <Background gap={24} color="#ececec" />
        <Controls position="bottom-left" showInteractive={false} />
      </ReactFlow>
      {ctx && layoutMode ? (
        <EditContextMenu
          menu={ctx}
          onClose={() => setCtx(null)}
          onAlign={alignSelected}
          onDistribute={distributeSelected}
          onEqualize={equalizeSelected}
          onGroup={groupSelected}
          onUngroup={ungroupSelected}
          onDelete={deleteSelected}
          onRename={renameSelected}
          onUndo={onUndo}
          canUndo={canUndo}
        />
      ) : null}
      {viewCtx && !layoutMode ? (
        <>
          <div
            className="ctx-backdrop"
            onClick={() => setViewCtx(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setViewCtx(null);
            }}
          />
          <div className="ctx-menu" style={{ left: viewCtx.x, top: viewCtx.y }} role="menu">
            <p className="ctx-label">Flag</p>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onSetFlag(viewCtx.topicId, null);
                setViewCtx(null);
              }}
            >
              None
            </button>
            {FLAG_ORDER.map((c) => (
              <button
                key={c}
                type="button"
                role="menuitem"
                className={viewCtx.flag === c ? "active" : ""}
                onClick={() => {
                  onSetFlag(viewCtx.topicId, c);
                  setViewCtx(null);
                }}
              >
                {FLAG_LABELS[c]}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function FlowMap(props: Props) {
  return (
    <ReactFlowProvider>
      <FlowMapInner {...props} />
    </ReactFlowProvider>
  );
}

export function makeAddedNode(
  kind: AddNodeKind,
  id: string,
  label: string,
  position: { x: number; y: number },
  topicId?: string,
): ChartNode {
  const type = kind === "label" ? "label" : kind;
  const width = kind === "label" ? 160 : 200;
  const height = kind === "label" ? 28 : 49;
  return {
    id,
    type,
    position,
    width,
    height,
    data: {
      label,
      ...(topicId ? { topicId } : {}),
      ...(kind === "label" ? { style: { color: "#000000", fontSize: 17 } } : {}),
    },
  };
}
