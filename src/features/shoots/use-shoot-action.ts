"use client";

import { useCallback, useTransition } from "react";
import { toast } from "sonner";
import { useMessage } from "@/hooks/use-message";
import { useRouter } from "@/i18n/navigation";
import type { ActionResult } from "@/lib/actions";

/** Runs a server action in a transition: error toast on failure, page refresh on success. */
export function useShootAction() {
  const message = useMessage();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = useCallback(
    <T,>(action: () => Promise<ActionResult<T>>, options?: { success?: string; onDone?: (data: T) => void }) => {
      startTransition(async () => {
        const result = await action();
        if (!result.ok) {
          toast.error(message(result.error, result.params));
          router.refresh();
          return;
        }
        if (options?.success) toast.success(options.success);
        options?.onDone?.(result.data);
        router.refresh();
      });
    },
    [message, router],
  );
  return { pending, run };
}
