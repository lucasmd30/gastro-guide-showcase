/**
 * Data de nascimento e idade para exibição.
 *
 * <p>Sem `Date`: uma data civil não tem fuso, e `new Date("1980-03-15")` é
 * lido como meia-noite UTC — em UTC-3 viraria a véspera. Mesmo cuidado já
 * tomado no documento CFM (`cfm.ts`).
 */

/** "1980-03-15" → "15/03/1980". */
export function formatBirthDate(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : isoDate;
}

/** Idade em anos completos hoje, ou null se a data não for uma data civil válida. */
export function ageInYears(isoDate: string, today = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return null;

  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let age = today.getFullYear() - year;
  // Ainda não fez aniversário este ano: desconta um.
  const monthNow = today.getMonth() + 1;
  if (monthNow < month || (monthNow === month && today.getDate() < day)) {
    age -= 1;
  }
  return age >= 0 && age < 130 ? age : null;
}

/** "15/03/1980 · 46 anos" — o que a médica vê no cabeçalho do prontuário. */
export function birthDateWithAge(isoDate: string | null): string | null {
  if (!isoDate) return null;
  const age = ageInYears(isoDate);
  return age === null ? formatBirthDate(isoDate) : `${formatBirthDate(isoDate)} · ${age} anos`;
}
