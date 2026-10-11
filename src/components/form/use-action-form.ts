"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm, type DefaultValues, type FieldValues, type Path } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { useMessage } from "@/hooks/use-message";
import type { ActionResult } from "@/lib/actions";

type Options<TValues extends FieldValues, TData, TOut> = {
  schema: z.ZodType<TOut, TValues>;
  action: (values: TOut) => Promise<ActionResult<TData>>;
  defaultValues: DefaultValues<TValues>;
  onSuccess?: (data: TData, values: TOut) => void;
  successMessage?: string;
};

/** React Hook Form + Zod on the client, server action re-validates and checks permission. */
export function useActionForm<TValues extends FieldValues, TData = undefined, TOut = TValues>({
  schema,
  action,
  defaultValues,
  onSuccess,
  successMessage,
}: Options<TValues, TData, TOut>) {
  const message = useMessage();
  const [pending, startTransition] = useTransition();
  const form = useForm<TValues, unknown, TOut>({ resolver: zodResolver(schema), defaultValues });

  const onSubmit = form.handleSubmit((values) =>
    new Promise<void>((resolve) => {
      startTransition(async () => {
        try {
          const result = await action(values);
          if (!result) return;
          if (result.ok) {
            if (successMessage) toast.success(successMessage);
            onSuccess?.(result.data, values);
          } else {
            const fields = Object.entries(result.fieldErrors ?? {});
            fields.forEach(([name, key]) =>
              form.setError(name as Path<TValues>, { type: "server", message: key }),
            );
            if (!fields.length || result.error !== "validation.invalid") toast.error(message(result.error, result.params));
          }
        } finally {
          resolve();
        }
      });
    }),
  );

  return { form, onSubmit, pending, message };
}
