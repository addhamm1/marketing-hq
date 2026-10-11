"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Validated categorical palette (dataviz reference, light mode), fixed order. */
export const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];
const AXIS = { fontSize: 11, fill: "var(--muted-foreground)" };

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover rounded-md border px-2.5 py-1.5 text-xs shadow-sm">
      <p className="mb-0.5 font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="ms-auto font-medium tabular-nums">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

/** Vertical bars; one or more series (legend shown when more than one). */
export function Bars({ data, x, series, height = 220 }: {
  data: Record<string, string | number>[];
  x: string;
  series: { key: string; label: string }[];
  height?: number;
}) {
  return (
    <div dir="ltr" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }} barGap={2}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey={x} tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
          {series.length > 1 ? <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} /> : null}
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={SERIES[i]} radius={[4, 4, 0, 0]} maxBarSize={28} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal bars for ranked categories (single series). */
export function HBars({ data, label, height }: { data: { name: string; value: number }[]; label: string; height?: number }) {
  const h = height ?? Math.max(120, data.length * 28 + 24);
  return (
    <div dir="ltr" style={{ height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 8 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey="name" tick={AXIS} tickLine={false} axisLine={false} width={130} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
          <Bar dataKey="value" name={label} fill={SERIES[0]} radius={[0, 4, 4, 0]} maxBarSize={18} label={{ position: "right", fontSize: 11, fill: "var(--foreground)" }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
