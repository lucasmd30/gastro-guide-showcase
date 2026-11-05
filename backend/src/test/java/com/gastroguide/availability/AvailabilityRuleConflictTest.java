package com.gastroguide.availability;

import com.gastroguide.appointment.AppointmentRepository;
import com.gastroguide.availability.dto.CreateAvailabilityRuleRequest;
import com.gastroguide.availability.dto.CreateAvailabilityWindowRequest;
import com.gastroguide.availability.dto.UpdateAvailabilityWindowRequest;
import com.gastroguide.doctor.Doctor;
import com.gastroguide.doctor.DoctorRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * A regra de conflito de faixa considera datas: só colide faixa de mesmo
 * dia da semana em janelas que se cruzam no calendário. Repositórios
 * mockados, roda sem Docker.
 */
class AvailabilityRuleConflictTest {

    private static final UUID DOCTOR_ID = UUID.randomUUID();

    private final Doctor doctor = mock(Doctor.class);
    private final List<AvailabilityWindow> windows = new ArrayList<>();
    private AvailabilityService service;
    private AvailabilityRuleRepository ruleRepository;
    private AvailabilityWindowRepository windowRepository;

    @BeforeEach
    void setUp() {
        windowRepository = mock(AvailabilityWindowRepository.class);
        ruleRepository = mock(AvailabilityRuleRepository.class);
        DoctorRepository doctorRepository = mock(DoctorRepository.class);
        service = new AvailabilityService(windowRepository, ruleRepository,
                mock(AvailabilityBlockRepository.class), mock(AppointmentRepository.class), doctorRepository);

        when(doctorRepository.findById(DOCTOR_ID)).thenReturn(Optional.of(doctor));
        when(windowRepository.findByDoctorIdOrderByStartDateAscCreatedAtAsc(DOCTOR_ID)).thenReturn(windows);
        // O banco é quem gera os ids; sem ele, o DTO da resposta quebraria.
        when(windowRepository.save(any())).thenAnswer(invocation -> {
            AvailabilityWindow window = invocation.getArgument(0);
            ReflectionTestUtils.setField(window, "id", UUID.randomUUID());
            window.getRules().forEach(rule -> ReflectionTestUtils.setField(rule, "id", UUID.randomUUID()));
            return window;
        });
    }

    private void existing(String startDate, String endDate, DayOfWeek weekday, String start, String end) {
        AvailabilityWindow window = new AvailabilityWindow(doctor, LocalDate.parse(startDate),
                endDate == null ? null : LocalDate.parse(endDate));
        window.getRules().add(new AvailabilityRule(window, weekday, LocalTime.parse(start), LocalTime.parse(end)));
        windows.add(window);
    }

    private static CreateAvailabilityWindowRequest request(String startDate, String endDate, DayOfWeek weekday,
            String start, String end) {
        return new CreateAvailabilityWindowRequest(LocalDate.parse(startDate),
                endDate == null ? null : LocalDate.parse(endDate),
                List.of(new CreateAvailabilityRuleRequest(weekday, LocalTime.parse(start), LocalTime.parse(end))));
    }

    private void assertConflict(CreateAvailabilityWindowRequest request) {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.createWindow(DOCTOR_ID, request));
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void mesmoDiaDaSemanaEmJanelasQueSeCruzamConflita() {
        existing("2026-09-01", null, DayOfWeek.MONDAY, "08:00", "12:00");

        assertConflict(request("2026-09-22", "2026-10-03", DayOfWeek.MONDAY, "10:00", "14:00"));
    }

    @Test
    void janelasDisjuntasNoCalendarioNaoConflitam() {
        existing("2026-09-01", "2026-09-15", DayOfWeek.MONDAY, "08:00", "12:00");

        assertDoesNotThrow(() -> service.createWindow(DOCTOR_ID,
                request("2026-09-16", null, DayOfWeek.MONDAY, "08:00", "12:00")));
    }

    @Test
    void diasDaSemanaDiferentesNaoConflitam() {
        existing("2026-09-01", null, DayOfWeek.MONDAY, "08:00", "12:00");

        assertDoesNotThrow(() -> service.createWindow(DOCTOR_ID,
                request("2026-09-22", "2026-10-03", DayOfWeek.SATURDAY, "08:00", "12:00")));
    }

    @Test
    void faixasEncostadasNaoConflitam() {
        existing("2026-09-01", null, DayOfWeek.MONDAY, "08:00", "12:00");

        assertDoesNotThrow(() -> service.createWindow(DOCTOR_ID,
                request("2026-09-01", null, DayOfWeek.MONDAY, "12:00", "16:00")));
    }

    @Test
    void duasFaixasDoMesmoPedidoQueSeCruzamConflitam() {
        CreateAvailabilityWindowRequest request = new CreateAvailabilityWindowRequest(
                LocalDate.parse("2026-09-01"), null, List.of(
                        new CreateAvailabilityRuleRequest(DayOfWeek.MONDAY, LocalTime.parse("08:00"),
                                LocalTime.parse("12:00")),
                        new CreateAvailabilityRuleRequest(DayOfWeek.MONDAY, LocalTime.parse("11:00"),
                                LocalTime.parse("13:00"))));

        assertConflict(request);
    }

    // ---- Edição (em vez de apagar e recriar) -------------------------------

    /** Janela com id e faixas com id, do jeito que viriam do banco. */
    private AvailabilityWindow savedWindow(String startDate, String endDate, DayOfWeek weekday, String start,
            String end) {
        AvailabilityWindow window = new AvailabilityWindow(doctor, LocalDate.parse(startDate),
                endDate == null ? null : LocalDate.parse(endDate));
        ReflectionTestUtils.setField(window, "id", UUID.randomUUID());
        AvailabilityRule rule = new AvailabilityRule(window, weekday, LocalTime.parse(start), LocalTime.parse(end));
        ReflectionTestUtils.setField(rule, "id", UUID.randomUUID());
        window.getRules().add(rule);
        windows.add(window);

        when(windowRepository.findByIdAndDoctorId(window.getId(), DOCTOR_ID)).thenReturn(Optional.of(window));
        when(ruleRepository.findByIdAndWindowIdAndDoctorId(rule.getId(), window.getId(), DOCTOR_ID))
                .thenReturn(Optional.of(rule));
        return window;
    }

    private static CreateAvailabilityRuleRequest rule(DayOfWeek weekday, String start, String end) {
        return new CreateAvailabilityRuleRequest(weekday, LocalTime.parse(start), LocalTime.parse(end));
    }

    @Test
    void editarFaixaMudaHorarioSemConflitarConsigoMesma() {
        AvailabilityWindow window = savedWindow("2026-09-01", null, DayOfWeek.FRIDAY, "08:00", "12:00");
        UUID ruleId = window.getRules().get(0).getId();

        // O caso da cliente: sexta 08:00–12:00 vira 08:00–11:00.
        service.updateRule(DOCTOR_ID, window.getId(), ruleId, rule(DayOfWeek.FRIDAY, "08:00", "11:00"));

        assertEquals(LocalTime.parse("11:00"), window.getRules().get(0).getEndTime());
    }

    @Test
    void editarFaixaTambemMudaODiaDaSemana() {
        AvailabilityWindow window = savedWindow("2026-09-01", null, DayOfWeek.FRIDAY, "08:00", "12:00");
        UUID ruleId = window.getRules().get(0).getId();

        service.updateRule(DOCTOR_ID, window.getId(), ruleId, rule(DayOfWeek.THURSDAY, "14:00", "18:00"));

        AvailabilityRule edited = window.getRules().get(0);
        assertEquals(DayOfWeek.THURSDAY, edited.getWeekday());
        assertEquals(LocalTime.parse("14:00"), edited.getStartTime());
    }

    @Test
    void editarFaixaParaCimaDeOutraConflita() {
        AvailabilityWindow window = savedWindow("2026-09-01", null, DayOfWeek.FRIDAY, "08:00", "12:00");
        // Segunda faixa na mesma janela, à tarde.
        AvailabilityRule tarde = new AvailabilityRule(window, DayOfWeek.FRIDAY, LocalTime.parse("14:00"),
                LocalTime.parse("18:00"));
        ReflectionTestUtils.setField(tarde, "id", UUID.randomUUID());
        window.getRules().add(tarde);
        UUID manhaId = window.getRules().get(0).getId();

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.updateRule(
                DOCTOR_ID, window.getId(), manhaId, rule(DayOfWeek.FRIDAY, "08:00", "15:00")));
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void editarPeriodoDaJanelaReabreUmaEncerrada() {
        AvailabilityWindow window = savedWindow("2026-09-01", "2026-09-30", DayOfWeek.FRIDAY, "08:00", "12:00");

        service.updateWindow(DOCTOR_ID, window.getId(),
                new UpdateAvailabilityWindowRequest(LocalDate.parse("2026-09-01"), null));

        assertNull(window.getEndDate());
    }

    @Test
    void editarPeriodoQueFazAJanelaCruzarOutraConflita() {
        // Duas janelas com a mesma faixa, hoje disjuntas no calendário.
        savedWindow("2026-10-01", null, DayOfWeek.FRIDAY, "08:00", "12:00");
        AvailabilityWindow primeira = savedWindow("2026-09-01", "2026-09-30", DayOfWeek.FRIDAY, "08:00", "12:00");

        // Esticar a primeira até novembro faria as duas se cruzarem.
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.updateWindow(DOCTOR_ID, primeira.getId(),
                        new UpdateAvailabilityWindowRequest(LocalDate.parse("2026-09-01"),
                                LocalDate.parse("2026-11-30"))));
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void janelaComFimAntesDoInicioEhRejeitada() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.createWindow(
                DOCTOR_ID, request("2026-09-10", "2026-09-01", DayOfWeek.MONDAY, "08:00", "12:00")));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }
}
