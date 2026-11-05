import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  FilePlus2,
  Link2,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { getDashboardRequest, type DashboardKpi } from "@/lib/api";
import { getCurrentUser, requireAccessToken } from "@/lib/dal";
import { slotTime } from "@/lib/slot-time";
import { Button } from "@/components/ui/button";
import { DistributionChart, WeeklyChart } from "./dashboard-charts";

export const metadata = { title: "Dashboard | Prontuário" };

const TYPE_LABELS: Record<string, string> = { PRIMEIRA_CONSULTA: "Consulta", RETORNO: "Retorno" };
const STATUS_LABELS: Record<string, string> = { AGENDADO: "Agendado", CONFIRMADO: "Confirmado" };

function currentMonthLabel(): string {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  return label.charAt(0).toUpperCase() + label.slice(1).replace(" de ", " ");
}

function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={`rounded-2xl border border-border bg-card p-5 shadow-sm ${className ?? ""}`}>{children}</section>;
}

function KpiCard({
  label,
  value,
  sub,
  delta,
  icon: Icon,
}: {
  label: string;
  value: number;
  sub: string;
  /** Ausente = o card não tem comparação; nulo = o período anterior foi zero. */
  delta?: number | null;
  icon: LucideIcon;
}) {
  const up = (delta ?? 0) >= 0;
  const TrendIcon = up ? TrendingUp : TrendingDown;
  return (
    <Panel>
      <div className="flex items-center justify-between pb-2">
        <h2 className="text-sm font-medium text-muted-foreground">{label}</h2>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        <p className="text-xs text-muted-foreground">{sub}</p>
        {delta !== undefined &&
          (delta === null ? (
            <p className="text-xs text-muted-foreground">Sem base no mês anterior</p>
          ) : (
            <div className={`flex items-center gap-1 text-xs font-medium ${up ? "text-emerald-600" : "text-destructive"}`}>
              <TrendIcon className="h-3.5 w-3.5" />
              {`${up ? "+" : ""}${delta.toFixed(1).replace(".", ",")}%`}
              <span className="font-normal text-muted-foreground">vs. mês anterior</span>
            </div>
          ))}
      </div>
    </Panel>
  );
}

const kpiDelta = (kpi: DashboardKpi) => kpi.deltaPercent;

/**
 * A tela Dashboard do protótipo Lovable, com os dados reais do médico (lá são
 * fixos, "dados de exemplo"). O que muda em relação a lá está nos rótulos:
 * "Triagens pendentes" são aqui os links de consulta que o paciente ainda não
 * respondeu, e os atalhos apontam para as telas equivalentes.
 */
export default async function DashboardPage() {
  const token = await requireAccessToken();

  // Antes da chamada: a rota é só do médico, e a secretária ganharia um 403.
  const user = await getCurrentUser();
  if (user.role !== "DOCTOR") {
    redirect("/pacientes");
  }

  const data = await getDashboardRequest(token);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Dashboard</p>
        <h1 className="text-3xl font-bold tracking-tight">Visão geral</h1>
        <p className="text-sm text-muted-foreground">Resumo da sua prática clínica.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Consultas do mês"
          value={data.consultasMes.value}
          sub={currentMonthLabel()}
          delta={kpiDelta(data.consultasMes)}
          icon={CalendarDays}
        />
        <KpiCard
          label="Pacientes ativos"
          value={data.pacientesAtivos.value}
          sub="Atendidos nos últimos 12 meses"
          delta={kpiDelta(data.pacientesAtivos)}
          icon={Users}
        />
        <KpiCard
          label="Retornos agendados"
          value={data.retornosAgendados.value}
          sub="Próximos 30 dias"
          delta={kpiDelta(data.retornosAgendados)}
          icon={RotateCcw}
        />
        <KpiCard label="Links pendentes" value={data.linksPendentes} sub="Aguardando o paciente" icon={ClipboardList} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <h2 className="mb-4 font-semibold">Consultas semanais</h2>
          <WeeklyChart counts={data.consultasSemana} />
        </Panel>
        <Panel>
          <h2 className="mb-4 font-semibold">Distribuição de pacientes</h2>
          <DistributionChart slices={data.distribuicao} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-semibold">Próximos atendimentos — hoje</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/agenda">Ver agenda</Link>
            </Button>
          </div>
          <div className="space-y-2">
            {data.proximos.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum atendimento restante hoje.</p>
            )}
            {data.proximos.map((item) => (
              <div
                key={`${item.patientId}-${item.scheduledAt}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="font-mono text-sm font-medium text-muted-foreground">{slotTime(item.scheduledAt)}</span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{item.patientName}</div>
                    <div className="text-xs text-muted-foreground">{TYPE_LABELS[item.type] ?? item.type}</div>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    item.status === "CONFIRMADO" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  }`}
                >
                  {STATUS_LABELS[item.status] ?? item.status}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <h2 className="mb-4 font-semibold">Atalhos</h2>
          <div className="space-y-2">
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/prontuarios-modelo">
                <FilePlus2 className="mr-2 h-4 w-4" /> Nova consulta
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/prontuarios-modelo">
                <RotateCcw className="mr-2 h-4 w-4" /> Registrar retorno
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/pacientes">
                <Link2 className="mr-2 h-4 w-4" /> Gerar link de consulta
              </Link>
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
