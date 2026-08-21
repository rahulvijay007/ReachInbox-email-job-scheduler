"use client";

import type { RefObject } from "react";

const COMMANDS: { cmd: string; label: string; icon: string }[] = [
  { cmd: "undo", label: "Undo", icon: "↶" },
  { cmd: "redo", label: "Redo", icon: "↷" },
  { cmd: "bold", label: "Bold", icon: "B" },
  { cmd: "italic", label: "Italic", icon: "I" },
  { cmd: "underline", label: "Underline", icon: "U" },
  { cmd: "insertUnorderedList", label: "Bullet list", icon: "•" },
  { cmd: "insertOrderedList", label: "Numbered list", icon: "1." },
  { cmd: "strikeThrough", label: "Strikethrough", icon: "S" },
];

/** Lightweight formatting toolbar (document.execCommand) matching the Figma editor's look, without pulling in a heavy WYSIWYG dependency. */
export function RichTextToolbar({ targetRef }: { targetRef: RefObject<HTMLDivElement> }) {
  const run = (cmd: string) => {
    targetRef.current?.focus();
    document.execCommand(cmd, false);
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border-t border-gray-100 px-2 py-2">
      {COMMANDS.map((c) => (
        <button
          key={c.cmd}
          type="button"
          title={c.label}
          onClick={() => run(c.cmd)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-sm text-gray-500 hover:bg-gray-100"
        >
          {c.icon}
        </button>
      ))}
    </div>
  );
}
