import type { AppointmentBilling } from "@/lib/api";
import { formatBRL } from "@/lib/money";

export const BILLING_OPTIONS: { value: AppointmentBilling; label: string }[] = [
  { value: "PARTICULAR", label: "Particular" },
  { value: "CONVENIO", label: "Convênio" },
  { value: "CORTESIA", label: "Cortesia" },
];

/** "Convênio · Unimed", "Particular · R$ 450,00"… ou null quando não foi informada (consulta marcada pelo link). */
export function billingLabel(
  billing: AppointmentBilling | null,
  healthPlan: string | null,
  priceCents?: number | null,
): string | null {
  if (!billing) return null;
  const label = BILLING_OPTIONS.find((o) => o.value === billing)?.label ?? billing;
  if (billing === "CONVENIO" && healthPlan) return `${label} · ${healthPlan}`;
  if (billing === "PARTICULAR" && priceCents !== null && priceCents !== undefined) {
    return `${label} · ${formatBRL(priceCents)}`;
  }
  return label;
}
