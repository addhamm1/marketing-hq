import { describe, expect, it } from "vitest";
import { cardPath, draftPath, ownDraftName, storageName } from "./paths";

const ID = "0f8fad5b-d9cb-469f-a165-70867728950e";
const ME = "00000000-0000-4000-8000-000000000009";

describe("storage paths", () => {
  it("keeps a short safe extension and drops the original name", () => {
    expect(storageName("Brief FINAL (2).JPG", ID)).toBe(`${ID}.jpg`);
    expect(storageName("../../etc/passwd", ID)).toBe(ID);
    expect(storageName("noext", ID)).toBe(ID);
    expect(storageName("a.<script>", ID)).toBe(`${ID}.script`);
  });
  it("builds card and draft paths", () => {
    expect(cardPath("c1", "x.png")).toBe("cards/c1/x.png");
    expect(draftPath(ME, "x.png")).toBe(`drafts/${ME}/x.png`);
  });
  it("only accepts the caller's own, well-formed drafts", () => {
    expect(ownDraftName(`drafts/${ME}/${ID}.png`, ME)).toBe(`${ID}.png`);
    expect(ownDraftName(`drafts/${ME}/${ID}`, ME)).toBe(ID);
    expect(ownDraftName(`drafts/other/${ID}.png`, ME)).toBeNull();
    expect(ownDraftName(`drafts/${ME}/../cards/x/${ID}.png`, ME)).toBeNull();
    expect(ownDraftName(`cards/${ME}/${ID}.png`, ME)).toBeNull();
    expect(ownDraftName(`drafts/${ME}/sub/${ID}.png`, ME)).toBeNull();
  });
});
