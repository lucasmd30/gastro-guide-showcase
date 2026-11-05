"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Link2, UserPen } from "lucide-react";
import { generateConsultationLink, type IntakeLinkState } from "@/app/actions/pacientes";
import type { IntakeLinkPurpose } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: IntakeLinkState = {};

const DEFAULTS: Record<IntakeLinkPurpose, { label: string; hint: string; icon: typeof Link2 }> = {
  CADASTRO: {
    label: "Gerar link para cadastro",
    hint: "O paciente só preenche os dados, sem escolher horário. Se já tiver consulta marcada, vê a data dela.",
    icon: UserPen,
  },
  AGENDAMENTO: {
    label: "Gerar link para consulta",
    hint: "O paciente escolhe primeira consulta ou retorno e marca o horário. Se já tiver consulta marcada, vê essa em vez do calendário.",
    icon: CalendarPlus,
  },
};

/**
 * Gera um link público para o paciente. Compartilhado entre a lista de
 * pacientes (`patientId` nulo — paciente ainda não cadastrado), a tela de um
 * paciente e a linha de uma consulta na agenda.
 *
 * `purpose` separa os dois casos da secretária: CADASTRO quando ela já
 * marcou (ou só quer os dados) e AGENDAMENTO quando o paciente marca sozinho.
 */
export function ConsultationLinkButton({
  patientId = null,
  purpose,
  label,
  hint,
}: {
  patientId?: string | null;
  purpose: IntakeLinkPurpose;
  label?: string;
  hint?: string;
}) {
  const defaults = DEFAULTS[purpose];
  const Icon = defaults.icon;
  const action = generateConsultationLink.bind(null, patientId, purpose);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [origin, setOrigin] = useState("");

  // Só depois do mount: o servidor não conhece o host que o navegador usou,
  // e emitir um valor diferente aqui daria hydration mismatch.
  useEffect(() => setOrigin(window.location.origin), []);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  const url = state.link ? `${origin}/intake/${state.link.token}` : "";

  return (
    <div className="space-y-2">
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        {/* Sem seletor de tipo: quem escolhe entre primeira consulta e
            retorno é o paciente, na primeira tela do link. */}
        <Button type="submit" variant="outline" disabled={pending}>
          <Icon className="mr-1.5 h-4 w-4" />
          {pending ? "Gerando…" : (label ?? defaults.label)}
        </Button>
      </form>

      {state.link && (
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(url);
                toast.success("Link copiado.");
              }}
            >
              Copiar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {hint ?? defaults.hint} O link vale uma vez só e expira em{" "}
            {new Date(state.link.expiresAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.
          </p>
        </div>
      )}
    </div>
  );
}
