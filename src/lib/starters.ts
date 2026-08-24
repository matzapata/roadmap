import type { RoadmapBundle } from "./types";
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

/** Example map used as the template for New. */
export async function fetchStarterTemplate(): Promise<RoadmapBundle | null> {
  const data = await fetchJson("maps/untitled.json");
  if (data == null) return null;
  try {
    return validateBundle(data);
  } catch {
    return null;
  }
}
