import { configHash, hiddenLayers, layerTint, manifestSchema, selectedOption } from "./config";
import type { AvatarConfig, SpriteManifest } from "./types";

/**
 * Browser-only avatar compositor shared by the Phaser map and React (portraits).
 * Nothing here touches `window` or `document` until a function is called, so
 * importing it from a client component is safe during server rendering.
 */

const SPRITES_BASE = "/sprites/";
const MANIFEST_URL = "/sprites/manifest.json";
const PORTRAIT_STORAGE_PREFIX = "pixelhq:portrait:v1:";

const images = new Map<string, Promise<HTMLImageElement>>();
const sheets = new Map<string, Promise<HTMLCanvasElement>>();
const portraits = new Map<string, string>();
let manifestPromise: Promise<SpriteManifest> | null = null;

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context is not available");
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

/** Load an image once; failures are evicted from the cache so a retry can succeed. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = images.get(src);
  if (cached) return cached;
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load sprite ${src}`));
    img.src = src;
  });
  promise.catch(() => images.delete(src));
  images.set(src, promise);
  return promise;
}

/** Fetch and validate the sprite manifest once per page. */
export function loadManifest(): Promise<SpriteManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch(MANIFEST_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load sprite manifest (${res.status})`);
        return res.json();
      })
      .then((json: unknown) => manifestSchema.parse(json));
    manifestPromise.catch(() => {
      manifestPromise = null;
    });
  }
  return manifestPromise;
}

/** Draw `img` tinted by `color` (multiply, then clip to the layer's own alpha). */
function drawTinted(target: CanvasRenderingContext2D, scratch: HTMLCanvasElement, img: HTMLImageElement, color: string): void {
  const ctx = context(scratch);
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, scratch.width, scratch.height);
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, scratch.width, scratch.height);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  target.drawImage(scratch, 0, 0);
}

async function composeSheet(config: AvatarConfig, manifest: SpriteManifest): Promise<HTMLCanvasElement> {
  const width = manifest.frameWidth * 6;
  const height = manifest.frameHeight * manifest.directions.length;
  const hidden = hiddenLayers(config, manifest);
  const parts = manifest.layers
    .filter((layer) => !hidden.has(layer.key))
    .map((layer) => ({ layer, option: selectedOption(config, manifest, layer.key) }))
    .flatMap(({ layer, option }) => (option ? [{ layer, option }] : []));

  // Load everything in parallel, then draw strictly in manifest order.
  const loaded = await Promise.all(
    parts.map(async ({ layer, option }) => ({
      tint: option.tintable ? layerTint(config, layer) : null,
      base: await loadImage(SPRITES_BASE + option.file),
      overlay: option.overlay ? await loadImage(SPRITES_BASE + option.overlay) : null,
    })),
  );

  const sheet = createCanvas(width, height);
  const ctx = context(sheet);
  const scratch = createCanvas(width, height);
  for (const part of loaded) {
    if (part.tint) drawTinted(ctx, scratch, part.base, part.tint);
    else ctx.drawImage(part.base, 0, 0);
    if (part.overlay) ctx.drawImage(part.overlay, 0, 0);
  }
  return sheet;
}

/**
 * Compose every layer into one 6x4 frame sheet. Results are cached by config
 * hash, so the same config returns the same canvas (the map relies on this to
 * reuse textures). Treat the returned canvas as read-only.
 */
export function renderSheet(config: AvatarConfig, manifest: SpriteManifest): Promise<HTMLCanvasElement> {
  const key = configHash(config);
  const cached = sheets.get(key);
  if (cached) return cached;
  const promise = composeSheet(config, manifest);
  promise.catch(() => sheets.delete(key));
  sheets.set(key, promise);
  return promise;
}

function readStorage(key: string): string | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(key, value);
  } catch {
    // Storage full or blocked: the in-memory cache still works.
  }
}

/** PNG data URL of the front-facing idle frame, scaled up crisply. */
export async function renderPortrait(config: AvatarConfig, manifest: SpriteManifest, size = 64): Promise<string> {
  const key = `${configHash(config)}:${size}`;
  const memo = portraits.get(key) ?? readStorage(PORTRAIT_STORAGE_PREFIX + key);
  if (memo) {
    portraits.set(key, memo);
    return memo;
  }
  const sheet = await renderSheet(config, manifest);
  const row = Math.max(0, manifest.directions.indexOf("down"));
  const frame = manifest.animations.idle.frames[0] ?? 0;
  const canvas = createCanvas(size, size);
  const ctx = context(canvas);
  const fw = manifest.frameWidth;
  const fh = manifest.frameHeight;
  ctx.drawImage(sheet, (frame % 6) * fw, row * fh, fw, fh, 0, 0, size, size);
  const url = canvas.toDataURL("image/png");
  portraits.set(key, url);
  writeStorage(PORTRAIT_STORAGE_PREFIX + key, url);
  return url;
}
