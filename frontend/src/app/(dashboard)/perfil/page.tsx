import { getCurrentDoctor } from "@/lib/dal";
import { listHealthPlans, listSecretaries } from "@/app/actions/perfil";
import { PerfilForm } from "./perfil-form";

export const metadata = { title: "Meu perfil | Prontuário" };

export default async function PerfilPage() {
  const [doctor, secretaries, healthPlans] = await Promise.all([
    getCurrentDoctor(),
    listSecretaries(),
    listHealthPlans(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Meu perfil</h1>
          <p className="text-sm text-muted-foreground">
            Dados profissionais exibidos no cabeçalho do prontuário.
          </p>
        </div>
      </header>

      <PerfilForm doctor={doctor} secretaries={secretaries} healthPlans={healthPlans} />
    </div>
  );
}
