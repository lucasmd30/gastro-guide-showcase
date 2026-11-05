"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BookmarkPlus, User, X } from "lucide-react";
import { issueMedicalDocument, saveDocumentTemplate } from "@/app/actions/documentos";
import type { DocumentTemplate, DoctorCrm, DoctorRqe, MedicalDocument } from "@/lib/api";
import { DOC_MODELS, KIND_LABEL, buildDocumentText, templateToModel } from "@/lib/document-models";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { CidPicker } from "@/components/documents/cid-picker";
import { MyTemplatesManager } from "@/components/documents/my-templates";
import { ReadyGuidance } from "@/components/documents/ready-guidance";
import { DocumentRow } from "@/components/documents/document-row";
import { DocumentFields } from "@/components/documents/document-fields";

/**
 * Tela "Documentos" do protótipo Lovable (`documentos.tsx`): galeria de
 * modelos, campos que montam o texto, CID-10, orientações prontas, texto
 * final editável e emissão. Diferenças deliberadas: o documento emitido é
 * definitivo (decisão do usuário, 14/10/2026), o CRM/RQE é escolhido na
 * emissão e congelado como no prontuário, e não há envio por WhatsApp/e-mail.
 */
export function DocumentosView({
  patient,
  doctorCrms,
  doctorRqes,
  documents,
  templates,
  initialModelId,
}: {
  patient: { id: string; name: string; cpf: string | null };
  doctorCrms: DoctorCrm[];
  doctorRqes: DoctorRqe[];
  documents: MedicalDocument[];
  templates: DocumentTemplate[];
  initialModelId?: string;
}) {
  const docTemplates = templates.filter((t) => t.kind === "DOCUMENTO");
  const guidanceTemplates = templates.filter((t) => t.kind === "ORIENTACAO");
  const allModels = [...DOC_MODELS, ...docTemplates.map(templateToModel)];

  const [modelId, setModelId] = useState(initialModelId ?? DOC_MODELS[0].id);
  const model = allModels.find((m) => m.id === modelId) ?? allModels[0];
  const [values, setValues] = useState<Record<string, string>>({});
  /** Texto editado à mão; nulo = segue o que o modelo monta a partir dos campos. */
  const [manualText, setManualText] = useState<string | null>(null);
  /** Título do modelo pronto em uso; nulo = o título do modelo da galeria. */
  const [readyTitle, setReadyTitle] = useState<string | null>(null);
  const [crmId, setCrmId] = useState((doctorCrms.find((c) => c.principal) ?? doctorCrms[0])?.id ?? "");
  const [rqeId, setRqeId] = useState(doctorRqes.find((r) => r.principal)?.id ?? "none");
  const [pending, startTransition] = useTransition();

  const generated = buildDocumentText(model, values, { paciente: patient.name, cpf: patient.cpf });
  const text = manualText ?? generated;
  const title = readyTitle ?? ((model.freeTitle && values.titulo_livre?.trim()) || model.label);

  const chooseModel = (id: string) => {
    setModelId(id);
    setValues({});
    setManualText(null);
    setReadyTitle(null);
  };

  const setValue = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));

  const issue = () => {
    if (!text.trim()) return;
    if (!window.confirm("Emitir este documento? Depois de emitido ele não pode ser alterado nem excluído.")) return;
    startTransition(async () => {
      const result = await issueMedicalDocument(patient.id, {
        kind: model.kind,
        model: model.id,
        title,
        content: text,
        data: values,
        crmId,
        rqeId: rqeId === "none" ? undefined : rqeId,
      });
      // Sem erro, a action já levou à página de impressão.
      if (result?.error) toast.error(result.error);
    });
  };

  const saveAsTemplate = () => {
    const name = window.prompt("Nome do modelo:", model.label);
    if (!name?.trim()) return;
    startTransition(async () => {
      const result = await saveDocumentTemplate(null, { kind: "DOCUMENTO", name: name.trim(), content: text });
      if (result.error) toast.error(result.error);
      else toast.success("Modelo salvo em \"Meus modelos\".");
    });
  };

  const visibleFields = model.fields.filter((f) => !f.showIf || f.showIf(values));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3">
        <Link href={`/pacientes/${patient.id}`} className="flex items-center gap-2 text-sm hover:underline">
          <User className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">Paciente:</span>
          <span className="font-semibold">{patient.name}</span>
        </Link>
        <Link
          href="/documentos"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" /> trocar paciente
        </Link>
      </div>

      {/* Galeria de modelos */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {allModels.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => chooseModel(m.id)}
            aria-pressed={m.id === model.id}
            className={`rounded-xl border p-3 text-left transition-colors ${
              m.id === model.id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-accent/40"
            }`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wide text-primary">{KIND_LABEL[m.kind]}</div>
            <div className="text-sm font-medium text-foreground">
              {m.label}
              {m.id.startsWith("tpl:") && (
                <span className="ml-1 rounded bg-primary/10 px-1 text-[10px] text-primary">meu modelo</span>
              )}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">{m.descricao}</div>
          </button>
        ))}
      </div>

      <MyTemplatesManager templates={docTemplates} />

      <div className="rounded-2xl border border-border bg-card p-5">
        <CidPicker
          value={values.cid ?? ""}
          onChange={(v) => setValue("cid", v)}
          label="CID-10 (opcional)"
          hint="Busca em toda a CID-10. Informe o código somente com autorização do paciente."
        />
      </div>

      {visibleFields.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <DocumentFields fields={visibleFields} values={values} onChange={setValue} />
        </div>
      )}

      {/* Texto final */}
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
          rows={12}
          value={text}
          onChange={(e) => setManualText(e.target.value)}
          placeholder="Escreva o documento…"
        />
      </div>

      {/* Logo abaixo do texto, que é onde a orientação escolhida entra
          (pedido de 23/10/2026). */}
      <ReadyGuidance
        patientName={patient.name}
        templates={guidanceTemplates}
        onUse={(t, readyName) => {
          // Orientação pronta é um documento de orientação, com o título dela,
          // mesmo que outro modelo da galeria estivesse selecionado.
          chooseModel("orientacoes");
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
        <Button variant="outline" disabled={!text.trim() || pending} onClick={saveAsTemplate}>
          <BookmarkPlus className="mr-1.5 h-4 w-4" /> Salvar como meu modelo
        </Button>
        <Button onClick={issue} disabled={!text.trim() || pending}>
          {pending ? "Emitindo…" : "Emitir e imprimir"}
        </Button>
      </div>
      <p className="text-right text-xs text-muted-foreground">
        Documento emitido é definitivo: não pode ser alterado nem excluído. Para corrigir, emita outro.
      </p>

      {documents.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Documentos do paciente</h2>
          {documents.map((d) => (
            <DocumentRow key={d.id} patientId={patient.id} document={d} />
          ))}
        </div>
      )}
    </div>
  );
}
