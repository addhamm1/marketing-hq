"use client";

import * as tus from "tus-js-client";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/browser";
import { RESUMABLE_FROM } from "./rules";

export type Progress = (percent: number) => void;

export class UploadAborted extends Error {
  constructor() {
    super("aborted");
  }
}

type Target = { bucket: string; path: string };

/** PUT to a signed upload URL with progress and cancel (supabase-js has neither). */
export function putSigned({ bucket, path, token }: Target & { token: string }, file: Blob, onProgress: Progress, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new UploadAborted());
    const url = new URL(`${env.supabaseUrl}/storage/v1/object/upload/sign/${bucket}/${path}`);
    url.searchParams.set("token", token);
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url.toString());
    xhr.setRequestHeader("x-upsert", "false");
    if (env.supabaseAnonKey) xhr.setRequestHeader("apikey", env.supabaseAnonKey);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`upload ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("network"));
    xhr.onabort = () => reject(new UploadAborted());
    signal.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(body);
  });
}

/** TUS resumable upload (6 MB chunks) as the signed-in user; storage policies decide. */
export async function putResumable({ bucket, path }: Target, file: File, onProgress: Progress, signal?: AbortSignal) {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("no session");
  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${env.supabaseUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 2000, 5000, 10000, 20000],
      headers: { authorization: `Bearer ${token}`, "x-upsert": "false" },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: RESUMABLE_FROM,
      metadata: { bucketName: bucket, objectName: path, contentType: file.type || "application/octet-stream", cacheControl: "3600" },
      onError: reject,
      onProgress: (sent, total) => onProgress(Math.round((sent / total) * 100)),
      onSuccess: () => resolve(),
    });
    signal?.addEventListener(
      "abort",
      () => {
        upload.abort(true).catch(() => undefined);
        reject(new UploadAborted());
      },
      { once: true },
    );
    upload.findPreviousUploads().then((previous) => {
      if (signal?.aborted) return;
      if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
      upload.start();
    });
  });
}

/** Small files through the signed URL, big ones resumable. */
export async function putFile(target: Target & { token: string }, file: File, onProgress: Progress, signal: AbortSignal) {
  if (file.size > RESUMABLE_FROM) await putResumable(target, file, onProgress, signal);
  else await putSigned(target, file, onProgress, signal);
}
