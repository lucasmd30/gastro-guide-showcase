"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Exclusão em duas etapas: o primeiro clique vira "Confirmar / Cancelar",
 * e o "Confirmar" só libera 400 ms depois — sem isso, um duplo-clique no
 * mesmo lugar contorna a confirmação (achado real do cadastro de paciente).
 */
export function ConfirmDeleteButton({
  label,
  pending,
  iconOnly = false,
}: {
  label: string;
  pending: boolean;
  /** Só a lixeira, para linhas compactas (faixas, bloqueios). */
  iconOnly?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [confirmReady, setConfirmReady] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirmReady(true), 400);
    return () => clearTimeout(timer);
  }, [confirming]);

  function start() {
    setConfirmReady(false);
    setConfirming(true);
  }

  function cancel() {
    setConfirmReady(false);
    setConfirming(false);
  }

  if (!confirming) {
    return iconOnly ? (
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label={label} onClick={start}>
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>
    ) : (
      <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={start}>
        <Trash2 />
        {label}
      </Button>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <Button type="button" variant="ghost" size="sm" onClick={cancel}>
        Cancelar
      </Button>
      <Button type="submit" variant="destructive" size="sm" disabled={pending || !confirmReady}>
        {pending ? "…" : "Confirmar"}
      </Button>
    </span>
  );
}
