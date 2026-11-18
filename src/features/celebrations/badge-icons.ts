import { Cake, Clock, HandHeart, Lightbulb, type LucideIcon, Sparkles, Users } from "lucide-react";
import type { KudosBadge } from "./schemas";

export const BADGE_ICONS: Record<KudosBadge, LucideIcon> = {
  teamwork: Users,
  creative: Sparkles,
  on_time: Clock,
  helped: HandHeart,
  great_idea: Lightbulb,
  birthday: Cake,
};
