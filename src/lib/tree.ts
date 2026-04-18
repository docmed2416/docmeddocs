import type { ManifestEntry } from "../types";

export type FileNode = {
  kind: "file";
  name: string;
  key: string;
  title: string;
};

export type FolderNode = {
  kind: "folder";
  name: string;
  children: TreeNode[];
};

export type TreeNode = FileNode | FolderNode;

export function buildTree(entries: ManifestEntry[]): TreeNode[] {
  const root: FolderNode = { kind: "folder", name: "", children: [] };

  for (const entry of entries) {
    const segments = entry.docKey.split("__").filter(Boolean);
    let current = root;

    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      let folder = current.children.find(
        (n): n is FolderNode => n.kind === "folder" && n.name === seg
      );
      if (!folder) {
        folder = { kind: "folder", name: seg, children: [] };
        current.children.push(folder);
      }
      current = folder;
    }

    const fileName = segments[segments.length - 1];
    current.children.push({
      kind: "file",
      name: fileName,
      key: entry.docKey,
      title: entry.title,
    });
  }

  sortNodes(root.children);
  return root.children;
}

function sortNodes(nodes: TreeNode[]): void {
  nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const node of nodes) {
    if (node.kind === "folder") sortNodes(node.children);
  }
}
