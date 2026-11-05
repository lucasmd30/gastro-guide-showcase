import type { DocumentTemplate, MedicalDocumentKind } from "@/lib/api";
import { formatCpf } from "@/lib/cpf";
import { formatDateKey } from "@/lib/dates";

/**
 * Modelos de documento da tela "Documentos", portados de
 * frontend-lovable-reference/src/lib/documento-modelos.ts (export de
 * 06/10/2026). O texto que cada modelo monta é o do protótipo; mudou só o
 * que é infraestrutura daqui: datas sem `Date` (data civil não tem fuso —
 * `new Date("2026-10-14")` vira véspera em UTC-3), CPF com máscara, e o tipo
 * no enum do backend. O modelo "Orientações — DRGE" do protótipo não entrou:
 * lá ele só aparece dentro do prontuário da DRGE, e o mesmo texto está nas
 * orientações prontas.
 */

export interface DocField {
  key: string;
  label: string;
  type?: "text" | "date" | "number" | "textarea" | "time" | "select";
  placeholder?: string;
  /** Opções quando type = "select". */
  options?: { value: string; label: string }[];
  /** Mostra o campo apenas quando a condição for verdadeira. */
  showIf?: (v: Record<string, string>) => boolean;
}

export interface DocContext {
  paciente: string;
  cpf?: string | null;
}

export interface DocModel {
  id: string;
  kind: MedicalDocumentKind;
  label: string;
  descricao: string;
  /** O CID-10 tem campo próprio (busca), fora desta lista. */
  fields: DocField[];
  /** O modelo livre leva o título digitado pelo médico. */
  freeTitle?: boolean;
  build: (v: Record<string, string>, ctx: DocContext) => string;
}

export const KIND_LABEL: Record<MedicalDocumentKind, string> = {
  ATESTADO: "Atestado",
  DECLARACAO: "Declaração",
  ENCAMINHAMENTO: "Encaminhamento",
  RELATORIO: "Relatório",
  SOLICITACAO: "Solicitação de exames",
  ORIENTACAO: "Orientações",
  OUTRO: "Outro documento",
};

/** Hoje em São Paulo, `dd/mm/aaaa`. */
export function hojeBr(): string {
  return new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

const dataOuHoje = (key: string | undefined) => (key ? formatDateKey(key) : hojeBr());

const pac = (ctx: DocContext) => `${ctx.paciente}${ctx.cpf ? `, portador(a) do CPF ${formatCpf(ctx.cpf)}` : ""}`;

const cidTxt = (v: Record<string, string>) => (v.cid?.trim() ? ` CID-10: ${v.cid.trim()}.` : "");

export const DOC_MODELS: DocModel[] = [
  {
    id: "livre",
    kind: "OUTRO",
    label: "Outro documento (livre)",
    descricao: "Documento em branco com cabeçalho e assinatura.",
    fields: [{ key: "titulo_livre", label: "Título do documento", placeholder: "Declaração" }],
    freeTitle: true,
    build: () => "",
  },
  {
    id: "atestado_afastamento",
    kind: "ATESTADO",
    label: "Atestado médico (afastamento)",
    descricao: "Afastamento das atividades por período determinado.",
    fields: [
      { key: "dias", label: "Dias de afastamento", type: "number", placeholder: "3" },
      { key: "inicio", label: "A partir de", type: "date" },
    ],
    build: (v, ctx) =>
      `Atesto, para os devidos fins, que ${pac(ctx)} esteve sob meus cuidados médicos nesta data e necessita de afastamento de suas atividades habituais por ${v.dias || "___"} (${v.dias || "___"}) dia(s), a partir de ${dataOuHoje(v.inicio)}.${cidTxt(v)}`,
  },
  {
    id: "declaracao_comparecimento",
    kind: "DECLARACAO",
    label: "Declaração de comparecimento (paciente)",
    descricao: "Comprovação de presença em consulta, com horários.",
    fields: [
      { key: "data", label: "Data do atendimento", type: "date" },
      {
        key: "periodo",
        label: "Período",
        type: "select",
        options: [
          { value: "horario", label: "Informar horários (entrada e saída)" },
          { value: "manha", label: "Manhã" },
          { value: "tarde", label: "Tarde" },
          { value: "dia", label: "Dia todo" },
        ],
      },
      { key: "hora_inicio", label: "Horário de entrada", type: "time", showIf: (v) => !v.periodo || v.periodo === "horario" },
      { key: "hora_fim", label: "Horário de saída", type: "time", showIf: (v) => !v.periodo || v.periodo === "horario" },
    ],
    build: (v, ctx) => {
      const periodo =
        v.periodo === "manha"
          ? "no período da manhã"
          : v.periodo === "tarde"
            ? "no período da tarde"
            : v.periodo === "dia"
              ? "durante todo o dia"
              : `no período das ${v.hora_inicio || "__:__"} às ${v.hora_fim || "__:__"} horas`;
      return `Declaro, para os devidos fins, que ${pac(ctx)} compareceu a esta consulta médica no dia ${dataOuHoje(v.data)}, ${periodo}.`;
    },
  },
  {
    id: "comparecimento_acompanhante",
    kind: "DECLARACAO",
    label: "Atestado de comparecimento para acompanhante",
    descricao: "Justifica a presença do acompanhante durante o atendimento.",
    fields: [
      { key: "acompanhante", label: "Nome do acompanhante" },
      { key: "documento", label: "CPF/RG do acompanhante" },
      { key: "parentesco", label: "Grau de parentesco/vínculo", placeholder: "filho(a), cônjuge…" },
      { key: "data", label: "Data do atendimento", type: "date" },
      { key: "hora_inicio", label: "Horário de entrada", type: "time" },
      { key: "hora_fim", label: "Horário de saída", type: "time" },
    ],
    build: (v, ctx) =>
      `Declaro, para os devidos fins, que ${v.acompanhante || "____________________"}${v.documento ? ` (${v.documento})` : ""}, na condição de ${v.parentesco || "acompanhante"} de ${pac(ctx)}, permaneceu nesta unidade acompanhando o(a) paciente durante atendimento médico no dia ${dataOuHoje(v.data)}, das ${v.hora_inicio || "__:__"} às ${v.hora_fim || "__:__"} horas.`,
  },
  {
    id: "encaminhamento",
    kind: "ENCAMINHAMENTO",
    label: "Encaminhamento a especialista/serviço",
    descricao: "Encaminha o paciente com resumo clínico e motivo.",
    fields: [
      { key: "destino", label: "Encaminhar para (especialidade/serviço)" },
      { key: "motivo", label: "Motivo do encaminhamento", type: "textarea" },
      { key: "resumo", label: "Resumo clínico / exames relevantes", type: "textarea" },
    ],
    build: (v, ctx) =>
      `Encaminho o(a) paciente ${pac(ctx)} ao serviço de ${v.destino || "____________________"}.\n\nMotivo: ${v.motivo || "—"}${cidTxt(v)}\n\nResumo clínico:\n${v.resumo || "—"}\n\nColoco-me à disposição para as informações complementares que se fizerem necessárias.`,
  },
  {
    id: "relatorio",
    kind: "RELATORIO",
    label: "Relatório médico",
    descricao: "Relatório de acompanhamento para plano de saúde, escola, trabalho.",
    fields: [
      { key: "destinatario", label: "Destinatário", placeholder: "operadora, empregador, escola…" },
      { key: "evolucao", label: "Evolução e tratamento realizado", type: "textarea" },
      { key: "solicitacao", label: "Solicitação / justificativa", type: "textarea" },
    ],
    build: (v, ctx) =>
      `RELATÓRIO MÉDICO${v.destinatario ? ` — ${v.destinatario}` : ""}\n\nPaciente: ${pac(ctx)}${cidTxt(v)}\n\nEvolução e tratamento:\n${v.evolucao || "—"}\n\nJustificativa/solicitação:\n${v.solicitacao || "—"}`,
  },
  {
    id: "solicitacao_exames",
    kind: "SOLICITACAO",
    label: "Solicitação de exames/procedimento",
    descricao: "Pedido de exames com indicação clínica.",
    fields: [
      { key: "exames", label: "Exames/procedimentos solicitados (um por linha)", type: "textarea" },
      { key: "indicacao", label: "Indicação clínica", type: "textarea" },
    ],
    build: (v, ctx) =>
      `Solicito para o(a) paciente ${pac(ctx)}:\n\n${
        (v.exames || "")
          .split("\n")
          .filter((l) => l.trim())
          .map((l, i) => `${i + 1}. ${l.trim()}`)
          .join("\n") || "—"
      }\n\nIndicação clínica: ${v.indicacao || "—"}${cidTxt(v)}`,
  },
  {
    id: "orientacoes",
    kind: "ORIENTACAO",
    label: "Orientações e cuidados ao paciente",
    descricao: "Plano de cuidados, dieta e sinais de alarme por escrito.",
    fields: [
      { key: "orientacoes", label: "Orientações", type: "textarea" },
      { key: "alarme", label: "Sinais de alarme / quando procurar atendimento", type: "textarea" },
      { key: "retorno", label: "Retorno programado", placeholder: "em 30 dias com exames" },
    ],
    build: (v, ctx) =>
      `Orientações ao(à) paciente ${pac(ctx)}:\n\n${v.orientacoes || "—"}\n\nSinais de alarme:\n${v.alarme || "—"}\n\nRetorno: ${v.retorno || "a combinar"}.`,
  },
];

/**
 * Texto final de um modelo: o que ele monta mais o CID-10, quando escolhido e
 * o modelo não o incluiu no próprio texto (o livre e as orientações não
 * incluem) — mesma regra do protótipo.
 */
export function buildDocumentText(model: DocModel, values: Record<string, string>, ctx: DocContext): string {
  const base = model.build(values, ctx);
  const cid = (values.cid ?? "").trim();
  if (!cid || base.includes(cid.split(" — ")[0])) return base;
  return base ? `${base}\n\nCID-10: ${cid}` : `CID-10: ${cid}`;
}

/** Modelo próprio do médico na galeria — o texto dele é o documento inteiro. */
export function templateToModel(t: DocumentTemplate): DocModel {
  return {
    id: `tpl:${t.id}`,
    kind: "OUTRO",
    label: t.name,
    descricao: "Modelo criado por você.",
    fields: [],
    build: () => t.content,
  };
}
