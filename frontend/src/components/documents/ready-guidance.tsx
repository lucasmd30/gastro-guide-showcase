"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { HeartPulse, Plus, Trash2 } from "lucide-react";
import { deleteDocumentTemplate, saveDocumentTemplate } from "@/app/actions/documentos";
import type { DocumentTemplate } from "@/lib/api";
import { ORIENTACAO_GRUPOS, ORIENTACAO_MODELOS } from "@/lib/orientacoes-modelos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ToolPanel } from "./tool-panel";

/**
 * Modelos prontos de orientação ao paciente (o `OrientacoesProntas` do
 * protótipo): as orientações da cliente, por grupo, mais as que o médico
 * criar. "Usar modelo" joga o texto no documento, que fica editável.
 *
 * Os modelos prontos abrem com título e "Paciente:", que a folha do documento
 * já imprime: repetidos, a impressão parecia dois documentos num só (relato da
 * cliente, 04/11/2026). Por isso o título vai à parte e sai do texto.
 */
function splitBuiltIn(text: string): { title: string; body: string } {
  const [title, ...rest] = text.split("\n");
  return { title: title.trim(), body: rest.join("\n").replace(/^\s*Paciente:.*\n?/, "").trimStart() };
}

export function ReadyGuidance({
  patientName,
  templates,
  onUse,
  diseaseSlug,
}: {
  patientName: string;
  /** Dentro do prontuário: a orientação da doença aberta já vem escolhida, como no protótipo. */
  diseaseSlug?: string;
  /** Só os modelos próprios do tipo ORIENTACAO. */
  templates: DocumentTemplate[];
  /** O texto do documento e o título que a folha deve imprimir. */
  onUse: (text: string, title: string) => void;
}) {
  const [id, setId] = useState(
    () => ORIENTACAO_MODELOS.find((m) => diseaseSlug && m.doenca === diseaseSlug)?.id ?? "",
  );
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();

  const mine = templates.find((t) => `tpl:${t.id}` === id);
  const builtIn = ORIENTACAO_MODELOS.find((m) => m.id === id);
  const text = mine ? mine.content : builtIn ? builtIn.build(patientName) : "";

  const use = () => {
    if (mine) {
      onUse(mine.content, mine.name);
    } else if (builtIn) {
      const { title, body } = splitBuiltIn(text);
      onUse(body, title);
    }
  };

  const create = () =>
    startTransition(async () => {
      const result = await saveDocumentTemplate(null, { kind: "ORIENTACAO", name, content });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Modelo de orientação salvo.");
      setName("");
      setContent("");
      setCreating(false);
      if (result.template) setId(`tpl:${result.template.id}`);
    });

  const remove = () => {
    if (!mine || !window.confirm(`Excluir o modelo "${mine.name}"?`)) return;
    startTransition(async () => {
      const result = await deleteDocumentTemplate(mine.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Modelo excluído.");
      setId("");
    });
  };

  return (
    <ToolPanel
      title="Modelos prontos de orientação ao paciente"
      description="DRGE, dispepsia, H. pylori, celíaca, constipação, hemorroidas/fissura, cirrose, esteatose, hemocromatose, Wilson, EoE, FODMAP, semaglutida e vacinação no imunossuprimido — além dos seus próprios modelos."
      icon={<HeartPulse className="h-4 w-4 text-primary" />}
    >
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect value={id} onChange={(e) => setId(e.target.value)} className="min-w-0 flex-1">
          <option value="">Selecione uma orientação…</option>
          {templates.length > 0 && (
            <optgroup label="Meus modelos">
              {templates.map((t) => (
                <option key={t.id} value={`tpl:${t.id}`}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          )}
          {ORIENTACAO_GRUPOS.map((g) => (
            <optgroup key={g} label={g}>
              {ORIENTACAO_MODELOS.filter((m) => m.grupo === g).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </optgroup>
          ))}
        </NativeSelect>
        <Button size="sm" disabled={!text} onClick={use}>
          Usar modelo
        </Button>
        {mine && (
          <Button size="sm" variant="outline" disabled={pending} onClick={remove}>
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Excluir
          </Button>
        )}
        {!creating && (
          <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Novo modelo
          </Button>
        )}
      </div>

      {creating && (
        <div className="mt-3 space-y-2 rounded-xl border border-border bg-muted/30 p-3">
          <Input
            placeholder="Nome do modelo (ex.: Orientações pós-colonoscopia)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Textarea
            rows={8}
            placeholder="Escreva aqui o texto do modelo de orientação…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button size="sm" disabled={pending} onClick={create}>
              Salvar modelo
            </Button>
          </div>
        </div>
      )}

      {text && (
        <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-muted/40 p-3 font-sans text-xs text-muted-foreground">
          {text}
        </pre>
      )}
    </ToolPanel>
  );
}
