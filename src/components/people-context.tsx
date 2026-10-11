"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Person } from "@/features/boards/types";
import type { AvatarConfig } from "@/game/avatar/types";

type Ctx = { people: Person[]; byId: Map<string, Person>; avatars: Record<string, AvatarConfig> };
const PeopleContext = createContext<Ctx>({ people: [], byId: new Map(), avatars: {} });

/** People directory (and their avatar configs) for client components. Nested providers inherit avatars. */
export function PeopleProvider({ people, avatars, children }: { people: Person[]; avatars?: Record<string, AvatarConfig>; children: ReactNode }) {
  const parent = useContext(PeopleContext);
  const value = useMemo(
    () => ({ people, byId: new Map(people.map((p) => [p.id, p])), avatars: avatars ?? parent.avatars }),
    [people, avatars, parent.avatars],
  );
  return <PeopleContext.Provider value={value}>{children}</PeopleContext.Provider>;
}

export function usePeople() {
  return useContext(PeopleContext);
}

export function usePersonName() {
  const { byId } = usePeople();
  return (id: string | null | undefined) => (id ? (byId.get(id)?.display_name ?? "—") : "—");
}
