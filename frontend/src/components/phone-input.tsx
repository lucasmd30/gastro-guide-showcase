"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

/**
 * Máscara de telefone brasileiro com DDD entre parênteses —
 * `(11) 99999-8888` ou `(11) 3333-4444`. Aceita colar em qualquer formato:
 * só os dígitos são considerados.
 *
 * <p>O valor vai para o backend do jeito que foi digitado (a coluna guarda
 * texto livre, e a busca compara telefone cru), então a máscara é de
 * verdade o formato gravado — e é o que a cliente pediu para ler na tela.
 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  // Celular tem 9 dígitos (5+4); fixo tem 8 (4+4).
  const split = rest.length > 8 ? 5 : 4;
  if (rest.length <= split) return `(${ddd}) ${rest}`;
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

export function PhoneInput({
  name,
  defaultValue,
  placeholder = "(11) 99999-8888",
  required,
}: {
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  required?: boolean;
}) {
  const [value, setValue] = useState(() => formatPhone(defaultValue ?? ""));

  return (
    <Input
      name={name}
      value={value}
      onChange={(e) => setValue(formatPhone(e.target.value))}
      placeholder={placeholder}
      inputMode="tel"
      autoComplete="off"
      required={required}
    />
  );
}
