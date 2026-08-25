---
name: create-roadmap
description: >-
  Author a valid RoadmapBundle JSON for the Roadmap editor
  (matzapata.github.io/roadmap): topic tree, React Flow chart, notes, and
  progress. Use when creating or editing a roadmap, a learning path, or a
  .json map this site can Open.
---

# Create or edit a roadmap

Portable skill: copy this **entire file** into Cursor, ChatGPT, Claude, Gemini, or any other assistant. It is self-contained — no repo access required.

**Product:** [matzapata.github.io/roadmap](https://matzapata.github.io/roadmap/) — a map is one JSON file. Open it with **Menu → Open…** (do not paste JSON into the canvas).

**Output:** one complete `RoadmapBundle` JSON document, pretty-printed (2-space indent, trailing newline). Not a fragment, not a JSON Patch, not TypeScript, not Markdown wrapping unless the user asks.

**Creating** — no existing bundle, or they want a new map. Follow **Create**.
**Editing** — they pasted JSON, pointed at a `.json` file, or asked to add / remove / rename / reorder / restyle. Follow **Edit**.

`$schema` for standalone files:

`https://matzapata.github.io/roadmap/schemas/roadmap-bundle.schema.json`

(If you are writing into this git repo’s `public/maps/`, use `../schemas/roadmap-bundle.schema.json` instead.)

JSON Schema (same document): that `$schema` URL, or `public/schemas/roadmap-bundle.schema.json` in the repo.

---

## Schema

Top-level object. **No extra keys** (`additionalProperties: false`).

```ts
type Status = "todo" | "learning" | "done";
type FlagColor = "red" | "orange" | "green" | "blue" | "purple";
type NodeType =
  | "topic" | "subtopic" | "title" | "label" | "paragraph"
  | "checklist" | "section" | "vertical" | "horizontal" | "group";

type TopicNode = {
  id: string;       // required, unique, slug
  title: string;    // required
  file?: string;    // omit in new maps
  children?: TopicNode[];
};

type Lane = {
  id: string;       // required
  title: string;    // required
  nodes: TopicNode[];
};

type ChartNode = {
  id: string;                    // required
  type: NodeType;                // required
  position: { x: number; y: number }; // required
  width?: number;                // always set when authoring
  height?: number;
  parentId?: string;             // children of section/group
  data?: {
    label?: string;
    topicId?: string;            // required on topic + subtopic
    style?: {
      stroke?: string;
      strokeWidth?: number;
      strokeLinecap?: string;
      strokeDasharray?: string | number;
      fontSize?: number;
      textAlign?: string;
      color?: string;
      backgroundColor?: string;
      borderColor?: string;
    };
    checklists?: { id: string; label: string }[];
    links?: { id: string; label: string; url?: string }[];
  };
};

type ChartEdge = {
  id: string;                    // required
  source: string;                // required (chart node id)
  target: string;                // required
  sourceHandle?: string | null;  // e.g. "x2"
  targetHandle?: string | null;  // e.g. "w1"
  style?: { stroke?: string; strokeWidth?: number; strokeLinecap?: string; strokeDasharray?: string | number };
  data?: { edgeStyle?: "solid" | "dashed" };
};

type RoadmapBundle = {
  $schema?: string;
  version: 1;                    // required, const
  kind: "roadmap";               // required, const
  id: string;                    // required, stable slug
  title: string;                 // required
  description?: string;
  lanes: Lane[];                 // required
  nodes: ChartNode[];            // required
  edges: ChartEdge[];            // required
  notes: Record<string, string>; // required, topic id → markdown
  progress: {                    // required
    version: number;             // use 1
    nodes: Record<string, {
      status: Status;
      notes: string;             // personal notes, not curriculum
      flag?: FlagColor | null;
      updatedAt?: string | null;
    }>;
  };
};
```

**Topic id slug:** lowercase; `[a-z0-9]` kept; anything else becomes `-`; trim hyphens; empty → `topic`. Unique across the whole tree.

---

## Dual model

**Lanes = content** (panel, notes, progress). **Chart = drawing** (React Flow). Every clickable topic exists in both.

- Default one lane: `{ "id": "main", "title": "Main", "nodes": [...] }`
- Depth 0 = main topics (`type: "topic"`). Children = subtopics (`type: "subtopic"`), usually one level
- `notes` **must** have a key for every topic id (empty string is fine)
- Templates: `progress` is `{ "version": 1, "nodes": {} }` — never ship user status/flags
- Chart ids for topics: `edit-<topicId>` (topic `html` → node `edit-html`)
- `data.topicId` on every `topic` / `subtopic` node; `data.label` equals the topic `title`
- Decorative ids: `title`, `spine`, `continue`

| type | role | typical size | `data.topicId`? |
|------|------|----------------|-----------------|
| `title` | map heading | 360×52 | no |
| `topic` | main box | 252×49 | **yes** |
| `subtopic` | child box | 252×49 | **yes** |
| `label` | caption | ~210×28 | no |
| `vertical` / `horizontal` | line | 20×72 / wide×20 | no |
| `paragraph` | extra text | as needed | no |
| `checklist` | `data.checklists` | as needed | no |
| `section` / `group` | backdrop; children use `parentId` | as needed | no |

Do not invent node types.

---

## Visual grammar

Top-down spine. Topics in a center column. Subtopics branch left or right. Alternate sides.

```
        [spine]
          |
       [title]
          |  solid
     [topic A] ---- dashed --> [sub] [sub] [sub]
          |  solid
     [topic B] ---- dashed --> [sub] [sub]
          |  solid
     [topic C]
          |
    [Continue Learning]
```

- **Solid** (`strokeDasharray: "0"`, `data.edgeStyle: "solid"`): title → first topic, topic → topic, topic → label
- **Dashed** (`"0.8 8"`, `edgeStyle: "dashed"`): topic ↔ subtopic
- Wire: `#2b78e4`, `strokeWidth: 3.5` (dashed topic–subtopic may use 2.5)

### Handles

`w`=top `x`=bottom `y`=left `z`=right; `1`=target `2`=source.

| Connection | sourceHandle | targetHandle |
|------------|--------------|--------------|
| Downward (title→topic, topic→topic) | `x2` | `w1` |
| Topic → subtopics on the **right** | `z2` | `y1` |
| Topic → subtopics on the **left** | `y2` | `z1` |

### Spacing

- Title ~`(360, 108)`, 360×52, `fontSize: 28`, centered
- First topic ~108px below title, centered under it (`x ≈ 414` for width 252)
- Right subtopic column `x ≈ 744`; left `x ≈ 84`
- Subtopics stack with **67px** y-step (49 height + 18 gap)
- Next main topic sits below the tallest branch of the previous one — no overlap
- Optional dashed `vertical` spine (`id: "spine"`, 20×72) above the title
- Optional `label` footer (“Continue Learning”) under the last topic

---

## Notes

`notes` is `topicId → markdown` in the side panel.

- 1–3 short sentences per topic
- Teach the idea, not a book chapter
- Backticks for code/terms

---

## Create

1. Outline 4–10 main topics, 2–5 subtopics each. One domain, sequential.
2. Slug ids; one `main` lane; children one level unless needed.
3. Place title, then topics top-to-bottom, then subtopics, then edges.
4. Fill `notes`. Leave `progress.nodes` `{}`.
5. Run the checklist. Return the JSON (or write `public/maps/<id>.json` if this repo).

## Edit

Start from the user’s bundle. Return a **full** file.

1. Keep `id`, `kind`, `version`. Keep `progress` unless they asked to reset it.
2. Keep existing chart node ids, positions, and sizes for anything you are not changing. Do not relayout the whole map unless they ask.
3. Every change updates **lanes + chart + notes** together (and `progress` when deleting):

   | Change | Lanes | Chart | Notes / progress |
   |--------|-------|-------|------------------|
   | Add topic | New slug in the tree | Node `edit-<id>` (252×49) + solid spine edge | `notes[id] = ""` |
   | Add subtopic | Child under the parent | Same; dashed edge to parent; same x as siblings on that side | `notes[id] = ""` |
   | Rename topic | `title` only — **do not change `id`** | Matching `data.label` (and the `title` node if renaming the map) | Leave keys as-is |
   | Delete topic | Remove node and children | Remove `edit-<id>` and edges to/from it | Delete `notes[id]` and `progress.nodes[id]` |
   | Reorder | New tree order | New y positions + spine edges so the chart matches | Unchanged |

4. Inserting in the middle: shift nodes **below** down (~145px per main topic with no children; **67px** per extra subtopic row). Close obvious gaps after a delete. Leave unrelated branches put.
5. Run the checklist.

## Checklist

- [ ] `version: 1`, `kind: "roadmap"`, non-empty `id` / `title`
- [ ] `$schema` is the public URL (or the relative repo path)
- [ ] Every topic id unique; every topic has `notes[id]`
- [ ] Every `topic` / `subtopic` chart node has `data.topicId` matching a lane topic
- [ ] `data.label` equals topic `title`
- [ ] Chart node ids `edit-<topicId>` for those boxes
- [ ] Every edge `source` / `target` exists; handles set
- [ ] Topic–subtopic edges dashed; spine edges solid
- [ ] Boxes do not overlap; subtopics of one topic share an x
- [ ] **Create:** `progress` is `{ "version": 1, "nodes": {} }`. **Edit:** keep progress; drop keys for deleted topics
- [ ] No extra top-level keys

## Do not

- Invent node types
- Wipe `progress` on edit (templates only)
- Relayout the whole chart for a small edit
- Change topic `id`s when renaming
- Rely on title-matching instead of `topicId`
- Generate a chart with no `width` / `height`
- Dump an entire curriculum into `notes`

---

## Minimal example

Copy this shape. Scale it: more topics, alternate branch sides, keep the same spacing.

```json
{
  "$schema": "https://matzapata.github.io/roadmap/schemas/roadmap-bundle.schema.json",
  "version": 1,
  "kind": "roadmap",
  "id": "example",
  "title": "Example",
  "description": "Two topics — copy this layout.",
  "lanes": [
    {
      "id": "main",
      "title": "Main",
      "nodes": [
        {
          "id": "foundations",
          "title": "Foundations",
          "children": [
            { "id": "basics", "title": "Basics" },
            { "id": "practice", "title": "Practice" }
          ]
        },
        { "id": "next-steps", "title": "Next Steps" }
      ]
    }
  ],
  "nodes": [
    {
      "id": "spine",
      "type": "vertical",
      "position": { "x": 530, "y": 28 },
      "width": 20,
      "height": 72,
      "data": {
        "style": {
          "stroke": "#2b78e4",
          "strokeWidth": 3.5,
          "strokeLinecap": "round",
          "strokeDasharray": "0.8 8"
        }
      }
    },
    {
      "id": "title",
      "type": "title",
      "position": { "x": 360, "y": 108 },
      "width": 360,
      "height": 52,
      "data": { "label": "Example", "style": { "fontSize": 28, "textAlign": "center" } }
    },
    {
      "id": "edit-foundations",
      "type": "topic",
      "position": { "x": 414, "y": 216 },
      "width": 252,
      "height": 49,
      "data": { "label": "Foundations", "topicId": "foundations" }
    },
    {
      "id": "edit-basics",
      "type": "subtopic",
      "position": { "x": 744, "y": 216 },
      "width": 252,
      "height": 49,
      "data": { "label": "Basics", "topicId": "basics" }
    },
    {
      "id": "edit-practice",
      "type": "subtopic",
      "position": { "x": 744, "y": 283 },
      "width": 252,
      "height": 49,
      "data": { "label": "Practice", "topicId": "practice" }
    },
    {
      "id": "edit-next-steps",
      "type": "topic",
      "position": { "x": 414, "y": 361 },
      "width": 252,
      "height": 49,
      "data": { "label": "Next Steps", "topicId": "next-steps" }
    },
    {
      "id": "continue",
      "type": "label",
      "position": { "x": 437, "y": 480 },
      "width": 210,
      "height": 28,
      "data": { "label": "Continue Learning", "style": { "color": "#000000", "fontSize": 17 } }
    }
  ],
  "edges": [
    {
      "id": "e-title-foundations",
      "source": "title",
      "target": "edit-foundations",
      "sourceHandle": "x2",
      "targetHandle": "w1",
      "style": { "stroke": "#2b78e4", "strokeWidth": 3.5, "strokeLinecap": "round", "strokeDasharray": "0" },
      "data": { "edgeStyle": "solid" }
    },
    {
      "id": "e-foundations-basics",
      "source": "edit-foundations",
      "target": "edit-basics",
      "sourceHandle": "z2",
      "targetHandle": "y1",
      "style": { "stroke": "#2b78e4", "strokeWidth": 3.5, "strokeLinecap": "round", "strokeDasharray": "0.8 8" },
      "data": { "edgeStyle": "dashed" }
    },
    {
      "id": "e-foundations-practice",
      "source": "edit-foundations",
      "target": "edit-practice",
      "sourceHandle": "z2",
      "targetHandle": "y1",
      "style": { "stroke": "#2b78e4", "strokeWidth": 3.5, "strokeLinecap": "round", "strokeDasharray": "0.8 8" },
      "data": { "edgeStyle": "dashed" }
    },
    {
      "id": "e-foundations-next",
      "source": "edit-foundations",
      "target": "edit-next-steps",
      "sourceHandle": "x2",
      "targetHandle": "w1",
      "style": { "stroke": "#2b78e4", "strokeWidth": 3.5, "strokeLinecap": "round", "strokeDasharray": "0" },
      "data": { "edgeStyle": "solid" }
    },
    {
      "id": "e-next-continue",
      "source": "edit-next-steps",
      "target": "continue",
      "sourceHandle": "x2",
      "targetHandle": "w1",
      "style": { "stroke": "#2b78e4", "strokeWidth": 3.5, "strokeLinecap": "round", "strokeDasharray": "0" },
      "data": { "edgeStyle": "solid" }
    }
  ],
  "notes": {
    "foundations": "Start with the core ideas before you specialize.\n",
    "basics": "Names, terms, and the smallest working example.\n",
    "practice": "Build something small so the ideas stick.\n",
    "next-steps": "Pick one direction and go deeper — don’t try to learn everything at once.\n"
  },
  "progress": { "version": 1, "nodes": {} }
}
```
