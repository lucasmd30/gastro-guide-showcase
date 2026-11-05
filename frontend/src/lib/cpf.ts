export function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

/** Formata dígitos de CPF como XXX.XXX.XXX-YY, aceitando entrada parcial (para máscara em tempo real). */
export function formatCpf(value: string): string {
  const digits = normalizeCpf(value).slice(0, 11);
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9)].filter(Boolean);
  let formatted = parts.join(".");
  if (digits.length > 9) {
    formatted += `-${digits.slice(9, 11)}`;
  }
  return formatted;
}

/** Mesma checagem de dígito verificador do backend (CpfValidator.java) — feedback rápido. */
export function validateCpf(cpf: string): string | null {
  if (cpf.length !== 11 || new Set(cpf.split("")).size === 1) {
    return "CPF inválido.";
  }

  const digits = cpf.split("").map(Number);

  const checkDigit = (length: number, firstWeight: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += digits[i] * (firstWeight - i);
    }
    const remainder = 11 - (sum % 11);
    return remainder >= 10 ? 0 : remainder;
  };

  if (checkDigit(9, 10) !== digits[9]) return "CPF inválido.";
  if (checkDigit(10, 11) !== digits[10]) return "CPF inválido.";

  return null;
}
