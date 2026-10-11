"use client";

import { Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function SubmitButton({
  pending,
  pendingLabel,
  children,
  ...props
}: ComponentProps<typeof Button> & { pending: boolean; pendingLabel?: ReactNode }) {
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
