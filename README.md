# Roadmap tracker

Static React Flow SPA for interactive roadmaps. All state lives in a single **bundle JSON** file — open, edit, save. IndexedDB keeps drafts across refresh. No backend required.

## Run

```bash
# from repo root
tools/roadmap/roadmap

# or
cd tools/roadmap && npm run dev
```

First run installs npm deps. Open http://127.0.0.1:5173

Production build (includes bundling knowledge maps into `public/maps/`):

```bash
cd tools/roadmap && npm run build && npm run preview
```

The legacy Python server ([`serve.py`](serve.py)) still exists for the old file-based workflow but is **not** used by the default launcher.

## Bundle format (`roadmap.bundle.json`)

| Field | Role |
|-------|------|
| `lanes` | Topic tree (id + title, no file paths) |
| `nodes` / `edges` | React Flow chart layout |
| `notes` | Topic id → markdown curriculum |
| `progress` | Per-topic status, flags, personal notes |

Export/import uses the same shape. Share by sending the `.json` file.

## Regenerate bundles from knowledge (optional)

Existing markdown under `knowledge/**/topics/` is **not** modified. The bundler only **adds** `roadmap.bundle.json` and copies into `public/maps/`:

```bash
cd tools/roadmap && npm run bundle
```

Sources: `roadmap.json` + `topics/*.md` + `progress.json` per map folder.

## UI

- **☰ Menu** — New, Open, Save, Export JSON (no progress), Export PNG, roadmap switcher, Find & filter, Layout mode
- **Topic panel** — right side panel (no overlay); curriculum notes + personal progress
- **Zoom** — bottom-left controls on the chart
- IndexedDB autosave with toast feedback

**Layout mode** (menu): drag, resize, connect, undo — default is study/view (pan, click topic).

**Flags:** flag in panel or right-click on a box. Filter via Find & filter in menu.

## Migrate old layouts

If you still have `official.json` / `edits.json`:

```bash
node tools/roadmap/scripts/bake-roadmap.mjs
```
