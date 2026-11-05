"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { AlertTriangle, Download, ExternalLink, FileSignature, Printer, ShieldCheck, Upload } from "lucide-react";
import { attachSignedDocument } from "@/app/actions/documentos";
import type { MedicalDocument, SignatureLevel } from "@/lib/api";
import { Button } from "@/components/ui/button";

/** Validador oficial de assinaturas do ITI (aceita ICP-Brasil e gov.br). */
const ITI_VALIDATOR = "https://validar.iti.gov.br";
/** Assinador do gov.br, do próprio ITI. */
const GOVBR_SIGNER = "https://assinador.iti.br";

const LEVEL_LABEL: Record<SignatureLevel, string> = {
  ICP_BRASIL: "Certificado ICP-Brasil — assinatura qualificada",
  GOV_BR: "Conta gov.br — assinatura avançada",
  OUTRA: "Certificado fora da ICP-Brasil e do gov.br",
};

/** "***.456.789-**": o suficiente para reconhecer, sem expor o CPF inteiro na tela. */
function maskCpf(cpf: string): string {
  return `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`;
}

/** O nome da AC no DN do emissor ("CN=AC SOLUTI Multipla v5,OU=…" → "AC SOLUTI Multipla v5"). */
function issuerName(dn: string): string {
  const cn = dn.split(",").find((part) => part.trim().toUpperCase().startsWith("CN="));
  return cn ? cn.trim().slice(3) : dn;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
}

/**
 * Assinatura digital do documento (pedido de 19/10/2026). O sistema não
 * assina sozinho — integrar direto com cada certificadora exige contrato com
 * cada uma. Em vez disso, o médico gera o PDF, assina no assinador que já usa
 * (qualquer um que grave a assinatura dentro do PDF) e anexa aqui; o backend
 * confere e guarda a cópia assinada. Fica fora da impressão.
 */
export function SignaturePanel({ patientId, document }: { patientId: string; document: MedicalDocument }) {
  const [replacing, setReplacing] = useState(false);
  const signature = document.signature;

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5 text-sm print:hidden">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <FileSignature className="h-4 w-4 text-primary" />
        Assinatura digital
      </h2>

      {signature ? (
        <>
          <div className="space-y-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-950">
            <p className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              PDF assinado anexado — a assinatura confere com o arquivo.
            </p>
            <p>
              <span className="text-emerald-800">Assinado por:</span> {signature.signerName ?? "—"}
              {signature.signerCpf && <> · CPF {maskCpf(signature.signerCpf)}</>}
            </p>
            <p>
              <span className="text-emerald-800">Tipo:</span> {LEVEL_LABEL[signature.level]}
              {signature.issuer && <> ({issuerName(signature.issuer)})</>}
            </p>
            {signature.signedAt && (
              <p>
                <span className="text-emerald-800">Assinado em:</span> {formatDateTime(signature.signedAt)}
              </p>
            )}
            {signature.signatureCount > 1 && <p>{signature.signatureCount} assinaturas no arquivo.</p>}
          </div>

          {document.kind === "ATESTADO" && signature.level !== "ICP_BRASIL" && (
            <Warning>
              Atestado em meio eletrônico só vale com assinatura qualificada, feita com certificado ICP-Brasil (Lei
              14.063/2020, art. 13). Assine de novo com o seu certificado (VIDaaS, BirdID, SafeID…) e anexe esse
              arquivo.
            </Warning>
          )}
          {!signature.coversDocument && (
            <Warning>
              O arquivo tem conteúdo acrescentado depois da última assinatura. Às vezes é só o assinador gravando dados
              de validação — confira no validador do ITI.
            </Warning>
          )}

          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" className="gap-1.5">
              <a href={`/api/documento-assinado?paciente=${patientId}&documento=${document.id}`}>
                <Download className="h-3.5 w-3.5" />
                Baixar PDF assinado
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <a href={ITI_VALIDATOR} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Validar no ITI
              </a>
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setReplacing((v) => !v)}>
              Substituir PDF assinado
            </Button>
          </div>
          {replacing && <Uploader patientId={patientId} documentId={document.id} onDone={() => setReplacing(false)} />}
          <p className="text-xs text-muted-foreground">
            O sistema confere que a assinatura bate com o arquivo e lê o certificado de quem assinou. A validação oficial
            da cadeia de certificação é a do ITI — é o link que vale mandar a quem recebe o documento.
          </p>
        </>
      ) : (
        <ol className="space-y-4">
          <Step n={1} title="Salve este documento em PDF">
            <p className="text-muted-foreground">
              Na janela de impressão, escolha <strong>Salvar como PDF</strong> no destino. O código de verificação{" "}
              <span className="font-mono">{formatCode(document.verificationCode)}</span>, no rodapé, é o que liga o
              arquivo a este documento.
            </p>
            <Button type="button" variant="outline" size="sm" className="mt-2 gap-1.5" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" />
              Gerar PDF
            </Button>
          </Step>
          <Step n={2} title="Assine o PDF no assinador que você já usa">
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>
                <strong className="text-foreground">Certificado ICP-Brasil em nuvem</strong> — VIDaaS (Valid, o
                oferecido pelo CRM), BirdID (Soluti), SafeID (Safeweb), RemoteID (Certisign) ou NeoID (Serpro): abra o
                app ou o portal do seu certificado e assine o PDF.
              </li>
              <li>
                <strong className="text-foreground">Token ou cartão (A3) e certificado A1</strong> — Assinador Serpro ou
                Adobe Acrobat Reader (Ferramentas → Certificados → Assinar digitalmente).
              </li>
              <li>
                <strong className="text-foreground">Conta gov.br</strong> —{" "}
                <a href={GOVBR_SIGNER} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  assinador.iti.br
                </a>
                . É assinatura avançada: serve para declaração, relatório e encaminhamento, mas{" "}
                <strong className="text-foreground">não para atestado</strong>, que exige certificado ICP-Brasil (Lei
                14.063/2020, art. 13).
              </li>
            </ul>
            <p className="mt-1 text-xs text-muted-foreground">
              Quando o assinador perguntar o formato, escolha a assinatura dentro do PDF (PAdES), não um arquivo .p7s
              separado.
            </p>
          </Step>
          <Step n={3} title="Anexe aqui o PDF assinado">
            <Uploader patientId={patientId} documentId={document.id} />
          </Step>
        </ol>
      )}
    </section>
  );
}

function formatCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <div className="mt-1">{children}</div>
      </div>
    </li>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
      <span>{children}</span>
    </p>
  );
}

function Uploader({ patientId, documentId, onDone }: { patientId: string; documentId: string; onDone?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // onSubmit em vez de `action`: com `action` o React limpa o formulário
  // depois de todo envio, inclusive o recusado, e o arquivo escolhido sumiria.
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await attachSignedDocument(patientId, documentId, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("PDF assinado anexado ao documento.");
      setFileName("");
      if (inputRef.current) inputRef.current.value = "";
      onDone?.();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent">
          <Upload className="h-3.5 w-3.5" />
          {fileName || "Escolher PDF assinado"}
          <input
            ref={inputRef}
            type="file"
            name="file"
            accept="application/pdf,.pdf"
            required
            className="sr-only"
            onChange={(e) => {
              setFileName(e.target.files?.[0]?.name ?? "");
              setError(null);
            }}
          />
        </label>
        <Button type="submit" size="sm" disabled={pending || !fileName}>
          {pending ? "Conferindo…" : "Anexar"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
