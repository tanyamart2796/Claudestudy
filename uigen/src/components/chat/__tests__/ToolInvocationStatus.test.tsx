import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import {
  ToolInvocationStatus,
  getToolStatusMessage,
} from "../ToolInvocationStatus";

afterEach(() => {
  cleanup();
});

test("str_replace_editor create shows 'Creating <basename>' while running", () => {
  render(
    <ToolInvocationStatus
      toolInvocation={{
        toolName: "str_replace_editor",
        state: "call",
        args: { command: "create", path: "/src/components/Button.jsx" },
      }}
    />
  );

  expect(screen.getByText("Creating Button.jsx")).toBeDefined();
});

test("str_replace_editor create shows 'Created <basename>' when done", () => {
  render(
    <ToolInvocationStatus
      toolInvocation={{
        toolName: "str_replace_editor",
        state: "result",
        args: { command: "create", path: "/src/components/Button.jsx" },
        result: "ok",
      }}
    />
  );

  expect(screen.getByText("Created Button.jsx")).toBeDefined();
});

test("str_replace_editor str_replace shows 'Editing <basename>'", () => {
  render(
    <ToolInvocationStatus
      toolInvocation={{
        toolName: "str_replace_editor",
        state: "call",
        args: { command: "str_replace", path: "/App.jsx" },
      }}
    />
  );

  expect(screen.getByText("Editing App.jsx")).toBeDefined();
});

test("str_replace_editor insert shows 'Edited <basename>' when done", () => {
  render(
    <ToolInvocationStatus
      toolInvocation={{
        toolName: "str_replace_editor",
        state: "result",
        args: { command: "insert", path: "/App.jsx" },
        result: "ok",
      }}
    />
  );

  expect(screen.getByText("Edited App.jsx")).toBeDefined();
});

test("str_replace_editor view shows 'Viewing <basename>'", () => {
  render(
    <ToolInvocationStatus
      toolInvocation={{
        toolName: "str_replace_editor",
        state: "call",
        args: { command: "view", path: "/README.md" },
      }}
    />
  );

  expect(screen.getByText("Viewing README.md")).toBeDefined();
});

test("str_replace_editor undo_edit shows revert message", () => {
  render(
    <ToolInvocationStatus
      toolInvocation={{
        toolName: "str_replace_editor",
        state: "call",
        args: { command: "undo_edit", path: "/App.jsx" },
      }}
    />
  );

  expect(screen.getByText("Reverting changes to App.jsx")).toBeDefined();
});

test("file_manager rename shows both file names", () => {
  render(
    <ToolInvocationStatus
      toolInvocation={{
        toolName: "file_manager",
        state: "result",
        args: {
          command: "rename",
          path: "/old.jsx",
          new_path: "/new.jsx",
        },
        result: { success: true },
      }}
    />
  );

  expect(screen.getByText("Renamed old.jsx to new.jsx")).toBeDefined();
});

test("file_manager delete shows 'Deleting <basename>'", () => {
  render(
    <ToolInvocationStatus
      toolInvocation={{
        toolName: "file_manager",
        state: "call",
        args: { command: "delete", path: "/src/Old.jsx" },
      }}
    />
  );

  expect(screen.getByText("Deleting Old.jsx")).toBeDefined();
});

test("unknown tool name falls back to the raw tool name", () => {
  render(
    <ToolInvocationStatus
      toolInvocation={{
        toolName: "some_other_tool",
        state: "call",
        args: {},
      }}
    />
  );

  expect(screen.getByText("some_other_tool")).toBeDefined();
});

test("str_replace_editor with unknown command and a path uses 'Updating'", () => {
  render(
    <ToolInvocationStatus
      toolInvocation={{
        toolName: "str_replace_editor",
        state: "call",
        args: { command: "weird_command", path: "/App.jsx" },
      }}
    />
  );

  expect(screen.getByText("Updating App.jsx")).toBeDefined();
});

test("shows a spinner while running and a green dot when done", () => {
  const { container: pending } = render(
    <ToolInvocationStatus
      toolInvocation={{
        toolName: "str_replace_editor",
        state: "call",
        args: { command: "create", path: "/App.jsx" },
      }}
    />
  );

  expect(pending.querySelector(".animate-spin")).toBeTruthy();
  expect(pending.querySelector(".bg-emerald-500")).toBeNull();

  cleanup();

  const { container: done } = render(
    <ToolInvocationStatus
      toolInvocation={{
        toolName: "str_replace_editor",
        state: "result",
        args: { command: "create", path: "/App.jsx" },
        result: "ok",
      }}
    />
  );

  expect(done.querySelector(".bg-emerald-500")).toBeTruthy();
  expect(done.querySelector(".animate-spin")).toBeNull();
});

test("state=result with no result still shows pending spinner", () => {
  const { container } = render(
    <ToolInvocationStatus
      toolInvocation={{
        toolName: "str_replace_editor",
        state: "result",
        args: { command: "create", path: "/App.jsx" },
      }}
    />
  );

  expect(container.querySelector(".animate-spin")).toBeTruthy();
});

test("getToolStatusMessage strips trailing slashes from directory paths", () => {
  expect(
    getToolStatusMessage(
      "file_manager",
      { command: "delete", path: "/src/components/" },
      true
    )
  ).toBe("Deleted components");
});

test("getToolStatusMessage handles missing args gracefully", () => {
  expect(getToolStatusMessage("str_replace_editor", undefined, false)).toBe(
    "str_replace_editor"
  );
});
