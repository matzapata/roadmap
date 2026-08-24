import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppMenu } from "./components/AppMenu";
import { ModeToolbar, type CanvasTool } from "./components/ModeToolbar";
import { TopicPanel } from "./components/TopicPanel";
import { SaveToast } from "./components/SaveToast";
import { SearchPopover } from "./components/SearchPopover";
import { FlowMap, makeAddedNode, type AddNodeKind } from "./components/FlowMap";
import {
  bundleWithChart,
  collectTopicIds,
  createTopicInBundle,
  deleteTopicFromBundle,
  downloadBundle,
  emptyBundle,
  patchProgressEntry,
  renameTopicInBundle,
  validateBundle,
} from "./lib/bundle";
import { exportChartPng } from "./lib/export";
import { buildFlow, chartFromGraph } from "./lib/merge";
import { idbGetBundle, idbListBundles, idbPutBundle } from "./lib/idb";
import { fetchStarterBundle, fetchStarterIndex } from "./lib/starters";
import type {
  BoundTopic,
  ChartSnapshot,
  Progress,
  RoadmapBundle,
  RoadmapListItem,
  RoadmapGraph,
  Status,
} from "./lib/types";
import { cloneChart, emptyChart } from "./lib/types";
import type { FlagColor, FlagFilter } from "./lib/flags";
import { parseFlagFilter } from "./lib/flags";

function chartsEqual(a: ChartSnapshot, b: ChartSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function mapIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("map");
}

function setMapIdInUrl(id: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("map", id);
  window.history.replaceState({}, "", url.toString());
}

function graphFromBundle(bundle: RoadmapBundle): RoadmapGraph {
  return {
    title: bundle.title,
    description: bundle.description,
    lanes: bundle.lanes,
    nodes: bundle.nodes,
    edges: bundle.edges,
  };
}

export default function App() {
  const [maps, setMaps] = useState<RoadmapListItem[]>([]);
  const [mapId, setMapId] = useState<string>("");
  const [bundle, setBundle] = useState<RoadmapBundle | null>(null);
  const [chart, setChart] = useState<ChartSnapshot>(emptyChart());
  const [chartBaseline, setChartBaseline] = useState<ChartSnapshot>(emptyChart());
  const [lanesBaseline, setLanesBaseline] = useState<RoadmapBundle["lanes"]>([]);
  const [layoutMode, setLayoutMode] = useState(false);
  const [canvasTool, setCanvasTool] = useState<CanvasTool>("select");
  const [selected, setSelected] = useState<BoundTopic | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [flagFilter, setFlagFilter] = useState<FlagFilter>("");
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [idbPending, setIdbPending] = useState(false);
  const [booting, setBooting] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  const idbTimer = useRef<number | null>(null);
  const chartTimer = useRef<number | null>(null);
  const chartRef = useRef(chart);
  chartRef.current = chart;
  const bundleRef = useRef(bundle);
  bundleRef.current = bundle;
  const flowRootRef = useRef<HTMLDivElement | null>(null);
  const addAtCenter = useRef<((kind: AddNodeKind) => void) | null>(null);
  const historyRef = useRef<ChartSnapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const skipHistoryRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastExportedRef = useRef<string>("");

  const showToast = useCallback((msg: string) => setToast(msg), []);

  const refreshMapList = useCallback(async () => {
    const idbMaps = await idbListBundles();
    const starters = await fetchStarterIndex();
    const byId = new Map<string, RoadmapListItem>();
    for (const s of starters) byId.set(s.id, s);
    for (const b of idbMaps) {
      byId.set(b.id, { id: b.id, title: b.title, topicCount: collectTopicIds(b.lanes).size });
    }
    const list = [...byId.values()].sort((a, b) => a.title.localeCompare(b.title));
    setMaps(list);
    return list;
  }, []);

  const scheduleIdbSave = useCallback((next: RoadmapBundle) => {
    setDirty(true);
    setIdbPending(true);
    if (idbTimer.current) window.clearTimeout(idbTimer.current);
    idbTimer.current = window.setTimeout(async () => {
      try {
        await idbPutBundle(next);
        showToast("Saved locally");
        setIdbPending(false);
      } catch {
        showToast("Local save failed");
        setIdbPending(false);
      }
    }, 1200);
  }, [showToast]);

  const applyBundle = useCallback(
    (next: RoadmapBundle, opts?: { markClean?: boolean }) => {
      bundleRef.current = next;
      setBundle(next);
      const c = chartFromGraph(graphFromBundle(next));
      chartRef.current = c;
      setChart(c);
      setChartBaseline(cloneChart(c));
      setLanesBaseline(structuredClone(next.lanes));
      historyRef.current = [];
      setCanUndo(false);
      document.title = next.title || "Roadmap";
      if (opts?.markClean) {
        setDirty(false);
        lastExportedRef.current = JSON.stringify(next);
      } else {
        scheduleIdbSave(next);
      }
    },
    [scheduleIdbSave],
  );

  const onRenameTitle = useCallback(
    (title: string) => {
      const b = bundleRef.current;
      if (!b) return;
      const nextTitle = title.trim();
      if (!nextTitle || nextTitle === b.title) return;
      const next = { ...b, title: nextTitle };
      bundleRef.current = next;
      setBundle(next);
      document.title = nextTitle;
      setDirty(true);
      scheduleIdbSave(next);
      void refreshMapList();
    },
    [scheduleIdbSave, refreshMapList],
  );

  const loadMap = useCallback(
    async (id: string) => {
      setError(null);
      setSelected(null);
      setLayoutMode(false);
      const fromIdb = await idbGetBundle(id);
      if (fromIdb) {
        applyBundle(fromIdb, { markClean: true });
        setMapId(id);
        setMapIdInUrl(id);
        return;
      }
      const starters = await fetchStarterIndex();
      const starter = starters.find((s) => s.id === id);
      if (starter?.path) {
        const fetched = await fetchStarterBundle(starter.path);
        await idbPutBundle(fetched);
        applyBundle(fetched, { markClean: true });
        setMapId(id);
        setMapIdInUrl(id);
        await refreshMapList();
        return;
      }
      throw new Error(`Unknown map: ${id}`);
    },
    [applyBundle, refreshMapList],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await refreshMapList();
        const fromUrl = mapIdFromUrl();
        let initial = fromUrl && list.find((m) => m.id === fromUrl)?.id;
        if (!initial && list.length) initial = list[0].id;
        if (!initial) {
          const starters = await fetchStarterIndex();
          if (starters.length) {
            const fetched = await fetchStarterBundle(starters[0].path!);
            await idbPutBundle(fetched);
            initial = fetched.id;
            await refreshMapList();
          }
        }
        if (!initial) {
          if (!cancelled) {
            setBooting(false);
            setError(null);
          }
          return;
        }
        if (!cancelled) await loadMap(initial);
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMap, refreshMapList]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty || idbPending) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, idbPending]);

  const displayGraph = useMemo((): RoadmapGraph | null => {
    if (!bundle) return null;
    return { ...graphFromBundle(bundle), nodes: chart.nodes, edges: chart.edges };
  }, [bundle, chart]);

  const flow = useMemo(() => (displayGraph ? buildFlow(displayGraph) : null), [displayGraph]);

  const persistBundleChart = useCallback(
    (nextChart: ChartSnapshot) => {
      const b = bundleRef.current;
      if (!b) return;
      const next = bundleWithChart(b, nextChart.nodes, nextChart.edges);
      applyBundle(next);
    },
    [applyBundle],
  );

  const scheduleSaveChart = useCallback(
    (nextChart: ChartSnapshot) => {
      if (chartTimer.current) window.clearTimeout(chartTimer.current);
      chartTimer.current = window.setTimeout(() => {
        persistBundleChart(nextChart);
      }, 400);
    },
    [persistBundleChart],
  );

  const onChartChange = useCallback(
    (next: ChartSnapshot | ((prev: ChartSnapshot) => ChartSnapshot)) => {
      const resolved = typeof next === "function" ? next(chartRef.current) : next;
      if (!skipHistoryRef.current && !chartsEqual(resolved, chartRef.current)) {
        historyRef.current.push(cloneChart(chartRef.current));
        if (historyRef.current.length > 50) historyRef.current.shift();
        setCanUndo(true);
      }
      chartRef.current = resolved;
      setChart(resolved);
      scheduleSaveChart(resolved);
    },
    [scheduleSaveChart],
  );

  const onUndo = useCallback(() => {
    const prev = historyRef.current.pop();
    setCanUndo(historyRef.current.length > 0);
    if (!prev) return;
    skipHistoryRef.current = true;
    chartRef.current = prev;
    setChart(prev);
    scheduleSaveChart(prev);
    skipHistoryRef.current = false;
  }, [scheduleSaveChart]);

  useEffect(() => {
    if (!layoutMode) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        onUndo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [layoutMode, onUndo]);

  const onRename = useCallback(
    (nodeId: string, label: string) => {
      onChartChange((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...(n.data || {}), label } } : n,
        ),
      }));

      const bound = flow?.binding.get(nodeId);
      const b = bundleRef.current;
      if (bound && b) {
        const next = renameTopicInBundle(b, bound.id, label);
        applyBundle(next);
        showToast("Title updated");
      }
    },
    [onChartChange, flow, applyBundle, showToast],
  );

  const onRequestAdd = useCallback(
    (kind: AddNodeKind, position: { x: number; y: number }) => {
      if (kind === "label") {
        const id = `edit-label-${Date.now().toString(36)}`;
        const node = makeAddedNode("label", id, "New label", position);
        onChartChange((prev) => ({ ...prev, nodes: [...prev.nodes, node] }));
        return;
      }

      const title = kind === "topic" ? "New topic" : "New subtopic";
      const b = bundleRef.current;
      if (!b) return;
      const { bundle: withTopic, topicId } = createTopicInBundle(b, title, kind);
      applyBundle(withTopic);
      const node = makeAddedNode(kind, `edit-${topicId}`, title, position, topicId);
      onChartChange((prev) => ({ ...prev, nodes: [...prev.nodes, node] }));
      showToast("Topic created");
    },
    [onChartChange, applyBundle, showToast],
  );

  const onDeleteTopics = useCallback(
    (topicIds: string[]) => {
      if (!topicIds.length) return;
      const b = bundleRef.current;
      if (!b) return;

      let next = b;
      for (const id of topicIds) next = deleteTopicFromBundle(next, id);
      applyBundle(next);
      showToast("Topic deleted");
    },
    [applyBundle, showToast],
  );

  const onAdd = useCallback(
    (kind: AddNodeKind) => {
      if (addAtCenter.current) addAtCenter.current(kind);
      else void onRequestAdd(kind, { x: 120, y: 120 });
    },
    [onRequestAdd],
  );

  const enterLayoutMode = useCallback(() => {
    setChartBaseline(cloneChart(chartRef.current));
    setLanesBaseline(structuredClone(bundleRef.current?.lanes || []));
    historyRef.current = [];
    setCanUndo(false);
    setLayoutMode(true);
  }, []);

  const exitLayoutMode = useCallback(() => {
    setLayoutMode(false);
    setChartBaseline(cloneChart(chartRef.current));
    setLanesBaseline(structuredClone(bundleRef.current?.lanes || []));
    historyRef.current = [];
    setCanUndo(false);
  }, []);

  const onCancelLayout = useCallback(() => {
    if (chartTimer.current) window.clearTimeout(chartTimer.current);
    const restoredChart = cloneChart(chartBaseline);
    skipHistoryRef.current = true;
    chartRef.current = restoredChart;
    setChart(restoredChart);
    historyRef.current = [];
    setCanUndo(false);
    skipHistoryRef.current = false;

    const b = bundleRef.current;
    if (b) {
      const next = bundleWithChart(
        { ...b, lanes: structuredClone(lanesBaseline) },
        restoredChart.nodes,
        restoredChart.edges,
      );
      applyBundle(next);
    }
    setLayoutMode(false);
    showToast("Layout changes cancelled");
  }, [chartBaseline, lanesBaseline, applyBundle, showToast]);

  const canCancelLayout =
    layoutMode &&
    (!chartsEqual(chart, chartBaseline) ||
      JSON.stringify(bundle?.lanes) !== JSON.stringify(lanesBaseline));

  const patchProgress = useCallback(
    (topicId: string, patch: Partial<Progress["nodes"][string]>) => {
      const b = bundleRef.current;
      if (!b) return;
      const next: RoadmapBundle = {
        ...b,
        progress: patchProgressEntry(b.progress, topicId, patch),
      };
      applyBundle(next);
    },
    [applyBundle],
  );

  const onSetFlag = useCallback(
    (topicId: string, flag: FlagColor | null) => {
      patchProgress(topicId, { flag });
    },
    [patchProgress],
  );

  const onNoteMarkdown = useCallback(
    (topicId: string, markdown: string) => {
      const b = bundleRef.current;
      if (!b) return;
      applyBundle({ ...b, notes: { ...b.notes, [topicId]: markdown } });
    },
    [applyBundle],
  );

  const onMapChange = (nextId: string) => {
    void loadMap(nextId).catch((e) => setError(String(e)));
  };

  const onNew = () => {
    const next = emptyBundle();
    void idbPutBundle(next).then(async () => {
      await refreshMapList();
      applyBundle(next, { markClean: true });
      setMapId(next.id);
      setMapIdInUrl(next.id);
      showToast("New roadmap");
    });
  };

  const onOpen = () => fileInputRef.current?.click();

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = validateBundle(JSON.parse(text));
      await idbPutBundle(parsed);
      await refreshMapList();
      applyBundle(parsed, { markClean: true });
      setMapId(parsed.id);
      setMapIdInUrl(parsed.id);
      showToast(`Opened ${file.name}`);
    } catch (err) {
      showToast(`Open failed: ${err}`);
    }
  };

  const onSave = () => {
    const b = bundleRef.current;
    if (!b) return;
    downloadBundle(b, { includeProgress: true });
    lastExportedRef.current = JSON.stringify(b);
    setDirty(false);
    showToast("Downloaded JSON");
  };

  const onExportJson = () => {
    const b = bundleRef.current;
    if (!b) return;
    downloadBundle(b, { includeProgress: false });
    showToast("Exported JSON (no progress)");
  };

  const onExportPng = async () => {
    const b = bundleRef.current;
    const root = flowRootRef.current;
    if (!b || !root) return;
    try {
      const slug =
        b.title
          .trim()
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/^-+|-+$/g, "") || b.id;
      await exportChartPng(root, `${slug}.png`);
      showToast("Exported PNG");
    } catch (err) {
      showToast(`PNG export failed: ${err}`);
    }
  };

  const progress = bundle?.progress ?? { version: 1, nodes: {} };

  const { progressPct, progressLabel } = useMemo(() => {
    if (!bundle) return { progressPct: 0, progressLabel: "0%" };
    const ids = collectTopicIds(bundle.lanes);
    let done = 0;
    let learning = 0;
    let flagged = 0;
    for (const id of ids) {
      const s = progress.nodes[id]?.status || "todo";
      if (s === "done") done++;
      else if (s === "learning") learning++;
      if (progress.nodes[id]?.flag) flagged++;
    }
    const total = ids.size || 1;
    const pct = Math.round((done / total) * 100);
    return {
      progressPct: pct,
      progressLabel: `${pct}% · ${done}/${total}${learning ? ` · ${learning} learning` : ""}${
        flagged ? ` · ${flagged} flagged` : ""
      }`,
    };
  }, [bundle, progress]);

  if (booting) {
    return <div className="loading">Loading roadmap…</div>;
  }

  if (!bundle && !error) {
    return (
      <div className="error-banner">
        <h1>Roadmap tracker</h1>
        <p>No roadmap loaded.</p>
        <div className="empty-actions">
          <button type="button" className="btn" onClick={onNew}>New roadmap</button>
          <button type="button" className="btn" onClick={onOpen}>Open JSON</button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden-file-input"
          onChange={onFileSelected}
        />
      </div>
    );
  }

  if (error && !bundle) {
    return (
      <div className="error-banner">
        <h1>Roadmap tracker</h1>
        <p>{error}</p>
        <button type="button" className="btn" onClick={onOpen}>Open JSON</button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden-file-input"
          onChange={onFileSelected}
        />
      </div>
    );
  }

  if (!bundle || !flow || !mapId) {
    return <div className="loading">Loading roadmap…</div>;
  }

  const selectedNote = selected ? bundle.notes[selected.id] ?? "" : "";

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden-file-input"
        onChange={onFileSelected}
      />
      <div className="app-shell">
        <div className="canvas-wrap">
          <AppMenu
            title={bundle.title}
            progressLabel={progressLabel}
            maps={maps}
            mapId={mapId}
            dirty={dirty}
            onMapChange={onMapChange}
            onNew={onNew}
            onOpen={onOpen}
            onSave={onSave}
            onExportJson={onExportJson}
            onExportPng={onExportPng}
            onOpenSearch={() => setSearchOpen(true)}
            onRenameTitle={onRenameTitle}
          />
          <ModeToolbar
            layoutMode={layoutMode}
            canvasTool={canvasTool}
            onCanvasTool={setCanvasTool}
            onEnterEdit={enterLayoutMode}
            onExitEdit={exitLayoutMode}
            onAdd={onAdd}
          />
          <SearchPopover
            open={searchOpen}
            onClose={() => setSearchOpen(false)}
            search={search}
            filter={filter}
            flagFilter={flagFilter}
            onSearch={setSearch}
            onFilter={setFilter}
            onFlagFilter={(v) => setFlagFilter(parseFlagFilter(v))}
          />
          <main className="map has-flow" aria-label="Roadmap">
            <FlowMap
              key={mapId}
              merged={flow}
              lanes={bundle.lanes}
              progress={progress}
              search={search}
              filter={filter}
              flagFilter={flagFilter}
              layoutMode={layoutMode}
              canvasTool={canvasTool}
              chart={chart}
              canUndo={canUndo}
              flowRootRef={flowRootRef}
              onSelect={setSelected}
              onSetFlag={onSetFlag}
              onChartChange={onChartChange}
              onRename={onRename}
              onRequestAdd={onRequestAdd}
              onDeleteTopics={onDeleteTopics}
              onUndo={onUndo}
              registerAddAtCenter={(fn) => {
                addAtCenter.current = fn;
              }}
            />
          </main>
        </div>
        <TopicPanel
          topic={selected}
          noteMarkdown={selectedNote}
          progress={progress}
          onClose={() => setSelected(null)}
          onStatus={(topicId, status) => patchProgress(topicId, { status })}
          onNotes={(topicId, notes) => patchProgress(topicId, { notes })}
          onNoteMarkdown={onNoteMarkdown}
          onFlag={onSetFlag}
        />
      </div>
      <SaveToast message={toast} onClear={() => setToast(null)} />
    </>
  );
}
