import "server-only";
import { normalizeCpf, validateCpf } from "@/lib/cpf";
import type { PatientInput } from "@/lib/api";

/** Lê os campos de identificação/contato de um FormData — compartilhado entre o cadastro autenticado e o formulário público de link de cadastro (nenhum dos dois inclui dado clínico aqui). */
export function readPatientInput(formData: FormData): { input: PatientInput; error?: string } {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { input: { name }, error: "Preencha o nome." };
  }

  const rawCpf = String(formData.get("cpf") ?? "").trim();
  const cpf = rawCpf ? normalizeCpf(rawCpf) : "";
  if (cpf) {
    const cpfError = validateCpf(cpf);
    if (cpfError) {
      return { input: { name }, error: cpfError };
    }
  }

  return {
    input: {
      name,
      cpf: cpf || undefined,
      phone: String(formData.get("phone") ?? "").trim() || undefined,
      phone2: String(formData.get("phone2") ?? "").trim() || undefined,
      email: String(formData.get("email") ?? "").trim() || undefined,
      birthDate: String(formData.get("birthDate") ?? "").trim() || undefined,
      birthplace: String(formData.get("birthplace") ?? "").trim() || undefined,
      origin: String(formData.get("origin") ?? "").trim() || undefined,
      address: String(formData.get("address") ?? "").trim() || undefined,
      motherName: String(formData.get("motherName") ?? "").trim() || undefined,
      sex: String(formData.get("sex") ?? "").trim() || undefined,
      profession: String(formData.get("profession") ?? "").trim() || undefined,
      maritalStatus: String(formData.get("maritalStatus") ?? "").trim() || undefined,
      religion: String(formData.get("religion") ?? "").trim() || undefined,
    },
  };
}
