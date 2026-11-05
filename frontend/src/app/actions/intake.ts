"use server";

import {
  completeIntakeRegistrationRequest,
  identifyIntakePatientRequest,
  listIntakeSlotsRequest,
  scheduleIntakeRequest,
  ApiError,
  type AppointmentBilling,
  type AppointmentModality,
  type AppointmentType,
  type AvailabilitySlot,
  type RegistrationDone,
  type ScheduledConsultation,
  type UpcomingConsultation,
} from "@/lib/api";
import { normalizeCpf, validateCpf } from "@/lib/cpf";
import { readPatientInput } from "@/lib/patient-input";
import { patientContactError } from "@/lib/patient-contact";

export interface IntakeFormState {
  error?: string;
  scheduled?: ScheduledConsultation;
}

export interface IdentifyState {
  error?: string;
  /** Preenchido só quando CPF e data de nascimento batem com um cadastro. */
  found?: { name: string; cpf: string; birthDate: string; upcoming: UpcomingConsultation | null };
  /** Os dois bateram com ninguém: o paciente segue pelo formulário completo. */
  notFound?: boolean;
}

/**
 * Fluxo de retorno: identifica o paciente por CPF + data de nascimento.
 *
 * Não achar não é erro — é o caminho de quem ainda não tem cadastro, que
 * segue pelo formulário completo. Tratar como erro também confirmaria pra
 * quem estivesse testando CPFs que aquele número não existe na base.
 */
export async function identifyPatient(
  token: string,
  _prevState: IdentifyState,
  formData: FormData,
): Promise<IdentifyState> {
  const rawCpf = String(formData.get("cpf") ?? "").trim();
  const cpf = rawCpf ? normalizeCpf(rawCpf) : "";
  if (!cpf) {
    return { error: "Preencha o CPF." };
  }
  const cpfError = validateCpf(cpf);
  if (cpfError) {
    return { error: cpfError };
  }

  const birthDate = String(formData.get("birthDate") ?? "").trim();
  if (!birthDate) {
    return { error: "Preencha a data de nascimento." };
  }

  try {
    const result = await identifyIntakePatientRequest(token, { cpf, birthDate });
    if (!result.found || !result.name || !result.cpf) {
      return { notFound: true };
    }
    return { found: { name: result.name, cpf: result.cpf, birthDate, upcoming: result.upcoming } };
  } catch (err) {
    if (err instanceof ApiError) {
      return { error: err.message };
    }
    throw err;
  }
}

/**
 * Cadastro e horário vão juntos numa chamada só — em duas etapas, um horário
 * tomado no meio do caminho deixaria o paciente cadastrado sem consulta.
 */
export async function submitIntake(
  token: string,
  _prevState: IntakeFormState,
  formData: FormData,
): Promise<IntakeFormState> {
  const { input, error } = readPatientInput(formData);
  if (error) {
    return { error };
  }

  // Retorno identificado reaproveita o cadastro como está (o backend nem
  // olha os campos), então só cobra contato de quem preencheu o formulário.
  if (formData.get("identified") !== "1") {
    const contactError = patientContactError(input);
    if (contactError) return { error: contactError };
  }

  const scheduledAt = String(formData.get("scheduledAt") ?? "");
  if (!scheduledAt) {
    return { error: "Escolha um horário para a consulta." };
  }

  const rawBilling = String(formData.get("billing") ?? "");
  if (rawBilling !== "PARTICULAR" && rawBilling !== "CONVENIO") {
    return { error: "Escolha entre particular e convênio." };
  }
  const billing: AppointmentBilling = rawBilling;
  const healthPlan = billing === "CONVENIO" ? String(formData.get("healthPlan") ?? "").trim() : "";
  if (billing === "CONVENIO" && !healthPlan) {
    return { error: "Escolha o seu convênio." };
  }

  const type: AppointmentType = formData.get("type") === "RETORNO" ? "RETORNO" : "PRIMEIRA_CONSULTA";
  const modality: AppointmentModality =
    formData.get("modality") === "TELECONSULTA" ? "TELECONSULTA" : "PRESENCIAL";

  try {
    const scheduled = await scheduleIntakeRequest(token, {
      patient: input,
      scheduledAt,
      type,
      modality,
      billing,
      healthPlan: healthPlan || null,
    });
    return { scheduled };
  } catch (err) {
    if (err instanceof ApiError) {
      return { error: err.message };
    }
    throw err;
  }
}

export interface RegistrationFormState {
  error?: string;
  done?: RegistrationDone;
}

/**
 * Só o cadastro: link de cadastro, ou consulta já marcada pela clínica. O
 * horário não passa por aqui — remarcar continua sendo com a clínica.
 */
export async function submitRegistration(
  token: string,
  _prevState: RegistrationFormState,
  formData: FormData,
): Promise<RegistrationFormState> {
  const { input, error } = readPatientInput(formData);
  if (error) {
    return { error };
  }
  const contactError = patientContactError(input);
  if (contactError) {
    return { error: contactError };
  }

  try {
    const done = await completeIntakeRegistrationRequest(token, input);
    return { done };
  } catch (err) {
    if (err instanceof ApiError) {
      return { error: err.message };
    }
    throw err;
  }
}

/**
 * Os horários dependem do tipo escolhido: primeira consulta e retorno têm
 * durações diferentes, então a grade muda quando o paciente decide.
 */
export async function listIntakeSlots(token: string, type: AppointmentType): Promise<AvailabilitySlot[]> {
  return listIntakeSlotsRequest(token, type);
}
