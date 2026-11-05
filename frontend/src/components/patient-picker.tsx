"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Search, UserPlus, X } from "lucide-react";
import { quickCreatePatient, searchPatients } from "@/app/actions/pacientes";
import type { Patient } from "@/lib/api";
import { formatCpf } from "@/lib/cpf";

/**
 * Seletor de paciente por busca. Substituiu um <select> que carregava a base
 * inteira — inutilizável (e pesado) a partir de algumas centenas de pacientes.
 * O id escolhido vai num input hidden, então o form action continua igual.
 *
 * Quem ainda não é paciente pode ser cadastrado aqui mesmo, só com o nome
 * digitado na busca — pedido da cliente, que tinha de sair da agenda para
 * criar o paciente antes de marcar. O resto do cadastro vem depois.
 *
 * Com `onSelect`, quem decide o que fazer com o paciente é o chamador (em
 * Prontuários modelo, navegar) e não há cadastro rápido nem input hidden.
 */
export function PatientPicker({
  name,
  required,
  onSelect,
  placeholder = "Buscar paciente por nome ou CPF",
}: {
  name?: string;
  required?: boolean;
  onSelect?: (patient: Patient) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [creating, startCreate] = useTransition();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }

    // Debounce: só consulta depois que o usuário para de digitar.
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        setResults(await searchPatients(q));
        setOpen(true);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, selected]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const typedName = query.trim();
  // Busca por CPF não vira nome de paciente novo.
  const canCreate = !onSelect && typedName.length >= 2 && !/^[\d.\-\s]+$/.test(typedName);

  function choose(patient: Patient) {
    setOpen(false);
    if (onSelect) {
      onSelect(patient);
      return;
    }
    setSelected(patient);
  }

  function createFromQuery() {
    startCreate(async () => {
      const result = await quickCreatePatient(typedName);
      if (result.error || !result.patient) {
        toast.error(result.error ?? "Não foi possível cadastrar o paciente.");
        return;
      }
      toast.success("Paciente cadastrado só com o nome. Complete o cadastro depois pela ficha ou pelo link.");
      setSelected(result.patient);
      setOpen(false);
    });
  }

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2">
        {name && <input type="hidden" name={name} value={selected.id} />}
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{selected.name}</div>
          {selected.cpf ? (
            <div className="truncate text-xs text-muted-foreground">{formatCpf(selected.cpf)}</div>
          ) : (
            <div className="truncate text-xs text-muted-foreground">Sem CPF cadastrado</div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setSelected(null);
            setQuery("");
            setResults([]);
          }}
          className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
          aria-label="Trocar paciente"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      {required && name && <input type="hidden" name={name} value="" />}
      <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {open && query.trim() && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border bg-card shadow-md">
          {searching && <div className="px-3 py-2 text-xs text-muted-foreground">Buscando…</div>}
          {!searching && results.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum paciente encontrado.</div>
          )}
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => choose(p)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent/40"
            >
              <span className="truncate">{p.name}</span>
              {p.cpf && (
                <span className="shrink-0 text-xs text-muted-foreground">{formatCpf(p.cpf)}</span>
              )}
            </button>
          ))}
          {!searching && canCreate && (
            <button
              type="button"
              onClick={createFromQuery}
              disabled={creating}
              className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-sm text-primary transition-colors hover:bg-accent/40 disabled:opacity-60"
            >
              <UserPlus className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {creating ? "Cadastrando…" : <>Cadastrar &ldquo;{typedName}&rdquo; como novo paciente</>}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
