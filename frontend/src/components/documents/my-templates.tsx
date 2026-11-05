"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { BookMarked, Pencil, Trash2 } from "lucide-react";
import { deleteDocumentTemplate, saveDocumentTemplate } from "@/app/actions/documentos";
import type { DocumentTemplate } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToolPanel } from "./tool-panel";

/**
 * "Meus modelos de documento" (o `MeusModelosManager` do protótipo): textos
 * que o médico usa sempre e quer reusar em qualquer paciente. Aparecem na
 * galeria de modelos com o selo "meu modelo". A lista volta atualizada pelo
 * revalidatePath das actions.
 */
export function MyTemplatesManager({ templates }: { templates: DocumentTemplate[] }) {
  const [editing, setEditing] = useState<DocumentTemplate | null>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setEditing(null);
    setName("");
    setContent("");
    setOpen(false);
  };

  const submit = () =>
    startTransition(async () => {
      const result = await saveDocumentTemplate(editing?.id ?? null, { kind: "DOCUMENTO", name, content });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Modelo salvo.");
      reset();
    });

  const remove = (template: DocumentTemplate) => {
    if (!window.confirm(`Excluir o modelo "${template.name}"?`)) return;
    startTransition(async () => {
      const result = await deleteDocumentTemplate(template.id);
      if (result.error) toast.error(result.error);
      else toast.success("Modelo excluído.");
    });
  };

  return (
    <ToolPanel
      title={`Meus modelos de documento (${templates.length})`}
      description="Crie textos que você usa sempre (ex.: orientações nutricionais na cirrose) e reutilize em qualquer paciente."
      icon={<BookMarked className="h-4 w-4 text-primary" />}
    >
      {!open && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          + Novo modelo
        </Button>
      )}

      {open && (
        <div className="space-y-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
          <div>
            <Label className="text-xs">Nome do modelo</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Orientações nutricionais — cirrose" />
          </div>
          <div>
            <Label className="text-xs">Conteúdo</Label>
            <Textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escreva o texto do documento…"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={reset}>
              Cancelar
            </Button>
            <Button size="sm" onClick={submit} disabled={pending}>
              {editing ? "Salvar alterações" : "Criar modelo"}
            </Button>
          </div>
        </div>
      )}

      {templates.length > 0 && (
        <div className="mt-4 space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
              <button
                type="button"
                title="Editar"
                aria-label={`Editar ${t.name}`}
                className="text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setEditing(t);
                  setName(t.name);
                  setContent(t.content);
                  setOpen(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Excluir"
                aria-label={`Excluir ${t.name}`}
                className="text-muted-foreground hover:text-destructive"
                disabled={pending}
                onClick={() => remove(t)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </ToolPanel>
  );
}
