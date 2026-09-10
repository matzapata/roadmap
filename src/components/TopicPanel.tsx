import { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import type { BoundTopic, Progress, Status } from "../lib/types";
import { FlagSelect } from "./FlagSelect";
import { StatusSelect } from "./StatusSelect";
import type { FlagColor } from "../lib/flags";

type Props = {
  topic: BoundTopic | null;
  noteMarkdown: string;
  progress: Progress;
  onClose: () => void;
  onStatus: (topicId: string, status: Status) => void;
  onNotes: (topicId: string, notes: string) => void;
  onNoteMarkdown: (topicId: string, markdown: string) => void;
  onFlag: (topicId: string, flag: FlagColor | null) => void;
};

function renderMd(md: string): string {
  return marked.parse(md, { async: false, gfm: true }) as string;
}

export function TopicPanel({
  topic,
  noteMarkdown,
  progress,
  onClose,
  onStatus,
  onNotes,
  onNoteMarkdown,
  onFlag,
}: Props) {
  const [markdown, setMarkdown] = useState("");
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const markdownRef = useRef<HTMLTextAreaElement>(null);
  const entry = topic ? progress.nodes[topic.id] : null;
  const status = (entry?.status as Status) || "todo";
  const personalNotes = entry?.notes || "";
  const flag = entry?.flag || null;

  const topicId = topic?.id;

  // Reset editor when switching topics only. Syncing on `noteMarkdown` would
  // return to preview on every keystroke because saves update that prop.
  useEffect(() => {
    if (!topicId) return;
    setMode("preview");
    setMarkdown(noteMarkdown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [topicId]);

  useEffect(() => {
    if (mode !== "edit") return;
    const el = markdownRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [mode]);

  useEffect(() => {
    if (!topic) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (mode === "edit") return;
      e.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [topic, mode, onClose]);

  const onMarkdownChange = (value: string) => {
    if (!topic) return;
    setMarkdown(value);
    onNoteMarkdown(topic.id, value);
  };

  if (!topic) return null;

  return (
    <aside className="topic-panel" aria-label={topic.title}>
      <div className="topic-panel-body">
        <div className="topic-panel-header">
          <StatusSelect value={status} onChange={(next) => onStatus(topic.id, next)} />
          <div className="topic-panel-header-actions">
            <FlagSelect value={flag} onChange={(next) => onFlag(topic.id, next)} />
            <button type="button" className="btn icon" aria-label="Close" onClick={onClose}>
              ×
            </button>
          </div>
        </div>
        {mode === "edit" ? (
          <textarea
            id="panel-markdown"
            ref={markdownRef}
            className="panel-markdown"
            wrap="soft"
            spellCheck={false}
            value={markdown}
            onChange={(e) => onMarkdownChange(e.target.value)}
            onBlur={() => setMode("preview")}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                setMode("preview");
              }
            }}
            placeholder="# Topic notes"
            aria-label="Topic notes editor"
          />
        ) : (
          <div
            className="preview markdown-body panel-preview"
            title="Double-click to edit"
            role="article"
            tabIndex={0}
            onDoubleClick={() => setMode("edit")}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                setMode("edit");
              }
            }}
          >
            {markdown.trim() ? (
              <div
                className="panel-preview-body"
                dangerouslySetInnerHTML={{ __html: renderMd(markdown) }}
              />
            ) : (
              <p className="panel-preview-placeholder">Double-click to edit</p>
            )}
          </div>
        )}
        <div className="topic-panel-comments">
          <label className="notes-label" htmlFor="panel-notes">
            Comments
          </label>
          <textarea
            id="panel-notes"
            className="panel-notes"
            rows={4}
            wrap="soft"
            placeholder="Add a comment…"
            value={personalNotes}
            onChange={(e) => onNotes(topic.id, e.target.value)}
          />
        </div>
      </div>
    </aside>
  );
}
