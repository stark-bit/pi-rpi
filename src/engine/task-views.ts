import type { TaskManifest } from "./types.ts";
import { requiredTypesApproved } from "./engine.ts";

export type TaskView = "active" | "freeform" | "completed";

export interface TaskRecord {
  manifest: TaskManifest;
  view: TaskView;
  lastModified: string;
}

export interface TaskGroups {
  active: TaskRecord[];
  freeform: TaskRecord[];
  completed: TaskRecord[];
  all: TaskRecord[];
}

/** Return whether a task satisfies the completion rule. */
export function isCompleted(manifest: TaskManifest): boolean {
  return manifest.completedAt !== undefined || requiredTypesApproved(manifest);
}

/** Classify a task for the picker views. */
export function taskView(manifest: TaskManifest): TaskView {
  if (isCompleted(manifest)) return "completed";
  if (manifest.flow === "freeform") return "freeform";
  return "active";
}

/** Return the newest persisted task timestamp. */
export function lastModified(manifest: TaskManifest): string {
  const timestamps = [
    ...manifest.artifacts.map((artifact) => artifact.updatedAt),
    ...manifest.receipts.map((receipt) => receipt.timestamp),
    ...(manifest.completedAt ? [manifest.completedAt] : []),
  ];
  return timestamps.reduce((latest, timestamp) => (timestamp > latest ? timestamp : latest), "");
}

function sortTasks(tasks: TaskRecord[]): TaskRecord[] {
  return tasks.sort(
    (left, right) =>
      right.lastModified.localeCompare(left.lastModified) || left.manifest.slug.localeCompare(right.manifest.slug),
  );
}

/** Group tasks into views without changing manifests or writing files. */
export function groupTasks(manifests: TaskManifest[]): TaskGroups {
  const all = manifests.map((manifest) => ({
    manifest,
    view: taskView(manifest),
    lastModified: lastModified(manifest),
  }));
  sortTasks(all);
  return {
    active: sortTasks(all.filter((task) => task.view === "active")),
    freeform: sortTasks(all.filter((task) => task.view === "freeform")),
    completed: sortTasks(all.filter((task) => task.view === "completed")),
    all,
  };
}
