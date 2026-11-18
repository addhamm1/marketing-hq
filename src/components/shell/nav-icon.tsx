import {
  BarChart3, CalendarClock, CalendarDays, CalendarRange, Clapperboard, FileInput, FilePlus2, Files, FileText, Inbox,
  KanbanSquare, ListTodo, Map, MapPinned, Milestone, PartyPopper, Settings, Stamp, Sun, Users,
} from "lucide-react";
import type { NavKey } from "@/lib/nav";

const ICONS: Record<NavKey, typeof Map> = {
  myDay: Sun,
  map: Map,
  meetings: CalendarClock,
  gates: Milestone,
  shoots: Clapperboard,
  week: MapPinned,
  celebrations: PartyPopper,
  portalWeek: MapPinned,
  portalMeetings: CalendarClock,
  portalCelebrations: PartyPopper,
  boards: KanbanSquare,
  myWork: ListTodo,
  approvals: Stamp,
  requests: FileText,
  calendar: CalendarDays,
  content: CalendarRange,
  reports: BarChart3,
  people: Users,
  admin: Settings,
  portalHome: Inbox,
  portalNew: FilePlus2,
  portalApprovals: Stamp,
  portalFiles: Files,
};

export function NavIcon({ name, className }: { name: NavKey; className?: string }) {
  const Icon = ICONS[name] ?? FileInput;
  return <Icon className={className} aria-hidden />;
}
