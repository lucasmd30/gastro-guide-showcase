"use client";

import { Fragment, startTransition, useActionState, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Check, Loader2, RefreshCcw, Save, ShieldCheck, Trash2, User, X } from "lucide-react";
import { createMedicalRecord, type ProntuarioFormState } from "@/app/actions/prontuario";
import type {
  MedicalRecordType,
  DiseaseDefinition,
  DoctorCrm,
  DoctorRqe,
  DiseaseFieldSummary,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { isFieldVisible, toggleMultiOption, type FieldValues } from "@/components/dynamic-form-field";
import { FieldGroups } from "@/components/field-groups";
import { CollapsibleSection } from "@/components/collapsible-section";
import { ScalePicker, ScalesSection } from "@/components/scales";
import { useRecordDraft, type DraftStatus } from "./use-record-draft";

const initialState: ProntuarioFormState = {};

/** Precisa bater com o id usado nos controles da barra (atributo `form`). */
const FORM_ID = "registro-form";

const TYPE_LABELS: Record<MedicalRecordType, string> = {
  PRIMEIRA_CONSULTA: "Consulta",
  RETORNO: "Retorno",
  EVOLUCAO: "Evolução",
};

/**
 * No protótipo Lovable este bloco só aparece em doenças de Hepatologia.
 * O texto tem que bater com ConsultationSectionRegistry.SUPLEMENTOS no
 * backend — é lá que a subseção é nomeada.
 */
const SUPLEMENTOS_SUBSECTION = "Suplementos, chás, fitoterápicos, fórmulas, hormonal e AINEs";

/** O último card do registro — as escalas vêm logo antes dele. Mesmo texto da seção no ConsultationSectionRegistry. */
const HIPOTESE_CONDUTA_SECTION = "Hipótese diagnóstica e conduta";

function computeImc(values: FieldValues): string | null {
  const peso = parseFloat(String(values.peso ?? "").replace(",", "."));
  const alturaCm = parseFloat(String(values.altura ?? "").replace(",", "."));
  if (!peso || !alturaCm) return null;
  const alturaM = alturaCm / 100;
  if (alturaM <= 0) return null;
  return (peso / (alturaM * alturaM)).toFixed(1);
}

export function RecordComposer({
  patientId,
  patientName,
  patientBirthLabel,
  disease,
  doctorCrms,
  doctorRqes,
  primeiraConsultaFields,
  retornoFields,
  evolucaoFields,
  renderHeader,
  historySlot,
  tabsSlot,
  noticeSlot,
  documentsSlot,
}: {
  /** Nulos na visualização do modelo: a tela funciona, mas não salva nada. */
  patientId: string | null;
  patientName: string | null;
  /** "15/03/1980 · 46 anos" — a médica pediu para ver isso junto do nome. */
  patientBirthLabel: string | null;
  /** A doença da aba selecionada — nulo no chip "Geral". */
  disease: DiseaseDefinition | null;
  doctorCrms: DoctorCrm[];
  doctorRqes: DoctorRqe[];
  primeiraConsultaFields: DiseaseFieldSummary[];
  retornoFields: DiseaseFieldSummary[];
  evolucaoFields: DiseaseFieldSummary[];
  /**
   * O card de Cabeçalho, que é um form próprio e por isso não pode ficar
   * aninhado aqui. Recebe o tipo escolhido: no retorno o card se chama "Retorno".
   */
  renderHeader?: (type: MedicalRecordType) => ReactNode;
  /** Botão do painel de consultas anteriores, na barra ao lado do "Salvar". */
  historySlot?: ReactNode;
  /** Os chips de modelo (Geral, DRGE…), logo abaixo do card do paciente. */
  tabsSlot?: ReactNode;
  /** Aviso entre o card do paciente e os modelos (o do modo visualização). */
  noticeSlot?: ReactNode;
  /** Card de documentos (atestado, encaminhamento…), logo depois das escalas. */
  documentsSlot?: ReactNode;
}) {
  const preview = patientId === null;
  const action = createMedicalRecord.bind(null, patientId ?? "");
  const [state, formAction, pending] = useActionState(action, initialState);
  const [resetCount, setResetCount] = useState(0);
  const [type, setType] = useState<MedicalRecordType>("PRIMEIRA_CONSULTA");
  const [values, setValues] = useState<FieldValues>({});
  /** Escalas já calculadas e anexadas a este registro, como texto formatado. */
  const [scores, setScores] = useState<string[]>([]);

  // A mesma escala pode ser recalculada — só a última leitura vale, senão o
  // registro acumularia "Child-Pugh: 6" e "Child-Pugh: 8" lado a lado.
  const addScore = (s: string) =>
    setScores((cur) => [...cur.filter((x) => x.split(":")[0] !== s.split(":")[0]), s]);


  const principalCrm = doctorCrms.find((c) => c.principal) ?? doctorCrms[0];
  const principalRqe = doctorRqes.find((r) => r.principal);
  const isHepato = disease?.specialty === "HEPATO";

  /**
   * Página em branco: em qualquer tipo de registro são só três cards — o
   * Cabeçalho (a folha livre), as escalas e "Hipótese diagnóstica e conduta"
   * (pedido de 19/10/2026).
   */
  const freeSheet = !!disease?.freeForm;

  const sectionFields = useMemo(() => {
    // A Gastro — Guiada tem a sua própria primeira consulta (anamnese por
    // sintomas dentro de "Anamnese & antecedentes"); os demais usam a genérica.
    const fields =
      type === "PRIMEIRA_CONSULTA"
        ? (disease?.consultationFields ?? primeiraConsultaFields)
        : type === "RETORNO"
          ? retornoFields
          : evolucaoFields;
    // Modelo "em branco": a folha livre faz as vezes de anamnese e exame, então
    // das seções genéricas só entra o card final de hipótese e conduta.
    if (freeSheet) return fields.filter((f) => f.section === HIPOTESE_CONDUTA_SECTION);
    return isHepato ? fields : fields.filter((f) => f.subsection !== SUPLEMENTOS_SUBSECTION);
  }, [
    type,
    isHepato,
    freeSheet,
    disease?.consultationFields,
    primeiraConsultaFields,
    retornoFields,
    evolucaoFields,
  ]);

  // Só envia os campos realmente preenchidos e visíveis — mesma regra do
  // cabeçalho de doença (um "Sim" trocado para "Não" não leva o detalhe junto).
  const visibleKeys = new Set(sectionFields.filter((f) => isFieldVisible(f, values)).map((f) => f.key));
  const filled = Object.fromEntries(
    Object.entries(values).filter(
      ([key, v]) => visibleKeys.has(key) && (Array.isArray(v) ? v.length > 0 : v !== ""),
    ),
  );

  // Rascunho automático, um por modelo (a aba aberta) para este paciente.
  const draft = useRecordDraft({
    patientId: patientId ?? "",
    enabled: !preview,
    formKey: disease?.slug ?? "geral",
    data: { type, values: filled, scores },
    isEmpty: Object.keys(filled).length === 0 && scores.length === 0,
    onRestore: (data) => {
      if (typeof data.type === "string") setType(data.type as MedicalRecordType);
      if (data.values && typeof data.values === "object") setValues(data.values as FieldValues);
      if (Array.isArray(data.scores)) setScores(data.scores as string[]);
    },
  });

  useEffect(() => {
    if (state.success) {
      toast.success("Registro finalizado e salvo no histórico do paciente.");
      setResetCount((n) => n + 1);
      setType("PRIMEIRA_CONSULTA");
      setValues({});
      setScores([]);
      // O registro de verdade existe agora: o rascunho não pode voltar.
      draft.discard();
    }
    if (state.error) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Título montado como no protótipo, em vez de digitado.
  const title = `${disease?.shortName ?? "Geral"} — ${TYPE_LABELS[type]} — ${new Date().toLocaleDateString("pt-BR")}`;

  const setScalar = (key: string, value: string) =>
    setValues((current) => {
      const next = { ...current, [key]: value };
      // Exame físico: "Normal" grava a frase padrão da região (que é o
      // placeholder do campo de achados) para ela aparecer no documento;
      // "Não realizado" limpa; "Alterado" preserva o que já foi digitado.
      const mode = sectionFields.find((f) => f.key === key && f.style === "EXAM_MODE");
      if (mode) {
        const findings = sectionFields.find(
          (f) => f.style === "EXAM_FINDINGS" && f.showIf?.some((c) => c.key === key),
        );
        if (findings) {
          if (value === "Normal") next[findings.key] = findings.placeholder ?? "";
          else if (value !== "Alterado") next[findings.key] = "";
        }
      }
      return next;
    });

  const toggleMulti = (key: string, option: string) =>
    setValues((current) => {
      const selected = Array.isArray(current[key]) ? (current[key] as string[]) : [];
      return { ...current, [key]: toggleMultiOption(selected, option) };
    });

  // Consulta e evolução têm antropometria; o retorno não.
  const imc = sectionFields.some((f) => f.key === "peso") ? computeImc(values) : null;

  const cards = useMemo(() => {
    const bySection = new Map<string, DiseaseFieldSummary[]>();
    for (const field of sectionFields) {
      // Retorno/evolução não tem seções no protótipo: vira um card só,
      // nomeado pelo próprio tipo do registro.
      const section = field.section ?? TYPE_LABELS[type];
      const list = bySection.get(section);
      if (list) list.push(field);
      else bySection.set(section, [field]);
    }
    return [...bySection.entries()];
  }, [sectionFields]);

  // Todas as escalas em todo prontuário, sem filtrar pela especialidade da
  // doença aberta: a cliente encontrou modelos em que faltava a calculadora
  // que ela queria usar.
  const scalesCard = (
    <ScalesSection key={resetCount} count={scores.length}>
      {scores.length > 0 && (
        <ul className="mb-4 space-y-1.5">
          {scores.map((s, i) => (
            <li
              key={`${s}-${i}`}
              className="flex items-start justify-between gap-2 rounded-md bg-muted px-3 py-1.5 text-xs"
            >
              <span className="text-foreground">{s}</span>
              <button
                type="button"
                onClick={() => setScores((cur) => cur.filter((_, j) => j !== i))}
                className="shrink-0 text-muted-foreground hover:text-destructive"
                aria-label="Remover escala"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <ScalePicker onResult={addScore} />
    </ScalesSection>
  );

  return (
    <div className="space-y-5">
      {/* O card do paciente vem primeiro, acima da escolha do modelo (pedido
          de 09/10/2026): é ele que diz de quem é o prontuário aberto. */}
      <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <User className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">Paciente:</span>
          <span className="font-semibold text-foreground">{patientName ?? "nenhum (visualização)"}</span>
          {patientBirthLabel && (
            <span className="text-xs text-muted-foreground">({patientBirthLabel})</span>
          )}
          <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="h-3 w-3" /> CFM 1.638 / 1.821
          </span>
        </div>

        {/* Os controles vivem visualmente aqui, mas pertencem ao formulário
            abaixo — o atributo `form` é o que permite isso sem aninhar um
            form dentro do outro (o card de Cabeçalho é um form à parte). */}
        <div className="flex flex-wrap items-center gap-2">
          {historySlot}

          <NativeSelect
            form={FORM_ID}
            name="type"
            value={type}
            onChange={(e) => {
              setType(e.target.value as MedicalRecordType);
              setValues({});
            }}
            className="h-9 w-auto"
          >
            <option value="PRIMEIRA_CONSULTA">Consulta</option>
            <option value="RETORNO">Retorno</option>
            <option value="EVOLUCAO">Evolução</option>
          </NativeSelect>

          <NativeSelect form={FORM_ID} name="crmId" defaultValue={principalCrm?.id ?? ""} className="h-9 w-auto" required>
            {doctorCrms.map((c) => (
              <option key={c.id} value={c.id}>
                CRM {c.crm}/{c.crmUf}
              </option>
            ))}
          </NativeSelect>

          {doctorRqes.length > 0 && (
            <NativeSelect form={FORM_ID} name="rqeId" defaultValue={principalRqe?.id ?? "none"} className="h-9 w-auto">
              <option value="none">Nenhum RQE</option>
              {doctorRqes.map((r) => (
                <option key={r.id} value={r.id}>
                  RQE {r.rqe}
                </option>
              ))}
            </NativeSelect>
          )}

          <Button
            form={FORM_ID}
            type="submit"
            size="sm"
            disabled={pending || preview}
            // Tudo já é salvo sozinho enquanto se escreve; este botão só fecha o
            // registro, que a partir daí é definitivo (pedido de 20/10/2026).
            title={
              preview
                ? "Escolha um paciente para salvar"
                : "O preenchimento já é salvo automaticamente. Finalizar grava o registro no histórico; depois disso ele não pode ser alterado."
            }
            className="gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            {pending ? "Finalizando…" : "Finalizar registro"}
          </Button>
        </div>
      </div>
      </div>

      {noticeSlot}
      {tabsSlot}
      {!preview && <DraftStatusLine status={draft.status} savedAt={draft.savedAt} onDiscard={draft.discard} />}

      {renderHeader?.(type)}

      {/* onSubmit em vez de `action`: com `action` o React reseta o
          formulário depois de todo envio — inclusive o que falha —, o que
          fazia o seletor de tipo voltar visualmente para "Consulta" (mesmo
          achado da agenda). O form só leva os campos ocultos: o registro sai
          do estado, não dos inputs, e os cards ficam fora dele para o card de
          documentos (que tem botões e campos próprios) não disparar o envio
          do registro. */}
      <form
        id={FORM_ID}
        // Só campos ocultos: escondido, para não ocupar espaço entre os cards.
        className="hidden"
        onSubmit={(event) => {
          event.preventDefault();
          if (preview) return;
          const formData = new FormData(event.currentTarget);
          startTransition(() => formAction(formData));
        }}
      >
        <input type="hidden" name="consultationJson" value={JSON.stringify(filled)} readOnly />
        <input type="hidden" name="title" value={title} readOnly />
        <input type="hidden" name="disease" value={disease?.slug ?? ""} readOnly />
        <input type="hidden" name="scores" value={JSON.stringify(scores)} readOnly />
      </form>

      {/* Anamnese (ou Retorno/Evolução), exame físico, escalas, documentos e
          por último hipótese/conduta: a ordem que a médica pediu. As escalas
          entram logo antes de "Hipótese diagnóstica e conduta" — depois do
          exame físico, que é quando ela tem os dados para calcular —, e os
          documentos logo depois delas, como no protótipo. */}
      <div className="space-y-5">
        {cards.map(([section, fields]) => (
          <Fragment key={section}>
            {section === HIPOTESE_CONDUTA_SECTION && (
              <>
                {scalesCard}
                {documentsSlot}
              </>
            )}
            {/* O `key` recolhe o card depois de salvar; o de documentos não
                entra nisso, para não perder um documento sendo escrito. */}
            <CollapsibleSection key={resetCount} title={section}>
              <FieldGroups
                fields={fields}
                values={values}
                onScalarChange={setScalar}
                onToggleMulti={toggleMulti}
                // O título já está no cabeçalho do card; repetir aqui duplicaria.
                renderSection={(_, children) => children}
                slotAfterSubsection={(subsection) =>
                  subsection === "Antropometria" && imc ? (
                    <p className="text-xs text-muted-foreground">IMC calculado: {imc}</p>
                  ) : null
                }
              />
            </CollapsibleSection>
          </Fragment>
        ))}
      </div>
      {/* Registro sem o card de hipótese/conduta: escalas e documentos
          continuam disponíveis, no fim. */}
      {!cards.some(([section]) => section === HIPOTESE_CONDUTA_SECTION) && (
        <>
          {scalesCard}
          {documentsSlot}
        </>
      )}
    </div>
  );
}

/** Linha discreta acima da barra — a mesma do protótipo (`DraftStatus`). */
function DraftStatusLine({
  status,
  savedAt,
  onDiscard,
}: {
  status: DraftStatus;
  savedAt: string | null;
  onDiscard: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
      {status === "salvando" || status === "carregando" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
      ) : status === "erro" ? (
        <RefreshCcw className="h-3.5 w-3.5 text-amber-600" />
      ) : (
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      )}
      <span>
        {status === "carregando"
          ? "Buscando rascunho salvo…"
          : status === "salvando"
            ? "Salvando automaticamente…"
            : status === "erro"
              ? "Não consegui salvar agora — tentando de novo…"
              : savedAt
                ? `Salvo automaticamente às ${new Date(savedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}. Ao terminar, use "Finalizar registro" para gravá-lo no histórico.`
                : "Salvamento automático ativo: o que for escrito fica guardado, mesmo se a página fechar."}
      </span>
      {savedAt && (
        <button
          type="button"
          onClick={onDiscard}
          className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" /> descartar rascunho
        </button>
      )}
    </div>
  );
}
