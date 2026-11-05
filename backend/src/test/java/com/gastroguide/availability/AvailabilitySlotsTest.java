package com.gastroguide.availability;

import com.gastroguide.availability.SlotGenerator.BusyInterval;
import com.gastroguide.availability.dto.AvailabilitySlotDto;
import com.gastroguide.doctor.Doctor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

/**
 * A expansão de janelas e bloqueios em horários livres é a única lógica de
 * verdade da feature — e a que mais tem casos de borda (slot que não cabe
 * na faixa, virada de dia, fuso, janela que termina, bloqueio parcial).
 * {@link SlotGenerator} é puro, então isto roda sem banco nem mock de
 * repositório.
 */
class AvailabilitySlotsTest {

    private final Doctor doctor = mock(Doctor.class);
    private final List<AvailabilityWindow> windows = new ArrayList<>();
    private final List<AvailabilityBlock> blocks = new ArrayList<>();
    private final List<BusyInterval> busy = new ArrayList<>();

    /** Duração do atendimento sendo procurado; cada teste ajusta a sua. */
    private int durationMin = 30;

    @BeforeEach
    void setUp() {
        windows.clear();
        blocks.clear();
        busy.clear();
        durationMin = 30;
    }

    /** Janela aberta ("até segunda ordem") desde muito antes das datas dos testes. */
    private AvailabilityWindow openWindow() {
        return window("2020-01-01", null);
    }

    private AvailabilityWindow window(String startDate, String endDate) {
        AvailabilityWindow window = new AvailabilityWindow(doctor, LocalDate.parse(startDate),
                endDate == null ? null : LocalDate.parse(endDate));
        windows.add(window);
        return window;
    }

    private static void rule(AvailabilityWindow window, DayOfWeek weekday, String start, String end) {
        window.getRules().add(new AvailabilityRule(window, weekday, LocalTime.parse(start), LocalTime.parse(end)));
    }

    private void busy(String date, String time, int durationMin) {
        Instant start = at(date, time);
        busy.add(new BusyInterval(start, start.plusSeconds(durationMin * 60L)));
    }

    private void block(String startDate, String endDate, String startTime, String endTime) {
        blocks.add(new AvailabilityBlock(doctor, LocalDate.parse(startDate), LocalDate.parse(endDate),
                startTime == null ? null : LocalTime.parse(startTime),
                endTime == null ? null : LocalTime.parse(endTime), null));
    }

    /** Instante correspondente a uma data/hora local do consultório. */
    private static Instant at(String date, String time) {
        return LocalDate.parse(date).atTime(LocalTime.parse(time)).atZone(AvailabilityService.ZONE).toInstant();
    }

    private List<AvailabilitySlotDto> slots(Instant from, Instant to) {
        return SlotGenerator.generate(windows, blocks, busy, durationMin, from, to, AvailabilityService.ZONE);
    }

    private List<String> slotTimes(Instant from, Instant to) {
        return slots(from, to).stream()
                .map(slot -> slot.scheduledAt().atZone(AvailabilityService.ZONE).toLocalDateTime().toString())
                .toList();
    }

    // ---- Expansão da faixa (comportamento anterior às janelas) -------------

    @Test
    void semJanelaNaoOfereceNenhumHorario() {
        assertTrue(slots(at("2026-09-01", "00:00"), at("2026-09-08", "00:00")).isEmpty());
    }

    @Test
    void expandeUmaFaixaEmSlotsDaDuracaoConfigurada() {
        // 2026-09-01 é uma terça-feira.
        rule(openWindow(), DayOfWeek.TUESDAY, "08:00", "10:00");

        assertEquals(
                List.of("2026-09-01T08:00", "2026-09-01T08:30", "2026-09-01T09:00", "2026-09-01T09:30"),
                slotTimes(at("2026-09-01", "00:00"), at("2026-09-02", "00:00")));
    }

    @Test
    void descartaSlotQueNaoCabeInteiroNaFaixa() {
        // 50 minutos de faixa não comportam um segundo slot de 30.
        rule(openWindow(), DayOfWeek.TUESDAY, "08:00", "08:50");

        assertEquals(List.of("2026-09-01T08:00"), slotTimes(at("2026-09-01", "00:00"), at("2026-09-02", "00:00")));
    }

    @Test
    void naoRepeteAFaixaEmOutroDiaDaSemana() {
        durationMin = 60;
        rule(openWindow(), DayOfWeek.TUESDAY, "08:00", "09:00");

        // Quarta-feira: nada.
        assertTrue(slotTimes(at("2026-09-02", "00:00"), at("2026-09-03", "00:00")).isEmpty());
    }

    @Test
    void repeteAFaixaNaSemanaSeguinte() {
        durationMin = 60;
        rule(openWindow(), DayOfWeek.TUESDAY, "08:00", "09:00");

        assertEquals(
                List.of("2026-09-01T08:00", "2026-09-08T08:00"),
                slotTimes(at("2026-09-01", "00:00"), at("2026-09-09", "00:00")));
    }

    @Test
    void subtraiHorarioJaAgendado() {
        rule(openWindow(), DayOfWeek.TUESDAY, "08:00", "09:00");
        busy("2026-09-01", "08:30", 30);

        assertEquals(List.of("2026-09-01T08:00"), slotTimes(at("2026-09-01", "00:00"), at("2026-09-02", "00:00")));
    }

    @Test
    void juntaEOrdenaVariasFaixasDoMesmoDia() {
        AvailabilityWindow window = openWindow();
        durationMin = 60;
        rule(window, DayOfWeek.TUESDAY, "14:00", "15:00");
        rule(window, DayOfWeek.TUESDAY, "08:00", "09:00");

        assertEquals(
                List.of("2026-09-01T08:00", "2026-09-01T14:00"),
                slotTimes(at("2026-09-01", "00:00"), at("2026-09-02", "00:00")));
    }

    @Test
    void ignoraSlotAnteriorAoInicioDoIntervalo() {
        rule(openWindow(), DayOfWeek.TUESDAY, "08:00", "10:00");

        assertEquals(
                List.of("2026-09-01T09:00", "2026-09-01T09:30"),
                slotTimes(at("2026-09-01", "09:00"), at("2026-09-02", "00:00")));
    }

    /**
     * O laço de dias começa um dia antes do intervalo de propósito: uma
     * faixa no fim do dia local pertence, em UTC, ao dia seguinte, e seria
     * perdida se a varredura começasse pelo dia de `from`.
     */
    @Test
    void encontraFaixaNoFimDoDiaLocal() {
        durationMin = 60;
        rule(openWindow(), DayOfWeek.TUESDAY, "22:00", "23:00");

        assertEquals(
                List.of("2026-09-01T22:00"),
                slotTimes(at("2026-09-01", "21:00"), at("2026-09-02", "02:00")));
    }

    @Test
    void faixaQueTerminaAMeiaNoiteNaoEntraEmLacoInfinito() {
        rule(openWindow(), DayOfWeek.TUESDAY, "23:00", "23:59");

        List<AvailabilitySlotDto> result = slots(at("2026-09-01", "00:00"), at("2026-09-02", "12:00"));
        assertEquals(1, result.size());
        assertEquals(at("2026-09-01", "23:00"), result.get(0).scheduledAt());
    }

    @Test
    void intervaloInvertidoNaoDevolveNada() {
        rule(openWindow(), DayOfWeek.TUESDAY, "08:00", "10:00");

        assertTrue(slots(at("2026-09-02", "00:00"), at("2026-09-01", "00:00")).isEmpty());
    }

    // ---- Janelas -----------------------------------------------------------

    @Test
    void janelaComFimIncluiOUltimoDiaENaoOSeguinte() {
        // Terças 01/09 e 08/09; a janela fecha em 08/09 (inclusive).
        durationMin = 60;
        rule(window("2026-09-01", "2026-09-08"), DayOfWeek.TUESDAY, "08:00", "09:00");

        assertEquals(
                List.of("2026-09-01T08:00", "2026-09-08T08:00"),
                slotTimes(at("2026-08-25", "00:00"), at("2026-09-30", "00:00")));
    }

    @Test
    void janelaSoComecaAOferecerNaDataDeInicio() {
        durationMin = 60;
        rule(window("2026-09-05", null), DayOfWeek.TUESDAY, "08:00", "09:00");

        // 01/09 é terça mas está antes do início; 08/09 é a primeira dentro.
        assertEquals(
                List.of("2026-09-08T08:00", "2026-09-15T08:00"),
                slotTimes(at("2026-09-01", "00:00"), at("2026-09-16", "00:00")));
    }

    @Test
    void janelasSobrepostasSomamHorarios() {
        // Seg–sex sem fim + sábado só numa semana.
        durationMin = 60;
        rule(openWindow(), DayOfWeek.TUESDAY, "08:00", "09:00");
        durationMin = 60;
        rule(window("2026-08-31", "2026-09-06"), DayOfWeek.SATURDAY, "08:00", "09:00");

        assertEquals(
                List.of("2026-09-01T08:00", "2026-09-05T08:00", "2026-09-08T08:00"),
                slotTimes(at("2026-09-01", "00:00"), at("2026-09-13", "00:00")));
    }

    @Test
    void duasJanelasComOMesmoHorarioNaoDuplicamOSlot() {
        durationMin = 60;
        rule(openWindow(), DayOfWeek.TUESDAY, "08:00", "09:00");
        durationMin = 60;
        rule(window("2026-09-01", "2026-09-01"), DayOfWeek.TUESDAY, "08:00", "09:00");

        assertEquals(List.of("2026-09-01T08:00"), slotTimes(at("2026-09-01", "00:00"), at("2026-09-02", "00:00")));
    }

    // ---- Bloqueios ---------------------------------------------------------

    @Test
    void bloqueioDeDiaInteiroFechaODia() {
        durationMin = 60;
        rule(openWindow(), DayOfWeek.TUESDAY, "08:00", "10:00");
        block("2026-09-01", "2026-09-01", null, null);

        assertEquals(List.of("2026-09-08T08:00", "2026-09-08T09:00"),
                slotTimes(at("2026-09-01", "00:00"), at("2026-09-09", "00:00")));
    }

    @Test
    void bloqueioDeVariosDiasFechaTodoOPeriodo() {
        durationMin = 60;
        rule(openWindow(), DayOfWeek.TUESDAY, "08:00", "09:00");
        // Férias de 01/09 a 10/09: as terças 01 e 08 caem fora; 15/09 volta.
        block("2026-09-01", "2026-09-10", null, null);

        assertEquals(List.of("2026-09-15T08:00"), slotTimes(at("2026-09-01", "00:00"), at("2026-09-16", "00:00")));
    }

    @Test
    void bloqueioPorHorasFechaSoAFaixaEmCadaDia() {
        rule(openWindow(), DayOfWeek.TUESDAY, "13:00", "17:00");
        // 14:00–16:00 fechado: 13:45 fica, 14:00 a 15:30 saem, 16:00 volta.
        block("2026-09-01", "2026-09-01", "14:00", "16:00");

        assertEquals(
                List.of("2026-09-01T13:00", "2026-09-01T13:30", "2026-09-01T16:00", "2026-09-01T16:30"),
                slotTimes(at("2026-09-01", "00:00"), at("2026-09-02", "00:00")));
    }

    // ---- Duração por tipo de atendimento -----------------------------------

    @Test
    void aGradeAndaPelaDuracaoDoTipoEscolhido() {
        rule(openWindow(), DayOfWeek.TUESDAY, "08:00", "09:00");

        durationMin = 15;
        assertEquals(
                List.of("2026-09-01T08:00", "2026-09-01T08:15", "2026-09-01T08:30", "2026-09-01T08:45"),
                slotTimes(at("2026-09-01", "00:00"), at("2026-09-02", "00:00")));

        durationMin = 30;
        assertEquals(
                List.of("2026-09-01T08:00", "2026-09-01T08:30"),
                slotTimes(at("2026-09-01", "00:00"), at("2026-09-02", "00:00")));
    }

    @Test
    void naoOfereceHorarioEmQueOAtendimentoNaoCabeAteOFimDaFaixa() {
        // 45 min de faixa não comportam uma consulta de 30 a partir das 08:30.
        rule(openWindow(), DayOfWeek.TUESDAY, "08:00", "08:45");

        assertEquals(List.of("2026-09-01T08:00"), slotTimes(at("2026-09-01", "00:00"), at("2026-09-02", "00:00")));
    }

    /**
     * O caso que o conflito por instante exato não pegava: a consulta das
     * 08:30 não começa junto com o retorno das 08:15, mas invade os 15 min
     * finais dele. O próximo horário começa quando o retorno termina (08:45),
     * e a grade segue dali.
     */
    @Test
    void agendamentoOcupaOIntervaloInteiroENaoSoOInstanteDeInicio() {
        rule(openWindow(), DayOfWeek.TUESDAY, "08:00", "10:00");
        busy("2026-09-01", "08:15", 30);

        durationMin = 30;
        assertEquals(
                List.of("2026-09-01T08:45", "2026-09-01T09:15"),
                slotTimes(at("2026-09-01", "00:00"), at("2026-09-02", "00:00")));
    }

    /**
     * O relato de 10/10/2026: faixa das 08:30, retorno de 30 min às 08:30 e
     * consultas de 60 min às 09:00 e às 10:00. O próximo livre é 11:00 —
     * antes a grade fixa (08:30, 09:30, 10:30…) pulava para 11:30.
     */
    @Test
    void proximoHorarioLivreComecaQuandoOAgendamentoAnteriorTermina() {
        rule(openWindow(), DayOfWeek.FRIDAY, "08:30", "12:30");
        busy("2026-10-09", "08:30", 30);
        busy("2026-10-09", "09:00", 60);
        busy("2026-10-09", "10:00", 60);

        durationMin = 60;
        assertEquals(
                List.of("2026-10-09T11:00"),
                slotTimes(at("2026-10-09", "00:00"), at("2026-10-10", "00:00")));

        // Para um retorno de 30 min, 11:00, 11:30 e 12:00.
        durationMin = 30;
        assertEquals(
                List.of("2026-10-09T11:00", "2026-10-09T11:30", "2026-10-09T12:00"),
                slotTimes(at("2026-10-09", "00:00"), at("2026-10-10", "00:00")));
    }

    /** Horário fechado pelo "X" da agenda (fechamento por horas): a grade recomeça no fim dele. */
    @Test
    void depoisDeUmFechamentoPorHorasAGradeRecomecaNoFimDele() {
        rule(openWindow(), DayOfWeek.TUESDAY, "08:00", "11:00");
        block("2026-09-01", "2026-09-01", "08:00", "08:30");

        durationMin = 60;
        assertEquals(
                List.of("2026-09-01T08:30", "2026-09-01T09:30"),
                slotTimes(at("2026-09-01", "00:00"), at("2026-09-02", "00:00")));
    }

    @Test
    void bloqueioPorHorasDerrubaAtendimentoQueInvadiriaOInicioDele() {
        rule(openWindow(), DayOfWeek.TUESDAY, "13:00", "17:00");
        block("2026-09-01", "2026-09-01", "14:00", "16:00");

        durationMin = 30;
        // 13:30 terminaria às 14:00 (encostado, não invade) e fica; 13:45
        // não existe nessa grade. A partir das 14:00, só depois das 16:00.
        assertEquals(
                List.of("2026-09-01T13:00", "2026-09-01T13:30", "2026-09-01T16:00", "2026-09-01T16:30"),
                slotTimes(at("2026-09-01", "00:00"), at("2026-09-02", "00:00")));
    }

    @Test
    void bloqueioNaoAlcancaDiaForaDoPeriodo() {
        durationMin = 60;
        rule(openWindow(), DayOfWeek.TUESDAY, "08:00", "09:00");
        block("2026-09-02", "2026-09-07", null, null);

        assertEquals(
                List.of("2026-09-01T08:00", "2026-09-08T08:00"),
                slotTimes(at("2026-09-01", "00:00"), at("2026-09-09", "00:00")));
    }
}
