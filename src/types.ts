export type ManifestEntry = { filePath: string; title: string; docKey: string };
export type DocVersion = {
  timestamp: string;
  title: string;
  content: string;
  dependencies: string[];
  commitId: string | null;
};
export type DocFile = {
  filePath: string;
  title: string;
  content: string;
  dependencies?: string[];
  versions?: DocVersion[];
};
export type Commit = { id: string; message: string; pusher: string; timestamp: string };
export type DependencyGraph = Record<string, string[]>;
export type View =
  | { type: "home" }
  | { type: "commits" }
  | { type: "deps"; focus?: string }
  | { type: "doc"; key: string }
  | { type: "folder"; path: string };
export type Tab = { id: string; view: View; label: string };
