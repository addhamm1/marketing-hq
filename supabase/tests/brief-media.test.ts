import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { as, DEPT, makePipelineCard, U } from "./helpers";

// M-03: brief media staged under drafts/<uid>/ before the card exists.
const BUCKET = "card-attachments";
const file = () => new Blob(["reference"], { type: "text/plain" });

describe("brief media drafts", () => {
  it("a requester stages a draft, moves it into their own request card and registers it", async () => {
    const sales = await as("sales");
    const card = await makePipelineCard("performance_input");
    const draft = `drafts/${U.sales}/${randomUUID()}.txt`;
    expect((await sales.storage.from(BUCKET).upload(draft, file())).error).toBeNull();

    const dest = `cards/${card.id}/${draft.split("/").pop()}`;
    expect((await sales.storage.from(BUCKET).move(draft, dest)).error).toBeNull();
    const { error } = await sales.from("attachments").insert({
      card_id: card.id, uploaded_by: U.sales, kind: "file", storage_path: dest, name: "ref.txt", mime: "text/plain", size: 9,
    });
    expect(error).toBeNull();
    // The reviewer on the card can read it; the draft path is gone.
    expect((await (await as("leadCreative")).storage.from(BUCKET).createSignedUrl(dest, 60)).error).toBeNull();
    expect((await sales.storage.from(BUCKET).createSignedUrl(draft, 60)).error).not.toBeNull();
  });

  it("drafts are private to the uploader", async () => {
    const sales = await as("sales");
    const draft = `drafts/${U.sales}/${randomUUID()}.txt`;
    await sales.storage.from(BUCKET).upload(draft, file());
    const member2 = await as("member2");
    expect((await member2.storage.from(BUCKET).upload(`drafts/${U.sales}/${randomUUID()}.txt`, file())).error).not.toBeNull();
    expect((await member2.storage.from(BUCKET).createSignedUrl(draft, 60)).error).not.toBeNull();
    // Someone else cannot move it, even into a card they can see.
    const card = await makePipelineCard("brief_schedule");
    expect((await (await as("traffic")).storage.from(BUCKET).move(draft, `cards/${card.id}/stolen.txt`)).error).not.toBeNull();
  });

  it("a draft cannot be moved into a card the uploader cannot see, or back out of cards/", async () => {
    const sales = await as("sales");
    const hidden = await makePipelineCard("brief_schedule", {
      requesting_department_id: DEPT.marketing, requester_id: U.traffic, approver_id: null,
    });
    const draft = `drafts/${U.sales}/${randomUUID()}.txt`;
    await sales.storage.from(BUCKET).upload(draft, file());
    expect((await sales.storage.from(BUCKET).move(draft, `cards/${hidden.id}/x.txt`)).error).not.toBeNull();
    expect((await sales.storage.from(BUCKET).move(draft, `drafts/${U.member}/x.txt`)).error).not.toBeNull();

    // Card files cannot be moved at all (no update policy outside drafts/).
    const traffic = await as("traffic");
    const own = `cards/${hidden.id}/${randomUUID()}.txt`;
    expect((await traffic.storage.from(BUCKET).upload(own, file())).error).toBeNull();
    expect((await traffic.storage.from(BUCKET).move(own, `drafts/${U.traffic}/back.txt`)).error).not.toBeNull();
  });
});
