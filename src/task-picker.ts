import { Key, matchesKey, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import type { Component, TUI } from "@earendil-works/pi-tui";
import type { Theme } from "@earendil-works/pi-coding-agent";
import type { KeybindingsManager } from "@earendil-works/pi-coding-agent";
import type { TaskGroups, TaskRecord } from "./engine/task-views.ts";

const views = ["active", "freeform", "completed", "all"] as const;
type PickerView = (typeof views)[number];

const labels: Record<PickerView, string> = {
  active: "Active",
  freeform: "Freeform",
  completed: "Completed",
  all: "All",
};

function taskLabel(task: TaskRecord): string {
  return `${task.manifest.slug} · ${task.manifest.title} · ${task.manifest.flow}`;
}

/** Create the interactive task picker. */
export function createTaskPicker(
  groups: TaskGroups,
  tui: Pick<TUI, "requestRender">,
  theme: Pick<Theme, "fg" | "bg">,
  keybindings: Pick<KeybindingsManager, "matches">,
  done: (task: TaskRecord | undefined) => void,
): Component {
  let viewIndex = 0;
  let selectedIndex = 0;

  const currentTasks = (): TaskRecord[] => groups[views[viewIndex]!];
  const moveView = (delta: number) => {
    viewIndex = (viewIndex + delta + views.length) % views.length;
    selectedIndex = 0;
    tui.requestRender();
  };

  return {
    render(width: number): string[] {
      const header = views
        .map((view, index) => {
          const text = `${labels[view]} (${groups[view].length})`;
          return index === viewIndex ? theme.bg("selectedBg", theme.fg("text", text)) : theme.fg("muted", text);
        })
        .join(" · ");
      const lines = [truncateToWidth(header, width)];
      const tasks = currentTasks();
      if (tasks.length === 0) lines.push(theme.fg("muted", `No ${labels[views[viewIndex]!].toLowerCase()} tasks.`));
      else {
        for (let index = 0; index < tasks.length; index++) {
          const marker = index === selectedIndex ? "→ " : "  ";
          lines.push(truncateToWidth(marker + taskLabel(tasks[index]!), width));
        }
      }
      const hints = "←/→ view · ↑/↓ move · enter select · esc cancel";
      lines.push(truncateToWidth(hints, width));
      return lines.map((line) => (visibleWidth(line) > width ? truncateToWidth(line, width) : line));
    },
    handleInput(data: string): void {
      if (matchesKey(data, Key.left)) return moveView(-1);
      if (matchesKey(data, Key.right)) return moveView(1);
      if (keybindings.matches(data, "tui.select.up")) {
        const length = currentTasks().length;
        if (length > 0) selectedIndex = (selectedIndex + length - 1) % length;
        tui.requestRender();
        return;
      }
      if (keybindings.matches(data, "tui.select.down")) {
        const length = currentTasks().length;
        if (length > 0) selectedIndex = (selectedIndex + 1) % length;
        tui.requestRender();
        return;
      }
      if (keybindings.matches(data, "tui.select.confirm")) return done(currentTasks()[selectedIndex]);
      if (keybindings.matches(data, "tui.select.cancel")) return done(undefined);
    },
    invalidate(): void {},
  };
}
