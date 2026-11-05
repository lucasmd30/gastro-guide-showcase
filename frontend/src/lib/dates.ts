/**
 * Datas de calendário como chave `YYYY-MM-DD`, sem hora nem fuso — é o
 * formato que trafega para a API (`LocalDate`) e que os pickers usam como
 * valor. A conversão para `Date` é sempre à meia-noite local do navegador,
 * só para o calendário desenhar; nunca vira instante.
 */

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

/** `25/09/2026` */
export function formatDateKey(key: string): string {
  const [year, month, day] = key.split("-");
  return `${day}/${month}/${year}`;
}

/** `sex., 25/09/2026` */
export function formatDateKeyWithWeekday(key: string): string {
  return parseDateKey(key).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** `08:00:00` → `08:00` */
export function hhmm(time: string): string {
  return time.slice(0, 5);
}
