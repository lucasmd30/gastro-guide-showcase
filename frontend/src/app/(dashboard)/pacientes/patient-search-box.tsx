"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { searchPatients } from "@/app/actions/pacientes";
import type { Patient } from "@/lib/api";
import { formatCpf } from "@/lib/cpf";
import { Button } from "@/components/ui/button";

/**
 * Busca da aba Pacientes com sugestões enquanto digita (pedido da cliente).
 * Escolher uma sugestão abre a ficha do paciente direto; Enter sem sugestão
 * destacada continua sendo a busca por GET de sempre, que filtra a lista
 * paginada pela URL.
 */
export function PatientSearchBox({ query }: { query: string }) {
  const router = useRouter();
  const [value, setValue] = useState(query);
  const [suggestions, setSuggestions] = useState<Patient[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const boxRef = useRef<HTMLFormElement>(null);
  // Só busca sugestões depois que a pessoa digita — não ao abrir a página já
  // com ?q= preenchido, senão o dropdown apareceria por cima do resultado.
  const typedRef = useRef(false);

  useEffect(() => {
    const q = value.trim();
    if (!typedRef.current || q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const found = await searchPatients(q);
      if (cancelled) return;
      setSuggestions(found);
      setHighlighted(-1);
      setOpen(true);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === "Enter" && highlighted >= 0) {
      event.preventDefault();
      setOpen(false);
      router.push(`/pacientes/${suggestions[highlighted].id}`);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    // Busca por GET: a query vai pra URL e o servidor devolve só a página pedida.
    <form
      ref={boxRef}
      action="/pacientes"
      method="get"
      onSubmit={() => setOpen(false)}
      className="relative flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2"
    >
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      <input
        name="q"
        value={value}
        onChange={(e) => {
          typedRef.current = true;
          setValue(e.target.value);
        }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Buscar por nome, CPF, telefone ou e-mail"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls="patient-suggestions"
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      {query && (
        <Link href="/pacientes" className="shrink-0 text-xs text-muted-foreground hover:text-foreground">
          limpar
        </Link>
      )}
      <Button type="submit" variant="ghost" size="sm">
        Buscar
      </Button>

      {open && (
        <div
          id="patient-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-border bg-card shadow-md"
        >
          {suggestions.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum paciente encontrado.</div>
          )}
          {suggestions.map((p, i) => (
            <Link
              key={p.id}
              href={`/pacientes/${p.id}`}
              role="option"
              aria-selected={i === highlighted}
              onMouseEnter={() => setHighlighted(i)}
              onClick={() => setOpen(false)}
              className={`flex items-center justify-between gap-2 px-3 py-2 text-sm transition-colors ${
                i === highlighted ? "bg-accent/60" : "hover:bg-accent/40"
              }`}
            >
              <span className="truncate">{p.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{p.cpf ? formatCpf(p.cpf) : "—"}</span>
            </Link>
          ))}
        </div>
      )}
    </form>
  );
}
