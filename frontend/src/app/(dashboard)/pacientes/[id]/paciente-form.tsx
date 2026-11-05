"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { updatePatient, deletePatient, type PatientFormState } from "@/app/actions/pacientes";
import type { Patient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, PatientFormFields } from "@/components/patient-form-fields";
import { ConsultationLinkButton } from "@/components/consultation-link-button";

const initialState: PatientFormState = {};

export function PacienteForm({
  patient,
  canDelete,
  showClinicalFields,
}: {
  patient: Patient;
  canDelete: boolean;
  showClinicalFields: boolean;
}) {
  const updateAction = updatePatient.bind(null, patient.id);
  const deleteAction = deletePatient.bind(null, patient.id);

  const [state, formAction, pending] = useActionState(updateAction, initialState);
  const [deleteState, deleteFormAction, deletePending] = useActionState(deleteAction, initialState);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmReady, setConfirmReady] = useState(false);

  useEffect(() => {
    if (!confirmingDelete) {
      setConfirmReady(false);
      return;
    }
    // "Remover paciente" e "Confirmar" ocupam a mesma posição (container
    // alinhado à direita) — sem esse atraso, um duplo-clique comum no botão
    // original cai em cima do "Confirmar" e apaga o prontuário inteiro sem
    // chance real de arrependimento (achado da revisão final da Fase 0).
    const timer = setTimeout(() => setConfirmReady(true), 400);
    return () => clearTimeout(timer);
  }, [confirmingDelete]);

  const current = state.patient ?? patient;

  useEffect(() => {
    if (state.success) toast.success("Paciente atualizado.");
    if (state.error) toast.error(state.error);
  }, [state]);

  useEffect(() => {
    if (deleteState.error) toast.error(deleteState.error);
  }, [deleteState]);

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-5 rounded-lg border border-border bg-card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <PatientFormFields current={current} />
          {showClinicalFields && (
            <>
              <Field label="Medicamentos contínuos" full>
                <Textarea name="continuousMedications" defaultValue={current.continuousMedications ?? ""} rows={3} />
              </Field>
              <Field label="Observações" full>
                <Textarea name="notes" defaultValue={current.notes ?? ""} rows={3} />
              </Field>
            </>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>

      <div className="space-y-2 rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-medium">Links para o paciente</h3>
        <p className="text-xs text-muted-foreground">
          Links públicos de uso único. <strong>Cadastro</strong>: o paciente confere e completa os próprios dados.{" "}
          <strong>Consulta</strong>: além disso, escolhe o horário. Gerar um novo invalida o anterior. Não é
          obrigatório — a secretária pode marcar pela agenda normalmente.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <ConsultationLinkButton patientId={patient.id} purpose="CADASTRO" />
          <ConsultationLinkButton patientId={patient.id} purpose="AGENDAMENTO" />
        </div>
      </div>

      {canDelete && (
        <div className="flex justify-end">
          {!confirmingDelete ? (
            <Button variant="ghost" className="text-destructive" onClick={() => setConfirmingDelete(true)}>
              <Trash2 className="mr-1 h-4 w-4" /> Remover paciente
            </Button>
          ) : (
            <form action={deleteFormAction} className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Remover este paciente permanentemente?</span>
              <Button type="button" variant="ghost" onClick={() => setConfirmingDelete(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={deletePending || !confirmReady}>
                {deletePending ? "Removendo…" : "Confirmar"}
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
