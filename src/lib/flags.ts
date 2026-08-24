export const FLAG_COLORS = {
  red: "#d32f2f",
  orange: "#ef6c00",
  green: "#2e7d32",
  blue: "#1565c0",
  purple: "#6a1b9a",
} as const;

export type FlagColor = keyof typeof FLAG_COLORS;

export const FLAG_ORDER: FlagColor[] = ["red", "orange", "green", "blue", "purple"];

export const FLAG_LABELS: Record<FlagColor, string> = {
  red: "Red",
  orange: "Orange",
  green: "Green",
  blue: "Blue",
  purple: "Purple",
};

/** Top-bar filter: no filter, any color, or one color. */
export type FlagFilter = "" | "any" | FlagColor;

export function parseFlag(value: unknown): FlagColor | null {
  if (typeof value === "string" && value in FLAG_COLORS) return value as FlagColor;
  if (value === true) return "red";
  return null;
}

export function parseFlagFilter(value: string): FlagFilter {
  if (value === "any" || value in FLAG_COLORS) return value as FlagFilter;
  return "";
}

export function flagMatches(flag: FlagColor | null | undefined, filter: FlagFilter): boolean {
  if (!filter) return true;
  if (filter === "any") return !!flag;
  return flag === filter;
}
