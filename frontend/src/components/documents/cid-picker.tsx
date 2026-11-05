"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Busca em toda a CID-10 (capítulos, categorias e subcategorias do DATASUS,
 * 14.496 códigos) — o `CidPicker` do protótipo Lovable. A lista é um JSON
 * estático em /public (~1 MB), baixado só quando a tela de documentos abre e
 * guardado em memória; não passa pelo backend.
 */

interface CidEntry {
  code: string;
  desc: string;
}

let cache: CidEntry[] | null = null;
let inflight: Promise<CidEntry[]> | null = null;

function loadCid10(): Promise<CidEntry[]> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = fetch("/cid10.json")
    .then((r) => r.json() as Promise<string[]>)
    .then((rows) => {
      cache = rows.map((row) => {
        const i = row.indexOf("|");
        return { code: row.slice(0, i), desc: row.slice(i + 1) };
      });
      return cache;
    })
    .catch(() => {
      // Sem a lista, a busca só mostra "nenhum código"; tentar de novo na próxima abertura.
      inflight = null;
      return [];
    });
  return inflight;
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** O valor é "K21.0 — Doença de refluxo…", como no protótipo. */
export function CidPicker({
  value,
  onChange,
  label = "CID-10",
  hint,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  hint?: string;
}) {
  const [all, setAll] = useState<CidEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCid10().then((rows) => {
      setAll(rows);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Código que começa com o termo vem antes de descrição que o contém.
  const results = useMemo(() => {
    const term = norm(q.trim());
    if (term.length < 2) return [];
    const byCode: CidEntry[] = [];
    const byDesc: CidEntry[] = [];
    for (const e of all) {
      if (norm(e.code).startsWith(term)) byCode.push(e);
      else if (norm(e.desc).includes(term)) byDesc.push(e);
      if (byCode.length + byDesc.length > 400) break;
    }
    return [...byCode, ...byDesc].slice(0, 60);
  }, [q, all]);

  const [code, ...rest] = value.split(" — ");

  return (
    <div ref={boxRef} className="relative">
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {value ? (
        <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
          <span className="font-semibold text-primary">{code}</span>
          <span className="flex-1 truncate text-foreground">{rest.join(" — ")}</span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            aria-label="Remover CID"
            onClick={() => onChange("")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            value={q}
            placeholder="Buscar por código ou doença (ex.: K21, cirrose)…"
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
          />
        </div>
      )}
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}

      {open && !value && results.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg">
          {results.map((e) => (
            <button
              key={e.code}
              type="button"
              className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => {
                onChange(`${e.code} — ${e.desc}`);
                setQ("");
                setOpen(false);
              }}
            >
              <span className="min-w-14 font-mono text-xs font-semibold text-primary">{e.code}</span>
              <span className="flex-1 text-foreground">{e.desc}</span>
            </button>
          ))}
        </div>
      )}
      {open && !value && q.trim().length >= 2 && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-lg">
          {loaded ? "Nenhum código encontrado." : "Carregando CID-10…"}
        </div>
      )}
    </div>
  );
}
