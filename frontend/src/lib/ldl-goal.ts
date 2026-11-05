// LDL-c goal by cardiovascular risk — Diretriz Brasileira de Dislipidemias SBC 2025
// (risk stratified by PREVENT 10-year total CVD). Browser-safe; covered by ldl-goal.test.ts.

export type LdlRisco = "baixo" | "intermediario" | "alto" | "muito_alto" | "extremo";

export interface LdlGoal {
  risco: LdlRisco;
  rotulo: string;
  metaLdl: number; // mg/dL, LDL-c < meta
  metaNaoHdl: number; // mg/dL
  medicacoes: string;
}

const TABLE: Record<LdlRisco, LdlGoal> = {
  baixo: { risco: "baixo", rotulo: "Baixo risco", metaLdl: 115, metaNaoHdl: 145,
    medicacoes: "Mudança de estilo de vida; estatina de moderada intensidade se não atingir a meta (ex.: sinvastatina 20–40 mg, atorvastatina 10–20 mg, rosuvastatina 5–10 mg)." },
  intermediario: { risco: "intermediario", rotulo: "Risco intermediário", metaLdl: 100, metaNaoHdl: 130,
    medicacoes: "Estatina de moderada intensidade (atorvastatina 10–20 mg, rosuvastatina 5–10 mg, sinvastatina 20–40 mg); intensificar se necessário." },
  alto: { risco: "alto", rotulo: "Alto risco", metaLdl: 70, metaNaoHdl: 100,
    medicacoes: "Estatina de alta intensidade (atorvastatina 40–80 mg ou rosuvastatina 20–40 mg); associar ezetimiba 10 mg se não atingir a meta." },
  muito_alto: { risco: "muito_alto", rotulo: "Muito alto risco (DCV aterosclerótica)", metaLdl: 50, metaNaoHdl: 80,
    medicacoes: "Estatina de alta intensidade + ezetimiba 10 mg; se fora da meta, inibidor de PCSK9 (evolocumabe/alirocumabe) ou inclisirana." },
  extremo: { risco: "extremo", rotulo: "Risco extremo", metaLdl: 40, metaNaoHdl: 70,
    medicacoes: "Estatina de alta intensidade + ezetimiba desde o início; inibidor de PCSK9 ou inclisirana frequentemente necessários." },
};

/** PREVENT 10-year total CVD (%) → SBC 2025 category, unless clinical status overrides. */
export function ldlGoal(opts: { risco10: number | null; dcvEstabelecida?: boolean; riscoExtremo?: boolean }): LdlGoal | null {
  if (opts.riscoExtremo) return TABLE.extremo;
  if (opts.dcvEstabelecida) return TABLE.muito_alto;
  const r = opts.risco10;
  if (r == null || !Number.isFinite(r)) return null;
  if (r < 5) return TABLE.baixo;
  if (r < 20) return TABLE.intermediario;
  return TABLE.alto;
}

/** Percent LDL reduction needed to reach goal (0 when already at goal). */
export function ldlReducaoNecessaria(ldlAtual: number, meta: number): number | null {
  if (!Number.isFinite(ldlAtual) || ldlAtual <= 0) return null;
  if (ldlAtual < meta) return 0;
  return Math.round(((ldlAtual - meta) / ldlAtual) * 100);
}
