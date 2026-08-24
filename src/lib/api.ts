import type {
  ChartSnapshot,
  Progress,
  RoadmapGraph,
  RoadmapListItem,
} from "./types";
import { parseFlag } from "./flags";

export async function listRoadmaps(): Promise<RoadmapListItem[]> {
  const res = await fetch("/api/roadmaps", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to list roadmaps");
  return res.json();
}

export async function loadRoadmap(slug: string): Promise<RoadmapGraph> {
  const res = await fetch(`/r/${slug}/roadmap.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load roadmap ${slug}`);
  return res.json();
}

export async function saveRoadmap(slug: string, graph: RoadmapGraph): Promise<void> {
  const res = await fetch(`/r/${slug}/roadmap.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(graph, null, 2) + "\n",
  });
  if (!res.ok) throw new Error("Failed to save roadmap");
}

export async function loadProgress(slug: string): Promise<Progress> {
  const res = await fetch(`/r/${slug}/progress.json`, { cache: "no-store" });
  if (!res.ok) return { version: 1, nodes: {} };
  const data = await res.json();
  return normalizeProgress(data);
}

export async function saveProgress(slug: string, progress: Progress): Promise<void> {
  const nodes: Progress["nodes"] = {};
  for (const [k, v] of Object.entries(progress.nodes)) {
    const entry: Progress["nodes"][string] = {
      status: v.status,
      notes: v.notes,
      updatedAt: v.updatedAt ?? null,
    };
    if (v.flag) entry.flag = v.flag;
    nodes[k] = entry;
  }
  const res = await fetch(`/r/${slug}/progress.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version: progress.version || 1, nodes }, null, 2) + "\n",
  });
  if (!res.ok) throw new Error("Failed to save progress");
}

export type CreatedTopic = { id: string; title: string; file: string };

export async function createTopic(
  slug: string,
  title: string,
  type: "topic" | "subtopic",
): Promise<CreatedTopic> {
  const res = await fetch(`/r/${slug}/topics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, type }),
  });
  if (!res.ok) throw new Error("Failed to create topic");
  return res.json();
}

export async function renameTopic(slug: string, id: string, title: string): Promise<CreatedTopic> {
  const res = await fetch(`/r/${slug}/topics/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error("Failed to rename topic");
  return res.json();
}

export async function deleteTopic(
  slug: string,
  id: string,
): Promise<{ id: string; file: string; deletedFile: boolean }> {
  const res = await fetch(`/r/${slug}/topics/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete topic");
  return res.json();
}

const MD_LINK = /\[([^\]]*)\]\(([^)\s]+\.md)(#[^)\s]*)?\)/gi;

function resolveRelPath(fromFile: string, href: string): string {
  const fromDir = fromFile.includes("/") ? fromFile.slice(0, fromFile.lastIndexOf("/")) : "";
  const parts = [...fromDir.split("/").filter(Boolean), ...href.split("/")];
  const out: string[] = [];
  for (const p of parts) {
    if (!p || p === ".") continue;
    if (p === "..") {
      if (out.length && out[out.length - 1] !== "..") out.pop();
      else out.push("..");
    } else {
      out.push(p);
    }
  }
  return out.join("/");
}

function headingSlug(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

/** Slice a notes file to the heading / HTML id matching `anchor`. */
export function extractMarkdownSection(md: string, anchor: string): string {
  if (!anchor) return md;
  const escaped = anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const idRe = new RegExp(`<a\\s+id=["']${escaped}["']\\s*>\\s*</a>\\s*\\n?`, "i");
  const idMatch = idRe.exec(md);
  if (idMatch && idMatch.index != null) {
    const rest = md.slice(idMatch.index + idMatch[0].length);
    const next = rest.search(/<a\s+id=["'][^"']+["']\s*>\s*<\/a>/i);
    return (next === -1 ? rest : rest.slice(0, next)).trim();
  }

  const lines = md.split("\n");
  let found = -1;
  let level = 0;
  for (let i = 0; i < lines.length; i++) {
    const hm = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(lines[i]);
    if (!hm) continue;
    if (headingSlug(hm[2]) === anchor) {
      found = i;
      level = hm[1].length;
      break;
    }
  }
  if (found === -1) return md;
  let end = lines.length;
  for (let i = found + 1; i < lines.length; i++) {
    const hm = /^(#{1,6})\s+/.exec(lines[i]);
    if (hm && hm[1].length <= level) {
      end = i;
      break;
    }
  }
  return lines.slice(found, end).join("\n").trim();
}

async function fetchMapMarkdown(slug: string, relPath: string): Promise<string | null> {
  const res = await fetch(
    `/api/md?slug=${encodeURIComponent(slug)}&path=${encodeURIComponent(relPath)}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  return res.text();
}

export async function loadTopicMarkdown(slug: string, file: string): Promise<string> {
  const path = file.replace(/^\//, "");
  const res = await fetch(`/r/${slug}/${path}`, { cache: "no-store" });
  if (!res.ok) return `_Could not load_ \`${file}\``;
  const md = await res.text();

  // Short stubs may point at a notes file outside the map (AWS). Don't follow
  // once the topic file is a real note.
  if (md.length > 1200) return md;

  MD_LINK.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MD_LINK.exec(md))) {
    const href = match[2];
    const hash = match[3] ? match[3].slice(1) : "";
    const resolved = resolveRelPath(path, href);
    if (!resolved.startsWith("../")) continue;
    const target = await fetchMapMarkdown(slug, resolved);
    if (target == null) continue;
    return hash ? extractMarkdownSection(target, hash) : target;
  }
  return md;
}

export async function saveTopicMarkdown(slug: string, file: string, markdown: string): Promise<void> {
  const path = file.replace(/^\//, "");
  if (!path.startsWith("topics/") || !path.toLowerCase().endsWith(".md")) {
    throw new Error("Can only save topic markdown");
  }
  const res = await fetch(`/r/${slug}/${path}`, {
    method: "PUT",
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
    body: markdown,
  });
  if (!res.ok) throw new Error("Failed to save markdown");
}

export function graphWithChart(graph: RoadmapGraph, chart: ChartSnapshot): RoadmapGraph {
  return {
    title: graph.title,
    description: graph.description,
    lanes: graph.lanes,
    nodes: chart.nodes,
    edges: chart.edges,
  };
}

function normalizeProgress(data: unknown): Progress {
  if (!data || typeof data !== "object") return { version: 1, nodes: {} };
  const raw = data as Progress;
  const nodes: Progress["nodes"] = {};
  for (const [k, v] of Object.entries(raw.nodes || {})) {
    if (!v || typeof v !== "object") continue;
    const status = ["todo", "learning", "done"].includes(v.status) ? v.status : "todo";
    nodes[k] = {
      status: status as Progress["nodes"][string]["status"],
      notes: typeof v.notes === "string" ? v.notes : "",
      flag: parseFlag((v as { flag?: unknown; flagged?: unknown }).flag ?? (v as { flagged?: unknown }).flagged),
      updatedAt: v.updatedAt || null,
    };
  }
  return { version: raw.version || 1, nodes };
}
