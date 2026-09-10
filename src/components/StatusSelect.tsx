import type { Status } from "../lib/types";

const STATUS_ORDER: Status[] = ["todo", "learning", "done"];

const STATUS_LABELS: Record<Status, string> = {
  todo: "Todo",
  learning: "Learning",
  done: "Done",
};

type Props = {
  value: Status;
  onChange: (status: Status) => void;
  className?: string;
  id?: string;
  disabled?: boolean;
};

export function StatusSelect({ value, onChange, className, id, disabled }: Props) {
  return (
    <span className={`status-wrap status-${value} ${className || ""}`.trim()}>
      <span className="status-wrap-label" aria-hidden="true">
        {STATUS_LABELS[value]}
      </span>
      <select
        id={id}
        className="status-select"
        aria-label="Status"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as Status)}
      >
        {STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </span>
  );
}
