import type { CharacterStatus } from "@/game";
import type { AvatarConfig } from "@/game/avatar/types";

export type MapBranch = { id: string; name: string; mapKey: string };
export type MapPerson = { id: string; name: string; title: string | null; teamId: string | null; presence: CharacterStatus; homeBranchId: string | null };
export type MapSession = { user_id: string; branch_id: string | null; method: string; checked_in_at: string; field_card_id: string | null; note: string | null; checkin_place: string | null };
export type MapDesk = { branch_id: string; zone_name: string; assigned_user_id: string | null };
export type MapData = {
  branches: MapBranch[];
  sessions: MapSession[];
  people: MapPerson[];
  teamColors: Record<string, string>;
  desks: MapDesk[];
  avatars: Record<string, AvatarConfig>;
  currentCards: Record<string, { id: string; title: string; board_id: string }>;
  onLeaveToday: string[];
};

/** "field" and "home" are virtual maps; anything else is a branch id. */
export type MapSelection = string;
