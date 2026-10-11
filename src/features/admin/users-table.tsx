"use client";

import { Plus, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/states/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APP_ROLES } from "./schemas";
import type { AdminUser, OrgOption } from "./queries";
import { UserFormDialog } from "./user-form-dialog";
import { UserRowActions } from "./user-row-actions";

type Org = { departments: OrgOption[]; teams: OrgOption[]; branches: OrgOption[] };

export function UsersTable({
  users,
  org,
  isAdmin,
  currentUserId,
}: {
  users: AdminUser[];
  org: Org;
  isAdmin: boolean;
  currentUserId: string;
}) {
  const t = useTranslations("admin");
  const tr = useTranslations("roles");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);

  const label = (o?: OrgOption) => (o ? (locale === "ar" ? o.name_ar : o.name_en) : "");
  const deptById = useMemo(() => new Map(org.departments.map((d) => [d.id, d])), [org.departments]);
  const teamById = useMemo(() => new Map(org.teams.map((d) => [d.id, d])), [org.teams]);

  const filtered = users.filter((u) => {
    const text = `${u.full_name} ${u.email}`.toLowerCase();
    if (q && !text.includes(q.toLowerCase())) return false;
    if (dept !== "all" && u.department_id !== dept) return false;
    if (role !== "all" && !u.roles.some((r) => r.role === role)) return false;
    if (status !== "all" && u.status !== status) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="text-muted-foreground absolute start-2.5 top-1/2 size-4 -translate-y-1/2" aria-hidden />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchUsers")}
            aria-label={t("searchUsers")}
            className="ps-8"
          />
        </div>
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="w-40" aria-label={t("department")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("anyDepartment")}</SelectItem>
            {org.departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {label(d)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-36" aria-label={t("roles")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("anyRole")}</SelectItem>
            {APP_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {tr(r)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-32" aria-label={tc("status")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("anyStatus")}</SelectItem>
            <SelectItem value="active">{t("statusActive")}</SelectItem>
            <SelectItem value="inactive">{t("statusInactive")}</SelectItem>
          </SelectContent>
        </Select>
        {isAdmin ? (
          <Button onClick={() => setCreating(true)} className="ms-auto">
            <Plus aria-hidden /> {t("createAccount")}
          </Button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={t("noUsers")} />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {filtered.map((u) => (
            <li key={u.id} className="flex items-center gap-3 px-4 py-3" data-testid={`user-row-${u.email}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{u.full_name || u.email}</span>
                  {u.status === "inactive" ? <Badge variant="destructive">{t("statusInactive")}</Badge> : null}
                  {u.must_change_password && u.status === "active" ? (
                    <Badge variant="outline">{t("mustChange")}</Badge>
                  ) : null}
                </div>
                <div className="text-muted-foreground truncate text-xs" dir="ltr">
                  {u.email}
                </div>
                <div className="text-muted-foreground mt-1 flex flex-wrap gap-1 text-xs">
                  {[label(deptById.get(u.department_id ?? "")), label(teamById.get(u.team_id ?? ""))]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
              <div className="hidden max-w-64 flex-wrap justify-end gap-1 sm:flex">
                {u.roles.map((r) => (
                  <Badge key={`${r.role}-${r.team_id}`} variant="secondary">
                    {tr(r.role)}
                    {r.team_id ? ` · ${label(teamById.get(r.team_id))}` : ""}
                  </Badge>
                ))}
              </div>
              <UserRowActions
                user={u}
                isAdmin={isAdmin}
                isSelf={u.id === currentUserId}
                onEdit={() => setEditing(u)}
              />
            </li>
          ))}
        </ul>
      )}

      {creating ? <UserFormDialog mode="create" org={org} isAdmin onClose={() => setCreating(false)} /> : null}
      {editing ? (
        <UserFormDialog mode="edit" user={editing} org={org} isAdmin={isAdmin} onClose={() => setEditing(null)} />
      ) : null}
    </div>
  );
}
