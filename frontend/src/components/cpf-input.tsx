"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { formatCpf } from "@/lib/cpf";

/** Input de CPF com máscara em tempo real (XXX.XXX.XXX-YY) — aceita colar ou digitar em qualquer formato. */
export function CpfInput({ defaultValue = "" }: { defaultValue?: string | null }) {
  const [value, setValue] = useState(() => formatCpf(defaultValue ?? ""));

  return (
    <Input
      name="cpf"
      inputMode="numeric"
      autoComplete="off"
      placeholder="000.000.000-00"
      value={value}
      onChange={(e) => setValue(formatCpf(e.target.value))}
      maxLength={14}
    />
  );
}
