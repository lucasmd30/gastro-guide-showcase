import "server-only";

const API_URL = process.env.API_URL ?? "http://localhost:8080";

export interface DoctorCrm {
  id: string;
  crm: string;
  crmUf: string;
  principal: boolean;
}

export interface DoctorRqe {
  id: string;
  rqe: string;
  specialty: string;
  principal: boolean;
}

export interface Doctor {
  id: string;
  name: string;
  email: string;
  crms: DoctorCrm[];
  rqes: DoctorRqe[];
  phone: string | null;
  /** Endereço comercial, impresso no cabeçalho dos documentos (todos os campos opcionais). */
  officeAddress: OfficeAddress;
}

export interface OfficeAddress {
  /** Só dígitos. */
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
}

export interface Secretary {
  id: string;
  name: string;
  email: string;
  doctorId: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  role: "DOCTOR" | "SECRETARIA";
  doctor: Doctor | null;
  secretary: Secretary | null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError("Não foi possível conectar à API.", 0);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.message ?? "Erro inesperado na API.", response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  crm: string;
  crmUf: string;
  rqe?: string;
  specialty?: string;
  phone?: string;
}

export function signupRequest(data: SignupInput) {
  return apiFetch<AuthResponse>("/api/auth/cadastro", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface LoginInput {
  email: string;
  password: string;
}

export function loginRequest(data: LoginInput) {
  return apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function refreshRequest(refreshToken: string) {
  return apiFetch<AuthResponse>("/api/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export function logoutRequest(refreshToken: string) {
  return apiFetch<void>("/api/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export function meRequest(accessToken: string) {
  return apiFetch<Doctor>("/api/medicos/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export interface CurrentUser {
  role: "DOCTOR" | "SECRETARIA";
  name: string;
  email: string;
  doctorId: string | null;
}

export function currentUserRequest(accessToken: string) {
  return apiFetch<CurrentUser>("/api/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export interface CreateSecretaryInput {
  name: string;
  email: string;
  password: string;
}

export function listSecretariesRequest(accessToken: string) {
  return apiFetch<Secretary[]>("/api/medicos/me/secretarias", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function createSecretaryRequest(accessToken: string, data: CreateSecretaryInput) {
  return apiFetch<Secretary>("/api/medicos/me/secretarias", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}

export function resetSecretaryPasswordRequest(accessToken: string, secretaryId: string, password: string) {
  return apiFetch<void>(`/api/medicos/me/secretarias/${secretaryId}/senha`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ password }),
  });
}

export function removeSecretaryRequest(accessToken: string, secretaryId: string) {
  return apiFetch<void>(`/api/medicos/me/secretarias/${secretaryId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export interface UpdateProfileInput {
  name: string;
  phone?: string;
}

export function updateProfileRequest(accessToken: string, data: UpdateProfileInput) {
  return apiFetch<Doctor>("/api/medicos/me", {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}

export function updateOfficeAddressRequest(accessToken: string, data: Partial<OfficeAddress>) {
  return apiFetch<Doctor>("/api/medicos/me/endereco", {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}

export interface AddCrmInput {
  crm: string;
  crmUf: string;
}

export function addCrmRequest(accessToken: string, data: AddCrmInput) {
  return apiFetch<Doctor>("/api/medicos/me/crms", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}

export function removeCrmRequest(accessToken: string, crmId: string) {
  return apiFetch<Doctor>(`/api/medicos/me/crms/${crmId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function setCrmPrincipalRequest(accessToken: string, crmId: string) {
  return apiFetch<Doctor>(`/api/medicos/me/crms/${crmId}/principal`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}


/** Um convênio que o médico atende ("Meu perfil"). Alimenta o link de consulta. */
export interface DoctorHealthPlan {
  id: string;
  name: string;
}

export function listHealthPlansRequest(accessToken: string) {
  return apiFetch<DoctorHealthPlan[]>("/api/medicos/me/convenios", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function addHealthPlanRequest(accessToken: string, name: string) {
  return apiFetch<DoctorHealthPlan[]>("/api/medicos/me/convenios", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ name }),
  });
}

export function removeHealthPlanRequest(accessToken: string, planId: string) {
  return apiFetch<DoctorHealthPlan[]>(`/api/medicos/me/convenios/${planId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
/**
 * Os mesmos convênios, só os nomes, pela agenda: é a lista do "Plano" de um
 * agendamento por convênio, e a secretária também precisa dela.
 */
export function listAgendaHealthPlansRequest(accessToken: string) {
  return apiFetch<string[]>("/api/agenda/convenios", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export interface AddRqeInput {
  rqe: string;
  specialty: string;
}

export function addRqeRequest(accessToken: string, data: AddRqeInput) {
  return apiFetch<Doctor>("/api/medicos/me/rqes", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}

export function removeRqeRequest(accessToken: string, rqeId: string) {
  return apiFetch<Doctor>(`/api/medicos/me/rqes/${rqeId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function setRqePrincipalRequest(accessToken: string, rqeId: string) {
  return apiFetch<Doctor>(`/api/medicos/me/rqes/${rqeId}/principal`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export interface Patient {
  id: string;
  name: string;
  cpf: string | null;
  phone: string | null;
  phone2: string | null;
  email: string | null;
  birthDate: string | null;
  birthplace: string | null;
  origin: string | null;
  address: string | null;
  motherName: string | null;
  sex: string | null;
  profession: string | null;
  maritalStatus: string | null;
  religion: string | null;
  continuousMedications: string | null;
  notes: string | null;
}

export interface PatientInput {
  name: string;
  cpf?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  birthDate?: string;
  birthplace?: string;
  origin?: string;
  address?: string;
  motherName?: string;
  sex?: string;
  profession?: string;
  maritalStatus?: string;
  religion?: string;
  continuousMedications?: string;
  notes?: string;
}

export interface PatientPage {
  items: Patient[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface ListPatientsOptions {
  q?: string;
  page?: number;
  size?: number;
}

/**
 * Busca e paginação acontecem no servidor. Antes esta chamada devolvia a base
 * inteira e o filtro rodava no navegador — 1,6 MB por carregamento com 2.000
 * pacientes, em três telas diferentes.
 */
export interface DashboardKpi {
  value: number;
  /** Nulo = o período anterior foi zero, sem base de comparação. */
  deltaPercent: number | null;
}

export interface DashboardData {
  consultasMes: DashboardKpi;
  pacientesAtivos: DashboardKpi;
  retornosAgendados: DashboardKpi;
  linksPendentes: number;
  /** De segunda a domingo da semana atual. */
  consultasSemana: number[];
  distribuicao: { name: string; patients: number }[];
  proximos: { patientId: string; patientName: string; scheduledAt: string; type: string; status: string }[];
}

export function getDashboardRequest(accessToken: string) {
  return apiFetch<DashboardData>("/api/medicos/me/dashboard", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function listPatientsRequest(accessToken: string, options: ListPatientsOptions = {}) {
  const params = new URLSearchParams();
  if (options.q) params.set("q", options.q);
  if (options.page !== undefined) params.set("page", String(options.page));
  if (options.size !== undefined) params.set("size", String(options.size));
  const query = params.toString();

  return apiFetch<PatientPage>(`/api/pacientes${query ? `?${query}` : ""}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getPatientRequest(accessToken: string, patientId: string) {
  return apiFetch<Patient>(`/api/pacientes/${patientId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function createPatientRequest(accessToken: string, data: PatientInput) {
  return apiFetch<Patient>("/api/pacientes", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}

export function updatePatientRequest(accessToken: string, patientId: string, data: PatientInput) {
  return apiFetch<Patient>(`/api/pacientes/${patientId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}

export function deletePatientRequest(accessToken: string, patientId: string) {
  return apiFetch<void>(`/api/pacientes/${patientId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export interface PatientIntakeLink {
  token: string;
  expiresAt: string;
}

/**
 * CADASTRO: o paciente só preenche os dados. AGENDAMENTO: ele escolhe o
 * horário (a não ser que já tenha consulta marcada — aí vê a consulta).
 */
export type IntakeLinkPurpose = "CADASTRO" | "AGENDAMENTO";

/**
 * `patientId` ausente gera um link para paciente ainda não cadastrado. O tipo
 * da consulta não é mais enviado: quem escolhe é o paciente, dentro do link.
 */
export function createConsultationLinkRequest(
  accessToken: string,
  data: { patientId?: string; purpose: IntakeLinkPurpose },
) {
  return apiFetch<PatientIntakeLink>("/api/links-consulta", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}

export interface AvailabilityRule {
  id: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
}

export type Weekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export interface AvailabilitySlot {
  scheduledAt: string;
  durationMin: number;
}

export interface AvailabilityRuleInput {
  weekday: Weekday;
  startTime: string;
  endTime: string;
}

/** Quanto dura cada tipo de atendimento — é daqui que sai o tamanho de cada horário da grade. */
export interface AppointmentDurations {
  firstVisitMinutes: number;
  followUpMinutes: number;
  /** Valor padrão do particular, em centavos (nulo = sem valor padrão). */
  firstVisitPriceCents: number | null;
  followUpPriceCents: number | null;
}

export function getAppointmentDurationsRequest(accessToken: string) {
  return apiFetch<AppointmentDurations>("/api/agenda/duracoes", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function updateAppointmentDurationsRequest(accessToken: string, data: AppointmentDurations) {
  return apiFetch<AppointmentDurations>("/api/agenda/duracoes", {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}

/** Janela de atendimento: período (`endDate` nulo = sem fim) + faixas semanais. */
export interface AvailabilityWindow {
  id: string;
  startDate: string;
  endDate: string | null;
  rules: AvailabilityRule[];
}

/** Fechamento de agenda: período de dias, com faixa de horas opcional (nula = dia inteiro). */
export interface AvailabilityBlock {
  id: string;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}

export function listAvailabilityWindowsRequest(accessToken: string) {
  return apiFetch<AvailabilityWindow[]>("/api/agenda/janelas", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function createAvailabilityWindowRequest(
  accessToken: string,
  data: { startDate: string; endDate: string | null; rules: AvailabilityRuleInput[] },
) {
  return apiFetch<AvailabilityWindow>("/api/agenda/janelas", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}

/** Período da janela: encerrar, adiantar o começo ou reabrir (`endDate` nulo). */
export function updateAvailabilityWindowRequest(
  accessToken: string,
  windowId: string,
  data: { startDate: string; endDate: string | null },
) {
  return apiFetch<AvailabilityWindow>(`/api/agenda/janelas/${windowId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}

/** Edita a faixa no lugar, em vez de apagar e recriar. */
export function updateAvailabilityRuleRequest(
  accessToken: string,
  windowId: string,
  ruleId: string,
  data: AvailabilityRuleInput,
) {
  return apiFetch<AvailabilityRule>(`/api/agenda/janelas/${windowId}/faixas/${ruleId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}

export function deleteAvailabilityWindowRequest(accessToken: string, windowId: string) {
  return apiFetch<void>(`/api/agenda/janelas/${windowId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function addAvailabilityRuleRequest(accessToken: string, windowId: string, data: AvailabilityRuleInput) {
  return apiFetch<AvailabilityRule>(`/api/agenda/janelas/${windowId}/faixas`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}

export function deleteAvailabilityRuleRequest(accessToken: string, windowId: string, ruleId: string) {
  return apiFetch<void>(`/api/agenda/janelas/${windowId}/faixas/${ruleId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function listAvailabilityBlocksRequest(accessToken: string) {
  return apiFetch<AvailabilityBlock[]>("/api/agenda/bloqueios", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function createAvailabilityBlockRequest(
  accessToken: string,
  data: {
    startDate: string;
    endDate: string;
    startTime: string | null;
    endTime: string | null;
    reason: string | null;
  },
) {
  return apiFetch<AvailabilityBlock>("/api/agenda/bloqueios", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}

export function deleteAvailabilityBlockRequest(accessToken: string, blockId: string) {
  return apiFetch<void>(`/api/agenda/bloqueios/${blockId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/**
 * Horários livres para um atendimento desse tipo — o tamanho de cada um é a
 * duração configurada para o tipo. Sem intervalo, a mesma grade que o
 * paciente vê; com `from`/`to` (ISO), os livres do intervalo a partir de agora.
 */
export function listOpenSlotsRequest(
  accessToken: string,
  type: AppointmentType,
  range?: { from: string; to: string },
) {
  const rangeQuery = range ? `&de=${encodeURIComponent(range.from)}&ate=${encodeURIComponent(range.to)}` : "";
  return apiFetch<AvailabilitySlot[]>(`/api/agenda/horarios?tipo=${type}${rangeQuery}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export interface IntakeContext {
  /** Preenchido só quando o link foi gerado de dentro da ficha de um paciente. */
  patient: Patient | null;
  /** Nulo nos links novos: quem escolhe o tipo é o paciente, dentro do link. */
  appointmentType: AppointmentType | null;
  doctorName: string;
  purpose: IntakeLinkPurpose;
  /**
   * Consulta que o paciente já tem marcada (tipicamente pela secretária).
   * Preenchida, o link não oferece horário: mostra a consulta e pede só o cadastro.
   */
  upcoming: UpcomingConsultation | null;
  /** Convênios que o médico atende. Vazio = o link só oferece particular. */
  healthPlans: string[];
}

export interface UpcomingConsultation {
  scheduledAt: string;
  durationMin: number;
  type: AppointmentType;
  modality: AppointmentModality;
}

/** Resultado da identificação por CPF + data de nascimento, no fluxo de retorno. */
export interface IdentifiedPatient {
  found: boolean;
  name: string | null;
  cpf: string | null;
  /** Consulta futura que ele já tem — aí não se marca outra pelo link. */
  upcoming: UpcomingConsultation | null;
}

export interface ScheduledConsultation {
  scheduledAt: string;
  durationMin: number;
  type: AppointmentType;
  doctorName: string;
  patientName: string;
  billing: AppointmentBilling | null;
  healthPlan: string | null;
}

/** Sem Authorization — o token no path é a própria credencial (rota pública). */
export function getIntakeContextRequest(token: string) {
  return apiFetch<IntakeContext>(`/api/intake/${token}`);
}

/** Os horários dependem do tipo: primeira consulta e retorno têm durações diferentes. */
export function listIntakeSlotsRequest(token: string, type?: AppointmentType) {
  const query = type ? `?tipo=${type}` : "";
  return apiFetch<AvailabilitySlot[]>(`/api/intake/${token}/horarios${query}`);
}

/**
 * POST, e não GET com query: CPF e data de nascimento são dado pessoal e não
 * podem ir na URL (log de servidor, histórico, `Referer`).
 */
export function identifyIntakePatientRequest(
  token: string,
  data: { cpf: string; birthDate: string },
) {
  return apiFetch<IdentifiedPatient>(`/api/intake/${token}/identificar`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function scheduleIntakeRequest(
  token: string,
  data: {
    patient: PatientInput;
    scheduledAt: string;
    type: AppointmentType;
    modality: AppointmentModality;
    billing: AppointmentBilling;
    healthPlan: string | null;
  },
) {
  return apiFetch<ScheduledConsultation>(`/api/intake/${token}/agendar`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface RegistrationDone {
  doctorName: string;
  patientName: string;
  /** Só vem quando o link é do próprio paciente (gerado da ficha ou da agenda). */
  upcoming: UpcomingConsultation | null;
}

/** Link de cadastro, ou paciente que já tem consulta marcada: só os dados, sem horário. */
export function completeIntakeRegistrationRequest(token: string, patient: PatientInput) {
  return apiFetch<RegistrationDone>(`/api/intake/${token}/cadastro`, {
    method: "POST",
    body: JSON.stringify(patient),
  });
}

export interface DiseaseFieldTableColumn {
  key: string;
  label: string;
  placeholder: string | null;
}

export interface DiseaseFieldLink {
  label: string;
  url: string;
}

export interface DiseaseFieldShowIf {
  key: string;
  equals: string[] | null;
  includes: string[] | null;
}

export type DiseaseFieldStyle =
  | "RADIO"
  | "BUTTONS"
  | "EXAM_MODE"
  | "EXAM_FINDINGS"
  /** Rótulo cinza e opções ao lado (itens da biópsia hepática). */
  | "COMPACT"
  /** Campos SINGLE seguidos viram uma tabela de escolha (estratificação de risco da CBP). */
  | "CHOICE_TABLE"
  /** Campos com o mesmo rowLabel viram um quadro em grade (dados do PREVENT, com o link da calculadora). */
  | "CALCULATOR_PANEL"
  /** Texto com a calculadora de dose de álcool logo abaixo. */
  | "ALCOHOL_CALCULATOR";

export interface DiseaseFieldSummary {
  key: string;
  label: string;
  type: "SINGLE" | "MULTI" | "TEXT" | "NUMBER" | "TABLE" | "LINKS" | "NOTE" | "COMPUTED";
  options: string[] | null;
  placeholder: string | null;
  rows: number | null;
  hint: string | null;
  section: string | null;
  subsection: string | null;
  rowLabel: string | null;
  inline: boolean | null;
  style: DiseaseFieldStyle | null;
  suffix: string | null;
  columns: DiseaseFieldTableColumn[] | null;
  links: DiseaseFieldLink[] | null;
  /** Texto que um clique preenche (o botão "Nega" dos antecedentes). */
  quickFill: string | null;
  /** Todas as condições precisam casar (E lógico) — ver DiseaseField.ShowIf no backend. */
  showIf: DiseaseFieldShowIf[] | null;
  /** Campo COMPUTED: a conta (lib/computed-fields.ts) e os campos que a alimentam. */
  computed: { formula: string; inputs: string[]; applyTo: string | null } | null;
  /** Rótulo conforme a opção escolhida em outro campo. */
  dynamicLabel: { key: string; labels: Record<string, string> } | null;
}

/** `AMBAS` aparece nas duas abas da tela "Prontuários modelo", não é uma terceira aba. */
export type DiseaseSpecialty = "HEPATO" | "GASTRO" | "AMBAS";

export interface DiseaseSummary {
  slug: string;
  title: string;
  shortName: string;
  description: string;
  specialty: DiseaseSpecialty;
}

export interface DiseaseDefinition extends DiseaseSummary {
  fields: DiseaseFieldSummary[];
  /** Modelo "em branco": o registro não recebe as seções genéricas de consulta. */
  freeForm: boolean;
  /** Campos próprios de primeira consulta (Gastro — Guiada); nulo = os genéricos. */
  consultationFields: DiseaseFieldSummary[] | null;
}

export function listDiseasesRequest(accessToken: string) {
  return apiFetch<DiseaseSummary[]>("/api/doencas", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getDiseaseConfigRequest(accessToken: string, slug: string) {
  return apiFetch<DiseaseDefinition>(`/api/doencas/${slug}/config`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export interface DiseaseHeader {
  disease: string;
  data: Record<string, unknown>;
  updatedAt: string;
}

export function getDiseaseHeaderRequest(accessToken: string, patientId: string, disease: string) {
  return apiFetch<DiseaseHeader>(`/api/pacientes/${patientId}/cabecalhos/${disease}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function upsertDiseaseHeaderRequest(
  accessToken: string,
  patientId: string,
  disease: string,
  data: Record<string, unknown>,
) {
  return apiFetch<DiseaseHeader>(`/api/pacientes/${patientId}/cabecalhos/${disease}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ data }),
  });
}

export type MedicalRecordType = "PRIMEIRA_CONSULTA" | "RETORNO" | "EVOLUCAO";

export function getConsultationSectionsRequest(accessToken: string, type: MedicalRecordType) {
  return apiFetch<DiseaseFieldSummary[]>(`/api/prontuario/secoes/${type}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export interface MedicalRecordSummary {
  id: string;
  type: MedicalRecordType;
  disease: string | null;
  title: string;
  createdAt: string;
  /** Nome curto do modelo ("DRGE", "Em branco"); nulo no registro "Geral". */
  diseaseName: string | null;
  /** Trechos já cortados pelo backend, para os cards do histórico. */
  hypothesis: string | null;
  conduct: string | null;
  /** Só quando não há hipótese nem conduta: queixa, HMA ou a anotação livre. */
  excerpt: string | null;
  scoreCount: number;
  /** "12345/SP", congelado no registro; nulo em registros antigos. */
  crm: string | null;
}

export interface MedicalRecordDetail extends MedicalRecordSummary {
  crm: string | null;
  crmUf: string | null;
  rqe: string | null;
  specialty: string | null;
  contentText: string;
  contentJson: Record<string, unknown> | null;
  consultationJson: Record<string, unknown> | null;
  /** Escalas anexadas ao registro, já formatadas. */
  scoresJson: string[] | null;
}

export function listMedicalRecordsRequest(accessToken: string, patientId: string) {
  return apiFetch<MedicalRecordSummary[]>(`/api/pacientes/${patientId}/prontuario`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getMedicalRecordRequest(accessToken: string, patientId: string, recordId: string) {
  return apiFetch<MedicalRecordDetail>(`/api/pacientes/${patientId}/prontuario/${recordId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export interface CreateMedicalRecordInput {
  type: MedicalRecordType;
  disease?: string;
  title: string;
  contentText?: string;
  crmId: string;
  rqeId?: string;
  consultationData?: Record<string, unknown>;
  scores?: string[];
}

export function createMedicalRecordRequest(accessToken: string, patientId: string, data: CreateMedicalRecordInput) {
  return apiFetch<MedicalRecordDetail>(`/api/pacientes/${patientId}/prontuario`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}

export function deleteMedicalRecordRequest(accessToken: string, patientId: string, recordId: string) {
  return apiFetch<void>(`/api/pacientes/${patientId}/prontuario/${recordId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// --- Documentos médicos (só o médico) ---

export type MedicalDocumentKind =
  | "ATESTADO"
  | "DECLARACAO"
  | "ENCAMINHAMENTO"
  | "RELATORIO"
  | "SOLICITACAO"
  | "ORIENTACAO"
  | "OUTRO";

/** Documento emitido — definitivo: não há rota de edição nem de exclusão. */
export interface MedicalDocument {
  id: string;
  kind: MedicalDocumentKind;
  model: string | null;
  title: string;
  content: string;
  data: Record<string, string> | null;
  /** CRM/RQE escolhidos na emissão, congelados no documento. */
  crm: string;
  crmUf: string;
  rqe: string | null;
  specialty: string | null;
  issuedAt: string;
  /** Impresso na folha ("AB12-CD34" sem o traço): identifica o PDF assinado anexado depois. */
  verificationCode: string;
  /** Há PDF assinado digitalmente anexado. */
  signed: boolean;
  /** Os dados da assinatura — só na leitura de um documento; na lista vem nulo. */
  signature: MedicalDocumentSignature | null;
}

/** ICP_BRASIL = assinatura qualificada; GOV_BR = avançada (Lei 14.063/2020). */
export type SignatureLevel = "ICP_BRASIL" | "GOV_BR" | "OUTRA";

export interface MedicalDocumentSignature {
  fileName: string | null;
  signerName: string | null;
  signerCpf: string | null;
  /** DN do emissor do certificado de quem assinou. */
  issuer: string | null;
  level: SignatureLevel;
  signedAt: string | null;
  signatureCount: number;
  /** Falso quando há conteúdo acrescentado ao PDF depois da última assinatura. */
  coversDocument: boolean;
  uploadedAt: string;
}

export interface CreateMedicalDocumentInput {
  kind: MedicalDocumentKind;
  model?: string;
  title: string;
  content: string;
  data?: Record<string, string>;
  crmId: string;
  rqeId?: string;
}

export function listMedicalDocumentsRequest(accessToken: string, patientId: string) {
  return apiFetch<MedicalDocument[]>(`/api/pacientes/${patientId}/documentos`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getMedicalDocumentRequest(accessToken: string, patientId: string, documentId: string) {
  return apiFetch<MedicalDocument>(`/api/pacientes/${patientId}/documentos/${documentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/**
 * Anexa o PDF assinado. Multipart, então não passa pelo apiFetch (que fixa
 * o Content-Type em JSON) — o fetch monta o boundary sozinho.
 */
export async function attachSignedDocumentRequest(
  accessToken: string,
  patientId: string,
  documentId: string,
  file: Blob,
  fileName: string,
) {
  const body = new FormData();
  body.set("file", file, fileName);
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/pacientes/${patientId}/documentos/${documentId}/assinatura`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
    });
  } catch {
    throw new ApiError("Não foi possível conectar à API.", 0);
  }
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new ApiError(error?.message ?? "Erro inesperado na API.", response.status);
  }
  return (await response.json()) as MedicalDocument;
}

/** O PDF assinado como veio da API (a rota de download repassa o corpo). */
export function fetchSignedDocumentPdf(accessToken: string, patientId: string, documentId: string) {
  return fetch(`${API_URL}/api/pacientes/${patientId}/documentos/${documentId}/assinatura/pdf`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function createMedicalDocumentRequest(accessToken: string, patientId: string, data: CreateMedicalDocumentInput) {
  return apiFetch<MedicalDocument>(`/api/pacientes/${patientId}/documentos`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}

/** DOCUMENTO aparece na galeria de modelos; ORIENTACAO, no seletor de orientações prontas. */
export type DocumentTemplateKind = "DOCUMENTO" | "ORIENTACAO";

export interface DocumentTemplate {
  id: string;
  kind: DocumentTemplateKind;
  name: string;
  content: string;
  updatedAt: string;
}

export interface SaveDocumentTemplateInput {
  kind: DocumentTemplateKind;
  name: string;
  content: string;
}

export function listDocumentTemplatesRequest(accessToken: string) {
  return apiFetch<DocumentTemplate[]>("/api/medicos/me/modelos-documento", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function createDocumentTemplateRequest(accessToken: string, data: SaveDocumentTemplateInput) {
  return apiFetch<DocumentTemplate>("/api/medicos/me/modelos-documento", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}

export function updateDocumentTemplateRequest(accessToken: string, templateId: string, data: SaveDocumentTemplateInput) {
  return apiFetch<DocumentTemplate>(`/api/medicos/me/modelos-documento/${templateId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}

export function deleteDocumentTemplateRequest(accessToken: string, templateId: string) {
  return apiFetch<void>(`/api/medicos/me/modelos-documento/${templateId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/** Combo de exames salvo pelo médico ("Meus combos" da solicitação de exames). */
export interface ExamCombo {
  id: string;
  name: string;
  items: string[];
}

/** Combos próprios + nomes dos combos com estrela (próprios ou do catálogo). */
export interface ExamPreferences {
  combos: ExamCombo[];
  favorites: string[];
}

export interface SaveExamComboInput {
  name: string;
  items: string[];
}

export function getExamPreferencesRequest(accessToken: string) {
  return apiFetch<ExamPreferences>("/api/medicos/me/combos-exames", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function createExamComboRequest(accessToken: string, data: SaveExamComboInput) {
  return apiFetch<ExamCombo>("/api/medicos/me/combos-exames", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}

export function updateExamComboRequest(accessToken: string, comboId: string, data: SaveExamComboInput) {
  return apiFetch<ExamCombo>(`/api/medicos/me/combos-exames/${comboId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}

export function deleteExamComboRequest(accessToken: string, comboId: string) {
  return apiFetch<void>(`/api/medicos/me/combos-exames/${comboId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/** Devolve a lista de favoritos já atualizada. */
export function setExamFavoriteRequest(accessToken: string, name: string, favorite: boolean) {
  return apiFetch<string[]>("/api/medicos/me/combos-exames/favoritos", {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ name, favorite }),
  });
}

export type AppointmentType = "PRIMEIRA_CONSULTA" | "RETORNO";
/** Como o atendimento acontece — o médico vê isso na agenda do dia. */
export type AppointmentModality = "PRESENCIAL" | "TELECONSULTA";
/** Contratação: como o atendimento é pago. Convênio traz o nome do plano. */
export type AppointmentBilling = "PARTICULAR" | "CONVENIO" | "CORTESIA";
export type AppointmentStatus = "AGENDADO" | "CONFIRMADO" | "ATENDIDO" | "FALTOU" | "CANCELADO";

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  scheduledAt: string;
  durationMin: number;
  type: AppointmentType;
  modality: AppointmentModality;
  /** Nulo = não informado (consulta marcada pelo paciente no link). */
  billing: AppointmentBilling | null;
  healthPlan: string | null;
  /** Valor do particular, em centavos; nulo fora do particular ou sem valor. */
  priceCents: number | null;
  status: AppointmentStatus;
  notes: string | null;
  /** Marcado de propósito num horário que já tinha outro paciente. */
  encaixe: boolean;
  createdAt: string;
  updatedAt: string;
}

export function listAppointmentsRequest(accessToken: string, from: string, to: string) {
  return apiFetch<Appointment[]>(`/api/agenda?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export interface CreateAppointmentInput {
  patientId: string;
  scheduledAt: string;
  durationMin?: number;
  type: AppointmentType;
  modality?: AppointmentModality;
  billing?: AppointmentBilling;
  healthPlan?: string;
  /** Valor do particular em centavos; ausente = o padrão do tipo. */
  priceCents?: number;
  notes?: string;
  /** Aceita o horário mesmo que ele já tenha outro agendamento. */
  encaixe?: boolean;
}

export function createAppointmentRequest(accessToken: string, data: CreateAppointmentInput) {
  return apiFetch<Appointment>("/api/agenda", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}

export interface UpdateAppointmentInput {
  scheduledAt?: string;
  type?: AppointmentType;
  modality?: AppointmentModality;
  /** Mandar `billing` redefine plano e valor: o plano some fora do convênio, o valor fora do particular. */
  billing?: AppointmentBilling;
  healthPlan?: string;
  /** Com `billing` particular: o valor em centavos, ou null para "sem valor". */
  priceCents?: number | null;
  status?: AppointmentStatus;
  notes?: string;
  encaixe?: boolean;
}

export function updateAppointmentRequest(accessToken: string, appointmentId: string, data: UpdateAppointmentInput) {
  return apiFetch<Appointment>(`/api/agenda/${appointmentId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}

export function deleteAppointmentRequest(accessToken: string, appointmentId: string) {
  return apiFetch<void>(`/api/agenda/${appointmentId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/**
 * Rascunho automático do formulário de registro, por paciente + modelo
 * (`formKey` = slug da doença ou "geral"). Não é registro clínico: some quando
 * o registro de verdade é salvo.
 */
export interface MedicalRecordDraft {
  formKey: string;
  data: Record<string, unknown>;
  updatedAt: string;
}

/** `undefined` quando não há rascunho (o backend responde 204). */
export function getMedicalRecordDraftRequest(accessToken: string, patientId: string, formKey: string) {
  return apiFetch<MedicalRecordDraft | undefined>(`/api/pacientes/${patientId}/prontuario/rascunhos/${formKey}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function saveMedicalRecordDraftRequest(
  accessToken: string,
  patientId: string,
  formKey: string,
  data: Record<string, unknown>,
) {
  return apiFetch<MedicalRecordDraft>(`/api/pacientes/${patientId}/prontuario/rascunhos/${formKey}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}

export function deleteMedicalRecordDraftRequest(accessToken: string, patientId: string, formKey: string) {
  return apiFetch<void>(`/api/pacientes/${patientId}/prontuario/rascunhos/${formKey}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
