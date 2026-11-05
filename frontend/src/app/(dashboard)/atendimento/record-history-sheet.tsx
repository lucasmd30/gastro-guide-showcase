"use client";

import { History } from "lucide-react";
import type { MedicalRecordSummary } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MedicalRecordRows } from "@/components/medical-record-rows";

/**
 * Consultas anteriores sem sair do atendimento (pedido da cliente): antes o
 * histórico só existia na ficha do paciente. Cada documento abre em outra
 * aba, porque navegar a partir daqui descartaria o registro em andamento.
 */
export function RecordHistorySheet({
  patientId,
  records,
}: {
  patientId: string;
  records: MedicalRecordSummary[];
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <History className="h-3.5 w-3.5" />
          Histórico ({records.length})
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="mb-4">
          <SheetTitle>Histórico de consultas</SheetTitle>
          <SheetDescription>Registros anteriores, do mais recente ao mais antigo. Cada um abre em outra aba.</SheetDescription>
        </SheetHeader>
        <MedicalRecordRows patientId={patientId} records={records} newTab />
      </SheetContent>
    </Sheet>
  );
}
