"use client";

import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, type ClipboardEvent, type DragEvent, type ReactNode } from "react";
import { pastedName } from "@/lib/uploads/rules";
import { cn } from "@/lib/utils";

const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");

/** Files from a paste: screenshots arrive as "image.png", so give them a unique, readable name. */
export function pastedFiles(e: ClipboardEvent): File[] {
  return Array.from(e.clipboardData?.files ?? []).map((f) =>
    f.type.startsWith("image/") && /^image\.\w+$/.test(f.name) ? new File([f], pastedName(f.type), { type: f.type }) : f,
  );
}

/**
 * Makes a whole region accept dropped and pasted files. Nested targets win:
 * the innermost one handles the files and stops them bubbling (React events also
 * bubble out of portals, so a dialog over a sheet keeps its own files).
 */
export function DropTarget({ onFiles, disabled, className, children }: { onFiles: (files: File[]) => void; disabled?: boolean; className?: string; children: ReactNode }) {
  const t = useTranslations("media");
  const [over, setOver] = useState(false);
  const depth = useRef(0);

  function enter(e: DragEvent) {
    if (disabled || !hasFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    depth.current += 1;
    setOver(true);
  }
  function leave(e: DragEvent) {
    if (disabled || !hasFiles(e)) return;
    e.stopPropagation();
    depth.current = Math.max(0, depth.current - 1);
    if (!depth.current) setOver(false);
  }
  function drop(e: DragEvent) {
    if (disabled || !hasFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    depth.current = 0;
    setOver(false);
    onFiles(Array.from(e.dataTransfer.files));
  }
  function paste(e: ClipboardEvent) {
    if (disabled) return;
    const files = pastedFiles(e);
    if (!files.length) return;
    e.preventDefault();
    e.stopPropagation();
    onFiles(files);
  }

  return (
    <div
      className={cn("relative", className)}
      onDragEnter={enter}
      onDragOver={(e) => {
        if (!disabled && hasFiles(e)) {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "copy";
        }
      }}
      onDragLeave={leave}
      onDrop={drop}
      onPaste={paste}
    >
      {children}
      {over ? (
        <div className="bg-primary/10 border-primary text-primary-ink pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-xl border-2 border-dashed backdrop-blur-[1px]">
          <p className="bg-background flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-sm">
            <Upload className="size-4" aria-hidden /> {t("dropToAttach")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
