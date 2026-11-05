/**
 * Dia (`YYYY-MM-DD`) e hora (`HH:mm`) de um slot no fuso do consultório —
 * não no do navegador, para um horário das 23h de Brasília cair no dia
 * certo em qualquer máquina.
 */

const TIME_ZONE = "America/Sao_Paulo";

const DATE_KEY_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const TIME_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

export function slotDateKey(iso: string): string {
  return DATE_KEY_FORMAT.format(new Date(iso));
}

export function slotTime(iso: string): string {
  return TIME_FORMAT.format(new Date(iso));
}

/** Um horário escolhido na linha do tempo do dia; `seq` faz o mesmo horário valer duas vezes seguidas. */
export interface PickedSlot {
  dateKey: string;
  time: string;
  seq: number;
  /** Veio do botão "Encaixe" de uma consulta: o horário já está ocupado. */
  encaixe?: boolean;
}
