/**
 * Contato obrigatório do link público (pedido da clínica, 08/10/2026): nome
 * completo, telefone com DDD e e-mail. Mesma regra de
 * IntakeService.requireContact no backend — aqui é só o feedback rápido,
 * usado tanto no passo do formulário (cliente) quanto na Server Action.
 */
export function patientContactError(fields: { name?: string; phone?: string; email?: string }): string | null {
  if (!fields.name?.trim()) return "Preencha o nome completo.";
  if ((fields.phone ?? "").replace(/\D/g, "").length < 10) return "Preencha o telefone com DDD.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((fields.email ?? "").trim())) return "Preencha um e-mail válido.";
  return null;
}

/** O cadastro já tem o que o link exige? Senão, o paciente precisa passar pelo formulário. */
export function hasPatientContact(patient: { name: string; phone: string | null; email: string | null }): boolean {
  return patientContactError({ name: patient.name, phone: patient.phone ?? "", email: patient.email ?? "" }) === null;
}
