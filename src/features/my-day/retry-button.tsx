"use client";

import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";

/** Reloads the briefing's data after a section failed. */
export function RetryButton({ label }: { label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => router.refresh())}
      className="text-primary-ink text-xs font-semibold hover:underline disabled:opacity-50"
    >
      {label}
    </button>
  );
}
