import type { RoadmapListItem } from "./types";
import { validateBundle } from "./bundle";

function withBase(path: string): string {
  const base = import.meta.env.BASE_URL;
  if (/^https?:\/\//.test(path) || path.startsWith(base)) return path;
  return `${base}${path.replace(/^\//, "")}`;
}

async function fetchJson(path: string): Promise<unknown | null> {
  try {
    const res = await fetch(withBase(path), { cache: "no-store" });
    if (!res.ok) return null;
    const text = await res.text();
    const trimmed = text.trim();
    if (!trimmed || trimmed.startsWith("<")) return null;
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

export async function fetchStarterIndex(): Promise<RoadmapListItem[]> {
  const data = await fetchJson("maps/index.json");
  if (!Array.isArray(data)) return [];
  return data
    .map((raw) => {
      const item = raw as {
        id?: unknown;
        title?: unknown;
        path?: unknown;
        topicCount?: unknown;
      };
      const id = String(item.id ?? "");
      return {
        id,
        title: String(item.title || id),
        path: withBase(String(item.path || `maps/${id}.json`)),
        topicCount: typeof item.topicCount === "number" ? item.topicCount : 0,
      };
    })
    .filter((item) => item.id);
}

export async function fetchStarterBundle(path: string): Promise<import("./types").RoadmapBundle> {
  const data = await fetchJson(path);
  if (data == null) throw new Error(`Failed to load ${path}`);
  return validateBundle(data);
}

/** First shipped map, preferring `untitled`. */
export async function fetchStarterTemplate(): Promise<import("./types").RoadmapBundle | null> {
  const index = await fetchStarterIndex();
  const starter = index.find((s) => s.id === "untitled") ?? index[0];
  if (!starter?.path) return null;
  try {
    return await fetchStarterBundle(starter.path);
  } catch {
    return null;
  }
}
