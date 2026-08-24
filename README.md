# Roadmap tracker

Static React Flow SPA for interactive study roadmaps. A map is a single **bundle JSON** file — open, edit, save. IndexedDB keeps drafts across refresh. No backend.

Live: [matzapata.github.io/roadmap](https://matzapata.github.io/roadmap/)

## Run

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173

Production build:

```bash
npm run build && npm run preview
```

Pushes to `main` deploy GitHub Pages (`base` is `/roadmap/` when `GITHUB_PAGES=true`).

## Using it

On first load the app opens the shipped **Untitled** example if you have no saved maps. **New** starts another copy of that example. Or **Open…** an existing `.json` bundle.

- **☰ Menu** — New, Open, Save to file, Export JSON (no progress), Export PNG, Delete, Find & filter, roadmap switcher
- **Title** — double-click to rename
- **Topic panel** — click a topic; curriculum markdown + personal notes + status (`todo` / `learning` / `done`)
- **Zoom** — bottom-left controls on the chart
- IndexedDB autosave with toast feedback (`?map=<id>` in the URL)

**Edit mode** (pen icon on the toolbar): drag, resize, connect, add topic/subtopic/label, undo (`⌘Z` / `Ctrl+Z`). The eye icon returns to view mode (pan, click topic). Select vs pan tools are on the same toolbar.

**Flags:** set in the panel or via right-click. Filter under Find & filter.

## Bundle format

| Field | Role |
|-------|------|
| `version` / `kind` | `1` / `"roadmap"` |
| `id` / `title` | Map identity |
| `lanes` | Topic tree (`id` + `title`) |
| `nodes` / `edges` | React Flow chart layout |
| `notes` | Topic id → markdown curriculum |
| `progress` | Per-topic status, flags, personal notes |

Export/import uses the same shape. Share by sending the `.json` file.

Shipped maps live in `public/maps/` (`index.json` plus matching bundle files). The app fetches that index on boot and copies a starter into IndexedDB the first time it is opened.
