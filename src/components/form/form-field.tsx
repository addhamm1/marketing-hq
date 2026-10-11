"use client";

import type { ReactNode } from "react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { useMessage } from "@/hooks/use-message";

type Props = {
  id: string;
  label: ReactNode;
  error?: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Label, control and an error shown next to the field in the user's language. */
export function FormField({ id, label, error, description, children, className }: Props) {
  const message = useMessage();
  return (
    <Field data-invalid={!!error || undefined} className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      {description && !error ? <FieldDescription>{description}</FieldDescription> : null}
      {error ? <FieldError id={`${id}-error`}>{message(error)}</FieldError> : null}
    </Field>
  );
}
