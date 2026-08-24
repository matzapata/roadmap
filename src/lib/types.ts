import type { FlagColor } from "./flags";

export type Status = "todo" | "learning" | "done";

export type ProgressEntry = {
  status: Status;
  notes: string;
  flag?: FlagColor | null;
  updatedAt?: string | null;
};

export type Progress = {
  version: number;
  nodes: Record<string, ProgressEntry>;
};

export type TopicNode = {
  id: string;
  title: string;
  file?: string;
  children?: TopicNode[];
};

export type Lane = {
  id: string;
  title: string;
  nodes: TopicNode[];
};

export type ChartNode = {
  id: string;
  type: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  measured?: { width: number; height: number };
  parentId?: string;
  style?: Record<string, unknown>;
  data?: {
    label?: string;
    topicId?: string;
    style?: Record<string, unknown>;
    checklists?: { id: string; label: string }[];
    links?: { id: string; label: string; url?: string }[];
    href?: string;
    colorType?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type ChartEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  style?: Record<string, unknown>;
  data?: { edgeStyle?: string; [key: string]: unknown };
  [key: string]: unknown;
};

/** @deprecated use ChartNode */
export type OfficialNode = ChartNode;
/** @deprecated use ChartEdge */
export type OfficialEdge = ChartEdge;

export type RoadmapGraph = {
  title: string;
  description?: string;
  lanes: Lane[];
  nodes?: ChartNode[];
  edges?: ChartEdge[];
};

export type RoadmapBundle = {
  version: number;
  kind: "roadmap";
  id: string;
  title: string;
  description?: string;
  lanes: Lane[];
  nodes: ChartNode[];
  edges: ChartEdge[];
  notes: Record<string, string>;
  progress: Progress;
};

export type RoadmapListItem = {
  id: string;
  title: string;
  topicCount?: number;
};

export type BoundTopic = {
  id: string;
  title: string;
};

export type TopicData = {
  label: string;
  topic?: BoundTopic | null;
  status?: Status;
  flag?: FlagColor | null;
  dimmed?: boolean;
  style?: Record<string, unknown>;
  checklists?: { id: string; label: string }[];
  width?: number;
  height?: number;
  onSelect?: (topic: BoundTopic) => void;
  onSetFlag?: (topicId: string, flag: FlagColor | null) => void;
  layoutMode?: boolean;
  onRename?: (nodeId: string, label: string) => void;
  renameNonce?: number;
};

export type ChartSnapshot = {
  nodes: ChartNode[];
  edges: ChartEdge[];
};

export function emptyChart(): ChartSnapshot {
  return { nodes: [], edges: [] };
}

export function cloneChart(c: ChartSnapshot): ChartSnapshot {
  return structuredClone(c);
}
