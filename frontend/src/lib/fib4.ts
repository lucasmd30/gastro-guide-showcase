// FIB-4 for MASLD: cutoffs 1.30 / 2.67; lower cutoff 2.0 when age ≥ 65 (McPherson 2017; AASLD/EASL).
export function fib4Value(idade: number, ast: number, alt: number, plaquetas: number): number | null {
  if (!(idade > 0 && ast > 0 && alt > 0 && plaquetas > 0)) return null;
  const plt = plaquetas > 2000 ? plaquetas / 1000 : plaquetas; // aceita 250000/mm³
  return (idade * ast) / (plt * Math.sqrt(alt));
}

export function fib4Faixa(v: number, idade: number): string {
  const senior = idade >= 65;
  const low = senior ? 2.0 : 1.3;
  const lowTxt = senior ? "2,00" : "1,30";
  let f: string;
  if (v < low) f = `Baixo risco (< ${lowTxt}${senior ? ", corte para ≥ 65 anos" : ""})`;
  else if (v <= 2.67) f = `Intermediário (${lowTxt}–2,67) → Elastografia`;
  else f = "Alto risco (> 2,67) → fibrose ≥ F3 provável";
  if (idade < 35) f += " — atenção: FIB-4 pouco acurado < 35 anos";
  return f;
}
