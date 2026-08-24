import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import type { RoadmapListItem } from "../lib/types";

type Props = {
  title: string;
  progressLabel: string;
  maps: RoadmapListItem[];
  mapId: string;
  dirty: boolean;
  onMapChange: (id: string) => void;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onExportJson: () => void;
  onExportPng: () => void;
  onOpenSearch: () => void;
  onRenameTitle: (title: string) => void;
  onDeleteMap: (id: string) => void;
};

export function AppMenu({
  title,
  progressLabel,
  maps,
  mapId,
  dirty,
  onMapChange,
  onNew,
  onOpen,
  onSave,
  onExportJson,
  onExportPng,
  onOpenSearch,
  onRenameTitle,
  onDeleteMap,
}: Props) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const ignoreBlurUntil = useRef(0);

  useEffect(() => {
    if (!editingTitle) setDraftTitle(title);
  }, [title, editingTitle]);

  useEffect(() => {
    if (!editingTitle) return;
    ignoreBlurUntil.current = Date.now() + 250;
    const id = window.requestAnimationFrame(() => {
      const el = titleInputRef.current;
      if (!el) return;
      el.focus();
      el.select();
    });
    return () => window.cancelAnimationFrame(id);
  }, [editingTitle]);

  const close = () => {
    setConfirmDelete(false);
    setOpen(false);
  };
  const act = (fn: () => void) => {
    fn();
    close();
  };

  const beginEditTitle = (e: SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    setDraftTitle(title);
    setEditingTitle(true);
  };

  const commitTitle = () => {
    if (Date.now() < ignoreBlurUntil.current) {
      titleInputRef.current?.focus();
      return;
    }
    const next = draftTitle.trim();
    setEditingTitle(false);
    if (!next || next === title) {
      setDraftTitle(title);
      return;
    }
    onRenameTitle(next);
  };

  const cancelTitle = () => {
    setDraftTitle(title);
    setEditingTitle(false);
  };

  return (
    <div className="app-menu-wrap">
      <button
        type="button"
        className="btn menu-trigger"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() =>
          setOpen((v) => {
            if (v) setConfirmDelete(false);
            return !v;
          })
        }
      >
        ☰
      </button>
      {editingTitle ? (
        <input
          ref={titleInputRef}
          className="map-title-input"
          value={draftTitle}
          aria-label="Roadmap title"
          autoFocus
          onChange={(e) => setDraftTitle(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              ignoreBlurUntil.current = 0;
              commitTitle();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancelTitle();
            }
          }}
        />
      ) : (
        <button
          type="button"
          className="map-title-pill"
          title="Double-click to rename roadmap"
          onDoubleClick={beginEditTitle}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {title}
        </button>
      )}
      <span className="progress-pill" title="Study progress">
        {progressLabel}
      </span>
      {open ? (
        <>
          <div className="menu-backdrop" onClick={close} />
          <nav className="app-menu" aria-label="Main menu">
            {confirmDelete ? (
              <div className="menu-confirm" role="alertdialog" aria-labelledby="menu-delete-title">
                <p id="menu-delete-title" className="menu-confirm-copy">
                  Delete “{title}”? This cannot be undone.
                </p>
                <button type="button" className="menu-item" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </button>
                <button type="button" className="menu-item danger" onClick={() => act(() => onDeleteMap(mapId))}>
                  Delete
                </button>
              </div>
            ) : (
              <>
                <p className="menu-section">File</p>
                <button type="button" className="menu-item" onClick={() => act(onNew)}>
                  New
                </button>
                <button type="button" className="menu-item" onClick={() => act(onOpen)}>
                  Open…
                </button>
                <button type="button" className="menu-item" onClick={() => act(onSave)}>
                  Save to file{dirty ? " *" : ""}
                </button>
                <button type="button" className="menu-item" onClick={() => act(onExportJson)}>
                  Export JSON (no progress)
                </button>
                <button type="button" className="menu-item" onClick={() => act(onExportPng)}>
                  Export PNG
                </button>
                <button type="button" className="menu-item danger" onClick={() => setConfirmDelete(true)}>
                  Delete
                </button>
                <p className="menu-section">View</p>
                <button type="button" className="menu-item" onClick={() => act(onOpenSearch)}>
                  Find & filter…
                </button>
                <p className="menu-section">Roadmaps</p>
                {maps.length === 0 ? (
                  <p className="menu-empty">No saved roadmaps</p>
                ) : (
                  maps.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`menu-item${m.id === mapId ? " active" : ""}`}
                      onClick={() => act(() => onMapChange(m.id))}
                    >
                      {m.title}
                    </button>
                  ))
                )}
              </>
            )}
          </nav>
        </>
      ) : null}
    </div>
  );
}
