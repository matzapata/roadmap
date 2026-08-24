import type { RoadmapListItem } from "./types";
import { validateBundle } from "./bundle";

function withBase(path: string): string {
  const base = import.meta.env.BASE_URL;
  if (/^https?:\/\//.test(path) || path.startsWith(base)) return path;
  return `${base}${path.replace(/^\//, "")}`;
}

export async function fetchStarterIndex(): Promise<RoadmapListItem[]> {
  const res = await fetch(withBase("maps/index.json"), { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((item) => ({
    id: String(item.id),
    title: String(item.title || item.id),
    path: withBase(String(item.path || `maps/${item.id}.json`)),
    topicCount: typeof item.topicCount === "number" ? item.topicCount : 0,
  }));
}

export async function fetchStarterBundle(path: string): Promise<import("./types").RoadmapBundle> {
  const res = await fetch(withBase(path), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  const data = await res.json();
  return validateBundle(data);
}
