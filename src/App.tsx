import { useState, useEffect, useMemo, useCallback } from "react";
import { marked } from "marked";
import type { ManifestEntry, DocFile, Commit, View, Tab } from "./types";
import { buildTree } from "./lib/tree";
import type { TreeNode, FolderNode, FileNode } from "./lib/tree";
import { FileTree } from "./FileTree";
import { TabBar } from "./TabBar";

const REPO_NAME = "DocMed";

let nextId = 1;
function makeTab(view: View = { type: "home" }): Tab {
  return { id: String(nextId++), view, label: labelFor(view) };
}

function labelFor(view: View): string {
  if (view.type === "home") return "Overview";
  if (view.type === "commits") return "Commits";
  if (view.type === "folder") return view.path.split("__").pop() ?? view.path;
  return view.key.split("__").pop() ?? view.key;
}

// ─── Theme ────────────────────────────────────────────────────────────────────

function useTheme() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}

// ─── Folder tree helpers ──────────────────────────────────────────────────────

function findFolder(nodes: TreeNode[], pathSegments: string[]): FolderNode | null {
  if (pathSegments.length === 0) return null;
  const [head, ...rest] = pathSegments;
  const found = nodes.find((n): n is FolderNode => n.kind === "folder" && n.name === head);
  if (!found) return null;
  if (rest.length === 0) return found;
  return findFolder(found.children, rest);
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const { dark, toggle: toggleTheme } = useTheme();
  const [tabs, setTabs] = useState<Tab[]>(() => [makeTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id);
  const [manifest, setManifest] = useState<ManifestEntry[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [docCache, setDocCache] = useState<Record<string, DocFile | null>>({});
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const view = activeTab.view;

  useEffect(() => {
    fetch("/docs/_manifest.json")
      .then((r) => (r.ok ? r.json() : []))
      .then(setManifest)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/data/commits.json")
      .then((r) => (r.ok ? r.json() : []))
      .then(setCommits)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (view.type !== "doc") return;
    const key = view.key;
    if (key in docCache || loadingKeys.has(key)) return;
    setLoadingKeys((s) => new Set(s).add(key));
    fetch(`/docs/${key}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: DocFile | null) => setDocCache((c) => ({ ...c, [key]: data })))
      .catch(() => setDocCache((c) => ({ ...c, [key]: null })))
      .finally(() => setLoadingKeys((s) => { const n = new Set(s); n.delete(key); return n; }));
  }, [view, docCache, loadingKeys]);

  const openInActiveTab = useCallback((newView: View) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId ? { ...t, view: newView, label: labelFor(newView) } : t
      )
    );
  }, [activeTabId]);

  const addTab = useCallback(() => {
    const tab = makeTab();
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      if (prev.length === 1) return [makeTab()];
      const idx = prev.findIndex((t) => t.id === id);
      const next = prev.filter((t) => t.id !== id);
      if (id === activeTabId) setActiveTabId(next[Math.max(0, idx - 1)].id);
      return next;
    });
  }, [activeTabId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return manifest;
    const q = search.toLowerCase();
    return manifest.filter(
      (e) => e.filePath.toLowerCase().includes(q) || e.title.toLowerCase().includes(q)
    );
  }, [manifest, search]);

  const treeNodes = useMemo(() => buildTree(filtered), [filtered]);

  const activeDocKey = view.type === "doc" ? view.key : null;
  const activeFolderPath = view.type === "folder" ? view.path : null;
  const currentDoc = activeDocKey != null ? (docCache[activeDocKey] ?? null) : null;
  const isLoadingDoc = activeDocKey != null && loadingKeys.has(activeDocKey);

  const currentFolder = useMemo(() => {
    if (view.type !== "folder") return null;
    return findFolder(treeNodes, view.path.split("__"));
  }, [view, treeNodes]);

  return (
    <div className="layout">
      <aside className={`sidebar ${sidebarOpen ? "" : "collapsed"}`}>
        <div className="sidebar-top">
          {sidebarOpen && (
            <>
              <button className="repo-title" onClick={() => openInActiveTab({ type: "home" })}>
                {REPO_NAME}
              </button>
              <div className="sidebar-top-actions">
                <button
                  className="theme-toggle"
                  onClick={toggleTheme}
                  title={dark ? "Switch to light mode" : "Switch to dark mode"}
                  aria-label="Toggle theme"
                >
                  {dark ? "☀" : "☾"}
                </button>
              </div>
            </>
          )}
          <button
            className="collapse-btn"
            onClick={() => setSidebarOpen((o) => !o)}
            title={sidebarOpen ? "Collapse" : "Expand"}
          >
            {sidebarOpen ? "‹" : "›"}
          </button>
        </div>

        {sidebarOpen && (
          <div className="sidebar-body">
            <div className="search-wrap">
              <svg className="search-icon" viewBox="0 0 20 20" fill="none">
                <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Search docs…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="search-clear" onClick={() => setSearch("")}>×</button>
              )}
            </div>

            <nav className="nav">
              <button
                className={`nav-item ${view.type === "home" ? "active" : ""}`}
                onClick={() => openInActiveTab({ type: "home" })}
              >
                Overview
              </button>
              <button
                className={`nav-item ${view.type === "commits" ? "active" : ""}`}
                onClick={() => openInActiveTab({ type: "commits" })}
              >
                Commits
                {commits.length > 0 && (
                  <span className="nav-badge">{commits.length}</span>
                )}
              </button>

              {treeNodes.length > 0 && (
                <div className="nav-docs">
                  <p className="nav-section-label">Documentation</p>
                  <FileTree
                    nodes={treeNodes}
                    activeKey={activeDocKey}
                    activeFolderPath={activeFolderPath}
                    onSelect={(key) => openInActiveTab({ type: "doc", key })}
                    onFolder={(path) => openInActiveTab({ type: "folder", path })}
                  />
                </div>
              )}

              {manifest.length === 0 && (
                <p className="nav-empty">Documentation is being generated…</p>
              )}
            </nav>
          </div>
        )}
      </aside>

      <div className="main-column">
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onSwitch={setActiveTabId}
          onClose={closeTab}
          onAdd={addTab}
        />

        <main className="main">
          {view.type === "home" && (
            <HomeView
              repoName={REPO_NAME}
              manifest={manifest}
              commits={commits}
              onNavigate={(v) => openInActiveTab(v)}
            />
          )}
          {view.type === "commits" && <CommitsView commits={commits} />}
          {view.type === "doc" && (
            <DocView doc={currentDoc} loading={isLoadingDoc} docKey={view.key} onNavigate={(v) => openInActiveTab(v)} />
          )}
          {view.type === "folder" && (
            <FolderView
              path={view.path}
              folder={currentFolder}
              onNavigate={(v) => openInActiveTab(v)}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────

function HomeView({
  repoName,
  manifest,
  commits,
  onNavigate,
}: {
  repoName: string;
  manifest: ManifestEntry[];
  commits: Commit[];
  onNavigate: (v: View) => void;
}) {
  return (
    <div className="page">
      <h1 className="page-title">{repoName}</h1>
      <p className="page-subtitle">Auto-generated documentation</p>

      <div className="stats-row">
        <div className="stat-card" onClick={() => onNavigate({ type: "commits" })} role="button">
          <span className="stat-value">{commits.length}</span>
          <span className="stat-label">Commits tracked</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{manifest.length}</span>
          <span className="stat-label">Files documented</span>
        </div>
        {commits.length > 0 && (
          <div className="stat-card">
            <span className="stat-value stat-small">
              {new Date(commits[commits.length - 1].timestamp).toLocaleDateString()}
            </span>
            <span className="stat-label">Last commit</span>
          </div>
        )}
      </div>

      {manifest.length > 0 && (
        <section className="home-section">
          <h2 className="section-title">Recent docs</h2>
          <div className="file-grid">
            {manifest.slice(0, 12).map((e) => (
              <button
                key={e.docKey}
                className="file-card"
                onClick={() => onNavigate({ type: "doc", key: e.docKey })}
              >
                <span className="file-card-name">{e.filePath.split("/").pop()}</span>
                <span className="file-card-path">{e.filePath}</span>
                <span className="file-card-title">{e.title}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Folder ───────────────────────────────────────────────────────────────────

function FolderView({
  path,
  folder,
  onNavigate,
}: {
  path: string;
  folder: FolderNode | null;
  onNavigate: (v: View) => void;
}) {
  const segments = path.split("__");
  const name = segments[segments.length - 1];

  if (!folder) {
    return (
      <div className="page">
        <p className="empty-state">Folder not found.</p>
      </div>
    );
  }

  const files = folder.children.filter((n): n is FileNode => n.kind === "file");
  const subfolders = folder.children.filter((n): n is FolderNode => n.kind === "folder");

  return (
    <div className="page">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        {segments.map((seg, i) => {
          const crumbPath = segments.slice(0, i + 1).join("__");
          const isLast = i === segments.length - 1;
          return (
            <span key={crumbPath} className="breadcrumb-item">
              {i > 0 && <span className="breadcrumb-sep">/</span>}
              {isLast ? (
                <span className="breadcrumb-current">{seg}</span>
              ) : (
                <button
                  className="breadcrumb-link"
                  onClick={() => onNavigate({ type: "folder", path: crumbPath })}
                >
                  {seg}
                </button>
              )}
            </span>
          );
        })}
      </div>

      <h1 className="page-title">{name}</h1>
      <p className="page-subtitle">{folder.children.length} item{folder.children.length !== 1 ? "s" : ""}</p>

      {subfolders.length > 0 && (
        <section className="home-section">
          <h2 className="section-title">Folders</h2>
          <div className="file-grid">
            {subfolders.map((sub) => {
              const subPath = `${path}__${sub.name}`;
              return (
                <button
                  key={sub.name}
                  className="file-card"
                  onClick={() => onNavigate({ type: "folder", path: subPath })}
                >
                  <span className="file-card-name">📁 {sub.name}</span>
                  <span className="file-card-path">{sub.children.length} item{sub.children.length !== 1 ? "s" : ""}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {files.length > 0 && (
        <section className="home-section">
          <h2 className="section-title">Files</h2>
          <div className="file-grid">
            {files.map((file) => (
              <button
                key={file.key}
                className="file-card"
                onClick={() => onNavigate({ type: "doc", key: file.key })}
              >
                <span className="file-card-name">{file.name}</span>
                <span className="file-card-title">{file.title}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Commits ──────────────────────────────────────────────────────────────────

function CommitsView({ commits }: { commits: Commit[] }) {
  return (
    <div className="page">
      <h1 className="page-title">Commits</h1>
      {commits.length === 0 ? (
        <p className="empty-state">No commits recorded yet.</p>
      ) : (
        <ul className="commit-list">
          {[...commits].reverse().map((c) => (
            <li key={c.id} className="commit-item">
              <span className="commit-sha">{c.id.slice(0, 7)}</span>
              <div className="commit-body">
                <span className="commit-msg">{c.message}</span>
                <span className="commit-meta">
                  {c.pusher} · {new Date(c.timestamp).toLocaleString()}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Doc ──────────────────────────────────────────────────────────────────────

function DocView({ doc, loading, docKey, onNavigate }: { doc: DocFile | null; loading: boolean; docKey: string; onNavigate: (v: View) => void }) {
  const html = useMemo(() => {
    if (!doc?.content) return "";
    return marked.parse(doc.content) as string;
  }, [doc]);

  if (loading) {
    return (
      <div className="page">
        <div className="loading-pulse" />
        <div className="loading-pulse short" />
        <div className="loading-pulse" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="page">
        <p className="empty-state">Documentation not found.</p>
      </div>
    );
  }

  const segments = docKey.split("__");

  return (
    <div className="page">
      {segments.length > 1 && (
        <div className="breadcrumb">
          {segments.map((seg, i) => {
            const isLast = i === segments.length - 1;
            const crumbPath = segments.slice(0, i + 1).join("__");
            return (
              <span key={crumbPath} className="breadcrumb-item">
                {i > 0 && <span className="breadcrumb-sep">/</span>}
                {isLast ? (
                  <span className="breadcrumb-current">{seg}</span>
                ) : (
                  <button
                    className="breadcrumb-link"
                    onClick={() => onNavigate({ type: "folder", path: crumbPath })}
                  >
                    {seg}
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}
      <h1 className="page-title">{doc.title}</h1>
      <div
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
