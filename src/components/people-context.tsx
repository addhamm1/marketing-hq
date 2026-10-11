"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Person } from "@/features/boards/types";

type Ctx = { people: Person[]; byId: Map<string, Person> };
const PeopleContext = createContext<Ctx>({ people: [], byId: new Map() });

export function PeopleProvider({ people, children }: { people: Person[]; children: ReactNode }) {
  const value = useMemo(() => ({ people, byId: new Map(people.map((p) => [p.id, p])) }), [people]);
  return <PeopleContext.Provider value={value}>{children}</PeopleContext.Provider>;
}

export function usePeople() {
  return useContext(PeopleContext);
}

export function usePersonName() {
  const { byId } = usePeople();
  return (id: string | null | undefined) => (id ? (byId.get(id)?.display_name ?? "—") : "—");
}
