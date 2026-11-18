import { z } from "zod";
import { isPushEndpoint } from "@/lib/push/endpoint";

const endpoint = z.string().max(1000).refine(isPushEndpoint);
const base64url = /^[A-Za-z0-9_-]+={0,2}$/;

export const subscriptionSchema = z.object({
  endpoint,
  p256dh: z.string().min(1).max(200).regex(base64url),
  auth: z.string().min(1).max(100).regex(base64url),
  userAgent: z
    .string()
    .max(1000)
    .transform((s) => s.slice(0, 300))
    .optional(),
});

export const endpointSchema = z.object({ endpoint });
export const digestSchema = z.object({ enabled: z.boolean() });
