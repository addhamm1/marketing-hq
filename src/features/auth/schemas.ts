import { z } from "zod";

export const PASSWORD_MIN = 10;

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "validation.required").email("validation.email"),
  password: z.string().min(1, "validation.required").max(200, "validation.tooLong"),
  next: z.string().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "validation.required").max(200, "validation.tooLong"),
    newPassword: z.string().min(PASSWORD_MIN, "validation.passwordMin").max(200, "validation.tooLong"),
    confirmPassword: z.string().min(1, "validation.required"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "validation.passwordMismatch",
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "validation.passwordSame",
  });

export const accountSchema = z.object({
  display_name: z.string().trim().max(60, "validation.tooLong"),
  phone: z.string().trim().max(30, "validation.tooLong"),
  locale: z.enum(["en", "ar"]),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type AccountInput = z.infer<typeof accountSchema>;
