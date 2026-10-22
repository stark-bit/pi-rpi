import { test } from "node:test";
import assert from "node:assert/strict";
import { createTaskPicker } from "../../src/task-picker.ts";
import type { TaskGroups } from "../../src/engine/task-views.ts";

function groups(): TaskGroups {
  const task = (slug: string, view: "active" | "freeform" | "completed") => ({
    manifest: {
      slug,
      title: slug,
      flow: view === "freeform" ? "freeform" : "rpi",
      artifacts: [],
      receipts: [],
    } as never,
    view,
    lastModified: "2025-01-01T00:00:00.000Z",
  });
  return { active: [task("active", "active")], freeform: [], completed: [], all: [task("active", "active")] };
}

test("task picker wraps views and confirms the selected task", () => {
  const completed: unknown[] = [];
  const picker = createTaskPicker(
    groups(),
    { requestRender: () => undefined },
    { fg: (_color, text) => text, bg: (_color, text) => text },
    {
      matches: (data, binding) =>
        (binding === "tui.select.confirm" && data === "\r") || (binding === "tui.select.cancel" && data === "\u001b"),
    },
    (task) => completed.push(task?.manifest.slug),
  );

  picker.handleInput?.("\u001b[C");
  picker.handleInput?.("\u001b[D");
  picker.handleInput?.("\r");
  assert.deepEqual(completed, ["active"]);
  assert.match(picker.render(80).join("\n"), /Active \(1\)/);
});

test("task picker renders an empty view", () => {
  const empty = groups();
  const picker = createTaskPicker(
    empty,
    { requestRender: () => undefined },
    { fg: (_color, text) => text, bg: (_color, text) => text },
    { matches: () => false },
    () => undefined,
  );
  picker.handleInput?.("\u001b[C");
  assert.match(picker.render(24).join("\n"), /No freeform tasks/);
});
