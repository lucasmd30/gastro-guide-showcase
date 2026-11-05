"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, RefreshCcw } from "lucide-react";
import { autosaveDiseaseHeader } from "@/app/actions/prontuario";
import type { DiseaseDefinition } from "@/lib/api";
import { isFieldVisible, toggleMultiOption, type FieldValues, type TableRow } from "@/components/dynamic-form-field";
import { FieldGroups } from "@/components/field-groups";
import { CollapsibleSection } from "@/components/collapsible-section";

/** Espera depois da última digitação antes de salvar — a mesma do rascunho do registro. */
const DEBOUNCE_MS = 1500;
/** Depois de uma falha (rede, sessão), tenta de novo sozinho, sem esperar outra digitação. */
const RETRY_MS = 5000;

type SaveStatus = "ativo" | "salvando" | "salvo" | "erro";

function emptyValues(config: DiseaseDefinition): FieldValues {
  const out: FieldValues = {};
  for (const field of config.fields) {
    out[field.key] = field.type === "MULTI" || field.type === "TABLE" ? [] : "";
  }
  return out;
}

// Só os campos realmente preenchidos — o backend rejeita string vazia
// como valor inválido para campos SINGLE (só aceita ausente ou uma opção real).
// E só os que o modelo ainda tem: quando um modelo muda (a Gastro — Guiada
// de 06/10/2026 perdeu campos), um cabeçalho antigo traria chaves que o
// backend recusa, e a médica não conseguiria mais salvar. Campo escondido
// por showIf também não vai: marcar "Presente", detalhar e voltar para
// "Ausente" gravaria um detalhe que a tela não mostra mais.
function filledValues(config: DiseaseDefinition, values: FieldValues): Record<string, unknown> {
  const knownKeys = new Set(config.fields.filter((f) => isFieldVisible(f, values)).map((f) => f.key));
  return Object.fromEntries(
    Object.entries(values).filter(
      ([key, v]) => knownKeys.has(key) && (Array.isArray(v) ? v.length > 0 : v !== ""),
    ),
  );
}

/**
 * Cabeçalho da doença, salvo automaticamente enquanto a médica escreve
 * (pedido de 20/10/2026 — sem botão, para nada se perder se a página fechar
 * ou a conexão cair). O cabeçalho é mutável (upsert), então salvar a cada
 * pausa é seguro; o registro da consulta, que é definitivo, continua
 * dependendo do "Finalizar registro".
 */
export function DiseaseHeaderForm({
  patientId,
  config,
  initialData,
  initialSavedAt,
  onChange,
  kindLabel = "Cabeçalho",
  title,
}: {
  /** Nulo na visualização do modelo: o cabeçalho pode ser preenchido, mas não salvo. */
  patientId: string | null;
  config: DiseaseDefinition;
  /** O último valor conhecido — do servidor, ou o que foi digitado antes de trocar de aba. */
  initialData: Record<string, unknown> | null;
  initialSavedAt: string | null;
  /**
   * Avisa o `ProntuarioView` a cada mudança: trocar de aba desmonta este
   * card, e sem isso voltar à aba mostraria o cabeçalho de quando a tela
   * abriu (o salvamento automático não recarrega a página).
   */
  onChange: (data: Record<string, unknown>, savedAt: string | null) => void;
  /** Primeira palavra do título: "Cabeçalho", ou "Retorno" quando o registro é um retorno. */
  kindLabel?: string;
  /** Título do card; sem ele, "<kindLabel> — <modelo>". */
  title?: string;
}) {
  const [values, setValues] = useState<FieldValues>(() => ({
    ...emptyValues(config),
    ...((initialData as FieldValues) ?? {}),
  }));
  const [status, setStatus] = useState<SaveStatus>("ativo");
  const [savedAt, setSavedAt] = useState<string | null>(initialSavedAt);
  const [retry, setRetry] = useState(0);

  const data = filledValues(config, values);
  const serialized = JSON.stringify(data);
  // O que está no servidor agora: abrir a tela não salva nada, só mudar algo.
  const lastSaved = useRef(serialized);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    onChangeRef.current(JSON.parse(serialized), savedAt);
  }, [serialized, savedAt]);

  useEffect(() => {
    if (!patientId || serialized === lastSaved.current) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setStatus("salvando");
      const result = await autosaveDiseaseHeader(patientId, config.slug, JSON.parse(serialized));
      if (cancelled) return;
      if (result.error || !result.updatedAt) {
        setStatus("erro");
        setTimeout(() => setRetry((n) => n + 1), RETRY_MS);
        return;
      }
      lastSaved.current = serialized;
      setSavedAt(result.updatedAt);
      setStatus("salvo");
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [serialized, patientId, config.slug, retry]);

  // Trocar de aba antes do debounce desmonta o card: manda o que estiver
  // pendente em vez de perder a última digitação.
  const pending = useRef({ serialized, patientId });
  pending.current = { serialized, patientId };
  useEffect(
    () => () => {
      const p = pending.current;
      if (p.patientId && p.serialized !== lastSaved.current) {
        void autosaveDiseaseHeader(p.patientId, config.slug, JSON.parse(p.serialized));
      }
    },
    [config.slug],
  );

  const setScalar = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));
  const toggleMulti = (key: string, option: string) =>
    setValues((v) => {
      const current = Array.isArray(v[key]) ? (v[key] as string[]) : [];
      return { ...v, [key]: toggleMultiOption(current, option) };
    });
  const setTable = (key: string, rows: TableRow[]) => setValues((v) => ({ ...v, [key]: rows }));

  return (
    <CollapsibleSection
      title={title ?? `${kindLabel} — ${config.title}`}
      actions={<HeaderSaveStatus preview={!patientId} status={status} savedAt={savedAt} />}
    >
      <FieldGroups
        fields={config.fields}
        values={values}
        onScalarChange={setScalar}
        onToggleMulti={toggleMulti}
        onTableChange={setTable}
      />
    </CollapsibleSection>
  );
}

function HeaderSaveStatus({
  preview,
  status,
  savedAt,
}: {
  preview: boolean;
  status: SaveStatus;
  savedAt: string | null;
}) {
  if (preview) return <span className="text-[11px] text-muted-foreground">Visualização — não salva</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      {status === "salvando" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
      ) : status === "erro" ? (
        <RefreshCcw className="h-3.5 w-3.5 text-amber-600" />
      ) : (
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      )}
      {status === "salvando"
        ? "Salvando…"
        : status === "erro"
          ? "Não consegui salvar agora — tentando de novo…"
          : savedAt
            ? `Salvo às ${new Date(savedAt).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}`
            : "Salvamento automático"}
    </span>
  );
}
