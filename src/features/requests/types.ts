export type FormField = {
  name: string;
  type: "date" | "text" | "textarea" | "number" | "select" | "card" | "time";
  required?: boolean;
  label_en: string;
  label_ar: string;
  options?: string[];
  min?: number;
  max?: number;
};

export type RequestType = {
  key: string;
  name_en: string;
  name_ar: string;
  category: "leave" | "special";
  is_leave: boolean;
  counts_working_days: boolean;
  requires_attachment_after_days: number | null;
  fields: FormField[];
};

export type Balance = { type_key: string; year: number; allowance: number; used: number; pending: number };
