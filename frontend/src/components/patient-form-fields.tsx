import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CpfInput } from "@/components/cpf-input";
import { PhoneInput } from "@/components/phone-input";
import { NativeSelect } from "@/components/ui/native-select";

export function Field({
  label,
  required,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <Label className="text-sm">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}

/** Cadastro em branco — usado pelo cadastro rápido e pelo link público. */
export const EMPTY_PATIENT_FIELDS: PatientFieldValues = {
  name: "",
  cpf: null,
  phone: null,
  phone2: null,
  email: null,
  birthDate: null,
  birthplace: null,
  origin: null,
  address: null,
  motherName: null,
  sex: null,
  profession: null,
  maritalStatus: null,
  religion: null,
};

export interface PatientFieldValues {
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
}

/** Campos de identificação/contato do paciente — sem dado clínico. Compartilhado entre o cadastro completo (autenticado) e o formulário público de link de cadastro. */
export function PatientFormFields({
  current,
  contactRequired = false,
}: {
  current: PatientFieldValues;
  /**
   * Link público: telefone e e-mail viram obrigatórios, além do nome — é por
   * eles que a clínica confirma a consulta. No cadastro interno continua só o
   * nome (a secretária marca com o que o paciente disse ao telefone).
   */
  contactRequired?: boolean;
}) {
  return (
    <>
      <Field label="Nome completo" required>
        <Input name="name" defaultValue={current.name} required />
      </Field>
      <Field label="CPF">
        <CpfInput defaultValue={current.cpf} />
      </Field>
      <Field label="Telefone" required={contactRequired}>
        <PhoneInput name="phone" defaultValue={current.phone} required={contactRequired} />
      </Field>
      <Field label="Segundo telefone">
        <PhoneInput name="phone2" defaultValue={current.phone2} />
      </Field>
      <Field label="E-mail" required={contactRequired}>
        <Input name="email" type="email" defaultValue={current.email ?? ""} required={contactRequired} />
      </Field>
      <Field label="Data de nascimento">
        <Input name="birthDate" type="date" defaultValue={current.birthDate ?? ""} />
      </Field>
      <Field label="Naturalidade">
        <Input name="birthplace" defaultValue={current.birthplace ?? ""} />
      </Field>
      <Field label="Procedência">
        <Input name="origin" defaultValue={current.origin ?? ""} />
      </Field>
      <Field label="Nome da mãe">
        <Input name="motherName" defaultValue={current.motherName ?? ""} />
      </Field>
      {/* Sexo, profissão, estado civil e religião saíram do cabeçalho da
          consulta de hepatologia e viraram cadastro: são identificação, não
          achado do atendimento. */}
      <Field label="Sexo">
        <NativeSelect name="sex" defaultValue={current.sex ?? ""}>
          <option value="">Não informado</option>
          <option value="Feminino">Feminino</option>
          <option value="Masculino">Masculino</option>
          <option value="Outro">Outro</option>
        </NativeSelect>
      </Field>
      <Field label="Profissão">
        <Input name="profession" defaultValue={current.profession ?? ""} />
      </Field>
      <Field label="Estado civil">
        <Input name="maritalStatus" defaultValue={current.maritalStatus ?? ""} />
      </Field>
      <Field label="Religião">
        <Input name="religion" defaultValue={current.religion ?? ""} />
      </Field>
      <Field label="Endereço completo" full>
        <Input
          name="address"
          defaultValue={current.address ?? ""}
          placeholder="Rua, número, complemento, bairro, cidade - UF, CEP"
        />
      </Field>
    </>
  );
}
