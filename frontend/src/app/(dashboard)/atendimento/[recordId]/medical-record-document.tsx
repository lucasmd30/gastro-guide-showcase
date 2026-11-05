import type { ReactNode } from "react";
import type { DocItem, DocSection, MedicalRecordDocumentModel } from "@/lib/cfm";

/**
 * Documento do registro (CFM 1.638/2002 e 1.821/2007). Era um <pre> de texto
 * monoespaçado com linhas de "═══"; a cliente achou difícil de ler. Agora é
 * HTML com hierarquia: cabeçalho, identificação lado a lado, seções com
 * título, grade rótulo/valor e bloco de assinatura. Também imprime limpo.
 */
export function MedicalRecordDocument({ doc }: { doc: MedicalRecordDocumentModel }) {
  return (
    <article className="rounded-xl border border-border bg-card px-6 py-7 text-[15px] leading-relaxed text-foreground shadow-sm sm:px-10 sm:py-9 print:border-0 print:p-0 print:shadow-none">
      <header className="space-y-1 border-b border-border pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{doc.heading}</p>
        <h1 className="text-xl font-semibold leading-snug">{doc.title}</h1>
        <p className="text-sm text-muted-foreground">
          {doc.typeLabel} · {doc.dateTime}
        </p>
      </header>

      <div className="grid gap-6 border-b border-border py-5 sm:grid-cols-2">
        <IdentityBlock title="Profissional" rows={doc.professional} />
        <IdentityBlock title="Paciente" rows={doc.patient} />
      </div>

      <div className="space-y-8 pt-6">
        {doc.disease && (
          <Block title={`Dados da doença — ${doc.disease.title}`}>
            <Sections sections={doc.disease.sections} />
          </Block>
        )}

        {doc.consultation.length > 0 && (
          <Sections sections={doc.consultation} topLevel fallbackTitle={doc.typeLabel} />
        )}

        {doc.scores.length > 0 && (
          <Block title="Escalas e calculadoras">
            <ul className="space-y-1.5">
              {doc.scores.map((score, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>{score}</span>
                </li>
              ))}
            </ul>
          </Block>
        )}

        {doc.freeText && (
          <Block title="Anotações">
            <p className="whitespace-pre-line">{doc.freeText}</p>
          </Block>
        )}

        {doc.disease === null && doc.consultation.length === 0 && doc.scores.length === 0 && !doc.freeText && (
          <p className="text-sm text-muted-foreground">Nenhum campo foi preenchido neste registro.</p>
        )}
      </div>

      <footer className="mt-10 space-y-6 break-inside-avoid">
        <div className="mx-auto w-full max-w-xs border-t border-foreground/60 pt-2 text-center text-sm">
          <p className="font-semibold">{doc.signature.name}</p>
          <p>{doc.signature.crm}</p>
          <p className="text-xs text-muted-foreground">Registro efetuado em {doc.signature.registeredAt}</p>
        </div>
        <div className="space-y-0.5 border-t border-border pt-3 text-center text-xs text-muted-foreground">
          {doc.legal.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </footer>
    </article>
  );
}

function IdentityBlock({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</h2>
      <dl className="space-y-1 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-wrap gap-x-2">
            <dt className="text-muted-foreground">{row.label}:</dt>
            <dd className="font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="border-b border-primary/30 pb-1.5 text-sm font-semibold uppercase tracking-[0.08em] text-primary">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * `topLevel`: as seções da consulta (Anamnese, Exame físico…) viram blocos
 * com título próprio. Dentro do bloco da doença, as seções — quando existem —
 * são subtítulos.
 */
function Sections({
  sections,
  topLevel = false,
  fallbackTitle = "Registro",
}: {
  sections: DocSection[];
  topLevel?: boolean;
  /** Título do bloco sem seção (retorno/evolução não têm seções). */
  fallbackTitle?: string;
}) {
  const body = (section: DocSection) => (
    <div className="space-y-5">
      {section.subgroups.map((sub, i) => (
        <div key={sub.title ?? `sub-${i}`} className="space-y-2.5">
          {sub.title && <h3 className="text-sm font-semibold text-foreground">{sub.title}</h3>}
          <dl className="space-y-3">
            {sub.items.map((item, j) => (
              <Item key={j} item={item} hideRowLabel={item.kind === "row" && item.label === sub.title} />
            ))}
          </dl>
        </div>
      ))}
    </div>
  );

  if (topLevel) {
    return (
      <>
        {sections.map((section, i) => (
          <Block key={section.title ?? `sec-${i}`} title={section.title ?? fallbackTitle}>
            {body(section)}
          </Block>
        ))}
      </>
    );
  }

  return (
    <div className="space-y-5">
      {sections.map((section, i) => (
        <div key={section.title ?? `sec-${i}`} className="space-y-2.5">
          {section.title && <h3 className="text-sm font-semibold">{section.title}</h3>}
          {body(section)}
        </div>
      ))}
    </div>
  );
}

function Item({ item, hideRowLabel }: { item: DocItem; hideRowLabel: boolean }) {
  if (item.kind === "row") {
    return (
      <div className="grid gap-1 sm:grid-cols-[13rem_1fr] sm:gap-6">
        <dt className="text-sm text-muted-foreground">{hideRowLabel ? "" : item.label}</dt>
        <dd className="flex flex-wrap gap-x-6 gap-y-1">
          {item.cells.map((cell) => (
            <span key={cell.label}>
              <span className="text-sm text-muted-foreground">{cell.label}: </span>
              <span className="font-medium">{cell.value}</span>
            </span>
          ))}
        </dd>
      </div>
    );
  }

  if (item.kind === "table") {
    return (
      <div className="space-y-1.5">
        <dt className="text-sm text-muted-foreground">{item.label}</dt>
        <dd className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {item.columns.map((col) => (
                  <th key={col} className="border-b border-border px-2 py-1.5 text-left font-medium text-muted-foreground">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {item.rows.map((row, i) => (
                <tr key={i} className="border-b border-border/60 last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="px-2 py-1.5">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </dd>
      </div>
    );
  }

  return (
    <div className="grid gap-0.5 sm:grid-cols-[13rem_1fr] sm:gap-6">
      <dt className="text-sm text-muted-foreground">{item.label}</dt>
      <dd className="whitespace-pre-line">{item.value}</dd>
    </div>
  );
}
