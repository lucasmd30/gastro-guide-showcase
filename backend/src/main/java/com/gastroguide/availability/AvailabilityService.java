package com.gastroguide.availability;

import com.gastroguide.appointment.AppointmentRepository;
import com.gastroguide.appointment.AppointmentType;
import com.gastroguide.availability.SlotGenerator.BusyInterval;
import com.gastroguide.availability.dto.AppointmentDurationsDto;
import com.gastroguide.availability.dto.AvailabilityBlockDto;
import com.gastroguide.availability.dto.AvailabilityRuleDto;
import com.gastroguide.availability.dto.AvailabilitySlotDto;
import com.gastroguide.availability.dto.AvailabilityWindowDto;
import com.gastroguide.availability.dto.CreateAvailabilityBlockRequest;
import com.gastroguide.availability.dto.CreateAvailabilityRuleRequest;
import com.gastroguide.availability.dto.CreateAvailabilityWindowRequest;
import com.gastroguide.availability.dto.UpdateAppointmentDurationsRequest;
import com.gastroguide.availability.dto.UpdateAvailabilityWindowRequest;
import com.gastroguide.doctor.Doctor;
import com.gastroguide.doctor.DoctorRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Janelas de atendimento, bloqueios e os horários livres que eles produzem.
 *
 * <p>Modelo iClinic/Doctoralia: <b>janelas</b> abrem (período + faixas
 * semanais, fim opcional) e <b>bloqueios</b> fecham (período, dia inteiro
 * ou faixa de horas). A grade é declarada em horário <b>local</b> do
 * consultório; a conversão para {@link Instant} acontece só no
 * {@link SlotGenerator}, com o {@link #ZONE} daqui — a fonte da verdade de
 * fuso do sistema.
 */
@Service
public class AvailabilityService {

    public static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");

    /** Antecedência mínima para o paciente marcar sozinho. */
    public static final Duration MIN_NOTICE = Duration.ofHours(12);

    /** Quanto para trás a busca por agendamentos ocupados começa — cobre a maior duração plausível. */
    private static final Duration LOOKBACK = Duration.ofHours(8);

    /** Quanto para frente a grade é oferecida. */
    public static final int HORIZON_DAYS = 60;

    private final AvailabilityWindowRepository windowRepository;
    private final AvailabilityRuleRepository ruleRepository;
    private final AvailabilityBlockRepository blockRepository;
    private final AppointmentRepository appointmentRepository;
    private final DoctorRepository doctorRepository;

    public AvailabilityService(AvailabilityWindowRepository windowRepository,
            AvailabilityRuleRepository ruleRepository, AvailabilityBlockRepository blockRepository,
            AppointmentRepository appointmentRepository, DoctorRepository doctorRepository) {
        this.windowRepository = windowRepository;
        this.ruleRepository = ruleRepository;
        this.blockRepository = blockRepository;
        this.appointmentRepository = appointmentRepository;
        this.doctorRepository = doctorRepository;
    }

    // ---- Janelas -----------------------------------------------------------

    @Transactional(readOnly = true)
    public List<AvailabilityWindowDto> listWindows(UUID doctorId) {
        return windowRepository.findByDoctorIdOrderByStartDateAscCreatedAtAsc(doctorId).stream()
                .map(AvailabilityWindowDto::from)
                .toList();
    }

    @Transactional
    public AvailabilityWindowDto createWindow(UUID doctorId, CreateAvailabilityWindowRequest request) {
        Doctor doctor = requireDoctor(doctorId);
        if (request.endDate() != null && request.endDate().isBefore(request.startDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O fim da janela deve ser depois do início.");
        }

        List<AvailabilityWindow> existing = windowRepository.findByDoctorIdOrderByStartDateAscCreatedAtAsc(doctorId);
        AvailabilityWindow window = new AvailabilityWindow(doctor, request.startDate(), request.endDate());
        for (CreateAvailabilityRuleRequest ruleRequest : request.rules()) {
            validateRule(ruleRequest);
            // Confere contra as janelas já gravadas e contra as faixas que
            // esta mesma janela vai receber neste pedido.
            rejectIfOverlaps(window, ruleRequest, existing);
            rejectIfOverlaps(window, ruleRequest, List.of(window));
            window.getRules().add(new AvailabilityRule(window, ruleRequest.weekday(), ruleRequest.startTime(),
                    ruleRequest.endTime()));
        }
        return AvailabilityWindowDto.from(windowRepository.save(window));
    }

    /**
     * Muda o período da janela — encerrar numa data, adiantar o começo ou
     * reabrir uma já encerrada ({@code endDate} nulo).
     *
     * <p>Mexer nas datas pode fazer a janela passar a cruzar outra no
     * calendário, então as faixas dela são revalidadas contra as demais: o
     * período novo só vale se nenhuma faixa passar a se sobrepor.
     */
    @Transactional
    public AvailabilityWindowDto updateWindow(UUID doctorId, UUID windowId,
            UpdateAvailabilityWindowRequest request) {
        AvailabilityWindow window = requireWindow(doctorId, windowId);
        if (request.endDate() != null && request.endDate().isBefore(request.startDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O fim da janela deve ser depois do início.");
        }

        List<AvailabilityWindow> others = otherWindows(doctorId, windowId);
        for (AvailabilityRule rule : window.getRules()) {
            rejectIfOverlaps(request.startDate(), request.endDate(), asRequest(rule), others, null);
        }

        window.setStartDate(request.startDate());
        window.setEndDate(request.endDate());
        return AvailabilityWindowDto.from(window);
    }

    @Transactional
    public void deleteWindow(UUID doctorId, UUID windowId) {
        windowRepository.delete(requireWindow(doctorId, windowId));
    }

    @Transactional
    public AvailabilityRuleDto addRule(UUID doctorId, UUID windowId, CreateAvailabilityRuleRequest request) {
        AvailabilityWindow window = requireWindow(doctorId, windowId);
        validateRule(request);
        rejectIfOverlaps(window, request, windowRepository.findByDoctorIdOrderByStartDateAscCreatedAtAsc(doctorId));

        AvailabilityRule rule = new AvailabilityRule(window, request.weekday(), request.startTime(),
                request.endTime());
        window.getRules().add(rule);
        return AvailabilityRuleDto.from(ruleRepository.save(rule));
    }

    /**
     * Edita uma faixa no lugar — dia da semana e horário. Antes disso, mudar
     * "sexta 08:00–12:00" para "08:00–11:00" exigia apagar e recriar.
     */
    @Transactional
    public AvailabilityRuleDto updateRule(UUID doctorId, UUID windowId, UUID ruleId,
            CreateAvailabilityRuleRequest request) {
        AvailabilityRule rule = requireRule(doctorId, windowId, ruleId);
        validateRule(request);

        AvailabilityWindow window = rule.getWindow();
        // Conta as outras faixas desta janela também: duas faixas do mesmo
        // dia não podem se cruzar nem dentro da mesma janela.
        List<AvailabilityWindow> windows = windowRepository.findByDoctorIdOrderByStartDateAscCreatedAtAsc(doctorId);
        rejectIfOverlaps(window.getStartDate(), window.getEndDate(), request, windows, ruleId);

        rule.setWeekday(request.weekday());
        rule.setStartTime(request.startTime());
        rule.setEndTime(request.endTime());
        return AvailabilityRuleDto.from(rule);
    }

    @Transactional
    public void deleteRule(UUID doctorId, UUID windowId, UUID ruleId) {
        AvailabilityRule rule = requireRule(doctorId, windowId, ruleId);
        rule.getWindow().getRules().remove(rule);
        ruleRepository.delete(rule);
    }

    private static void validateRule(CreateAvailabilityRuleRequest request) {
        if (!request.endTime().isAfter(request.startTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O fim da faixa deve ser depois do início.");
        }
    }

    /**
     * Uma faixa nova só colide com faixa de mesmo dia da semana cuja janela
     * tem pelo menos um dia em comum com a dela — é o caso em que os slots
     * das duas cairiam no mesmo dia do calendário. "Seg–sex sem fim" e
     * "sáb de 22/09 a 03/10" convivem; "seg 08–12 sem fim" e "seg 10–14 de
     * 22/09 a 03/10" não.
     */
    private static void rejectIfOverlaps(AvailabilityWindow target, CreateAvailabilityRuleRequest request,
            List<AvailabilityWindow> windows) {
        rejectIfOverlaps(target.getStartDate(), target.getEndDate(), request, windows, null);
    }

    /**
     * @param ignoredRuleId a faixa sendo editada — ela não pode colidir
     *                      consigo mesma.
     */
    private static void rejectIfOverlaps(LocalDate startDate, LocalDate endDate,
            CreateAvailabilityRuleRequest request, List<AvailabilityWindow> windows, UUID ignoredRuleId) {
        boolean overlaps = windows.stream()
                .filter(window -> window.intersects(startDate, endDate))
                .flatMap(window -> window.getRules().stream())
                // Comparação a partir do id ignorado: uma faixa ainda não
                // gravada (criação de janela) não tem id, e `getId().equals`
                // estouraria.
                .filter(rule -> ignoredRuleId == null || !ignoredRuleId.equals(rule.getId()))
                .filter(rule -> rule.getWeekday() == request.weekday())
                .anyMatch(rule -> request.startTime().isBefore(rule.getEndTime())
                        && rule.getStartTime().isBefore(request.endTime()));
        if (overlaps) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Essa faixa se sobrepõe a outra já cadastrada nesse período.");
        }
    }

    /** As outras janelas do médico — as que a edição precisa não colidir. */
    private List<AvailabilityWindow> otherWindows(UUID doctorId, UUID windowId) {
        return windowRepository.findByDoctorIdOrderByStartDateAscCreatedAtAsc(doctorId).stream()
                .filter(window -> !window.getId().equals(windowId))
                .toList();
    }

    private static CreateAvailabilityRuleRequest asRequest(AvailabilityRule rule) {
        return new CreateAvailabilityRuleRequest(rule.getWeekday(), rule.getStartTime(), rule.getEndTime());
    }

    // ---- Bloqueios ---------------------------------------------------------

    /** Só os bloqueios que ainda alcançam hoje ou depois — os passados não interessam à tela. */
    @Transactional(readOnly = true)
    public List<AvailabilityBlockDto> listBlocks(UUID doctorId) {
        return blockRepository.findByDoctorIdAndEndDateGreaterThanEqualOrderByStartDateAscCreatedAtAsc(doctorId,
                LocalDate.now(ZONE)).stream()
                .map(AvailabilityBlockDto::from)
                .toList();
    }

    @Transactional
    public AvailabilityBlockDto createBlock(UUID doctorId, CreateAvailabilityBlockRequest request) {
        Doctor doctor = requireDoctor(doctorId);
        if (request.endDate().isBefore(request.startDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O fim do bloqueio deve ser depois do início.");
        }
        if ((request.startTime() == null) != (request.endTime() == null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Informe o início e o fim do horário, ou nenhum dos dois para o dia inteiro.");
        }
        if (request.startTime() != null && !request.endTime().isAfter(request.startTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O fim do horário deve ser depois do início.");
        }
        String reason = request.reason() == null || request.reason().isBlank() ? null : request.reason().trim();

        AvailabilityBlock block = blockRepository.save(new AvailabilityBlock(doctor, request.startDate(),
                request.endDate(), request.startTime(), request.endTime(), reason));
        return AvailabilityBlockDto.from(block);
    }

    @Transactional
    public void deleteBlock(UUID doctorId, UUID blockId) {
        AvailabilityBlock block = blockRepository.findByIdAndDoctorId(blockId, doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bloqueio não encontrado."));
        blockRepository.delete(block);
    }

    // ---- Horários ----------------------------------------------------------

    /** Horários livres do médico no horizonte padrão, a partir de agora + antecedência mínima. */
    @Transactional(readOnly = true)
    public List<AvailabilitySlotDto> openSlots(UUID doctorId, AppointmentType type) {
        Instant now = Instant.now();
        return slotsBetween(doctorId, type, now.plus(MIN_NOTICE), now.plus(HORIZON_DAYS, ChronoUnit.DAYS));
    }

    /**
     * Horários livres do intervalo que ainda estão no futuro — para a agenda
     * do consultório, sem a antecedência mínima do paciente. Um slot que já
     * passou não é "livre", é história.
     */
    @Transactional(readOnly = true)
    public List<AvailabilitySlotDto> slotsFromNow(UUID doctorId, AppointmentType type, Instant from, Instant to) {
        Instant now = Instant.now();
        return slotsBetween(doctorId, type, from.isBefore(now) ? now : from, to);
    }

    /**
     * Horários livres entre dois instantes para um atendimento desse tipo —
     * ver {@link SlotGenerator#generate}. O tamanho de cada horário é a
     * duração que o médico configurou para o tipo.
     */
    @Transactional(readOnly = true)
    public List<AvailabilitySlotDto> slotsBetween(UUID doctorId, AppointmentType type, Instant from, Instant to) {
        if (!to.isAfter(from)) {
            return List.of();
        }
        List<AvailabilityWindow> windows = windowRepository.findByDoctorIdOrderByStartDateAscCreatedAtAsc(doctorId);
        if (windows.isEmpty()) {
            return List.of();
        }
        List<AvailabilityBlock> blocks = blockRepository.findByDoctorIdOrderByStartDateAscCreatedAtAsc(doctorId);
        return SlotGenerator.generate(windows, blocks, busyIntervals(doctorId, from, to),
                requireDoctor(doctorId).minutesFor(type), from, to, ZONE);
    }

    /**
     * Agendamentos não-cancelados que ocupam qualquer parte do intervalo.
     * A busca começa antes de {@code from} porque um agendamento que
     * <b>começa</b> antes pode terminar dentro — com durações variáveis,
     * olhar só o instante de início deixaria passar sobreposição.
     */
    private List<BusyInterval> busyIntervals(UUID doctorId, Instant from, Instant to) {
        return appointmentRepository
                .findByDoctorIdAndScheduledAtBetweenOrderByScheduledAtAsc(doctorId, from.minus(LOOKBACK), to).stream()
                .filter(appointment -> appointment.getStatus().occupiesSlot())
                .map(appointment -> new BusyInterval(appointment.getScheduledAt(),
                        appointment.getScheduledAt().plusSeconds(appointment.getDurationMin() * 60L)))
                .filter(interval -> interval.end().isAfter(from))
                .toList();
    }

    /**
     * O slot livre exatamente nesse instante, se a grade ainda o oferece
     * para esse tipo. Vazio significa "fora da grade, cedo demais ou já
     * ocupado" — quem agenda não precisa distinguir os três casos.
     */
    @Transactional(readOnly = true)
    public Optional<AvailabilitySlotDto> findOpenSlot(UUID doctorId, AppointmentType type, Instant scheduledAt) {
        return openSlots(doctorId, type).stream()
                .filter(slot -> slot.scheduledAt().equals(scheduledAt))
                .findFirst();
    }

    // ---- Durações por tipo -------------------------------------------------

    @Transactional(readOnly = true)
    public AppointmentDurationsDto durations(UUID doctorId) {
        return AppointmentDurationsDto.from(requireDoctor(doctorId));
    }

    @Transactional
    public AppointmentDurationsDto updateDurations(UUID doctorId, UpdateAppointmentDurationsRequest request) {
        Doctor doctor = requireDoctor(doctorId);
        doctor.setFirstVisitMinutes(request.firstVisitMinutes());
        doctor.setFollowUpMinutes(request.followUpMinutes());
        doctor.setFirstVisitPriceCents(request.firstVisitPriceCents());
        doctor.setFollowUpPriceCents(request.followUpPriceCents());
        return AppointmentDurationsDto.from(doctor);
    }

    // ---- Apoio -------------------------------------------------------------

    private Doctor requireDoctor(UUID doctorId) {
        return doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Sessão inválida, faça login novamente."));
    }

    private AvailabilityRule requireRule(UUID doctorId, UUID windowId, UUID ruleId) {
        return ruleRepository.findByIdAndWindowIdAndDoctorId(ruleId, windowId, doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Faixa não encontrada."));
    }

    private AvailabilityWindow requireWindow(UUID doctorId, UUID windowId) {
        return windowRepository.findByIdAndDoctorId(windowId, doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Janela não encontrada."));
    }
}
