"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ClipboardList, Copy, ExternalLink, Search, Sparkles, Star, X } from "lucide-react";
import { issueMedicalDocumentInline } from "@/app/actions/documentos";
import { deleteExamCombo, saveExamCombo, setExamFavorite } from "@/app/actions/exames";
import type { DoctorCrm, DoctorRqe, ExamCombo, ExamPreferences, MedicalDocument } from "@/lib/api";
import { examCatalog, examCombos, type Combo } from "@/lib/exam-catalog";
import { tussCode, withTuss } from "@/lib/tuss";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CollapsibleSection } from "@/components/collapsible-section";
import { CidPicker } from "@/components/documents/cid-picker";

/**
 * Solicitação de exames — o `ExamOrder` do protótipo Lovable: combos por
 * doença (revisados item a item antes de entrar), catálogo com busca, exame
 * digitado fora do catálogo, CID-10, indicação, preparo e TUSS opcional.
 *
 * Duas diferenças de propósito: (1) o "Concluir pedido" de lá abria um
 * diálogo com nome/CRM digitados e assinatura desenhada, sem gravar nada;
 * aqui o pedido é emitido como documento "Solicitação de exames" do paciente,
 * com as regras dos outros documentos (definitivo, CRM/RQE congelados, folha
 * com código de verificação e assinatura ICP-Brasil pelo PDF); (2) "Meus
 * combos" e favoritos ficam na conta do médico, não no navegador.
 *
 * O estado mora aqui, fora do card: recolher o card não perde o pedido.
 */

const examToCategory = new Map<string, string>();
for (const c of examCatalog) for (const i of c.items) examToCategory.set(i, c.category);

/** Rótulo do grupo dos exames digitados fora do catálogo. */
const CUSTOM_CATEGORY = "Outros";

/** Tem que caber no `data` do documento (5000 caracteres por campo no backend). */
const MAX_EXAMS_CHARS = 5000;

/** Busca sem acento, como a de pacientes e a de escalas. */
function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Combo do catálogo ou próprio; o próprio tem `id`. */
type AnyCombo = Combo & { id?: string };

const BUILT_IN_NAMES = new Set(examCombos.map((c) => norm(c.name)));

export function ExamOrder({
  patient,
  doctorCrms,
  doctorRqes,
  preferences,
  collapsible = false,
}: {
  /** Nulo na visualização do modelo: o pedido monta, mas não emite. */
  patient: { id: string; name: string } | null;
  doctorCrms: DoctorCrm[];
  doctorRqes: DoctorRqe[];
  preferences: ExamPreferences;
  /** No atendimento, o pedido fica num card recolhível como os outros. */
  collapsible?: boolean;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const selected = useMemo(() => new Set(picked), [picked]);
  const [query, setQuery] = useState("");
  const [openCat, setOpenCat] = useState<string | null>(null);

  const [personal, setPersonal] = useState<ExamCombo[]>(preferences.combos);
  const [favorites, setFavorites] = useState<string[]>(preferences.favorites);
  const [comboSearch, setComboSearch] = useState("");
  const [personalName, setPersonalName] = useState("");
  const [reviewing, setReviewing] = useState<AnyCombo | null>(null);
  const [comboPicked, setComboPicked] = useState<string[]>([]);

  const [cid, setCid] = useState("");
  const [indication, setIndication] = useState("");
  const [preparation, setPreparation] = useState("");
  const [includeTuss, setIncludeTuss] = useState(false);

  const [crmId, setCrmId] = useState((doctorCrms.find((c) => c.principal) ?? doctorCrms[0])?.id ?? "");
  const [rqeId, setRqeId] = useState(doctorRqes.find((r) => r.principal)?.id ?? "none");
  /** Emitidos nesta tela, para reabrir a impressão. */
  const [issued, setIssued] = useState<MedicalDocument[]>([]);
  const [pending, startTransition] = useTransition();

  const allCombos: AnyCombo[] = useMemo(() => {
    const term = norm(comboSearch.trim());
    return [...personal, ...examCombos]
      .filter((c) => norm(c.name).includes(term))
      .sort((a, b) => Number(favorites.includes(b.name)) - Number(favorites.includes(a.name)));
  }, [personal, favorites, comboSearch]);

  const toggle = (item: string) =>
    setPicked((cur) => (cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item]));

  const openCombo = (combo: AnyCombo) => {
    setReviewing(combo);
    setComboPicked([...combo.items]);
  };
  const toggleComboItem = (item: string) =>
    setComboPicked((cur) => (cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item]));

  const addFromCombo = () => {
    setPicked((cur) => [...cur, ...comboPicked.filter((i) => !cur.includes(i))]);
    setReviewing(null);
    toast.success("Combo adicionado à requisição.");
  };

  const toggleFavorite = (name: string) => {
    const favorite = !favorites.includes(name);
    setFavorites((cur) => (favorite ? [...cur, name] : cur.filter((n) => n !== name)));
    startTransition(async () => {
      const result = await setExamFavorite(name, favorite);
      if (result.favorites) setFavorites(result.favorites);
      else {
        setFavorites((cur) => (favorite ? cur.filter((n) => n !== name) : [...cur, name]));
        toast.error(result.error ?? "Não foi possível salvar o favorito.");
      }
    });
  };

  const savePersonal = () => {
    const name = personalName.trim();
    if (!name || picked.length === 0) return;
    if (BUILT_IN_NAMES.has(norm(name)) || personal.some((c) => norm(c.name) === norm(name))) {
      toast.error("Já existe um combo com esse nome.");
      return;
    }
    startTransition(async () => {
      const result = await saveExamCombo(null, { name, items: picked });
      if (!result.combo) {
        toast.error(result.error ?? "Não foi possível salvar o combo.");
        return;
      }
      const combo = result.combo;
      setPersonal((cur) => [...cur, combo].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      setPersonalName("");
      toast.success("Combo salvo nos seus combos.");
    });
  };

  const updatePersonal = (combo: AnyCombo) => {
    if (!combo.id) return;
    const id = combo.id;
    startTransition(async () => {
      const result = await saveExamCombo(id, { name: combo.name, items: comboPicked });
      if (!result.combo) {
        toast.error(result.error ?? "Não foi possível atualizar o combo.");
        return;
      }
      const updated = result.combo;
      setPersonal((cur) => cur.map((c) => (c.id === id ? updated : c)));
      setReviewing(updated);
      toast.success("Combo atualizado.");
    });
  };

  const removePersonal = (combo: AnyCombo) => {
    if (!combo.id) return;
    if (!window.confirm(`Excluir o combo "${combo.name}"?`)) return;
    const id = combo.id;
    startTransition(async () => {
      const result = await deleteExamCombo(id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setPersonal((cur) => cur.filter((c) => c.id !== id));
      setFavorites((cur) => cur.filter((n) => n !== combo.name));
      setReviewing(null);
      toast.success("Combo excluído.");
    });
  };

  const filteredCatalog = useMemo(() => {
    const term = norm(query.trim());
    if (!term) return examCatalog;
    return examCatalog
      .map((c) => ({ ...c, items: c.items.filter((i) => norm(i).includes(term)) }))
      .filter((c) => c.items.length > 0);
  }, [query]);

  /** Selecionados por categoria, na ordem do catálogo; digitados no fim. */
  const grouped = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const e of picked) {
      const cat = examToCategory.get(e) ?? CUSTOM_CATEGORY;
      map.set(cat, [...(map.get(cat) ?? []), e]);
    }
    const sortPt = (items: string[]) => [...items].sort((a, b) => a.localeCompare(b, "pt-BR"));
    const out = examCatalog
      .filter((c) => map.has(c.category))
      .map((c) => ({ cat: c.category, items: sortPt(map.get(c.category)!) }));
    const custom = map.get(CUSTOM_CATEGORY);
    if (custom) out.push({ cat: CUSTOM_CATEGORY, items: sortPt(custom) });
    return out;
  }, [picked]);

  const customExams = useMemo(
    () => picked.filter((p) => !examToCategory.has(p)).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [picked],
  );

  /** O corpo do pedido — a folha do documento já imprime título, paciente e data. */
  const body = useMemo(() => {
    if (picked.length === 0) return "";
    const lines: string[] = [];
    if (cid.trim()) lines.push(`CID-10: ${cid.trim()}`, "");
    if (indication.trim()) lines.push(`Indicação clínica: ${indication.trim()}`, "");
    for (const g of grouped) {
      lines.push(g.cat.toUpperCase());
      g.items.forEach((i) => lines.push(`  • ${includeTuss ? withTuss(i) : i}`));
      lines.push("");
    }
    if (preparation.trim()) lines.push("ORIENTAÇÕES DE COLETA / PREPARO", preparation.trim());
    return lines.join("\n").trim();
  }, [picked, grouped, cid, indication, preparation, includeTuss]);

  const copy = async () => {
    if (!body) {
      toast.error("Nenhum exame selecionado.");
      return;
    }
    await navigator.clipboard.writeText(`SOLICITAÇÃO DE EXAMES\n\n${body}`);
    toast.success("Pedido copiado.");
  };

  const clearAll = () => setPicked([]);

  const printUrl = (doc: MedicalDocument) => `/documentos/${doc.id}?paciente=${patient?.id}`;

  const issue = () => {
    if (!patient || !body) return;
    const exams = picked.join("\n");
    if (exams.length > MAX_EXAMS_CHARS) {
      toast.error("Pedido grande demais para um documento só — divida em dois.");
      return;
    }
    if (!window.confirm("Emitir esta solicitação? Depois de emitida ela não pode ser alterada nem excluída.")) return;
    // A aba é aberta ainda dentro do clique — depois do await o navegador a
    // trataria como pop-up e bloquearia.
    const tab = window.open("about:blank", "_blank");
    startTransition(async () => {
      const result = await issueMedicalDocumentInline(patient.id, {
        kind: "SOLICITACAO",
        model: "pedido_exames",
        title: "Solicitação de exames",
        content: body,
        data: {
          exames: exams,
          cid,
          indicacao: indication,
          preparo: preparation,
          tuss: includeTuss ? "sim" : "",
        },
        crmId,
        rqeId: rqeId === "none" ? undefined : rqeId,
      });
      if (!result.document) {
        tab?.close();
        toast.error(result.error ?? "Não foi possível emitir a solicitação.");
        return;
      }
      const doc = result.document;
      if (tab) tab.location.href = printUrl(doc);
      setIssued((cur) => [doc, ...cur]);
      setPicked([]);
      setCid("");
      setIndication("");
      setPreparation("");
      toast.success(tab ? "Solicitação emitida — a impressão abriu em outra aba." : "Solicitação emitida.");
    });
  };

  const isPersonal = (c: AnyCombo) => !!c.id;

  const content = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ClipboardList className="h-4 w-4 text-primary" /> Exames selecionados
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{picked.length}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {picked.length > 0 && (
            <Button type="button" size="sm" variant="ghost" onClick={clearAll} className="gap-1.5 text-muted-foreground">
              <X className="h-3.5 w-3.5" /> Limpar
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" onClick={copy} className="gap-1.5">
            <Copy className="h-3.5 w-3.5" /> Copiar prévia
          </Button>
        </div>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Combos rápidos
        </p>
        <Input
          value={comboSearch}
          onChange={(e) => setComboSearch(e.target.value)}
          placeholder="Buscar combo por doença…"
          className="mb-2"
        />
        <div className="flex max-h-48 flex-wrap gap-1.5 overflow-auto">
          {allCombos.map((c) => (
            <Button
              key={c.id ?? c.name}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openCombo(c)}
              className="h-auto whitespace-normal py-1 text-left text-xs"
            >
              {favorites.includes(c.name) ? "★ " : "+ "}
              {c.name}
              {isPersonal(c) && <span className="ml-1 text-muted-foreground">(meu)</span>}
            </Button>
          ))}
          {allCombos.length === 0 && <p className="text-xs text-muted-foreground">Nenhum combo com esse nome.</p>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input
            value={personalName}
            onChange={(e) => setPersonalName(e.target.value)}
            placeholder="Nome do meu combo (com os exames selecionados)"
            className="min-w-0 flex-1"
            maxLength={100}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!personalName.trim() || picked.length === 0 || pending}
            onClick={savePersonal}
          >
            Salvar combo
          </Button>
        </div>
      </div>

      <CidPicker
        value={cid}
        onChange={setCid}
        label="CID-10 (opcional)"
        hint="Informe somente com autorização do paciente; será incluído no pedido."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-xs font-medium">
          <span>Indicação clínica</span>
          <Textarea value={indication} onChange={(e) => setIndication(e.target.value)} rows={2} maxLength={2000} />
        </label>
        <label className="block space-y-1 text-xs font-medium">
          <span>Orientações de coleta / preparo</span>
          <Textarea value={preparation} onChange={(e) => setPreparation(e.target.value)} rows={2} maxLength={2000} />
        </label>
      </div>
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          className="mt-0.5 accent-primary"
          checked={includeTuss}
          onChange={(e) => setIncludeTuss(e.target.checked)}
        />
        Incluir códigos TUSS do catálogo — conferir na tabela vigente antes da emissão.
      </label>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar exame por nome…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="rounded-xl border border-border">
        {filteredCatalog.map((c) => {
          const isOpen = openCat === c.category || !!query.trim();
          const selectedInCat = c.items.filter((i) => selected.has(i)).length;
          return (
            <div key={c.category} className="border-b border-border last:border-0">
              <button
                type="button"
                onClick={() => setOpenCat(isOpen && !query.trim() ? null : c.category)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium hover:bg-muted/50"
              >
                <span>
                  {c.category} <span className="text-xs text-muted-foreground">({c.items.length})</span>
                </span>
                {selectedInCat > 0 && (
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {selectedInCat}
                  </span>
                )}
              </button>
              {isOpen && (
                <div className="grid gap-1 px-3 pb-3 sm:grid-cols-2 lg:grid-cols-3">
                  {c.items.map((item) => {
                    const checked = selected.has(item);
                    return (
                      <label
                        key={item}
                        className="flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 text-xs transition-colors hover:bg-muted"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 accent-primary"
                          checked={checked}
                          onChange={() => toggle(item)}
                        />
                        <span className={checked ? "text-foreground" : "text-muted-foreground"}>{item}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {filteredCatalog.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-3 py-4 text-center">
            <p className="text-xs text-muted-foreground">Nenhum exame encontrado para “{query.trim()}”.</p>
            <button
              type="button"
              onClick={() => {
                const item = query.trim();
                if (!item) return;
                setPicked((cur) => (cur.includes(item) ? cur : [...cur, item]));
                setQuery("");
                toast.success(`“${item}” adicionado ao pedido.`);
              }}
              className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10"
            >
              + Adicionar “{query.trim()}” assim mesmo
            </button>
          </div>
        )}
      </div>

      {customExams.length > 0 && (
        <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
            Exames adicionados manualmente
          </p>
          <div className="flex flex-wrap gap-1.5">
            {customExams.map((e) => (
              <span
                key={e}
                className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-xs text-foreground shadow-sm"
              >
                {e}
                <button
                  type="button"
                  onClick={() => toggle(e)}
                  aria-label={`Remover ${e}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {picked.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prévia do pedido</p>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-muted p-3 font-sans text-xs leading-relaxed text-muted-foreground">
            {body}
          </pre>
        </div>
      )}

      {patient ? (
        <>
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
            <Button type="button" size="sm" onClick={issue} disabled={picked.length === 0 || pending}>
              {pending ? "Emitindo…" : "Emitir e imprimir"}
            </Button>
          </div>
          <p className="text-right text-xs text-muted-foreground">
            A solicitação vira um documento do paciente e é definitiva. Para corrigir, emita outra.
          </p>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          Escolha o paciente acima para emitir a solicitação. Os combos e o catálogo já podem ser consultados.
        </p>
      )}

      {issued.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">Emitidas agora</p>
          {issued.map((d) => (
            <a
              key={d.id}
              href={printUrl(d)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent/40"
            >
              <span className="flex min-w-0 items-center gap-2">
                <ClipboardList className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="font-medium">{d.title}</span>
                <span className="truncate text-muted-foreground">
                  {(d.data?.exames ?? "").split("\n").filter(Boolean).length} exame(s)
                </span>
              </span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </a>
          ))}
        </div>
      )}

      <Sheet open={!!reviewing} onOpenChange={(open) => !open && setReviewing(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {reviewing && (
            <ComboReview
              combo={reviewing}
              picked={comboPicked}
              setPicked={setComboPicked}
              onToggle={toggleComboItem}
              favorite={favorites.includes(reviewing.name)}
              onToggleFavorite={() => toggleFavorite(reviewing.name)}
              onAdd={addFromCombo}
              onUpdate={isPersonal(reviewing) ? () => updatePersonal(reviewing) : undefined}
              onDelete={isPersonal(reviewing) ? () => removePersonal(reviewing) : undefined}
              pending={pending}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );

  if (!collapsible) return content;
  return (
    <CollapsibleSection title={`Solicitar exames${picked.length > 0 ? ` — ${picked.length} selecionado${picked.length > 1 ? "s" : ""}` : ""}`}>
      {patient && (
        <p className="text-xs text-muted-foreground">
          Combos por doença, busca no catálogo e impressão do pedido. Também em{" "}
          <Link href={`/solicitar-exames?paciente=${patient.id}`} target="_blank" className="text-primary hover:underline">
            Solicitar exames
          </Link>
          .
        </p>
      )}
      {content}
    </CollapsibleSection>
  );
}

/** Revisão do combo antes de entrar no pedido: painel básico, escolhas exclusivas e complementos. */
function ComboReview({
  combo,
  picked,
  setPicked,
  onToggle,
  favorite,
  onToggleFavorite,
  onAdd,
  onUpdate,
  onDelete,
  pending,
}: {
  combo: AnyCombo;
  picked: string[];
  setPicked: (fn: (cur: string[]) => string[]) => void;
  onToggle: (item: string) => void;
  favorite: boolean;
  onToggleFavorite: () => void;
  onAdd: () => void;
  onUpdate?: () => void;
  onDelete?: () => void;
  pending: boolean;
}) {
  const checkbox = (item: string): ReactNode => (
    <label key={item} className="flex items-start gap-2 py-1 text-sm">
      <input
        type="checkbox"
        className="mt-1 accent-primary"
        checked={picked.includes(item)}
        onChange={() => onToggle(item)}
      />
      <span>
        {item}
        {tussCode(item) && <span className="ml-1 text-xs text-muted-foreground">TUSS {tussCode(item)}</span>}
      </span>
    </label>
  );

  return (
    <div className="space-y-5">
      <SheetHeader>
        <SheetTitle>{combo.name}</SheetTitle>
        <SheetDescription>Revisão do painel — desmarque o que não for pedir.</SheetDescription>
      </SheetHeader>
      {combo.note && <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{combo.note}</p>}

      {combo.items.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold">{onUpdate ? "Exames do combo" : "Painel básico"}</h3>
          {combo.items.map(checkbox)}
        </div>
      )}

      {combo.choices?.map((choice) => (
        <fieldset key={choice.label} className="space-y-1">
          <legend className="mb-1 text-sm font-semibold">{choice.label}</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              className="accent-primary"
              name={choice.label}
              checked={!choice.items.some((i) => picked.includes(i))}
              onChange={() => setPicked((cur) => cur.filter((i) => !choice.items.includes(i)))}
            />
            Não incluir
          </label>
          {choice.items.map((item) => (
            <label key={item} className="flex items-center gap-2 py-1 text-sm">
              <input
                type="radio"
                className="accent-primary"
                name={choice.label}
                checked={picked.includes(item)}
                onChange={() => setPicked((cur) => [...cur.filter((i) => !choice.items.includes(i)), item])}
              />
              {item}
            </label>
          ))}
        </fieldset>
      ))}

      {!!combo.optional?.length && (
        <div>
          <h3 className="mb-1 text-sm font-semibold">Complementos conforme indicação</h3>
          {combo.optional.map(checkbox)}
        </div>
      )}

      <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onToggleFavorite} className="gap-1.5">
            <Star className={`h-3.5 w-3.5 ${favorite ? "fill-current text-amber-500" : ""}`} />
            {favorite ? "Remover favorito" : "Favoritar"}
          </Button>
          {onDelete && (
            <Button type="button" variant="destructive" size="sm" onClick={onDelete} disabled={pending}>
              Excluir combo
            </Button>
          )}
          {onUpdate && (
            <Button type="button" variant="outline" size="sm" onClick={onUpdate} disabled={picked.length === 0 || pending}>
              Salvar alterações
            </Button>
          )}
        </div>
        <Button type="button" size="sm" onClick={onAdd} disabled={picked.length === 0}>
          Adicionar {picked.length} exame(s)
        </Button>
      </div>
    </div>
  );
}
