import { getIntakeContextRequest, listIntakeSlotsRequest, ApiError } from "@/lib/api";
import { IntakeForm } from "./intake-form";
import { RegistrationForm } from "./registration-form";

export const metadata = { title: "Consulta e cadastro | Prontuário" };

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg space-y-2 p-6">
      <h1 className="text-xl font-semibold">Agende sua consulta</h1>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

export default async function IntakePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  try {
    // Sequencial de propósito: se o token não vale, não faz sentido pedir
    // horários e gastar o rate limit por IP numa segunda chamada.
    const context = await getIntakeContextRequest(token);

    // Link de cadastro, ou consulta já marcada (em geral pela secretária):
    // nada de calendário, só o cadastro — e a consulta, se houver.
    if (context.purpose === "CADASTRO" || context.upcoming) {
      return (
        <div className="mx-auto max-w-lg space-y-4 p-6">
          <h1 className="text-xl font-semibold">{context.upcoming ? "Sua consulta" : "Seu cadastro"}</h1>
          <p className="text-sm text-muted-foreground">Este link só pode ser usado uma vez.</p>
          <RegistrationForm token={token} context={context} />
        </div>
      );
    }

    const slots = await listIntakeSlotsRequest(token);

    return (
      <div className="mx-auto max-w-lg space-y-4 p-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Agende sua consulta</h1>
          {/* O nome vai num rótulo próprio, não no meio da frase: é o nome da
              conta, digitado sem tratamento (Dr./Dra.), e solto numa frase
              ("Agende com fulano") soava estranho. */}
          <p className="text-sm">
            <span className="text-muted-foreground">Médico(a): </span>
            <span className="font-medium">{context.doctorName}</span>
          </p>
        </div>
        <IntakeForm token={token} context={context} slots={slots} />
      </div>
    );
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 429)) {
      return (
        <Aviso>
          {error.status === 429
            ? "Muitas tentativas. Tente novamente em alguns minutos."
            : "Este link não é válido ou já foi usado. Entre em contato com a clínica pra receber um novo."}
        </Aviso>
      );
    }
    throw error;
  }
}
