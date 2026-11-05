/**
 * Ready-made patient guidance templates, used on the Documents tab.
 *
 * This public copy has a single example: the real texts are authored by the
 * responsible physician and stay in the private repository.
 */

export interface OrientacaoModelo {
  id: string;
  grupo: "Esôfago e estômago" | "Fígado" | "Intestino" | "Nutrição e medicações" | "Imunossupressão";
  label: string;
  /** Related disease slug, used to suggest the template inside the record. */
  doenca?: string;
  build: (paciente: string) => string;
}

export const ORIENTACAO_MODELOS: OrientacaoModelo[] = [
  {
    id: "exemplo",
    grupo: "Esôfago e estômago",
    label: "Exemplo de orientação",
    build: (paciente) =>
      `ORIENTAÇÕES AO PACIENTE\n\nPaciente: ${paciente}\n\nTexto de exemplo. Cada modelo gera um documento editável antes da emissão.`,
  },
];

export const ORIENTACAO_GRUPOS = Array.from(new Set(ORIENTACAO_MODELOS.map((m) => m.grupo)));
