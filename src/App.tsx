import { useState, useEffect, useMemo } from "react";
import { marked } from "marked";

const REPO_NAME = "DocMed";

type ManifestEntry = { filePath: string; title: string; docKey: string };
type DocFile = { filePath: string; title: string; content: string };
type Commit = { id: string; message: string; pusher: string; timestamp: string };
type View = { type: "home" } | { type: "commits" } | { type: "doc"; key: string };

function parseHash(): View {
  const hash = window.location.hash.slice(1);
  if (!hash || hash === "/") return { type: "home" };
  if (hash === "/commits") return { type: "commits" };
  if (hash.startsWith("/docs/")) return { type: "doc", key: hash.slice(6) };
  return { type: "home" };
}

function groupByDir(entries: ManifestEntry[]): [string, ManifestEntry[]][] {
  const map = new Map<string, ManifestEntry[]>();
  for (const e of entries) {
    const parts = e.filePath.split("/");
    const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : "root";
    if (!map.has(dir)) map.set(dir, []);
    map.get(dir)!.push(e);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

export default function App() {
  const [view, setView] = useState<View>(parseHash);
  const [manifest, setManifest] = useState<ManifestEntry[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [doc, setDoc] = useState<DocFile | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
    if (view.type !== "doc") { setDoc(null); return; }
    setLoadingDoc(true);
    setDoc(null);
    fetch(`/docs/${view.key}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setDoc)
      .catch(() => {})
      .finally(() => setLoadingDoc(false));
  }, [view]);

  useEffect(() => {
    const handler = () => setView(parseHash());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const navigate = (hash: string) => { window.location.hash = hash; };

  const filtered = useMemo(() => {
    if (!search.trim()) return manifest;
    const q = search.toLowerCase();
    return manifest.filter(
      (e) => e.filePath.toLowerCase().includes(q) || e.title.toLowerCase().includes(q)
    );
  }, [manifest, search]);

  const grouped = useMemo(() => groupByDir(filtered), [filtered]);

  const activeDocKey = view.type === "doc" ? view.key : null;

  return (
    <div className="layout">
      <aside className={`sidebar ${sidebarOpen ? "" : "collapsed"}`}>
        <div className="sidebar-top">
          <button className="repo-title" onClick={() => navigate("/")}>
            {REPO_NAME}
          </button>
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
                onClick={() => navigate("/")}
              >
                Overview
              </button>
              <button
                className={`nav-item ${view.type === "commits" ? "active" : ""}`}
                onClick={() => navigate("/commits")}
              >
                Commits
                {commits.length > 0 && (
                  <span className="nav-badge">{commits.length}</span>
                )}
              </button>

              {grouped.length > 0 && (
                <div className="nav-docs">
                  <p className="nav-section-label">Documentation</p>
                  {grouped.map(([dir, entries]) => (
                    <div key={dir} className="nav-group">
                      <p className="nav-dir">{dir}</p>
                      {entries.map((e) => (
                        <button
                          key={e.docKey}
                          className={`nav-item nav-file ${activeDocKey === e.docKey ? "active" : ""}`}
                          onClick={() => navigate(`/docs/${e.docKey}`)}
                          title={e.filePath}
                        >
                          {e.filePath.split("/").pop()}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {manifest.length === 0 && (
                <p className="nav-empty">Documentation is being generated…</p>
              )}
            </nav>
          </div>
        )}
      </aside>

      <main className="main">
        {view.type === "home" && (
          <HomeView repoName={REPO_NAME} manifest={manifest} commits={commits} navigate={navigate} />
        )}
        {view.type === "commits" && <CommitsView commits={commits} />}
        {view.type === "doc" && <DocView doc={doc} loading={loadingDoc} />}
      </main>
    </div>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────

function HomeView({
  repoName,
  manifest,
  commits,
  navigate,
}: {
  repoName: string;
  manifest: ManifestEntry[];
  commits: Commit[];
  navigate: (h: string) => void;
}) {
  return (
    <div className="page">
      <h1 className="page-title">{repoName}</h1>
      <p className="page-subtitle">Auto-generated documentation</p>

      <div className="stats-row">
        <div className="stat-card" onClick={() => navigate("/commits")} role="button">
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
                onClick={() => navigate(`/docs/${e.docKey}`)}
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

function DocView({ doc, loading }: { doc: DocFile | null; loading: boolean }) {
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

  return (
    <div className="page">
      <p className="doc-filepath">{doc.filePath}</p>
      <h1 className="page-title">{doc.title}</h1>
      <div
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
