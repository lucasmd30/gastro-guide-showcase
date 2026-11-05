"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { CalendarCheck, MapPin, Video } from "lucide-react";
import { submitRegistration, type RegistrationFormState } from "@/app/actions/intake";
import type { IntakeContext, Patient, UpcomingConsultation } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { EMPTY_PATIENT_FIELDS, PatientFormFields } from "@/components/patient-form-fields";

const TIME_ZONE = "America/Sao_Paulo";

const initialState: RegistrationFormState = {};

const EMPTY_PATIENT = {
  ...EMPTY_PATIENT_FIELDS,
  id: "",
  continuousMedications: null,
  notes: null,
} satisfies Patient;

export function consultationWhen(iso: string) {
  const date = new Date(iso);
  const day = date.toLocaleDateString("pt-BR", { timeZone: TIME_ZONE, weekday: "long", day: "2-digit", month: "long" });
  const time = date.toLocaleTimeString("pt-BR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });
  return `${day} às ${time}`;
}

/** A consulta que o paciente já tem — mostrada no lugar do calendário. */
export function UpcomingConsultationCard({
  upcoming,
  doctorName,
}: {
  upcoming: UpcomingConsultation;
  doctorName: string;
}) {
  const teleconsulta = upcoming.modality === "TELECONSULTA";
  const ModalityIcon = teleconsulta ? Video : MapPin;
  return (
    <div className="flex gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <CalendarCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div className="space-y-1">
        <p className="text-sm font-medium">Sua consulta está marcada</p>
        <p className="text-sm first-letter:uppercase">{consultationWhen(upcoming.scheduledAt)}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          {upcoming.type === "RETORNO" ? "Retorno" : "Primeira consulta"} com {doctorName} ·{" "}
          <ModalityIcon className="h-3 w-3" /> {teleconsulta ? "Teleconsulta" : "Presencial"}
        </p>
      </div>
    </div>
  );
}

/**
 * Só o cadastro, sem calendário: link de cadastro, ou paciente que já tem
 * consulta marcada (em geral pela secretária). Remarcar ou cancelar
 * continua sendo com a clínica — o link não mexe no horário.
 */
export function RegistrationForm({ token, context }: { token: string; context: IntakeContext }) {
  const action = submitRegistration.bind(null, token);
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  if (state.done) {
    const { done } = state;
    return (
      <div className="space-y-2 rounded-lg border border-border bg-card p-5 text-center">
        <p className="text-sm font-medium">Cadastro enviado!</p>
        <p className="text-sm text-muted-foreground">
          {done.upcoming
            ? `Te esperamos ${consultationWhen(done.upcoming.scheduledAt)}, com ${done.doctorName}.`
            : `Obrigado. A clínica de ${done.doctorName} já recebeu seus dados.`}
        </p>
        <p className="text-sm text-muted-foreground">Pode fechar esta página. Este link já foi usado.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {context.upcoming && <UpcomingConsultationCard upcoming={context.upcoming} doctorName={context.doctorName} />}

      <div className="space-y-4 rounded-lg border border-border bg-card p-5">
        <div>
          <h2 className="text-sm font-medium">{context.upcoming ? "Complete seu cadastro" : "Seus dados"}</h2>
          <p className="text-xs text-muted-foreground">
            {context.upcoming
              ? "Confira e preencha seus dados antes da consulta. Para remarcar, entre em contato com a clínica."
              : `Preencha seus dados para o cadastro com ${context.doctorName}.`}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <PatientFormFields current={context.patient ?? EMPTY_PATIENT} contactRequired />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Enviando…" : "Enviar cadastro"}
          </Button>
        </div>
      </div>
    </form>
  );
}
