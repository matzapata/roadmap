import type {
  BoundTopic,
  ChartEdge,
  ChartNode,
  ChartSnapshot,
  Lane,
  RoadmapGraph,
  TopicNode,
} from "./types";

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

/** @deprecated use collectTopicIds */
export function collectFiles(lanes: Lane[]): Set<string> {
  return collectTopicIds(lanes);
}

function normalizeTitle(s: string): string {
  return String(s || "")
    .replace(/&amp;/gi, "&")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const TITLE_ALIASES: Record<string, string> = {
  "ap availability partition tolerance": "ap",
  "cp consistency partition tolerance": "cp",
  "99 9 availability three 9s": "three nines 99 9",
  "99 99 availability four 9s": "four nines 99 99",
  "availability in parallel vs sequence": "parallel vs sequence",
  "layer 7 load balancing": "layer 7",
  "layer 4 load balancing": "layer 4",
  "types of caching": "types",
  "reliability patterns": "reliability",
  "scheduling agent supervisor": "scheduler agent supervisor",
};

function canonical(s: string): string {
  const n = normalizeTitle(s);
  return TITLE_ALIASES[n] || n;
}

function matchScore(a: string, b: string): number {
  const s = canonical(a);
  const g = canonical(b);
  if (!s || !g) return 0;
  if (s === g) return 100;
  if (g.length <= 3 && s.startsWith(g + " ")) return 96;
  if (s.endsWith(" load balancing") && s.slice(0, -" load balancing".length).trim() === g) return 95;
  return 0;
}

function stackedFromLanes(graph: RoadmapGraph): ChartSnapshot & { height: number } {
  const nodes: ChartNode[] = [];
  const edges: ChartEdge[] = [];
  let y = 40;
  const x = 80;
  const gap = 14;
  const boxH = 46;

  nodes.push({
    id: "title",
    type: "title",
    position: { x, y },
    width: 280,
    height: 52,
    data: { label: graph.title || "Roadmap" },
  });
  y += 70;

  for (const lane of graph.lanes) {
    if (lane.id === "added") continue;
    nodes.push({
      id: `label-${lane.id}`,
      type: "label",
      position: { x, y },
      width: 240,
      height: 28,
      data: { label: lane.title, style: { color: "#000000", fontSize: 17 } },
    });
    y += 40;

    function addTopic(n: TopicNode, depth: number) {
      const id = `our-${n.id}`;
      const w = Math.max(180, Math.min(320, 40 + n.title.length * 9));
      nodes.push({
        id,
        type: depth === 0 ? "topic" : "subtopic",
        position: { x: x + depth * 28, y },
        width: w,
        height: boxH,
        data: { label: n.title, topicId: n.id },
      });
      y += boxH + gap;
      for (const c of n.children || []) addTopic(c, depth + 1);
    }

    for (const n of lane.nodes) addTopic(n, 0);
    y += 24;
  }

  return { nodes, edges, height: y + 40 };
}

function bindChartToOurs(nodes: ChartNode[], ourNodes: TopicNode[]): Map<string, BoundTopic> {
  const byId = new Map(ourNodes.map((n) => [n.id, n]));
  const mapping = new Map<string, BoundTopic>();
  const usedOurs = new Set<string>();

  // Prefer explicit topicId
  for (const n of nodes) {
    if (n.type !== "topic" && n.type !== "subtopic") continue;
    const tid = typeof n.data?.topicId === "string" ? n.data.topicId : null;
    if (!tid) continue;
    const ours = byId.get(tid);
    if (ours && !usedOurs.has(ours.id)) {
      mapping.set(n.id, { id: ours.id, title: ours.title });
      usedOurs.add(ours.id);
    }
  }

  // edit-{topicId} convention
  for (const n of nodes) {
    if (mapping.has(n.id)) continue;
    if (n.type !== "topic" && n.type !== "subtopic") continue;
    if (n.id.startsWith("edit-")) {
      const topicId = n.id.slice("edit-".length);
      const ours = byId.get(topicId);
      if (ours && !usedOurs.has(ours.id)) {
        mapping.set(n.id, { id: ours.id, title: ours.title });
        usedOurs.add(ours.id);
      }
    } else if (n.id.startsWith("our-") || n.id.startsWith("extra-")) {
      const topicId = n.id.replace(/^(our|extra)-/, "");
      const ours = byId.get(topicId);
      if (ours && !usedOurs.has(ours.id)) {
        mapping.set(n.id, { id: ours.id, title: ours.title });
        usedOurs.add(ours.id);
      }
    }
  }

  // Title match for remaining
  for (const n of nodes) {
    if (mapping.has(n.id)) continue;
    if (n.type !== "topic" && n.type !== "subtopic") continue;
    const label = String(n.data?.label || "").trim();
    if (!label) continue;
    let best: { score: number; node: TopicNode | null } = { score: 0, node: null };
    for (const ours of ourNodes) {
      if (usedOurs.has(ours.id)) continue;
      const sc = matchScore(label, ours.title);
      if (sc > best.score) best = { score: sc, node: ours };
    }
    if (best.score >= 90 && best.node) {
      mapping.set(n.id, { id: best.node.id, title: best.node.title });
      usedOurs.add(best.node.id);
    }
  }

  return mapping;
}

export type MergedFlow = {
  nodes: ChartNode[];
  edges: ChartEdge[];
  binding: Map<string, BoundTopic>;
  width: number;
  height: number;
};

/** Build the display chart from roadmap.json (nodes/edges) + topic bindings. */
export function buildFlow(graph: RoadmapGraph): MergedFlow {
  const ourNodes = flattenTopics(graph.lanes);
  const hasChart = Array.isArray(graph.nodes) && graph.nodes.length > 0;

  if (!hasChart) {
    const stacked = stackedFromLanes(graph);
    const binding = bindChartToOurs(stacked.nodes, ourNodes);
    return {
      nodes: stacked.nodes,
      edges: stacked.edges,
      binding,
      width: 900,
      height: stacked.height,
    };
  }

  const nodes = [...(graph.nodes || [])].sort((a, b) => {
    const ap = a.parentId ? 1 : 0;
    const bp = b.parentId ? 1 : 0;
    if (ap !== bp) return ap - bp;
    const behind = (t?: string) => (t === "group" || t === "section" ? 0 : 1);
    return behind(a.type) - behind(b.type);
  });
  const ids = new Set(nodes.map((n) => n.id));
  const edges = (graph.edges || []).filter((e) => ids.has(e.source) && ids.has(e.target));
  const binding = bindChartToOurs(nodes, ourNodes);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = 0;
  let maxY = 0;
  for (const n of nodes) {
    const w = n.width ?? 160;
    const h = n.height ?? 49;
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + w);
    maxY = Math.max(maxY, n.position.y + h);
  }

  return {
    nodes,
    edges,
    binding,
    width: Math.max(900, maxX - minX + 80),
    height: Math.max(600, maxY - minY + 80),
  };
}

export function chartFromGraph(graph: RoadmapGraph): ChartSnapshot {
  return {
    nodes: structuredClone(graph.nodes || []),
    edges: structuredClone(graph.edges || []),
  };
}

