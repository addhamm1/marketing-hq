"use client";

import { Download, FileIcon, Link2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { attachmentUrl } from "@/features/boards/card-extras-actions";
import { useMessage } from "@/hooks/use-message";
import { Link } from "@/i18n/navigation";
import { formatCairo } from "@/lib/dates";

type File = { id: string; name: string; kind: string; mime: string | null; created_at: string; card_id: string; card_title: string };

export function DeliveredFiles({ files }: { files: File[] }) {
  const message = useMessage();
  const [, startTransition] = useTransition();
  return (
    <ul className="bg-card divide-y rounded-xl border">
      {files.map((f) => (
        <li key={f.id} className="flex items-center gap-3 px-4 py-3">
          {f.kind === "link" ? <Link2 className="text-muted-foreground size-5" aria-hidden /> : <FileIcon className="text-muted-foreground size-5" aria-hidden />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{f.name}</p>
            <Link href={`/portal/requests/${f.card_id}`} className="text-muted-foreground truncate text-xs hover:underline">{f.card_title}</Link>
          </div>
          <span className="text-muted-foreground hidden text-xs sm:block" dir="ltr">{formatCairo(f.created_at, "d MMM")}</span>
          <Button variant="ghost" size="icon" aria-label={f.name}
            onClick={() => startTransition(async () => {
              const r = await attachmentUrl({ id: f.id });
              if (r.ok) window.open(r.data.url, "_blank", "noopener,noreferrer");
              else toast.error(message(r.error));
            })}>
            <Download aria-hidden />
          </Button>
        </li>
      ))}
    </ul>
  );
}
