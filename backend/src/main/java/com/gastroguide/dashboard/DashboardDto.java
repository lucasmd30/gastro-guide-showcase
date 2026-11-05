package com.gastroguide.dashboard;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Tudo o que a tela Dashboard mostra, numa chamada só. */
public record DashboardDto(
        Kpi consultasMes,
        Kpi pacientesAtivos,
        Kpi retornosAgendados,
        long linksPendentes,
        /** Sete posições, de segunda a domingo da semana atual. */
        List<Long> consultasSemana,
        List<DiseaseCount> distribuicao,
        List<Upcoming> proximos) {

    /** {@code deltaPercent} nulo = sem base de comparação (o período anterior foi zero). */
    public record Kpi(long value, Double deltaPercent) {
    }

    public record DiseaseCount(String name, long patients) {
    }

    public record Upcoming(UUID patientId, String patientName, Instant scheduledAt, String type, String status) {
    }
}
