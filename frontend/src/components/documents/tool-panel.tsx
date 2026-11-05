"use client";

import { useState, type ReactNode } from "react";
import { Minus, Plus } from "lucide-react";

/**
 * Painel recolhido por padrão, que abre no "+" — o `ToolPanel` do protótipo
 * Lovable. Usado em Documentos para os modelos próprios e as orientações
 * prontas, que só interessam de vez em quando e ocupariam a tela toda.
 */
export function ToolPanel({
  title,
  description,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40"
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
            open
              ? "border-primary bg-primary text-primary-foreground"
              : "border-primary/40 bg-primary/10 text-primary"
          }`}
        >
          {open ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            {icon}
            {title}
          </span>
          {description && <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>}
        </span>
      </button>
      {open && <div className="border-t border-border p-4">{children}</div>}
    </section>
  );
}
