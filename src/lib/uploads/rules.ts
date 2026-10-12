/** File rules and link parsing shared by every uploader. Pure: safe in server, client and tests. */

export type FileLike = { name: string; type: string; size: number };

export type FileRule = {
  /** Bytes; mirrors the storage bucket's file_size_limit. */
  maxBytes: number;
  /** MIME types ("image/png") or families ("image/*"). */
  mimes: string[];
  /** Lower-case extensions without the dot, accepted when the browser reports no MIME type. */
  extensions: string[];
  /** Files per batch. */
  maxFiles: number;
};

export type FileError = { key: "tooBig" | "badType" | "empty" | "tooMany"; params: Record<string, string | number> };

export type MediaKind = "image" | "video" | "pdf" | "other";

const MB = 1024 * 1024;

/** Over this size uploads go through TUS (resumable, 6 MB chunks). */
export const RESUMABLE_FROM = 6 * MB;

/** card-attachments bucket: 100 MB per file (20261012000001_boards.sql). */
export const BRIEF_MEDIA_RULE: FileRule = {
  maxBytes: 100 * MB,
  mimes: [
    "image/*", "video/*", "audio/*", "application/pdf", "text/plain", "text/csv",
    "application/zip", "application/x-zip-compressed",
    "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
  extensions: [
    "jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "svg", "mp4", "mov", "webm", "m4v", "mp3", "wav", "m4a",
    "pdf", "txt", "csv", "zip", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "psd", "ai", "fig", "key",
  ],
  maxFiles: 20,
};

/** Value for <input accept>: families plus extensions so pickers show everything allowed. */
export function acceptAttr(rule: FileRule) {
  return [...rule.mimes, ...rule.extensions.map((e) => `.${e}`)].join(",");
}

export function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function mimeAllowed(type: string, mimes: string[]) {
  const t = type.toLowerCase();
  return mimes.some((m) => (m.endsWith("/*") ? t.startsWith(m.slice(0, -1)) : t === m));
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * MB) return `${(bytes / MB).toFixed(bytes < 10 * MB ? 1 : 0)} MB`;
  return `${(bytes / (1024 * MB)).toFixed(1)} GB`;
}

/** First problem with a file, or null when it may be uploaded. */
export function validateFile(file: FileLike, rule: FileRule): FileError | null {
  if (file.size === 0) return { key: "empty", params: { name: file.name } };
  const typeOk = file.type ? mimeAllowed(file.type, rule.mimes) || rule.extensions.includes(extensionOf(file.name)) : rule.extensions.includes(extensionOf(file.name));
  if (!typeOk) return { key: "badType", params: { name: file.name } };
  if (file.size > rule.maxBytes) return { key: "tooBig", params: { name: file.name, max: formatBytes(rule.maxBytes) } };
  return null;
}

/** Splits a batch into accepted files and per-file errors; extra files past maxFiles are refused. */
export function screenFiles<T extends FileLike>(files: T[], rule: FileRule, already = 0) {
  const accepted: T[] = [];
  const errors: FileError[] = [];
  for (const f of files) {
    const error = validateFile(f, rule);
    if (error) errors.push(error);
    else if (already + accepted.length >= rule.maxFiles) errors.push({ key: "tooMany", params: { max: rule.maxFiles } });
    else accepted.push(f);
  }
  return { accepted, errors: errors.filter((e, i) => e.key !== "tooMany" || errors.findIndex((x) => x.key === "tooMany") === i) };
}

export function mediaKind(mime: string | null | undefined, name = ""): MediaKind {
  const type = (mime ?? "").toLowerCase();
  const ext = extensionOf(name);
  if (type.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "image";
  if (type.startsWith("video/") || ["mp4", "mov", "webm", "m4v"].includes(ext)) return "video";
  if (type === "application/pdf" || ext === "pdf") return "pdf";
  return "other";
}

/** Clipboard images arrive as "image.png"; give them a readable unique name. */
export function pastedName(type: string, at = new Date()) {
  const ext = type.split("/")[1]?.replace("jpeg", "jpg").replace(/[^a-z0-9]/g, "") || "png";
  const stamp = at.toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "-");
  return `screenshot-${stamp}.${ext}`;
}

const KNOWN_HOSTS: [RegExp, string][] = [
  [/(^|\.)drive\.google\.com$|(^|\.)docs\.google\.com$/, "Google Drive"],
  [/(^|\.)wetransfer\.com$|^we\.tl$/, "WeTransfer"],
  [/(^|\.)dropbox\.com$/, "Dropbox"],
  [/(^|\.)onedrive\.live\.com$|^1drv\.ms$|(^|\.)sharepoint\.com$/, "OneDrive"],
  [/(^|\.)figma\.com$/, "Figma"],
  [/(^|\.)canva\.com$/, "Canva"],
  [/(^|\.)youtube\.com$|^youtu\.be$/, "YouTube"],
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)tiktok\.com$/, "TikTok"],
];

/**
 * Reads what someone pasted into a link field. Adds https:// to bare domains,
 * refuses anything that is not http(s), and names the link after the service.
 */
export function parseLink(input: string): { url: string; name: string } | null {
  const raw = input.trim();
  if (!raw || /\s/.test(raw) || raw.length > 2000) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!host.includes(".") && host !== "localhost") return null;
  const known = KNOWN_HOSTS.find(([re]) => re.test(host))?.[1];
  return { url: url.toString(), name: known ?? host };
}
