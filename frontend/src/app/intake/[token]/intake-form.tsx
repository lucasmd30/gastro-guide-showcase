"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowLeft, CalendarPlus, RefreshCw, UserPlus } from "lucide-react";
import {
  identifyPatient,
  listIntakeSlots,
  submitIntake,
  type IntakeFormState,
} from "@/app/actions/intake";
import type {
  AppointmentModality,
  AppointmentType,
  AvailabilitySlot,
  IntakeContext,
  Patient,
  UpcomingConsultation,
} from "@/lib/api";
import { UpcomingConsultationCard } from "./registration-form";

import { formatCpf } from "@/lib/cpf";
import { billingLabel } from "@/lib/billing";
import { hasPatientContact, patientContactError } from "@/lib/patient-contact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EMPTY_PATIENT_FIELDS, Field, PatientFormFields } from "@/components/patient-form-fields";
import { SlotPicker } from "@/components/slot-picker";

const initialState: IntakeFormState = {};

const MODALITIES: { value: AppointmentModality; label: string }[] = [
  { value: "PRESENCIAL", label: "Presencial" },
  { value: "TELECONSULTA", label: "Teleconsulta" },
];

const TIME_ZONE = "America/Sao_Paulo";

const EMPTY_PATIENT = {
  ...EMPTY_PATIENT_FIELDS,
  id: "",
  continuousMedications: null,
  notes: null,
} satisfies Patient;

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });
}

/**
 * Passos do link. O paciente escolhe o tipo aqui (antes era quem gerava o
 * link que decidia), e o caminho de retorno evita repreencher o cadastro
 * inteiro: identifica por CPF + data de nascimento e vai direto ao horário.
 */
type Step = "start" | "type" | "identify" | "form" | "slots" | "already";

/** Cadastro reaproveitado no retorno, depois que os dois fatores bateram. */
interface Identified {
  name: string;
  cpf: string;
  birthDate: string;
  upcoming: UpcomingConsultation | null;
}

export function IntakeForm({
  token,
  context,
  slots: initialSlots,
}: {
  token: string;
  context: IntakeContext;
  slots: AvailabilitySlot[];
}) {
  const action = submitIntake.bind(null, token);
  const [state, formAction, pending] = useActionState(action, initialState);

  const [step, setStep] = useState<Step>("start");
  // Links antigos ainda carregam o tipo escolhido por quem gerou; nesse caso
  // a escolha do paciente é ignorada pelo backend, então nem perguntamos.
  const [type, setType] = useState<AppointmentType | null>(context.appointmentType);
  const [identified, setIdentified] = useState<Identified | null>(null);
  const [selected, setSelected] = useState("");
  // A grade depende do tipo — primeira consulta e retorno têm durações
  // diferentes —, então é recarregada quando o paciente escolhe. Começa com
  // o que o servidor já trouxe.
  const [slots, setSlots] = useState(initialSlots);
  const [modality, setModality] = useState<AppointmentModality>("PRESENCIAL");
  // Particular ou convênio, escolha do paciente. O convênio é um dos que o
  // médico cadastrou no perfil; sem nenhum, só existe particular e ele já
  // vem marcado.
  const healthPlans = context.healthPlans;
  const [billing, setBilling] = useState<"PARTICULAR" | "CONVENIO" | null>(
    healthPlans.length === 0 ? "PARTICULAR" : null,
  );
  const [healthPlan, setHealthPlan] = useState("");
  const billingReady = billing === "PARTICULAR" || (billing === "CONVENIO" && healthPlan !== "");

  // Link gerado da ficha, para retorno: o cadastro já existe e vai direto ao
  // horário — a não ser que falte o contato que o link exige, e aí o
  // paciente completa antes.
  const skipsForm = type === "RETORNO" && !!context.patient && hasPatientContact(context.patient);

  // Sem `name`: estes dois campos são só da identificação e não podem entrar
  // no submit final, onde colidiriam com o `cpf` do cadastro.
  const [identifyCpf, setIdentifyCpf] = useState("");
  const [identifyBirthDate, setIdentifyBirthDate] = useState("");
  const [identifyPending, startIdentify] = useTransition();
  const [, startSlots] = useTransition();

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  if (state.scheduled) {
    const { scheduled } = state;
    return (
      <div className="space-y-2 rounded-lg border border-border bg-card p-5 text-center">
        <p className="text-sm font-medium">Consulta marcada!</p>
        <p className="text-sm text-muted-foreground">
          {dayLabel(scheduled.scheduledAt)} às {timeLabel(scheduled.scheduledAt)}, com {scheduled.doctorName}.
        </p>
        {scheduled.billing && (
          <p className="text-sm text-muted-foreground">{billingLabel(scheduled.billing, scheduled.healthPlan)}</p>
        )}
        <p className="text-sm text-muted-foreground">Pode fechar esta página. Este link já foi usado.</p>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="space-y-2 rounded-lg border border-border bg-card p-5">
        <p className="text-sm font-medium">Nenhum horário disponível no momento.</p>
        <p className="text-sm text-muted-foreground">
          Entre em contato com a clínica para marcar sua consulta. Seu link continua válido.
        </p>
      </div>
    );
  }

  function chooseType(chosen: AppointmentType) {
    setType(chosen);
    setSelected("");
    // O horário livre de um retorno não é o mesmo de uma primeira consulta:
    // a duração é outra, então a grade é recalculada.
    startSlots(async () => setSlots(await listIntakeSlots(token, chosen)));
    // O link gerado de dentro de uma ficha já sabe quem é o paciente: não faz
    // sentido pedir CPF de novo pra quem o consultório já cadastrou.
    if (chosen === "RETORNO" && !context.patient) {
      setStep("identify");
    } else {
      const skip = chosen === "RETORNO" && !!context.patient && hasPatientContact(context.patient);
      setStep(skip ? "slots" : "form");
    }
  }

  function runIdentify() {
    const formData = new FormData();
    formData.set("cpf", identifyCpf);
    formData.set("birthDate", identifyBirthDate);

    startIdentify(async () => {
      const result = await identifyPatient(token, {}, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.found) {
        setIdentified(result.found);
        // Já tem consulta marcada (a secretária pode ter agendado antes):
        // mostra essa em vez de oferecer uma segunda.
        setStep(result.found.upcoming ? "already" : "slots");
        return;
      }
      // Não achamos: segue pelo cadastro completo, sem dizer que o CPF não
      // existe na base (ver comentário na action).
      toast.info("Não encontramos seu cadastro. Preencha seus dados para continuar.");
      setStep("form");
    });
  }

  /** Só avança quando dá pra identificar a pessoa depois. */
  function validateFormStep() {
    const form = document.getElementById("intake-form") as HTMLFormElement | null;
    if (!form) return;
    const data = new FormData(form);
    // Nome completo, telefone e e-mail: os três obrigatórios do link (o CPF
    // deixou de ser em 08/10/2026).
    const error = patientContactError({
      name: String(data.get("name") ?? ""),
      phone: String(data.get("phone") ?? ""),
      email: String(data.get("email") ?? ""),
    });
    if (error) {
      toast.error(error);
      return;
    }
    setStep("slots");
  }

  if (step === "start") {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-card p-6 text-center">
        <CalendarPlus className="mx-auto h-8 w-8 text-primary" />
        <p className="text-sm text-muted-foreground">
          {type ? "Informe seus dados" : "Escolha o tipo de atendimento, informe seus dados"} e escolha o
          melhor horário. Leva menos de um minuto.
        </p>
        <p className="text-xs text-muted-foreground">Este link só pode ser usado uma vez.</p>
        <Button
          type="button"
          onClick={() =>
            setStep(
              !type ? "type" : type === "RETORNO" && !context.patient ? "identify" : skipsForm ? "slots" : "form",
            )
          }
        >
          Começar
        </Button>
      </div>
    );
  }

  if (step === "type") {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-card p-5">
        <div>
          <h2 className="text-sm font-medium">O que você precisa?</h2>
          <p className="text-xs text-muted-foreground">Escolha uma das opções abaixo.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => chooseType("PRIMEIRA_CONSULTA")}
            className="rounded-lg border border-border p-4 text-left transition-colors hover:border-primary hover:bg-accent/40"
          >
            <UserPlus className="mb-2 h-5 w-5 text-primary" />
            <p className="text-sm font-medium">Primeira consulta</p>
            <p className="text-xs text-muted-foreground">Para quem nunca consultou com este médico.</p>
          </button>
          <button
            type="button"
            onClick={() => chooseType("RETORNO")}
            className="rounded-lg border border-border p-4 text-left transition-colors hover:border-primary hover:bg-accent/40"
          >
            <RefreshCw className="mb-2 h-5 w-5 text-primary" />
            <p className="text-sm font-medium">Retorno</p>
            <p className="text-xs text-muted-foreground">Para quem já consultou e precisa de retorno.</p>
          </button>
        </div>
      </div>
    );
  }

  if (step === "already" && identified?.upcoming) {
    return (
      <div className="space-y-4 rounded-lg border border-border bg-card p-5">
        <p className="text-sm">Olá, {identified.name}.</p>
        <UpcomingConsultationCard upcoming={identified.upcoming} doctorName={context.doctorName} />
        <p className="text-sm text-muted-foreground">
          Você não precisa marcar outra. Para remarcar ou cancelar, entre em contato com a clínica.
        </p>
      </div>
    );
  }

  if (step === "identify") {
    return (
      <div className="space-y-4 rounded-lg border border-border bg-card p-5">
        <div>
          <h2 className="text-sm font-medium">Informe seus dados</h2>
          <p className="text-xs text-muted-foreground">
            Para encontrarmos seu cadastro sem você precisar preencher tudo de novo.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="CPF" required>
            <Input
              value={identifyCpf}
              onChange={(e) => setIdentifyCpf(formatCpf(e.target.value))}
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              maxLength={14}
            />
          </Field>
          <Field label="Data de nascimento" required>
            <Input
              type="date"
              value={identifyBirthDate}
              onChange={(e) => setIdentifyBirthDate(e.target.value)}
            />
          </Field>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="ghost" onClick={() => setStep("type")}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>
          <Button type="button" onClick={runIdentify} disabled={identifyPending}>
            {identifyPending ? "Procurando…" : "Seguinte"}
          </Button>
        </div>
      </div>
    );
  }

  // Passos "form" e "slots" vivem no mesmo <form>: o cadastro e o horário
  // seguem numa chamada só, senão um horário tomado no meio do caminho
  // deixaria o paciente cadastrado sem consulta.
  return (
    <form id="intake-form" action={formAction} className="space-y-5">
      <input type="hidden" name="type" value={type ?? "PRIMEIRA_CONSULTA"} readOnly />
      <input type="hidden" name="scheduledAt" value={selected} readOnly />
      <input type="hidden" name="modality" value={modality} readOnly />
      <input type="hidden" name="billing" value={billing ?? ""} readOnly />
      <input type="hidden" name="healthPlan" value={billing === "CONVENIO" ? healthPlan : ""} readOnly />

      {identified && (
        <>
          <input type="hidden" name="identified" value="1" readOnly />
          <input type="hidden" name="name" value={identified.name} readOnly />
          <input type="hidden" name="cpf" value={identified.cpf} readOnly />
          <input type="hidden" name="birthDate" value={identified.birthDate} readOnly />
        </>
      )}

      {/* Só um dos dois caminhos monta campos de cadastro. Manter os dois no
          DOM daria dois inputs `name`/`cpf`, e o FormData leva o primeiro —
          o vazio venceria o do paciente já identificado.

          Escondido, e não desmontado, porque os valores digitados precisam
          continuar no DOM para irem junto no submit final, lá no horário. */}
      {!identified && (
        <div className="space-y-4 rounded-lg border border-border bg-card p-5" hidden={step !== "form"}>
          <div>
            <h2 className="text-sm font-medium">Seus dados</h2>
            <p className="text-xs text-muted-foreground">Preencha para agendar sua consulta.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <PatientFormFields current={context.patient ?? EMPTY_PATIENT} contactRequired />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="ghost" onClick={() => setStep("type")}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
            </Button>
            <Button type="button" onClick={validateFormStep}>
              Continuar
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4 rounded-lg border border-border bg-card p-5" hidden={step !== "slots"}>
        <div>
          <h2 className="text-sm font-medium">
            Escolha o melhor horário {type === "RETORNO" ? "do seu retorno" : "da sua consulta"}
          </h2>
          <p className="text-xs text-muted-foreground">Selecione a data e o horário.</p>
        </div>

        {identified && (
          <div className="space-y-1 rounded-md border border-border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Confira seus dados</p>
            <p className="text-sm font-medium">{identified.name}</p>
            <p className="text-xs text-muted-foreground">{formatCpf(identified.cpf)}</p>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Particular ou convênio? <span className="text-destructive">*</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Pill active={billing === "PARTICULAR"} onClick={() => setBilling("PARTICULAR")}>
              Particular
            </Pill>
            {healthPlans.length > 0 && (
              <Pill active={billing === "CONVENIO"} onClick={() => setBilling("CONVENIO")}>
                Convênio
              </Pill>
            )}
          </div>
          {billing === "CONVENIO" && (
            <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                Qual o seu convênio? <span className="text-destructive">*</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {healthPlans.map((plan) => (
                  <Pill key={plan} active={healthPlan === plan} onClick={() => setHealthPlan(plan)}>
                    {plan}
                  </Pill>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Não encontrou o seu? Estes são os convênios atendidos — escolha particular ou fale com a clínica.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Como prefere ser atendido?
          </p>
          <div className="flex flex-wrap gap-2">
            {MODALITIES.map((option) => (
              <Pill key={option.value} active={modality === option.value} onClick={() => setModality(option.value)}>
                {option.label}
              </Pill>
            ))}
          </div>
        </div>

        <SlotPicker slots={slots} selected={selected} onSelect={setSelected} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quem pulou o cadastro (retorno identificado, ou link já preso a
              um paciente) volta para a escolha do tipo, não para um passo
              que nunca viu. */}
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep(identified || skipsForm ? "type" : "form")}
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>
          <div className="flex items-center gap-3">
            {selected && (
              <span className="text-xs text-muted-foreground">
                {dayLabel(selected)} às {timeLabel(selected)}
              </span>
            )}
            <Button type="submit" disabled={pending || !selected || !billingReady}>
              {pending ? "Confirmando…" : "Confirmar agendamento"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

/** Opção em pílula — modalidade, particular/convênio e o convênio. */
function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "rounded-full border border-primary bg-primary px-4 py-1.5 text-sm text-primary-foreground"
          : "rounded-full border border-border px-4 py-1.5 text-sm transition-colors hover:bg-accent"
      }
    >
      {children}
    </button>
  );
}
