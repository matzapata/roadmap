#!/usr/bin/env node
/**
 * Build roadmap.bundle.json from knowledge roadmaps + topics markdown + progress.
 * Copies bundles into tools/roadmap/public/maps/ for the static SPA.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROADMAP_UI = path.resolve(SCRIPT_DIR, "..");
const REPO_ROOT = path.resolve(ROADMAP_UI, "..", "..");
const KNOWLEDGE = path.join(REPO_ROOT, "knowledge");
const PUBLIC_MAPS = path.join(ROADMAP_UI, "public", "maps");
const ROADMAP_NAME = "roadmap.json";
const BUNDLE_NAME = "roadmap.bundle.json";
const PROGRESS_NAME = "progress.json";

const MD_LINK = /\[([^\]]*)\]\(([^)\s]+\.md)(#[^)\s]*)?\)/gi;

function slugFor(mapDir, knowledgeBase) {
  return path.relative(knowledgeBase, mapDir).split(path.sep).join("/");
}

function resolveRelPath(fromFile, href) {
  const fromDir = fromFile.includes("/") ? fromFile.slice(0, fromFile.lastIndexOf("/")) : "";
  const parts = [...fromDir.split("/").filter(Boolean), ...href.split("/")];
  const out = [];
  for (const p of parts) {
    if (!p || p === ".") continue;
    if (p === "..") {
      if (out.length && out[out.length - 1] !== "..") out.pop();
      else out.push("..");
    } else {
      out.push(p);
    }
  }
  return out.join("/");
}

function headingSlug(title) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function extractMarkdownSection(md, anchor) {
  if (!anchor) return md;
  const escaped = anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const idRe = new RegExp(`<a\\s+id=["']${escaped}["']\\s*>\\s*</a>\\s*\\n?`, "i");
  const idMatch = idRe.exec(md);
  if (idMatch && idMatch.index != null) {
    const rest = md.slice(idMatch.index + idMatch[0].length);
    const next = rest.search(/<a\s+id=["'][^"']+["']\s*>\s*<\/a>/i);
    return (next === -1 ? rest : rest.slice(0, next)).trim();
  }

  const lines = md.split("\n");
  let found = -1;
  let level = 0;
  for (let i = 0; i < lines.length; i++) {
    const hm = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(lines[i]);
    if (!hm) continue;
    if (headingSlug(hm[2]) === anchor) {
      found = i;
      level = hm[1].length;
      break;
    }
  }
  if (found === -1) return md;
  let end = lines.length;
  for (let i = found + 1; i < lines.length; i++) {
    const hm = /^(#{1,6})\s+/.exec(lines[i]);
    if (hm && hm[1].length <= level) {
      end = i;
      break;
    }
  }
  return lines.slice(found, end).join("\n").trim();
}

function safeKnowledgeMd(knowledgeBase, mapDir, rel) {
  if (!rel || rel.startsWith("/")) return null;
  const target = path.resolve(mapDir, rel);
  const base = path.resolve(knowledgeBase);
  if (!target.startsWith(base + path.sep) && target !== base) return null;
  if (!fs.existsSync(target) || path.extname(target).toLowerCase() !== ".md") return null;
  return target;
}

function loadTopicMarkdown(mapDir, knowledgeBase, file) {
  const rel = file.replace(/^\//, "");
  const topicPath = path.join(mapDir, rel);
  if (!fs.existsSync(topicPath)) return `_Could not load_ \`${file}\``;
  let md = fs.readFileSync(topicPath, "utf8");

  if (md.length > 1200) return md;

  MD_LINK.lastIndex = 0;
  let match;
  while ((match = MD_LINK.exec(md))) {
    const href = match[2];
    const hash = match[3] ? match[3].slice(1) : "";
    const resolved = resolveRelPath(rel, href);
    if (!resolved.startsWith("../")) continue;
    const target = safeKnowledgeMd(knowledgeBase, mapDir, resolved);
    if (!target) continue;
    const targetMd = fs.readFileSync(target, "utf8");
    return hash ? extractMarkdownSection(targetMd, hash) : targetMd;
  }
  return md;
}

function flattenTopics(lanes) {
  const out = [];
  function walk(nodes) {
    for (const n of nodes || []) {
      out.push(n);
      if (n.children?.length) walk(n.children);
    }
  }
  for (const lane of lanes || []) walk(lane.nodes);
  return out;
}

function stripFileFromLanes(lanes) {
  function walk(nodes) {
    return (nodes || []).map((n) => {
      const { id, title, children } = n;
      const node = { id, title };
      if (children?.length) node.children = walk(children);
      return node;
    });
  }
  return (lanes || []).map((lane) => ({
    id: lane.id,
    title: lane.title,
    nodes: walk(lane.nodes),
  }));
}

function loadProgress(progressPath, fileToId) {
  if (!fs.existsSync(progressPath)) {
    return { version: 1, nodes: {} };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(progressPath, "utf8"));
    const nodes = {};
    for (const [key, v] of Object.entries(raw.nodes || {})) {
      if (!v || typeof v !== "object") continue;
      const topicId = fileToId[key] || key;
      const entry = {
        status: ["todo", "learning", "done"].includes(v.status) ? v.status : "todo",
        notes: typeof v.notes === "string" ? v.notes : "",
        updatedAt: v.updatedAt || null,
      };
      if (v.flag) entry.flag = v.flag;
      nodes[topicId] = entry;
    }
    return { version: raw.version || 1, nodes };
  } catch {
    return { version: 1, nodes: {} };
  }
}

function discoverRoadmaps() {
  const found = [];
  if (!fs.existsSync(KNOWLEDGE)) return found;

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name.startsWith(".")) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name === ROADMAP_NAME) {
        try {
          const data = JSON.parse(fs.readFileSync(full, "utf8"));
          if (data && typeof data === "object" && Array.isArray(data.lanes)) {
            found.push({ mapDir: dir, data });
          }
        } catch {
          /* skip */
        }
      }
    }
  }
  walk(KNOWLEDGE);
  return found;
}

function bundleMap(mapDir, data) {
  const id = slugFor(mapDir, KNOWLEDGE);
  const topics = flattenTopics(data.lanes);
  const fileToId = {};
  for (const t of topics) {
    if (t.file) fileToId[t.file] = t.id;
  }

  const notes = {};
  for (const t of topics) {
    if (!t.file) {
      notes[t.id] = "";
      continue;
    }
    notes[t.id] = loadTopicMarkdown(mapDir, KNOWLEDGE, t.file);
  }

  const progressPath = path.join(mapDir, PROGRESS_NAME);
  const progress = loadProgress(progressPath, fileToId);

  return {
    version: 1,
    kind: "roadmap",
    id,
    title: data.title || id,
    description: typeof data.description === "string" ? data.description : "",
    lanes: stripFileFromLanes(data.lanes),
    nodes: data.nodes || [],
    edges: data.edges || [],
    notes,
    progress,
  };
}

function writeJson(filePath, obj) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function main() {
  const maps = discoverRoadmaps();
  if (!maps.length) {
    console.error("No roadmap.json files with lanes found under knowledge/");
    process.exit(1);
  }

  const index = [];

  for (const { mapDir, data } of maps) {
    const bundle = bundleMap(mapDir, data);
    const bundlePath = path.join(mapDir, BUNDLE_NAME);
    writeJson(bundlePath, bundle);

    const publicPath = path.join(PUBLIC_MAPS, `${bundle.id}.json`);
    writeJson(publicPath, bundle);

    index.push({
      id: bundle.id,
      title: bundle.title,
      path: `/maps/${bundle.id}.json`,
    });

    const noteCount = Object.keys(bundle.notes).length;
    const sizeKb = (Buffer.byteLength(JSON.stringify(bundle), "utf8") / 1024).toFixed(1);
    console.log(`  ${bundle.id} — ${noteCount} notes, ${sizeKb} KiB → ${bundlePath}`);
  }

  writeJson(path.join(PUBLIC_MAPS, "index.json"), index);
  console.log(`\nWrote ${index.length} bundle(s) + public/maps/index.json`);
}

main();
