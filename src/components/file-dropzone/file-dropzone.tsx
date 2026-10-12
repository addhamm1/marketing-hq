"use client";

import { Camera, ImagePlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { acceptAttr, formatBytes, type FileRule } from "@/lib/uploads/rules";
import { cn } from "@/lib/utils";
import { DropTarget } from "./drop-target";

/**
 * The big "drop, paste or browse" zone. Click (or Enter/Space) opens the file
 * picker with multi-select; on phones a second button opens the camera.
 * Focus it and press Ctrl/Cmd+V to paste a screenshot.
 */
export function FileDropzone({ rule, onFiles, disabled, compact, className }: { rule: FileRule; onFiles: (files: File[]) => void; disabled?: boolean; compact?: boolean; className?: string }) {
  const t = useTranslations("media");
  const input = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const hintId = useId();

  function picked(list: FileList | null, el: HTMLInputElement | null) {
    const files = Array.from(list ?? []);
    if (el) el.value = "";
    if (files.length) onFiles(files);
  }

  return (
    <DropTarget onFiles={onFiles} disabled={disabled} className={className}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-describedby={hintId}
        data-testid="file-dropzone"
        onClick={() => !disabled && input.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            input.current?.click();
          }
        }}
        className={cn(
          "border-muted-foreground/25 hover:border-primary/60 hover:bg-muted/40 focus-visible:border-primary focus-visible:ring-ring/50 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-center transition-colors outline-none focus-visible:ring-[3px]",
          compact ? "px-3 py-4" : "px-4 py-7",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <ImagePlus className={cn("text-muted-foreground", compact ? "size-5" : "size-7")} aria-hidden />
        <p className="text-sm font-medium">
          {t.rich("dropTitle", { browse: (chunks) => <span className="text-primary-ink underline underline-offset-2">{chunks}</span> })}
        </p>
        <p id={hintId} className="text-muted-foreground text-xs">
          {t("dropHint", { max: formatBytes(rule.maxBytes) })}
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" className="mt-2 w-full sm:hidden" disabled={disabled} onClick={() => camera.current?.click()}>
        <Camera aria-hidden /> {t("camera")}
      </Button>
      <input ref={input} type="file" multiple accept={acceptAttr(rule)} className="hidden" data-testid="file-input" onChange={(e) => picked(e.target.files, e.target)} />
      <input ref={camera} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => picked(e.target.files, e.target)} />
    </DropTarget>
  );
}
