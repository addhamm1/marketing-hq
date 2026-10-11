"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Direction } from "radix-ui";
import { useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children, dir }: { children: ReactNode; dir: "ltr" | "rtl" }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <Direction.Provider dir={dir}>
        <TooltipProvider delayDuration={300}>
          {children}
          <Toaster position={dir === "rtl" ? "top-left" : "top-right"} dir={dir} richColors />
        </TooltipProvider>
      </Direction.Provider>
    </QueryClientProvider>
  );
}
