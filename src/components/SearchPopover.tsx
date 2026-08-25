import { useEffect, useRef, useState } from "react";
import { FLAG_LABELS, FLAG_ORDER, type FlagFilter } from "../lib/flags";

type Props = {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  search: string;
  filter: string;
  flagFilter: FlagFilter;
  onSearch: (v: string) => void;
  onFilter: (v: string) => void;
  onFlagFilter: (v: string) => void;
};

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
      <path d="M16 16l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function SearchPopover({
  open,
  onOpen,
  onClose,
  search,
  filter,
  flagFilter,
  onSearch,
  onFilter,
  onFlagFilter,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draftSearch, setDraftSearch] = useState(search);
  const [draftFilter, setDraftFilter] = useState(filter);
  const [draftFlagFilter, setDraftFlagFilter] = useState(flagFilter);

  const active = Boolean(search.trim()) || filter !== "all" || Boolean(flagFilter);

  useEffect(() => {
    if (!open) return;
    setDraftSearch(search);
    setDraftFilter(filter);
    setDraftFlagFilter(flagFilter);
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, search, filter, flagFilter]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (open) {
          inputRef.current?.focus();
          inputRef.current?.select();
        } else {
          onOpen();
        }
        return;
      }
      if (open && e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpen, onClose]);

  const apply = () => {
    onSearch(draftSearch);
    onFilter(draftFilter);
    onFlagFilter(draftFlagFilter);
    onClose();
  };

  const clear = () => {
    setDraftSearch("");
    setDraftFilter("all");
    setDraftFlagFilter("");
    onSearch("");
    onFilter("all");
    onFlagFilter("");
  };

  return (
    <div className="search-wrap">
      <button
        type="button"
        className={`btn menu-trigger search-trigger${active ? " active" : ""}`}
        aria-label="Find and filter"
        aria-expanded={open}
        title="Find & filter (Ctrl+F)"
        onClick={() => (open ? onClose() : onOpen())}
      >
        <IconSearch />
      </button>
      {open ? (
        <>
          <div className="popover-backdrop" onClick={onClose} />
          <form
            className="search-popover"
            role="dialog"
            aria-label="Search and filter"
            onSubmit={(e) => {
              e.preventDefault();
              apply();
            }}
          >
            <p className="popover-title">Find & filter</p>
            <input
              ref={inputRef}
              type="search"
              placeholder="Search topics…"
              autoComplete="off"
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
            />
            <label className="popover-label">
              Status
              <select value={draftFilter} onChange={(e) => setDraftFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="todo">Todo</option>
                <option value="learning">Learning</option>
                <option value="done">Done</option>
              </select>
            </label>
            <label className="popover-label">
              Flag
              <select
                value={draftFlagFilter}
                onChange={(e) => setDraftFlagFilter(e.target.value as FlagFilter)}
              >
                <option value="">All flags</option>
                <option value="any">Any flag</option>
                {FLAG_ORDER.map((c) => (
                  <option key={c} value={c}>{FLAG_LABELS[c]}</option>
                ))}
              </select>
            </label>
            <div className="search-popover-actions">
              <button type="button" className="btn compact" onClick={clear}>
                Clear
              </button>
              <button type="submit" className="btn compact">
                Apply
              </button>
            </div>
          </form>
        </>
      ) : null}
    </div>
  );
}
