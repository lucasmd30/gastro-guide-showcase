"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * Teal da marca e tons que dá para separar: a rampa de teal do protótipo
 * reprovou na validação de paleta (fatias vizinhas quase iguais até para quem
 * enxerga todas as cores). O último é o cinza do "Outros".
 */
const SLICE_COLORS = ["#1f8a8e", "#c2410c", "#6d5bd0", "#b7791f", "#64748b"];
const BAR_COLOR = "#1f8a8e";
const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const TOOLTIP_STYLE = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

export function WeeklyChart({ counts }: { counts: number[] }) {
  const data = counts.map((consultas, i) => ({ day: DAYS[i], consultas }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
          <XAxis dataKey="day" tickLine={false} axisLine={false} className="text-xs" />
          <YAxis tickLine={false} axisLine={false} allowDecimals={false} className="text-xs" />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
          <Bar dataKey="consultas" name="Consultas" fill={BAR_COLOR} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DistributionChart({ slices }: { slices: { name: string; patients: number }[] }) {
  const total = slices.reduce((sum, s) => sum + s.patients, 0);
  if (total === 0) {
    return (
      <p className="flex h-64 items-center justify-center text-center text-sm text-muted-foreground">
        Ainda não há paciente com prontuário de doença.
      </p>
    );
  }
  return (
    <>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="patients" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
              {slices.map((slice, i) => (
                <Cell key={slice.name} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 space-y-1.5 text-xs">
        {slices.map((slice, i) => (
          <li key={slice.name} className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }}
              />
              {slice.name}
            </span>
            <span className="font-medium">{Math.round((slice.patients / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </>
  );
}
