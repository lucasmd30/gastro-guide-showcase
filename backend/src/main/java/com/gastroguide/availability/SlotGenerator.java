package com.gastroguide.availability;

import com.gastroguide.availability.dto.AvailabilitySlotDto;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/**
 * Expande janelas e bloqueios em horários livres para um atendimento de
 * {@code durationMin} minutos. Função pura — nada de repositório — porque é
 * a única lógica de verdade da disponibilidade e a que mais tem borda (slot
 * que não cabe, virada de dia, fuso, janela que termina, bloqueio parcial).
 *
 * <p>A grade anda pela própria duração do atendimento, ancorada no início
 * de cada faixa: um retorno de 15 min numa faixa 08:00–12:00 oferece 08:00,
 * 08:15, 08:30…, uma primeira consulta de 30 oferece 08:00, 08:30, 09:00…
 * Um horário só sai daqui se o atendimento <b>couber inteiro</b> até o fim
 * da faixa e não encostar em nada já ocupado.
 */
public final class SlotGenerator {

    /** Um intervalo já tomado: agendamento não-cancelado. Fim exclusivo. */
    public record BusyInterval(Instant start, Instant end) {

        boolean overlaps(Instant otherStart, Instant otherEnd) {
            return otherStart.isBefore(end) && start.isBefore(otherEnd);
        }
    }

    private SlotGenerator() {
    }

    public static List<AvailabilitySlotDto> generate(Collection<AvailabilityWindow> windows,
            Collection<AvailabilityBlock> blocks, Collection<BusyInterval> busy, int durationMin, Instant from,
            Instant to, ZoneId zone) {
        if (!to.isAfter(from) || windows.isEmpty() || durationMin <= 0) {
            return List.of();
        }

        List<AvailabilitySlotDto> slots = new ArrayList<>();
        // Começa um dia antes do início: uma faixa que abre no fim do dia
        // local pode cair depois de `from` mesmo pertencendo ao dia anterior
        // em UTC.
        LocalDate day = from.atZone(zone).toLocalDate().minusDays(1);
        LocalDate lastDay = to.atZone(zone).toLocalDate();

        while (!day.isAfter(lastDay)) {
            for (AvailabilityWindow window : windows) {
                if (!window.covers(day)) {
                    continue;
                }
                for (AvailabilityRule rule : window.getRules()) {
                    if (rule.getWeekday() != day.getDayOfWeek()) {
                        continue;
                    }
                    addSlotsOfRule(slots, rule, day, blocks, busy, durationMin, from, to, zone);
                }
            }
            day = day.plusDays(1);
        }

        slots.sort((a, b) -> a.scheduledAt().compareTo(b.scheduledAt()));
        // Duas janelas sobrepostas podem oferecer o mesmo instante; ele sai
        // uma vez só.
        List<AvailabilitySlotDto> distinct = new ArrayList<>(slots.size());
        for (AvailabilitySlotDto slot : slots) {
            if (distinct.isEmpty() || !distinct.get(distinct.size() - 1).scheduledAt().equals(slot.scheduledAt())) {
                distinct.add(slot);
            }
        }
        return distinct;
    }

    private static void addSlotsOfRule(List<AvailabilitySlotDto> slots, AvailabilityRule rule, LocalDate day,
            Collection<AvailabilityBlock> blocks, Collection<BusyInterval> busy, int durationMin, Instant from,
            Instant to, ZoneId zone) {
        // Em minutos desde a meia-noite, não em LocalTime: somar a um
        // LocalTime perto das 24h dá a volta no relógio, e a comparação com
        // o fim da faixa passa a mentir (uma faixa 22:00-23:00 de 60 min
        // chegava a oferecer um slot às 23:00).
        int endMinute = rule.getEndTime().toSecondOfDay() / 60;
        int minute = rule.getStartTime().toSecondOfDay() / 60;
        while (minute + durationMin <= endMinute) {
            LocalTime time = LocalTime.ofSecondOfDay(minute * 60L);
            Instant start = day.atTime(time).atZone(zone).toInstant();
            Instant end = start.plusSeconds(durationMin * 60L);

            if (start.isBefore(from) || !start.isBefore(to)) {
                minute += durationMin;
                continue;
            }

            // Esbarrou num agendamento ou num fechamento: o próximo horário
            // começa quando ele termina, e não no próximo passo da grade.
            // Antes, numa faixa das 08:30 com consultas de 60 min, uma
            // consulta das 10:00 às 11:00 fazia o próximo livre ser 11:30
            // (08:30, 09:30, 10:30 e só então 11:30), deixando 11:00–11:30
            // perdido (relato de usuário, 10/10/2026).
            int conflictEnd = conflictEndMinute(blocks, busy, day, time, start, end, durationMin, zone);
            if (conflictEnd >= 0) {
                if (conflictEnd <= minute) {
                    return; // conflito que vai até o fim do dia (fechamento do dia inteiro)
                }
                minute = conflictEnd;
                continue;
            }
            slots.add(new AvailabilitySlotDto(start, durationMin));
            minute += durationMin;
        }
    }

    /**
     * Onde termina, em minutos do dia, o que impede um atendimento neste
     * horário — o maior fim entre os agendamentos e fechamentos que ele
     * cruzaria. {@code -1} quando nada impede; o próprio {@code minute} (ou
     * menos) quando o impedimento vai até o fim do dia.
     */
    private static int conflictEndMinute(Collection<AvailabilityBlock> blocks, Collection<BusyInterval> busy,
            LocalDate day, LocalTime time, Instant start, Instant end, int durationMin, ZoneId zone) {
        int minute = time.toSecondOfDay() / 60;
        int latest = -1;
        for (AvailabilityBlock block : blocks) {
            if (!block.blocks(day, time, durationMin)) {
                continue;
            }
            if (block.getEndTime() == null) {
                return minute; // dia inteiro fechado
            }
            latest = Math.max(latest, block.getEndTime().toSecondOfDay() / 60);
        }
        for (BusyInterval interval : busy) {
            if (!interval.overlaps(start, end)) {
                continue;
            }
            var busyEnd = interval.end().atZone(zone);
            if (!busyEnd.toLocalDate().equals(day)) {
                return minute; // agendamento que atravessa a meia-noite
            }
            // Arredonda para cima: um fim 10:59:30 libera o horário das 11:00.
            int endSecond = busyEnd.toLocalTime().toSecondOfDay();
            latest = Math.max(latest, (endSecond + 59) / 60);
        }
        return latest;
    }
}
