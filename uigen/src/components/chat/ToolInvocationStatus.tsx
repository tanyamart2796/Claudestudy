"use client";

import { Loader2 } from "lucide-react";

interface ToolInvocation {
  toolName: string;
  state: string;
  args?: Record<string, any>;
  result?: any;
}

interface ToolInvocationStatusProps {
  toolInvocation: ToolInvocation;
}

function getBasename(path: string | undefined): string {
  if (!path) return "";
  const trimmed = path.replace(/\/+$/, "");
  const segments = trimmed.split("/").filter(Boolean);
  return segments[segments.length - 1] || path;
}

export function getToolStatusMessage(
  toolName: string,
  args: Record<string, any> | undefined,
  isDone: boolean
): string {
  const command = args?.command as string | undefined;
  const name = getBasename(args?.path as string | undefined);
  const newName = getBasename(args?.new_path as string | undefined);

  if (toolName === "str_replace_editor") {
    switch (command) {
      case "create":
        return isDone ? `Created ${name}` : `Creating ${name}`;
      case "str_replace":
      case "insert":
        return isDone ? `Edited ${name}` : `Editing ${name}`;
      case "view":
        return isDone ? `Viewed ${name}` : `Viewing ${name}`;
      case "undo_edit":
        return isDone ? `Reverted changes to ${name}` : `Reverting changes to ${name}`;
      default:
        return name
          ? isDone
            ? `Updated ${name}`
            : `Updating ${name}`
          : toolName;
    }
  }

  if (toolName === "file_manager") {
    switch (command) {
      case "rename":
        return isDone
          ? `Renamed ${name} to ${newName}`
          : `Renaming ${name} to ${newName}`;
      case "delete":
        return isDone ? `Deleted ${name}` : `Deleting ${name}`;
      default:
        return toolName;
    }
  }

  return toolName;
}

export function ToolInvocationStatus({
  toolInvocation,
}: ToolInvocationStatusProps) {
  const isDone =
    toolInvocation.state === "result" && Boolean(toolInvocation.result);
  const message = getToolStatusMessage(
    toolInvocation.toolName,
    toolInvocation.args,
    isDone
  );

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{message}</span>
    </div>
  );
}
