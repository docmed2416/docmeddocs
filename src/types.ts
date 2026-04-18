export type ManifestEntry = { filePath: string; title: string; docKey: string };
export type DocFile = { filePath: string; title: string; content: string };
export type Commit = { id: string; message: string; pusher: string; timestamp: string };
export type View = { type: "home" } | { type: "commits" } | { type: "doc"; key: string };
export type Tab = { id: string; view: View; label: string };
