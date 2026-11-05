package com.gastroguide.dashboard;

import com.gastroguide.availability.AvailabilityService;
import com.gastroguide.medicalrecord.DiseaseDefinition;
import com.gastroguide.medicalrecord.DiseaseRegistry;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Números da tela Dashboard (o {@code dashboard.tsx} do protótipo, que lá são
 * fixos, "dados de exemplo"; aqui vêm do banco). Só leitura, e toda consulta
 * filtra pelo médico.
 *
 * <p>Regras:
 * <ul>
 * <li>Consulta conta se ocupa horário: cancelada e falta ficam fora, como em
 * {@code AppointmentStatus.occupiesSlot}.
 * <li>Paciente ativo: teve consulta ou registro de prontuário nos últimos 12
 * meses.
 * <li>Link pendente: gerado, nem usado nem vencido — o que o protótipo chama
 * de triagem pendente.
 * <li>Distribuição: pacientes por doença, em cabeçalho ou registro. Os modelos
 * gerais não entram, porque não são diagnóstico. Quem tem duas doenças conta
 * nas duas.
 * </ul>
 */
@Service
public class DashboardService {

    private static final ZoneId ZONE = AvailabilityService.ZONE;
    private static final String OCCUPIES = "status NOT IN ('CANCELADO', 'FALTOU')";
    private static final Set<String> GENERAL_MODELS =
            Set.of("hepato-geral", "gastro-op1", "gastro-op2", "gastro-branco", "pagina-branca");
    /** Fatias da rosca, como no protótipo: quatro doenças e "Outros". */
    private static final int TOP_DISEASES = 4;
    private static final int UPCOMING_LIMIT = 5;
    private static final Duration THIRTY_DAYS = Duration.ofDays(30);

    private final JdbcClient jdbc;

    public DashboardService(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public DashboardDto dashboard(UUID doctorId) {
        Instant now = Instant.now();
        LocalDate today = LocalDate.now(ZONE);
        return new DashboardDto(
                consultasMes(doctorId, today),
                pacientesAtivos(doctorId, now),
                retornos(doctorId, now),
                linksPendentes(doctorId, now),
                consultasSemana(doctorId, today),
                distribuicao(doctorId),
                proximos(doctorId, now, today));
    }

    private DashboardDto.Kpi consultasMes(UUID doctorId, LocalDate today) {
        LocalDate month = today.withDayOfMonth(1);
        long current = appointments(doctorId, startOf(month), startOf(month.plusMonths(1)));
        long previous = appointments(doctorId, startOf(month.minusMonths(1)), startOf(month));
        return kpi(current, previous);
    }

    private long appointments(UUID doctorId, Instant from, Instant to) {
        return jdbc.sql("SELECT count(*) FROM appointments WHERE doctor_id = :d AND " + OCCUPIES
                        + " AND scheduled_at >= :from AND scheduled_at < :to")
                .param("d", doctorId).param("from", ts(from)).param("to", ts(to))
                .query(Long.class).single();
    }

    private DashboardDto.Kpi pacientesAtivos(UUID doctorId, Instant now) {
        LocalDate end = now.atZone(ZONE).toLocalDate();
        Instant monthAgo = end.minusMonths(1).atStartOfDay(ZONE).toInstant();
        long current = activePatients(doctorId, end.minusMonths(12).atStartOfDay(ZONE).toInstant(), now);
        long previous = activePatients(doctorId, end.minusMonths(13).atStartOfDay(ZONE).toInstant(), monthAgo);
        return kpi(current, previous);
    }

    private long activePatients(UUID doctorId, Instant from, Instant to) {
        return jdbc.sql("""
                        SELECT count(*) FROM (
                            SELECT patient_id FROM appointments
                             WHERE doctor_id = :d AND %s AND scheduled_at >= :from AND scheduled_at <= :to
                            UNION
                            SELECT patient_id FROM medical_records
                             WHERE doctor_id = :d AND created_at >= :from AND created_at <= :to
                        ) ativos
                        """.formatted(OCCUPIES))
                .param("d", doctorId).param("from", ts(from)).param("to", ts(to))
                .query(Long.class).single();
    }

    /** Retornos marcados nos próximos 30 dias, comparados aos que ocorreram nos 30 anteriores. */
    private DashboardDto.Kpi retornos(UUID doctorId, Instant now) {
        long upcoming = jdbc.sql("SELECT count(*) FROM appointments WHERE doctor_id = :d AND type = 'RETORNO'"
                        + " AND status IN ('AGENDADO', 'CONFIRMADO') AND scheduled_at >= :from AND scheduled_at < :to")
                .param("d", doctorId).param("from", ts(now)).param("to", ts(now.plus(THIRTY_DAYS)))
                .query(Long.class).single();
        long previous = jdbc.sql("SELECT count(*) FROM appointments WHERE doctor_id = :d AND type = 'RETORNO' AND "
                        + OCCUPIES + " AND scheduled_at >= :from AND scheduled_at < :to")
                .param("d", doctorId).param("from", ts(now.minus(THIRTY_DAYS))).param("to", ts(now))
                .query(Long.class).single();
        return kpi(upcoming, previous);
    }

    private long linksPendentes(UUID doctorId, Instant now) {
        return jdbc.sql("SELECT count(*) FROM patient_intake_tokens"
                        + " WHERE doctor_id = :d AND revoked_at IS NULL AND expires_at > :now")
                .param("d", doctorId).param("now", ts(now))
                .query(Long.class).single();
    }

    private List<Long> consultasSemana(UUID doctorId, LocalDate today) {
        LocalDate monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        long[] days = new long[7];
        jdbc.sql("SELECT scheduled_at FROM appointments WHERE doctor_id = :d AND " + OCCUPIES
                        + " AND scheduled_at >= :from AND scheduled_at < :to")
                .param("d", doctorId).param("from", ts(startOf(monday))).param("to", ts(startOf(monday.plusDays(7))))
                .query((rs, row) -> rs.getTimestamp(1).toInstant())
                .list()
                // Dia no fuso do consultório: uma consulta das 22h não pode cair no dia seguinte (UTC).
                .forEach(at -> days[at.atZone(ZONE).getDayOfWeek().getValue() - 1]++);
        return Arrays.stream(days).boxed().toList();
    }

    private List<DashboardDto.DiseaseCount> distribuicao(UUID doctorId) {
        record Row(String slug, long patients) {
        }
        List<DashboardDto.DiseaseCount> byDisease = jdbc.sql("""
                        SELECT disease, count(DISTINCT patient_id) FROM (
                            SELECT h.disease, h.patient_id FROM patient_disease_headers h
                              JOIN patients p ON p.id = h.patient_id
                             WHERE p.doctor_id = :d
                            UNION
                            SELECT disease, patient_id FROM medical_records
                             WHERE doctor_id = :d AND disease IS NOT NULL
                        ) doencas
                        GROUP BY disease
                        """)
                .param("d", doctorId)
                .query((rs, row) -> new Row(rs.getString(1), rs.getLong(2)))
                .list().stream()
                .filter(row -> !GENERAL_MODELS.contains(row.slug()))
                .map(row -> {
                    DiseaseDefinition disease = DiseaseRegistry.ALL.get(row.slug());
                    return new DashboardDto.DiseaseCount(disease == null ? row.slug() : disease.shortName(), row.patients());
                })
                .sorted(Comparator.comparingLong(DashboardDto.DiseaseCount::patients).reversed()
                        .thenComparing(DashboardDto.DiseaseCount::name))
                .toList();

        if (byDisease.size() <= TOP_DISEASES + 1) {
            return byDisease;
        }
        List<DashboardDto.DiseaseCount> top = new ArrayList<>(byDisease.subList(0, TOP_DISEASES));
        long others = byDisease.subList(TOP_DISEASES, byDisease.size()).stream()
                .mapToLong(DashboardDto.DiseaseCount::patients).sum();
        top.add(new DashboardDto.DiseaseCount("Outros", others));
        return top;
    }

    /** O que ainda falta hoje. */
    private List<DashboardDto.Upcoming> proximos(UUID doctorId, Instant now, LocalDate today) {
        return jdbc.sql("""
                        SELECT a.patient_id, p.name, a.scheduled_at, a.type, a.status
                          FROM appointments a JOIN patients p ON p.id = a.patient_id
                         WHERE a.doctor_id = :d AND a.status IN ('AGENDADO', 'CONFIRMADO')
                           AND a.scheduled_at >= :from AND a.scheduled_at < :to
                         ORDER BY a.scheduled_at
                         LIMIT :limit
                        """)
                .param("d", doctorId).param("from", ts(now)).param("to", ts(startOf(today.plusDays(1))))
                .param("limit", UPCOMING_LIMIT)
                .query((rs, row) -> new DashboardDto.Upcoming(
                        rs.getObject(1, UUID.class), rs.getString(2), rs.getTimestamp(3).toInstant(),
                        rs.getString(4), rs.getString(5)))
                .list();
    }

    private static DashboardDto.Kpi kpi(long current, long previous) {
        Double delta = previous == 0 ? null : (current - previous) * 100.0 / previous;
        return new DashboardDto.Kpi(current, delta);
    }

    private static Instant startOf(LocalDate day) {
        return day.atStartOfDay(ZONE).toInstant();
    }

    private static Timestamp ts(Instant instant) {
        return Timestamp.from(instant);
    }
}
