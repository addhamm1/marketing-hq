"use client";

import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Placeholder until D3-04 wires the notifications table.
export function NotificationBell() {
  const t = useTranslations("shell");
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-lg" aria-label={t("notifications")}>
          <Bell aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 text-center text-sm">
        <p className="text-muted-foreground py-6">{t("noNotifications")}</p>
      </PopoverContent>
    </Popover>
  );
}
