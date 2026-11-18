import { describe, expect, it } from "vitest";
import { decideRoute, type Access } from "./access";

const base: Access = {
  user_id: "u",
  email: "u@test.local",
  full_name: "U",
  display_name: "U",
  status: "active",
  must_change_password: false,
  locale: "en",
  presence: "available",
  avatar_seen: true,
  department_id: null,
  team_id: null,
  team_slug: null,
  home_branch_id: null,
  roles: [{ role: "member", team_id: null }],
  is_marketing: true,
  is_team_app: true,
  is_portal: false,
};
const portal: Access = { ...base, roles: [{ role: "requester", team_id: null }], is_marketing: false, is_team_app: false, is_portal: true };
const guest: Access = { ...base, roles: [{ role: "guest", team_id: null }], is_marketing: false };
const noRole: Access = { ...base, roles: [], is_marketing: false, is_team_app: false };

describe("decideRoute", () => {
  it("sends signed-out visitors to sign-in with next", () => {
    expect(decideRoute("/boards", false, null)).toEqual({ kind: "redirect", to: "/sign-in?next=%2Fboards" });
    expect(decideRoute("/sign-in", false, null)).toEqual({ kind: "allow" });
  });

  it("signs out inactive users", () => {
    expect(decideRoute("/map", true, { ...base, status: "inactive" })).toEqual({
      kind: "sign-out",
      to: "/sign-in?reason=inactive",
    });
  });

  it("forces a password change before anything else", () => {
    const a = { ...base, must_change_password: true };
    expect(decideRoute("/map", true, a)).toEqual({ kind: "redirect", to: "/change-password" });
    expect(decideRoute("/change-password", true, a)).toEqual({ kind: "allow" });
    expect(decideRoute("/me/account", true, a)).toEqual({ kind: "redirect", to: "/change-password" });
  });

  it("keeps portal-only users out of team routes", () => {
    expect(decideRoute("/boards", true, portal)).toEqual({ kind: "redirect", to: "/portal" });
    expect(decideRoute("/portal/requests/new", true, portal)).toEqual({ kind: "allow" });
    expect(decideRoute("/me/account", true, portal)).toEqual({ kind: "allow" });
  });

  it("keeps team-only users out of the portal", () => {
    expect(decideRoute("/portal", true, base)).toEqual({ kind: "redirect", to: "/my-day" });
  });

  it("limits guests to boards and my work", () => {
    expect(decideRoute("/boards/1", true, guest)).toEqual({ kind: "allow" });
    expect(decideRoute("/map", true, guest)).toEqual({ kind: "redirect", to: "/boards" });
  });

  it("shows no-access to users without roles", () => {
    expect(decideRoute("/map", true, noRole)).toEqual({ kind: "redirect", to: "/no-access" });
    expect(decideRoute("/no-access", true, noRole)).toEqual({ kind: "allow" });
    expect(decideRoute("/no-access", true, base)).toEqual({ kind: "redirect", to: "/my-day" });
  });

  it("redirects signed-in users away from sign-in and root", () => {
    expect(decideRoute("/sign-in", true, base)).toEqual({ kind: "redirect", to: "/my-day" });
    expect(decideRoute("/", true, portal)).toEqual({ kind: "redirect", to: "/portal" });
  });
});
