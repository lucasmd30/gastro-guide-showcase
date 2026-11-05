"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ExternalLink, FileText } from "lucide-react";
import { issueMedicalDocumentInline } from "@/app/actions/documentos";
import type { DocumentTemplate, DoctorCrm, DoctorRqe, MedicalDocument } from "@/lib/api";
import { DOC_MODELS, KIND_LABEL, buildDocumentText, templateToModel } from "@/lib/document-models";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { CollapsibleSection } from "@/components/collapsible-section";
import { CidPicker } from "./cid-picker";
import { DocumentFields } from "./document-fields";
import { ReadyGuidance } from "./ready-guidance";

/**
 * Documentos dentro do próprio prontuário — o bloco "Documentos" do
 * `ProntuarioTools` do protótipo Lovable: escolhe o modelo, preenche os
 * campos, CID-10, orientação pronta, e emite sem sair da consulta. A
 * impressão abre em outra aba, para o registro em andamento continuar aqui.
 * Mesmas regras da tela Documentos: emitido é definitivo, CRM/RQE congelados.
 *
 * O estado mora aqui, fora do card: recolher o card não perde o documento
 * que estava sendo escrito.
 */
export function RecordDocumentsPanel({
  patient,
  diseaseSlug,
  doctorCrms,
  doctorRqes,
  templates,
}: {
  /** Nulo na visualização do modelo: o card aparece, mas não emite. */
  patient: { id: string; name: string; cpf: string | null } | null;
  diseaseSlug?: string;
  doctorCrms: DoctorCrm[];
  doctorRqes: DoctorRqe[];
  templates: DocumentTemplate[];
}) {
  const docTemplates = templates.filter((t) => t.kind === "DOCUMENTO");
  const guidanceTemplates = templates.filter((t) => t.kind === "ORIENTACAO");
  const allModels = [...DOC_MODELS, ...docTemplates.map(templateToModel)];

  const [modelId, setModelId] = useState(DOC_MODELS[0].id);
  const model = allModels.find((m) => m.id === modelId) ?? allModels[0];
  const [values, setValues] = useState<Record<string, string>>({});
  /** Texto editado à mão; nulo = segue o que o modelo monta a partir dos campos. */
  const [manualText, setManualText] = useState<string | null>(null);
  /** Título do modelo pronto em uso; nulo = o título do modelo escolhido. */
  const [readyTitle, setReadyTitle] = useState<string | null>(null);
  const [crmId, setCrmId] = useState((doctorCrms.find((c) => c.principal) ?? doctorCrms[0])?.id ?? "");
  const [rqeId, setRqeId] = useState(doctorRqes.find((r) => r.principal)?.id ?? "none");
  /** Emitidos nesta tela, para reabrir a impressão. */
  const [issued, setIssued] = useState<MedicalDocument[]>([]);
  const [pending, startTransition] = useTransition();

  const generated = buildDocumentText(model, values, {
    paciente: patient?.name ?? "____________________",
    cpf: patient?.cpf,
  });
  const text = manualText ?? generated;
  const title = readyTitle ?? ((model.freeTitle && values.titulo_livre?.trim()) || model.label);
  const visibleFields = model.fields.filter((f) => !f.showIf || f.showIf(values));

  const setValue = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));
  const reset = (id: string) => {
    setModelId(id);
    setValues({});
    setManualText(null);
    setReadyTitle(null);
  };

  const printUrl = (doc: MedicalDocument) => `/documentos/${doc.id}?paciente=${patient?.id}`;

  const issue = () => {
    if (!patient || !text.trim()) return;
    if (!window.confirm("Emitir este documento? Depois de emitido ele não pode ser alterado nem excluído.")) return;
    // A aba é aberta ainda dentro do clique — depois do await o navegador a
    // trataria como pop-up e bloquearia. Ela recebe o endereço quando o
    // documento existir.
    const tab = window.open("about:blank", "_blank");
    startTransition(async () => {
      const result = await issueMedicalDocumentInline(patient.id, {
        kind: model.kind,
        model: model.id,
        title,
        content: text,
        data: values,
        crmId,
        rqeId: rqeId === "none" ? undefined : rqeId,
      });
      if (!result.document) {
        tab?.close();
        toast.error(result.error ?? "Não foi possível emitir o documento.");
        return;
      }
      const doc = result.document;
      if (tab) tab.location.href = printUrl(doc);
      setIssued((cur) => [doc, ...cur]);
      reset(model.id);
      toast.success(tab ? "Documento emitido — a impressão abriu em outra aba." : "Documento emitido.");
    });
  };

  return (
    <CollapsibleSection title={`Documentos${issued.length > 0 ? ` — ${issued.length} emitido${issued.length > 1 ? "s" : ""}` : ""}`}>
      {!patient ? (
        <p className="text-sm text-muted-foreground">
          Escolha o paciente acima para emitir atestados, declarações, encaminhamentos, relatórios e
          orientações daqui mesmo.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Atestados, declarações, encaminhamentos, relatórios, solicitações de exame, orientações e
            seus modelos próprios. Para criar ou editar modelos, use a tela{" "}
            <Link href={`/documentos?paciente=${patient.id}`} target="_blank" className="text-primary hover:underline">
              Documentos
            </Link>
            .
          </p>

          <div className="space-y-1">
            <Label className="text-xs">Modelo</Label>
            <NativeSelect value={model.id} onChange={(e) => reset(e.target.value)}>
              {allModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {KIND_LABEL[m.kind]} — {m.label}
                  {m.id.startsWith("tpl:") ? " (meu modelo)" : ""}
                </option>
              ))}
            </NativeSelect>
          </div>

          {visibleFields.length > 0 && <DocumentFields fields={visibleFields} values={values} onChange={setValue} />}

          <CidPicker
            value={values.cid ?? ""}
            onChange={(v) => setValue("cid", v)}
            label="CID-10 (opcional)"
            hint="Informe o código somente com autorização do paciente."
          />

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Texto do documento (editável)</Label>
              {manualText !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setManualText(null);
                    setReadyTitle(null);
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  regerar a partir do modelo
                </button>
              )}
            </div>
            <Textarea
              rows={8}
              value={text}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Escreva o documento…"
            />
          </div>

          {/* Mesma ordem da tela Documentos: os modelos prontos logo abaixo do texto. */}
          <ReadyGuidance
            patientName={patient.name}
            templates={guidanceTemplates}
            diseaseSlug={diseaseSlug}
            onUse={(t, readyName) => {
              // Orientação pronta é um documento de orientação, com o título dela.
              reset("orientacoes");
              setManualText(t);
              setReadyTitle(readyName);
              toast.success("Orientação carregada no texto do documento.");
            }}
          />

          <div className="flex flex-wrap items-center justify-end gap-2">
            <NativeSelect value={crmId} onChange={(e) => setCrmId(e.target.value)} className="h-9 w-auto">
              {doctorCrms.map((c) => (
                <option key={c.id} value={c.id}>
                  CRM {c.crm}/{c.crmUf}
                </option>
              ))}
            </NativeSelect>
            {doctorRqes.length > 0 && (
              <NativeSelect value={rqeId} onChange={(e) => setRqeId(e.target.value)} className="h-9 w-auto">
                <option value="none">Nenhum RQE</option>
                {doctorRqes.map((r) => (
                  <option key={r.id} value={r.id}>
                    RQE {r.rqe}
                  </option>
                ))}
              </NativeSelect>
            )}
            <Button type="button" size="sm" onClick={issue} disabled={!text.trim() || pending}>
              {pending ? "Emitindo…" : "Emitir e imprimir"}
            </Button>
          </div>
          <p className="text-right text-xs text-muted-foreground">
            Documento emitido é definitivo: não pode ser alterado nem excluído. Para corrigir, emita outro.
          </p>

          {issued.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">Emitidos nesta consulta</p>
              {issued.map((d) => (
                <a
                  key={d.id}
                  href={printUrl(d)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent/40"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="font-medium">{KIND_LABEL[d.kind]}</span>
                    <span className="truncate text-muted-foreground">{d.title}</span>
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </CollapsibleSection>
  );
}
