import type {
  ChartNode,
  ChartEdge,
  Lane,
  Progress,
  ProgressEntry,
  RoadmapBundle,
  Status,
  TopicNode,
} from "./types";
import { parseFlag } from "./flags";

export const BUNDLE_VERSION = 1;

export function emptyProgress(): Progress {
  return { version: 1, nodes: {} };
}

export function emptyBundle(title = "New roadmap"): RoadmapBundle {
  const id = `map-${Date.now().toString(36)}`;
  return {
    version: BUNDLE_VERSION,
    kind: "roadmap",
    id,
    title,
    description: "",
    lanes: [{ id: "main", title: "Main", nodes: [] }],
    nodes: [],
    edges: [],
    notes: {},
    progress: emptyProgress(),
  };
}

export function validateBundle(data: unknown): RoadmapBundle {
  if (!data || typeof data !== "object") throw new Error("Invalid bundle: expected object");
  const raw = data as Record<string, unknown>;

  if (raw.kind !== "roadmap") throw new Error("Invalid bundle: kind must be \"roadmap\"");
  if (raw.version !== BUNDLE_VERSION) {
    throw new Error(`Unsupported bundle version: ${raw.version}`);
  }
  if (typeof raw.id !== "string" || !raw.id.trim()) throw new Error("Invalid bundle: id required");
  if (typeof raw.title !== "string") throw new Error("Invalid bundle: title required");
  if (!Array.isArray(raw.lanes)) throw new Error("Invalid bundle: lanes must be an array");

  const nodes = Array.isArray(raw.nodes) ? (raw.nodes as ChartNode[]) : [];
  const edges = Array.isArray(raw.edges) ? (raw.edges as ChartEdge[]) : [];
  const notes =
    raw.notes && typeof raw.notes === "object" && !Array.isArray(raw.notes)
      ? (raw.notes as Record<string, string>)
      : {};

  return {
    version: BUNDLE_VERSION,
    kind: "roadmap",
    id: raw.id.trim(),
    title: raw.title,
    description: typeof raw.description === "string" ? raw.description : "",
    lanes: raw.lanes as Lane[],
    nodes,
    edges,
    notes,
    progress: normalizeProgress(raw.progress),
  };
}

export function normalizeProgress(data: unknown): Progress {
  if (!data || typeof data !== "object") return emptyProgress();
  const raw = data as Progress;
  const nodes: Progress["nodes"] = {};
  for (const [k, v] of Object.entries(raw.nodes || {})) {
    if (!v || typeof v !== "object") continue;
    const status = ["todo", "learning", "done"].includes(v.status) ? v.status : "todo";
    nodes[k] = {
      status: status as Status,
      notes: typeof v.notes === "string" ? v.notes : "",
      flag: parseFlag((v as { flag?: unknown; flagged?: unknown }).flag ?? (v as { flagged?: unknown }).flagged),
      updatedAt: v.updatedAt || null,
    };
  }
  return { version: raw.version || 1, nodes };
}

export function flattenTopics(lanes: Lane[]): TopicNode[] {
  const out: TopicNode[] = [];
  function walk(nodes: TopicNode[]) {
    for (const n of nodes || []) {
      out.push(n);
      if (n.children?.length) walk(n.children);
    }
  }
  for (const lane of lanes) walk(lane.nodes);
  return out;
}

export function collectTopicIds(lanes: Lane[]): Set<string> {
  const ids = new Set<string>();
  for (const n of flattenTopics(lanes)) ids.add(n.id);
  return ids;
}

export function slugifyTopic(title: string): string {
  const s = title.trim().toLowerCase();
  const out: string[] = [];
  let prevDash = false;
  for (const ch of s) {
    if (/[a-z0-9]/.test(ch)) {
      out.push(ch);
      prevDash = false;
    } else if (!prevDash) {
      out.push("-");
      prevDash = true;
    }
  }
  const slug = out.join("").replace(/^-+|-+$/g, "");
  return slug || "topic";
}

export function ensureAddedLane(lanes: Lane[]): Lane[] {
  if (lanes.some((l) => l.id === "added")) return lanes;
  return [...lanes, { id: "added", title: "Added", nodes: [] }];
}

export function createTopicInBundle(
  bundle: RoadmapBundle,
  title: string,
  kind: "topic" | "subtopic",
): { bundle: RoadmapBundle; topicId: string } {
  const lanes = ensureAddedLane(structuredClone(bundle.lanes));
  const existing = new Set(flattenTopics(lanes).map((n) => n.id));
  const base = slugifyTopic(title);
  let topicId = base;
  let n = 2;
  while (existing.has(topicId)) {
    topicId = `${base}-${n}`;
    n++;
  }

  const lane = lanes.find((l) => l.id === "added")!;
  lane.nodes.push({ id: topicId, title, children: kind === "subtopic" ? undefined : [] });

  return {
    bundle: {
      ...bundle,
      lanes,
      notes: { ...bundle.notes, [topicId]: "" },
    },
    topicId,
  };
}

export function renameTopicInBundle(bundle: RoadmapBundle, topicId: string, title: string): RoadmapBundle {
  function patch(nodes: TopicNode[]): TopicNode[] {
    return nodes.map((n) => ({
      ...n,
      title: n.id === topicId ? title : n.title,
      children: n.children ? patch(n.children) : undefined,
    }));
  }
  return {
    ...bundle,
    lanes: bundle.lanes.map((lane) => ({ ...lane, nodes: patch(lane.nodes) })),
  };
}

export function removeTopicFromLanes(lanes: Lane[], topicId: string): Lane[] {
  function filterNodes(nodes: TopicNode[]): TopicNode[] {
    return (nodes || [])
      .filter((n) => n.id !== topicId)
      .map((n) => ({
        ...n,
        children: n.children ? filterNodes(n.children) : undefined,
      }));
  }
  return lanes.map((lane) => ({
    ...lane,
    nodes: filterNodes(lane.nodes),
  }));
}

export function deleteTopicFromBundle(bundle: RoadmapBundle, topicId: string): RoadmapBundle {
  const lanes = removeTopicFromLanes(bundle.lanes, topicId);
  const notes = { ...bundle.notes };
  delete notes[topicId];
  const progressNodes = { ...bundle.progress.nodes };
  delete progressNodes[topicId];
  return {
    ...bundle,
    lanes,
    notes,
    progress: { ...bundle.progress, nodes: progressNodes },
  };
}

export function bundleWithChart(
  bundle: RoadmapBundle,
  nodes: ChartNode[],
  edges: ChartEdge[],
): RoadmapBundle {
  return { ...bundle, nodes, edges };
}

export function bundleToGraph(bundle: RoadmapBundle) {
  return {
    title: bundle.title,
    description: bundle.description,
    lanes: bundle.lanes,
    nodes: bundle.nodes,
    edges: bundle.edges,
  };
}

export function patchProgressEntry(
  progress: Progress,
  topicId: string,
  patch: Partial<ProgressEntry>,
): Progress {
  const cur = progress.nodes[topicId] || { status: "todo" as Status, notes: "" };
  return {
    ...progress,
    nodes: {
      ...progress.nodes,
      [topicId]: { ...cur, ...patch, updatedAt: new Date().toISOString() },
    },
  };
}

export function bundleForExport(bundle: RoadmapBundle, includeProgress: boolean): RoadmapBundle {
  if (includeProgress) return structuredClone(bundle);
  return { ...bundle, progress: { version: 1, nodes: {} } };
}

export function downloadBundle(
  bundle: RoadmapBundle,
  opts?: { includeProgress?: boolean; filename?: string },
) {
  const includeProgress = opts?.includeProgress ?? true;
  const data = bundleForExport(bundle, includeProgress);
  const name =
    opts?.filename ||
    `${data.title
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/^-+|-+$/g, "") || data.id}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2) + "\n"], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name.endsWith(".json") ? name : `${name}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
