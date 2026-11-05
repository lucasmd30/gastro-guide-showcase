"use client";

import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

/**
 * "Plano" de um agendamento por convênio: escolhido na lista de convênios
 * que o médico cadastrou em "Meu perfil" — a mesma do link de consulta.
 *
 * Um plano já gravado que saiu da lista continua aparecendo como opção, para
 * editar a contratação não apagar o que estava lá. Sem nenhum convênio no
 * perfil, o campo volta a ser texto livre, para a agenda nunca travar.
 */
export function HealthPlanField({
  plans,
  value,
  onChange,
  name,
  className,
}: {
  plans: string[];
  value: string;
  onChange: (value: string) => void;
  name?: string;
  className?: string;
}) {
  const options = value && !plans.includes(value) ? [...plans, value] : plans;

  if (options.length === 0) {
    return (
      <Input
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Plano"
        maxLength={120}
        className={className}
      />
    );
  }

  return (
    <NativeSelect name={name} value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      <option value="" disabled>
        Selecione o plano
      </option>
      {options.map((plan) => (
        <option key={plan} value={plan}>
          {plan}
        </option>
      ))}
    </NativeSelect>
  );
}
