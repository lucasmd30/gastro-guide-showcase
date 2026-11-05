import type { OfficeAddress } from "@/lib/api";

/** "01310100" → "01310-100"; aceita digitação parcial. */
export function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

/**
 * O endereço comercial em até duas linhas, pulando o que estiver vazio:
 * "Av. Paulista, 1000, cj. 42 — Bela Vista" e "São Paulo/SP · CEP 01310-100".
 * Sem nada preenchido, devolve lista vazia.
 */
export function officeAddressLines(address: OfficeAddress | null | undefined): string[] {
  if (!address) return [];
  const street = [address.street, address.number, address.complement].filter(Boolean).join(", ");
  const first = [street, address.district].filter(Boolean).join(" — ");
  const place = [address.city, address.state].filter(Boolean).join("/");
  const second = [place, address.cep ? `CEP ${formatCep(address.cep)}` : null].filter(Boolean).join(" · ");
  return [first, second].filter(Boolean);
}

/** "São Paulo/SP" para o "Local e data" do documento; nulo sem cidade. */
export function officeCityLabel(address: OfficeAddress | null | undefined): string | null {
  if (!address?.city) return null;
  return address.state ? `${address.city}/${address.state}` : address.city;
}
