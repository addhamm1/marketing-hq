import { z } from "zod";

/** A browser geolocation reading (metres for accuracy). */
export const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100_000),
});

export type Location = z.infer<typeof locationSchema>;

export const checkInSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("gps"), location: locationSchema }),
  z.object({ method: z.literal("wifi"), branch_id: z.uuid(), location: locationSchema }),
  z.object({
    method: z.literal("field"),
    location: locationSchema,
    place: z.string().trim().max(120, "validation.tooLong").optional(),
    card_id: z.uuid().nullable().optional(),
    note: z.string().trim().max(300, "validation.tooLong").optional(),
    shoot_id: z.uuid().nullable().optional(),
  }),
  z.object({ method: z.literal("home"), location: locationSchema }),
]);

export type CheckInInput = z.input<typeof checkInSchema>;

/** Every check-out needs a location reading. */
export const checkOutSchema = z.object({ location: locationSchema });
