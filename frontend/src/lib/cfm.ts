import { computeField, fieldLabel } from "@/lib/computed-fields";
import type { Doctor, Patient, MedicalRecordDetail, DiseaseFieldSummary, DiseaseDefinition } from "@/lib/api";
import { formatCpf } from "@/lib/cpf";

const TYPE_LABELS: Record<string, string> = {
  PRIMEIRA_CONSULTA: "Consulta",
  RETORNO: "Consulta de retorno / seguimento",
  EVOLUCAO: "Evolução clínica",
};

/** "1980-03-15" → "15/03/1980". Sem Date: uma data civil não tem fuso, e new Date("1980-03-15") viraria véspera em UTC-3. */
function formatBirthDate(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : isoDate;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
}

/*
 * O documento deixou de ser um bloco de texto monoespaçado (difícil de ler,
 * pedido da cliente) e passou a ser um modelo estruturado que a página
 * renderiza com títulos, grade rótulo/valor e tabela de verdade. O conteúdo
 * e as regras de CFM continuam aqui; a apresentação é do componente.
 */

/** Um item do documento: campo simples, linha de campos lado a lado (sinais vitais, antropometria) ou tabela. */
export type DocItem =
  | { kind: "field"; label: string; value: string }
  | { kind: "row"; label: string; cells: { label: string; value: string }[] }
  | { kind: "table"; label: string; columns: string[]; rows: string[][] };

export interface DocSubgroup {
  title: string | null;
  items: DocItem[];
}

export interface DocSection {
  title: string | null;
  subgroups: DocSubgroup[];
}

export interface MedicalRecordDocumentModel {
  heading: string;
  title: string;
  typeLabel: string;
  dateTime: string;
  professional: { label: string; value: string }[];
  patient: { label: string; value: string }[];
  /** Snapshot congelado do cabeçalho de doença, com o título da doença. */
  disease: { title: string; sections: DocSection[] } | null;
  consultation: DocSection[];
  scores: string[];
  /** Texto livre de registros antigos (campo que saiu da tela, mas continua no banco). */
  freeText: string | null;
  signature: { name: string; crm: string; registeredAt: string };
  legal: string[];
}

function scalarText(field: DiseaseFieldSummary, value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  let text = String(value);
  if (field.type === "NUMBER" && field.suffix) text += ` ${field.suffix}`;
  return text.trim();
}

/**
 * Pares "modo + detalhe" (exame físico: "Normal/Alterado" + achados; hábitos:
 * "Sim/Não" + detalhe) viram uma linha só: "Normal — BEG, LOTE…". O detalhe é
 * reconhecido por depender do campo anterior (showIf) e repetir o rótulo dele.
 */
function isDetailOf(detail: DiseaseFieldSummary, main: DiseaseFieldSummary): boolean {
  return (
    !!detail.showIf?.some((c) => c.key === main.key) && detail.label.startsWith(`${main.label} — `)
  );
}

/** Agrupa os valores preenchidos em seção → subseção → itens, pulando respostas vazias. */
function buildSections(json: Record<string, unknown> | null, fields: DiseaseFieldSummary[]): DocSection[] {
  if (!json) return [];

  const sections: DocSection[] = [];
  const push = (field: DiseaseFieldSummary, item: DocItem) => {
    let section = sections[sections.length - 1];
    if (!section || section.title !== (field.section ?? null)) {
      section = { title: field.section ?? null, subgroups: [] };
      sections.push(section);
    }
    let sub = section.subgroups[section.subgroups.length - 1];
    if (!sub || sub.title !== (field.subsection ?? null)) {
      sub = { title: field.subsection ?? null, items: [] };
      section.subgroups.push(sub);
    }
    // Campos consecutivos com o mesmo rowLabel (PA/FC/FR/SatO₂, peso/altura) numa linha só.
    const last = sub.items[sub.items.length - 1];
    if (item.kind === "row" && last?.kind === "row" && last.label === item.label) {
      last.cells.push(...item.cells);
    } else {
      sub.items.push(item);
    }
  };

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];

    // Calculado (FIB-4, NAS): não é gravado — refaz a conta com os valores do registro.
    if (field.type === "COMPUTED") {
      const computed = computeField(field, json);
      if (computed) push(field, { kind: "field", label: field.label, value: computed });
      continue;
    }

    const value = json[field.key];
    if (value === undefined || value === null) continue;

    if (field.type === "TABLE" && Array.isArray(value)) {
      const columns = field.columns ?? [];
      const rows = (value as Record<string, string>[])
        .filter((row) => Object.values(row).some((v) => typeof v === "string" && v.trim()))
        .map((row) => columns.map((col) => row[col.key] || "—"));
      if (rows.length > 0) push(field, { kind: "table", label: field.label, columns: columns.map((c) => c.label), rows });
      continue;
    }

    const text = scalarText(field, value);
    if (!text) continue;

    if (field.rowLabel) {
      push(field, { kind: "row", label: field.rowLabel, cells: [{ label: field.label, value: text }] });
      continue;
    }

    // Pode haver mais de um complemento seguido (sintoma da Gastro — Guiada:
    // características e depois detalhe) — todos entram na mesma linha.
    const parts = [text];
    while (fields[i + 1] && isDetailOf(fields[i + 1], field)) {
      const next = fields[++i];
      const detailValue = json[next.key];
      const detail = detailValue === undefined || detailValue === null ? "" : scalarText(next, detailValue);
      if (detail) parts.push(detail);
    }
    push(field, { kind: "field", label: fieldLabel(field, json), value: parts.join(" — ") });
  }

  return sections;
}

export function buildMedicalRecordDocument(
  doctor: Doctor,
  patient: Patient,
  record: MedicalRecordDetail,
  consultationFields: DiseaseFieldSummary[],
  diseaseConfig: DiseaseDefinition | null,
): MedicalRecordDocumentModel {
  const principalCrm = doctor.crms.find((c) => c.principal);
  const principalRqe = doctor.rqes.find((r) => r.principal);
  // CRM/RQE congelados no registro; o principal atual só vale para registros
  // anteriores ao snapshot (colunas nulas).
  const crm = record.crm ?? principalCrm?.crm ?? null;
  const crmUf = record.crmUf ?? principalCrm?.crmUf ?? null;
  const rqe = record.rqe ?? (record.crm ? null : principalRqe?.rqe) ?? null;
  const specialty = record.specialty ?? (record.crm ? null : principalRqe?.specialty) ?? null;
  const dateTime = formatDateTime(record.createdAt);

  const compact = (rows: ({ label: string; value: string } | null)[]) =>
    rows.filter((r): r is { label: string; value: string } => r !== null);

  const diseaseSections = diseaseConfig ? buildSections(record.contentJson, diseaseConfig.fields) : [];

  return {
    heading: "Registro de atendimento médico",
    title: record.title,
    typeLabel: TYPE_LABELS[record.type] ?? record.type,
    dateTime,
    professional: compact([
      { label: "Médico(a)", value: doctor.name },
      crm ? { label: "CRM", value: `${crm}/${crmUf}` } : null,
      rqe ? { label: "RQE", value: specialty ? `${rqe} (${specialty})` : rqe } : null,
    ]),
    patient: compact([
      { label: "Nome", value: patient.name },
      patient.birthDate ? { label: "Nascimento", value: formatBirthDate(patient.birthDate) } : null,
      patient.cpf ? { label: "CPF", value: formatCpf(patient.cpf) } : null,
      patient.motherName ? { label: "Nome da mãe", value: patient.motherName } : null,
    ]),
    disease: diseaseConfig && diseaseSections.length > 0 ? { title: diseaseConfig.title, sections: diseaseSections } : null,
    consultation: buildSections(record.consultationJson, consultationFields),
    scores: record.scoresJson ?? [],
    freeText: record.contentText?.trim() ? record.contentText : null,
    signature: {
      name: doctor.name,
      crm: crm ? `CRM ${crm}/${crmUf}` : "CRM não cadastrado",
      registeredAt: dateTime,
    },
    legal: [
      "Documento elaborado conforme Resoluções CFM 1.638/2002 e 1.821/2007.",
      "Guarda mínima: 20 anos a contar do último registro (Lei 13.787/2018).",
    ],
  };
}
