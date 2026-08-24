import { FLAG_LABELS, FLAG_ORDER, type FlagFilter } from "../lib/flags";

type Props = {
  open: boolean;
  onClose: () => void;
  search: string;
  filter: string;
  flagFilter: FlagFilter;
  onSearch: (v: string) => void;
  onFilter: (v: string) => void;
  onFlagFilter: (v: string) => void;
};

export function SearchPopover({
  open,
  onClose,
  search,
  filter,
  flagFilter,
  onSearch,
  onFilter,
  onFlagFilter,
}: Props) {
  if (!open) return null;

  return (
    <>
      <div className="popover-backdrop" onClick={onClose} />
      <div className="search-popover" role="dialog" aria-label="Search and filter">
        <p className="popover-title">Find & filter</p>
        <input
          type="search"
          placeholder="Search topics…"
          autoComplete="off"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        <label className="popover-label">
          Status
          <select value={filter} onChange={(e) => onFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="todo">Todo</option>
            <option value="learning">Learning</option>
            <option value="done">Done</option>
          </select>
        </label>
        <label className="popover-label">
          Flag
          <select value={flagFilter} onChange={(e) => onFlagFilter(e.target.value)}>
            <option value="">All flags</option>
            <option value="any">Any flag</option>
            {FLAG_ORDER.map((c) => (
              <option key={c} value={c}>{FLAG_LABELS[c]}</option>
            ))}
          </select>
        </label>
        <button type="button" className="btn compact" onClick={onClose}>Done</button>
      </div>
    </>
  );
}
