import { test } from "node:test";
import assert from "node:assert/strict";
import { groupTasks, isCompleted, lastModified, taskView } from "../../src/engine/index.ts";
import type { TaskManifest } from "../../src/engine/index.ts";

function manifest(slug: string, flow: TaskManifest["flow"], updatedAt: string, completedAt?: string): TaskManifest {
  return {
    schemaVersion: 1,
    id: `task-${slug}`,
    slug,
    title: slug,
    flow,
    baseBranch: "main",
    artifacts: [],
    receipts: [{ kind: "migration", detail: "created", timestamp: updatedAt }],
    ...(completedAt ? { completedAt } : {}),
  };
}

function finishedOneshot(slug: string, updatedAt: string): TaskManifest {
  const task = manifest(slug, "oneshot", updatedAt);
  task.artifacts = [
    {
      id: "implementation",
      type: "implementation",
      path: "implementation.md",
      status: "approved",
      dependsOn: [],
      contentHash: "a".repeat(64),
      updatedAt,
    },
    {
      id: "pr-description",
      type: "pr-description",
      path: "pr-description.md",
      status: "approved",
      dependsOn: [],
      contentHash: "b".repeat(64),
      updatedAt,
    },
  ];
  return task;
}

test("task views classify completed, freeform, and active tasks", () => {
  const completed = finishedOneshot("old-task", "2024-01-01T00:00:00.000Z");
  const freeform = manifest("notes", "freeform", "2024-01-03T00:00:00.000Z");
  const active = manifest("work", "rpi", "2024-01-02T00:00:00.000Z");

  assert.equal(isCompleted(completed), true);
  assert.equal(taskView(completed), "completed");
  assert.equal(taskView(freeform), "freeform");
  assert.equal(taskView(active), "active");
  assert.deepEqual(
    groupTasks([completed, freeform, active]).completed.map((task) => task.manifest.slug),
    ["old-task"],
  );
});

test("completedAt marks any flow completed without changing the manifest", () => {
  const task = manifest("done", "freeform", "2024-02-01T00:00:00.000Z", "2024-02-02T00:00:00.000Z");
  assert.equal(isCompleted(task), true);
  assert.equal(taskView(task), "completed");
  assert.equal(lastModified(task), "2024-02-02T00:00:00.000Z");
});

test("groups sort newest first and break ties by slug", () => {
  const newest = manifest("z-last", "rpi", "2024-03-02T00:00:00.000Z");
  const tieA = manifest("a-first", "rpi", "2024-03-01T00:00:00.000Z");
  const tieB = manifest("b-second", "rpi", "2024-03-01T00:00:00.000Z");
  const groups = groupTasks([tieB, newest, tieA]);
  assert.deepEqual(
    groups.active.map((task) => task.manifest.slug),
    ["z-last", "a-first", "b-second"],
  );
  assert.deepEqual(
    groups.all.map((task) => task.manifest.slug),
    ["z-last", "a-first", "b-second"],
  );
});
