import {
  BarChart3, CalendarDays, CalendarRange, FileInput, FilePlus2, Files, FileText, Inbox,
  KanbanSquare, ListTodo, Map, Settings, Stamp, Users,
} from "lucide-react";
import type { NavKey } from "@/lib/nav";

const ICONS: Record<NavKey, typeof Map> = {
  map: Map,
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
