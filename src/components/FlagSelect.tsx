import { FLAG_COLORS, FLAG_LABELS, FLAG_ORDER, type FlagColor } from "../lib/flags";

export function FlagIcon({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
      <path
        d="M3 1.5v13M3 2.2h9.2l-1.8 2.9 1.8 2.9H3"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

type Props = {
  value: FlagColor | null;
  onChange: (flag: FlagColor | null) => void;
  className?: string;
  id?: string;
  disabled?: boolean;
  variant?: "icon" | "dot";
};

export function FlagSelect({ value, onChange, className, id, disabled, variant = "icon" }: Props) {
  const color = value ? FLAG_COLORS[value] : undefined;
  const select = (
    <select
      id={id}
      className="flag-select nodrag nopan"
      aria-label="Flag color"
      value={value || ""}
      disabled={disabled}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      onChange={(e) => {
        e.stopPropagation();
        const next = e.target.value;
        onChange(next ? (next as FlagColor) : null);
      }}
    >
      <option value="">None</option>
      {FLAG_ORDER.map((c) => (
        <option key={c} value={c}>
          {FLAG_LABELS[c]}
        </option>
      ))}
    </select>
  );

  if (variant === "dot") {
    if (!value && disabled) return null;
    return (
      <span
        className={`flag-dot ${value ? "has-flag" : ""} ${className || ""}`.trim()}
        style={color ? { background: color } : undefined}
      >
        {disabled ? null : select}
      </span>
    );
  }

  return (
    <span
      className={`flag-wrap ${value ? "has-flag" : ""} ${className || ""}`.trim()}
      style={color ? { color } : undefined}
    >
      <FlagIcon filled={!!value} />
      {select}
    </span>
  );
}
