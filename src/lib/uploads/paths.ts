/** Storage object names for brief media in the card-attachments bucket. */

/** A random object name that keeps a short, safe extension from the original. */
export function storageName(fileName: string, id: string = crypto.randomUUID()) {
  const base = fileName.slice(Math.max(fileName.lastIndexOf("/"), fileName.lastIndexOf("\\")) + 1);
  const dot = base.lastIndexOf(".");
  const ext = dot > 0 ? base.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) : "";
  return ext ? `${id}.${ext}` : id;
}

export const cardPath = (cardId: string, name: string) => `cards/${cardId}/${name}`;
export const draftPath = (userId: string, name: string) => `drafts/${userId}/${name}`;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const NAME = new RegExp(`^${UUID}(\\.[a-z0-9]{1,8})?$`);

/** The object name inside drafts/<userId>/ when the path is one of that user's drafts, else null. */
export function ownDraftName(path: string, userId: string): string | null {
  const prefix = `drafts/${userId}/`;
  if (!path.startsWith(prefix)) return null;
  const name = path.slice(prefix.length);
  return NAME.test(name) ? name : null;
}
