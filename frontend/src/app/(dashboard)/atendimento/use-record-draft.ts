"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { discardRecordDraft, loadRecordDraft, saveRecordDraft } from "@/app/actions/prontuario";

export type DraftStatus = "carregando" | "ativo" | "salvando" | "salvo" | "erro";

/** Espera depois da última digitação antes de salvar — o mesmo do protótipo. */
const DEBOUNCE_MS = 1500;
/** Depois de uma falha (rede, sessão), tenta de novo sozinho, sem esperar outra digitação. */
const RETRY_MS = 5000;

/**
 * Rascunho automático do registro em andamento (export do Lovable de
 * 06/10/2026), salvo no servidor por paciente + modelo: se a página fechar
 * antes de "Finalizar registro", o preenchimento volta ao reabrir, inclusive
 * em outro computador.
 *
 * `data` é o estado da tela já serializável; `isEmpty` diz quando não há nada
 * digitado (aí não se salva nada, e um rascunho existente é apagado).
 * `onRestore` só é chamado se a tela ainda estiver vazia quando o rascunho
 * chegar — nunca por cima do que a médica já começou a digitar.
 */
export function useRecordDraft({
  patientId,
  formKey,
  data,
  isEmpty,
  onRestore,
  enabled = true,
}: {
  patientId: string;
  /** Falso na visualização do modelo (sem paciente): não há rascunho a guardar. */
  enabled?: boolean;
  formKey: string;
  data: Record<string, unknown>;
  isEmpty: boolean;
  onRestore: (data: Record<string, unknown>) => void;
}) {
  const [status, setStatus] = useState<DraftStatus>("carregando");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const serialized = JSON.stringify(data);
  // O que está no servidor agora — evita salvar de novo o mesmo conteúdo
  // (inclusive o que acabou de ser restaurado).
  const lastSaved = useRef<string | null>(null);
  const loaded = useRef(false);
  const isEmptyRef = useRef(isEmpty);
  isEmptyRef.current = isEmpty;
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;

  // Trocar de modelo (aba da doença) é outro rascunho.
  useEffect(() => {
    if (!enabled) {
      setStatus("ativo");
      return;
    }
    let cancelled = false;
    loaded.current = false;
    lastSaved.current = null;
    setStatus("carregando");
    setSavedAt(null);

    loadRecordDraft(patientId, formKey).then((result) => {
      if (cancelled) return;
      loaded.current = true;
      if (result.error) {
        setStatus("erro");
        return;
      }
      const draft = result.draft;
      if (draft) {
        lastSaved.current = JSON.stringify(draft.data);
        setSavedAt(draft.updatedAt);
        if (isEmptyRef.current) {
          onRestoreRef.current(draft.data);
          toast.info("Rascunho restaurado.");
        }
      }
      setStatus("ativo");
    });

    return () => {
      cancelled = true;
    };
  }, [patientId, formKey, enabled]);

  useEffect(() => {
    if (!enabled || !loaded.current || serialized === lastSaved.current) return;

    const timer = setTimeout(async () => {
      setStatus("salvando");
      if (isEmpty) {
        // Apagou tudo: o rascunho antigo não pode voltar na próxima visita.
        if (lastSaved.current !== null) {
          const result = await discardRecordDraft(patientId, formKey);
          if (result.error) return failed();
          lastSaved.current = null;
          setSavedAt(null);
        }
        return setStatus("ativo");
      }
      const result = await saveRecordDraft(patientId, formKey, JSON.parse(serialized));
      if (result.error || !result.draft) return failed();
      lastSaved.current = serialized;
      setSavedAt(result.draft.updatedAt);
      setStatus("salvo");
    }, DEBOUNCE_MS);
    const failed = () => {
      setStatus("erro");
      setTimeout(() => setRetry((n) => n + 1), RETRY_MS);
    };

    return () => clearTimeout(timer);
  }, [serialized, isEmpty, patientId, formKey, enabled, retry]);

  // Trocar de aba antes do debounce desmonta o formulário: manda o que estiver
  // pendente em vez de perder a última digitação.
  const pending = useRef({ serialized, isEmpty, patientId, formKey });
  pending.current = { serialized, isEmpty, patientId, formKey };
  useEffect(
    () => () => {
      const p = pending.current;
      if (loaded.current && !p.isEmpty && p.serialized !== lastSaved.current) {
        void saveRecordDraft(p.patientId, p.formKey, JSON.parse(p.serialized));
      }
    },
    [],
  );

  /** Apaga o rascunho — no botão "descartar" e depois que o registro é salvo. */
  const discard = useCallback(async () => {
    if (!enabled) return;
    const result = await discardRecordDraft(patientId, formKey);
    if (result.error) {
      setStatus("erro");
      return;
    }
    lastSaved.current = null;
    setSavedAt(null);
    setStatus("ativo");
  }, [patientId, formKey, enabled]);

  return { status, savedAt, discard };
}
