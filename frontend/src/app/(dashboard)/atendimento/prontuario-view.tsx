"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import type {
  DiseaseDefinition,
  DiseaseHeader,
  DoctorCrm,
  DoctorRqe,
  DiseaseFieldSummary,
  DocumentTemplate,
  ExamPreferences,
  MedicalRecordSummary,
} from "@/lib/api";
import { DiseaseHeaderForm } from "./disease-header-form";
import { RecordComposer } from "./record-composer";
import { RecordHistorySheet } from "./record-history-sheet";
import { Button } from "@/components/ui/button";
import { PatientPicker } from "@/components/patient-picker";
import { RECORD_TYPE_LABELS } from "@/components/medical-record-rows";
import { RecordDocumentsPanel } from "@/components/documents/record-documents-panel";
import { ExamOrder } from "@/components/exams/exam-order";

/** Índice reservado ao chip "Geral" — registro sem doença associada. */
const GERAL = -1;

export function ProntuarioView({
  patientId,
  patientName,
  patientCpf,
  patientBirthLabel,
  records,
  diseaseConfigs,
  headers,
  doctorCrms,
  doctorRqes,
  primeiraConsultaFields,
  retornoFields,
  evolucaoFields,
  documentTemplates,
  examPreferences,
  initialDiseaseSlug,
}: {
  /** Nulos na visualização do modelo (aberta sem paciente, de Prontuários modelo). */
  patientId: string | null;
  patientName: string | null;
  patientCpf: string | null;
  patientBirthLabel: string | null;
  records: MedicalRecordSummary[];
  diseaseConfigs: DiseaseDefinition[];
  headers: (DiseaseHeader | null)[];
  doctorCrms: DoctorCrm[];
  doctorRqes: DoctorRqe[];
  primeiraConsultaFields: DiseaseFieldSummary[];
  retornoFields: DiseaseFieldSummary[];
  evolucaoFields: DiseaseFieldSummary[];
  /** Modelos próprios do médico (documentos e orientações), para o card de documentos. */
  documentTemplates: DocumentTemplate[];
  examPreferences: ExamPreferences;
  initialDiseaseSlug?: string;
}) {
  const initialIndex = diseaseConfigs.findIndex((c) => c.slug === initialDiseaseSlug);
  const [selected, setSelected] = useState(initialIndex >= 0 ? initialIndex : GERAL);

  const disease = selected === GERAL ? null : diseaseConfigs[selected];
  const router = useRouter();

  // O cabeçalho mais recente de cada doença, digitado ou salvo. O salvamento
  // automático não recarrega a página, então é daqui que o card volta ao
  // trocar de aba (e não do `headers` de quando a tela abriu).
  const [headerState, setHeaderState] = useState<
    Record<string, { data: Record<string, unknown>; savedAt: string | null }>
  >(() =>
    Object.fromEntries(
      diseaseConfigs.flatMap((c, i) => {
        const h = headers[i];
        return h ? [[c.slug, { data: h.data, savedAt: h.updatedAt }]] : [];
      }),
    ),
  );

  const notice = !patientId && (
    <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-500/40 dark:bg-amber-500/10">
      <p className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-200">
        <Eye className="h-4 w-4" /> Modo visualização — nada do que for preenchido aqui é salvo.
      </p>
      <p className="text-xs text-amber-900/80 dark:text-amber-200/80">
        Para preencher e salvar, escolha o paciente (o modelo aberto continua o mesmo):
      </p>
      <PatientPicker
        placeholder="Buscar paciente por nome ou CPF"
        onSelect={(p) =>
          router.push(`/atendimento?paciente=${p.id}${disease ? `&disease=${disease.slug}` : ""}`)
        }
      />
    </div>
  );

  const tabs = (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant={selected === GERAL ? "default" : "outline"}
        size="sm"
        onClick={() => setSelected(GERAL)}
      >
        Geral
      </Button>
      {diseaseConfigs.map((config, i) => (
        <Button
          key={config.slug}
          type="button"
          variant={i === selected ? "default" : "outline"}
          size="sm"
          onClick={() => setSelected(i)}
        >
          {config.shortName}
          {headerState[config.slug]?.savedAt && <span className="ml-1.5 text-xs">✓</span>}
        </Button>
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Um formulário por aba: cada modelo tem o seu rascunho automático, e
          o que foi digitado numa doença não vaza para a outra. Voltar à aba
          restaura o rascunho dela. */}
      <RecordComposer
        key={disease?.slug ?? "geral"}
        patientId={patientId}
        patientName={patientName}
        patientBirthLabel={patientBirthLabel}
        noticeSlot={notice}
        tabsSlot={tabs}
        historySlot={patientId ? <RecordHistorySheet patientId={patientId} records={records} /> : null}
        disease={disease}
        doctorCrms={doctorCrms}
        doctorRqes={doctorRqes}
        primeiraConsultaFields={primeiraConsultaFields}
        retornoFields={retornoFields}
        evolucaoFields={evolucaoFields}
        documentsSlot={
          <>
            {/* Como no ProntuarioTools do protótipo: exames antes de documentos. */}
            <ExamOrder
              collapsible
              patient={patientId && patientName ? { id: patientId, name: patientName } : null}
              doctorCrms={doctorCrms}
              doctorRqes={doctorRqes}
              preferences={examPreferences}
            />
            <RecordDocumentsPanel
              patient={patientId && patientName ? { id: patientId, name: patientName, cpf: patientCpf } : null}
              diseaseSlug={disease?.slug}
              doctorCrms={doctorCrms}
              doctorRqes={doctorRqes}
              templates={documentTemplates}
            />
          </>
        }
        renderHeader={(type) =>
          disease && (
            <DiseaseHeaderForm
              key={disease.slug}
              patientId={patientId}
              config={disease}
              initialData={headerState[disease.slug]?.data ?? null}
              initialSavedAt={headerState[disease.slug]?.savedAt ?? null}
              onChange={(data, savedAt) =>
                setHeaderState((cur) => ({ ...cur, [disease.slug]: { data, savedAt } }))
              }
              // No retorno o card se chama "Retorno" ("Retorno — <modelo>"), não
              // "Cabeçalho" (pedido de 20/10/2026).
              kindLabel={type === "RETORNO" ? "Retorno" : undefined}
              // Na página em branco o card acompanha o tipo do registro (pedido
              // de 04/11/2026; desde 20/10 era sempre "Retorno"), e não
              // "Cabeçalho — Consulta/Retorno — Página em branco".
              title={disease.freeForm ? RECORD_TYPE_LABELS[type] : undefined}
            />
          )
        }
      />
    </div>
  );
}
