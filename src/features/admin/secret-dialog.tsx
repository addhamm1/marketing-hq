"use client";

import { CopyButton } from "@/components/copy-button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

/** Shows a one-time secret (temporary password or kiosk link). */
export function SecretDialog({
  secret,
  title,
  body,
  onClose,
}: {
  secret: string | null;
  title: string;
  body: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!secret} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        {secret ? (
          <div className="space-y-3">
            <code
              dir="ltr"
              className="bg-muted block rounded-md p-3 text-center font-mono text-base break-all select-all"
              data-testid="one-time-secret"
            >
              {secret}
            </code>
            <CopyButton value={secret} size="default" />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
