/** Label keys of the signs drawn on the map (`map.signs.<key>` in the message files, object names in the Tiled `signs` layer). */
export const SIGN_KEYS = [
  "reception",
  "cafe",
  "meeting-room",
  "studio",
  "kanban-wall",
  "phone-booth",
  "lounge",
  "pod-traffic",
  "pod-creative",
  "pod-performance",
  "pod-community",
] as const;

export type SignKey = (typeof SIGN_KEYS)[number];
