import { useState } from "react";
import type { TreeNode, FolderNode, FileNode } from "./lib/tree";

interface FileTreeProps {
  nodes: TreeNode[];
  activeKey: string | null;
  onSelect: (key: string) => void;
  depth?: number;
}

export function FileTree({ nodes, activeKey, onSelect, depth = 0 }: FileTreeProps) {
  return (
    <div className="tree-level">
      {nodes.map((node) =>
        node.kind === "folder" ? (
          <FolderRow
            key={node.name}
            node={node}
            activeKey={activeKey}
            onSelect={onSelect}
            depth={depth}
          />
        ) : (
          <FileRow
            key={node.key}
            node={node}
            activeKey={activeKey}
            onSelect={onSelect}
            depth={depth}
          />
        )
      )}
    </div>
  );
}

function FolderRow({
  node,
  activeKey,
  onSelect,
  depth,
}: {
  node: FolderNode;
  activeKey: string | null;
  onSelect: (key: string) => void;
  depth: number;
}) {
  const [open, setOpen] = useState(depth === 0);

  return (
    <div className="tree-folder-group">
      <button
        className="tree-row tree-folder-row"
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <svg
          className={`tree-chevron ${open ? "open" : ""}`}
          viewBox="0 0 16 16"
          fill="none"
        >
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <FolderIcon open={open} />
        <span className="tree-name">{node.name}</span>
      </button>

      <div className={`tree-children ${open ? "open" : ""}`}>
        <FileTree
          nodes={node.children}
          activeKey={activeKey}
          onSelect={onSelect}
          depth={depth + 1}
        />
      </div>
    </div>
  );
}

function FileRow({
  node,
  activeKey,
  onSelect,
  depth,
}: {
  node: FileNode;
  activeKey: string | null;
  onSelect: (key: string) => void;
  depth: number;
}) {
  return (
    <button
      className={`tree-row tree-file-row ${activeKey === node.key ? "active" : ""}`}
      style={{ paddingLeft: `${8 + depth * 12 + 16}px` }}
      onClick={() => onSelect(node.key)}
      title={node.title}
    >
      <FileIcon />
      <span className="tree-name">{node.name}</span>
    </button>
  );
}

function FolderIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="tree-icon tree-icon-folder" viewBox="0 0 16 16" fill="none">
      <path
        d="M1.5 4.5C1.5 3.67 2.17 3 3 3h3.09a1 1 0 0 1 .7.29l.92.92H13a1.5 1.5 0 0 1 1.5 1.5v6.29A1.5 1.5 0 0 1 13 13.5H3a1.5 1.5 0 0 1-1.5-1.5V4.5Z"
        fill="currentColor"
        opacity="0.3"
      />
      <path
        d="M1.5 6.5h13v5A1.5 1.5 0 0 1 13 13H3a1.5 1.5 0 0 1-1.5-1.5v-5Z"
        fill="currentColor"
        opacity="0.6"
      />
    </svg>
  ) : (
    <svg className="tree-icon tree-icon-folder" viewBox="0 0 16 16" fill="none">
      <path
        d="M1.5 4.5C1.5 3.67 2.17 3 3 3h3.09a1 1 0 0 1 .7.29l.92.92H13a1.5 1.5 0 0 1 1.5 1.5v6.29A1.5 1.5 0 0 1 13 13.5H3a1.5 1.5 0 0 1-1.5-1.5V4.5Z"
        fill="currentColor"
        opacity="0.5"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg className="tree-icon tree-icon-file" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="1.5" width="10" height="13" rx="1.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
      <path d="M5.5 6h5M5.5 8.5h5M5.5 11h3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}
