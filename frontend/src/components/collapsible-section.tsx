"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Stethoscope } from "lucide-react";

/**
 * Card recolhível da tela de atendimento, com o shell do protótipo Lovable.
 * Todos os cards têm o mesmo casco, o mesmo título e o estetoscópio
 * (pedido da cliente, 07/10/2026: antes o cabeçalho e o exame físico tinham
 * ícone, os outros não, e o card de escalas tinha título menor). Minimizado
 * por padrão — decisão do usuário, é a única divergência deliberada de
 * comportamento em relação ao protótipo (onde os cards ficam sempre abertos).
 */
export function CollapsibleSection({
  title,
  children,
  actions,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  /** Conteúdo à direita do título (ex.: o botão de salvar do cabeçalho). */
  actions?: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`}
          />
          <Stethoscope className="h-5 w-5 shrink-0 text-primary" />
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
        </button>
        {open && actions}
      </div>
      {open && <div className="mt-4 space-y-5 text-sm">{children}</div>}
    </section>
  );
}
