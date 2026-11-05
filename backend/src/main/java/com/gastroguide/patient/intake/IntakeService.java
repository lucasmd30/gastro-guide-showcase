package com.gastroguide.patient.intake;

import com.gastroguide.appointment.Appointment;
import com.gastroguide.appointment.AppointmentBilling;
import com.gastroguide.appointment.AppointmentRepository;
import com.gastroguide.appointment.AppointmentModality;
import com.gastroguide.appointment.AppointmentStatus;
import com.gastroguide.appointment.AppointmentType;
import com.gastroguide.availability.AvailabilityService;
import com.gastroguide.availability.dto.AvailabilitySlotDto;
import com.gastroguide.common.CpfValidator;
import com.gastroguide.doctor.Doctor;
import com.gastroguide.doctor.DoctorHealthPlanService;
import com.gastroguide.doctor.DoctorRepository;
import com.gastroguide.patient.Patient;
import com.gastroguide.patient.PatientRepository;
import com.gastroguide.patient.PatientService;
import com.gastroguide.patient.dto.PatientDto;
import com.gastroguide.patient.dto.PatientRequest;
import com.gastroguide.patient.intake.dto.IdentifiedPatientDto;
import com.gastroguide.patient.intake.dto.IdentifyPatientRequest;
import com.gastroguide.patient.intake.dto.IntakeContextDto;
import com.gastroguide.patient.intake.dto.PatientIntakeLinkDto;
import com.gastroguide.patient.intake.dto.RegistrationDoneDto;
import com.gastroguide.patient.intake.dto.ScheduleIntakeRequest;
import com.gastroguide.patient.intake.dto.ScheduledConsultationDto;
import com.gastroguide.patient.intake.dto.UpcomingConsultationDto;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Gera e resolve o link público (sem autenticação) pelo qual o próprio
 * paciente se cadastra e marca a consulta. Mesmo padrão de token opaco +
 * hash SHA-256 do refresh token de auth (AuthService), mas deliberadamente
 * não compartilhado com ele — mesma convenção de "espelhar, não
 * generalizar" já usada entre AuthService/SecretaryAuthService, pra não
 * arriscar o fluxo de autenticação já validado.
 *
 * <p>O token é de uso único: {@link #schedule} o revoga assim que a consulta
 * é criada. O prazo de 30 dias em {@link #LINK_TTL} é só o backstop pra um
 * link nunca usado.
 */
@Service
public class IntakeService {

    private static final Duration LINK_TTL = Duration.ofDays(30);
    // 128 bits — link mais curto pra colar no WhatsApp, mas ainda inviável de
    // adivinhar por força bruta; o uso único e o rate limit por IP (ver
    // IntakeController) reduzem ainda mais a janela de ataque.
    private static final int TOKEN_BYTES = 16;
    private static final Set<AppointmentStatus> UPCOMING_STATUSES =
            EnumSet.of(AppointmentStatus.AGENDADO, AppointmentStatus.CONFIRMADO);

    private final PatientIntakeTokenRepository tokenRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;
    private final PatientService patientService;
    private final AvailabilityService availabilityService;
    private final DoctorHealthPlanService healthPlanService;
    private final SecureRandom random = new SecureRandom();

    public IntakeService(PatientIntakeTokenRepository tokenRepository, PatientRepository patientRepository,
            DoctorRepository doctorRepository, AppointmentRepository appointmentRepository,
            PatientService patientService, AvailabilityService availabilityService,
            DoctorHealthPlanService healthPlanService) {
        this.tokenRepository = tokenRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.appointmentRepository = appointmentRepository;
        this.patientService = patientService;
        this.availabilityService = availabilityService;
        this.healthPlanService = healthPlanService;
    }

    /**
     * Gera um link. {@code patientId} nulo é o caso do botão na lista de
     * pacientes: o link existe antes do cadastro, e o paciente é criado
     * quando ele preencher.
     */
    @Transactional
    public PatientIntakeLinkDto generateLink(UUID doctorId, UUID patientId, AppointmentType appointmentType,
            IntakeLinkPurpose purpose) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Sessão inválida, faça login novamente."));

        Patient patient = null;
        if (patientId != null) {
            patient = patientRepository.findByIdAndDoctorId(patientId, doctorId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Paciente não encontrado."));
            // Só um link ativo por paciente — evita que um link antigo esquecido
            // numa conversa de WhatsApp continue válido depois de gerar outro.
            // Links sem paciente não têm o que revogar: cada um é independente.
            tokenRepository.revokeAllForPatient(patientId);
        }

        String rawToken = generateRawToken();
        Instant expiresAt = Instant.now().plus(LINK_TTL);
        tokenRepository.save(new PatientIntakeToken(doctor, patient, appointmentType, purpose, hash(rawToken),
                expiresAt));

        return new PatientIntakeLinkDto(rawToken, expiresAt);
    }

    @Transactional(readOnly = true)
    public IntakeContextDto getByToken(String rawToken) {
        PatientIntakeToken token = resolveToken(rawToken);
        // Dado clínico nunca é exposto pelo link público — mesma regra da secretária.
        PatientDto patient = token.getPatient() == null ? null : PatientDto.from(token.getPatient(), false);
        // Paciente que já tem consulta marcada (a secretária agendou pela
        // agenda, ou um link anterior) não recebe calendário: o link vira
        // "confira sua consulta e complete o cadastro". Vale tanto para o
        // link gerado da agenda quanto para um link de autoagendamento que
        // ficou aberto enquanto a secretária marcava — nos dois o paciente
        // abre e vê a consulta que já existe, sem como marcar uma segunda.
        UpcomingConsultationDto upcoming = token.getPatient() == null ? null
                : upcomingFor(token.getDoctor().getId(), token.getPatient().getId())
                        .map(UpcomingConsultationDto::from).orElse(null);
        return new IntakeContextDto(patient, token.getAppointmentType(), token.getDoctor().getName(),
                token.getPurpose(), upcoming, healthPlanService.names(token.getDoctor().getId()));
    }

    /**
     * Só o cadastro, sem horário: link de {@link IntakeLinkPurpose#CADASTRO},
     * ou link de agendamento de quem já tem consulta marcada. Consome o
     * token. Não mexe em consulta nenhuma — remarcar ou cancelar continua
     * sendo com a clínica.
     */
    @Transactional
    public RegistrationDoneDto completeRegistration(String rawToken, PatientRequest request) {
        PatientIntakeToken token = resolveToken(rawToken);
        Patient patient = token.getPatient();
        UUID doctorId = token.getDoctor().getId();
        String doctorName = token.getDoctor().getName();

        if (token.getPurpose() != IntakeLinkPurpose.CADASTRO
                && (patient == null || upcomingFor(doctorId, patient.getId()).isEmpty())) {
            // Link de agendamento sem consulta marcada: o caminho dele é
            // escolher horário. Acontece se a consulta foi cancelada entre
            // abrir a página e enviar — recarregar mostra o calendário.
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Não há consulta marcada para este link. Recarregue a página.");
        }
        requireContact(request);

        // Dado clínico fica de fora (includeClinicalFields = false) em todos
        // os caminhos, mesma regra do agendamento.
        RegistrationDoneDto done;
        if (patient != null) {
            patientService.update(doctorId, patient.getId(), request, false);
            done = new RegistrationDoneDto(doctorName, request.name(),
                    upcomingFor(doctorId, patient.getId()).map(UpcomingConsultationDto::from).orElse(null));
        } else {
            patient = registerFromOpenLink(doctorId, request);
            // Link sem paciente: a resposta não pode dizer nada de um
            // cadastro que já existia, então nem consulta, nem nome gravado.
            done = new RegistrationDoneDto(doctorName, request.name(), null);
        }

        token.attachPatient(patient);
        token.revoke();
        tokenRepository.save(token);
        return done;
    }

    /**
     * Link gerado sem paciente (cadastro ou agendamento). CPF que
     * já existe no médico não vira cadastro duplicado — mas também só é
     * atualizado quando a data de nascimento bate, o mesmo segundo fator da
     * identificação: só com o CPF, quem tivesse o link poderia reescrever o
     * cadastro de outra pessoa. Sem os dois fatores, o cadastro existente
     * fica como está e a clínica confere com o paciente.
     */
    private Patient registerFromOpenLink(UUID doctorId, PatientRequest request) {
        String cpf = CpfValidator.normalize(request.cpf());
        Patient existing = cpf == null || cpf.isBlank() ? null
                : patientRepository.findByDoctorIdAndCpf(doctorId, cpf).orElse(null);
        if (existing == null) {
            PatientDto created = patientService.create(doctorId, request, false);
            return patientRepository.findById(UUID.fromString(created.id())).orElseThrow();
        }
        if (sameBirthDate(existing, request)) {
            patientService.update(doctorId, existing.getId(), request, false);
        }
        return existing;
    }

    private static boolean sameBirthDate(Patient patient, PatientRequest request) {
        return request.birthDate() != null && request.birthDate().equals(patient.getBirthDate());
    }

    @Transactional(readOnly = true)
    public List<AvailabilitySlotDto> availableSlots(String rawToken, AppointmentType chosenType) {
        // Os horários dependem do tipo: uma primeira consulta ocupa mais
        // tempo que um retorno, então a grade é outra. O tipo do token
        // (links antigos, de quando quem escolhia era o médico) prevalece
        // sobre a escolha, mesma regra do agendamento.
        PatientIntakeToken token = resolveToken(rawToken);
        AppointmentType type = token.getAppointmentType() != null ? token.getAppointmentType() : chosenType;
        return availabilityService.openSlots(token.getDoctor().getId(),
                type != null ? type : AppointmentType.PRIMEIRA_CONSULTA);
    }

    /**
     * Fluxo de retorno: acha o cadastro do paciente por CPF <b>e</b> data de
     * nascimento, dentro do médico dono do link.
     *
     * <p>Exigir os dois é o que impede o link — feito pra circular no
     * WhatsApp — de virar um consultador de cadastro: só com o CPF, alguém
     * poderia varrer números e descobrir quem é paciente daqui, o que num
     * consultório de gastro/hepatologia já é informação de saúde. Ver
     * {@link IdentifyPatientRequest}.
     *
     * <p>Não achar não é erro: o paciente segue pelo formulário completo,
     * como se fosse primeira consulta. Assim o link também não confirma pra
     * um curioso que um CPF <i>não</i> está cadastrado.
     */
    @Transactional(readOnly = true)
    public IdentifiedPatientDto identify(String rawToken, IdentifyPatientRequest request) {
        PatientIntakeToken token = resolveToken(rawToken);

        // CPF malformado não precisa de checagem própria: simplesmente não
        // casa com nenhum cadastro, e cai no mesmo "não encontrado" genérico.
        String cpf = CpfValidator.normalize(request.cpf());
        if (cpf == null || cpf.isBlank()) {
            return IdentifiedPatientDto.notFound();
        }

        return patientRepository.findByDoctorIdAndCpf(token.getDoctor().getId(), cpf)
                .filter(patient -> request.birthDate().equals(patient.getBirthDate()))
                .map(patient -> new IdentifiedPatientDto(true, patient.getName(), patient.getCpf(),
                        upcomingFor(token.getDoctor().getId(), patient.getId())
                                .map(UpcomingConsultationDto::from).orElse(null)))
                .orElseGet(IdentifiedPatientDto::notFound);
    }

    /**
     * Cadastro e agendamento numa transação só: ou o paciente sai daqui com
     * consulta marcada, ou nada foi gravado.
     */
    @Transactional
    public ScheduledConsultationDto schedule(String rawToken, ScheduleIntakeRequest request) {
        PatientIntakeToken token = resolveToken(rawToken);
        UUID doctorId = token.getDoctor().getId();

        if (token.getPurpose() == IntakeLinkPurpose.CADASTRO) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Este link é só para cadastro. Para marcar horário, fale com a clínica.");
        }

        // Resolvido antes de tudo: o tipo decide o tamanho do horário (e,
        // logo, quais horários existem), e também se este é um retorno
        // (cadastro reaproveitado como está).
        // O tipo do token só existe em links antigos, de quando quem escolhia
        // era o médico; nos novos ele é nulo e vale a escolha do paciente.
        AppointmentType type = token.getAppointmentType() != null ? token.getAppointmentType() : request.type();
        if (type == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Escolha entre primeira consulta e retorno.");
        }

        AvailabilitySlotDto slot = availabilityService.findOpenSlot(doctorId, type, request.scheduledAt())
                // Não distingue "fora da grade" de "acabou de ser ocupado": pro
                // paciente a ação é a mesma, escolher outro horário.
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                        "Esse horário não está mais disponível. Escolha outro."));

        String healthPlan = resolveHealthPlan(doctorId, request.billing(), request.healthPlan());

        rejectIfAlreadyScheduled(token, doctorId, request.patient());

        Patient patient = resolvePatient(token, doctorId, request.patient(), type);

        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Médico não encontrado."));
        AppointmentModality modality = request.modality() != null ? request.modality()
                : AppointmentModality.PRESENCIAL;
        Appointment appointment = new Appointment(doctor, patient, request.scheduledAt(), slot.durationMin(),
                type, modality, null);
        // Particular pelo link nasce com o valor padrão do tipo.
        appointment.setBilling(request.billing(), healthPlan, doctor.priceFor(type));
        appointmentRepository.save(appointment);

        // Cadastro achado só pelo CPF fica como está, e o nome gravado nele não
        // volta na resposta: o link não pode revelar quem é paciente daqui.
        boolean confirmed = token.getPatient() != null || sameBirthDate(patient, request.patient());
        String patientName = confirmed ? patient.getName() : request.patient().name().trim();

        token.attachPatient(patient);
        token.revoke();
        tokenRepository.save(token);

        return new ScheduledConsultationDto(appointment.getScheduledAt(), appointment.getDurationMin(),
                appointment.getType(), doctor.getName(), patientName, appointment.getBilling(),
                appointment.getHealthPlan());
    }

    /**
     * Particular ou convênio, escolhido pelo paciente. Cortesia é decisão da
     * clínica, não opção do link. O convênio precisa ser um dos que o médico
     * atende ("Meu perfil") — devolvido com a grafia de lá, não a digitada.
     */
    private String resolveHealthPlan(UUID doctorId, AppointmentBilling billing, String healthPlan) {
        if (billing == null || billing == AppointmentBilling.CORTESIA) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Escolha entre particular e convênio.");
        }
        if (billing != AppointmentBilling.CONVENIO) {
            return null;
        }
        String wanted = healthPlan == null ? "" : healthPlan.trim();
        return healthPlanService.names(doctorId).stream()
                .filter(name -> name.equalsIgnoreCase(wanted))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Escolha um dos convênios atendidos."));
    }

    /**
     * Nome completo, telefone e e-mail são obrigatórios no link (pedido da
     * clínica, 08/10/2026): é por eles que a clínica confirma a consulta. O
     * CPF deixou de ser — continua opcional, como no cadastro interno.
     */
    private static void requireContact(PatientRequest request) {
        String phoneDigits = request.phone() == null ? "" : request.phone().replaceAll("\\D", "");
        String email = request.email() == null ? "" : request.email().trim();
        if (phoneDigits.length() < 10) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Preencha o telefone com DDD.");
        }
        if (!email.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Preencha um e-mail válido.");
        }
    }

    /**
     * Decide entre atualizar um cadastro existente e criar um novo. O link
     * já pode vir preso a um paciente; senão, vale a regra de
     * {@link #registerFromOpenLink}: CPF que já existe só atualiza com a data
     * de nascimento certa.
     */
    private Patient resolvePatient(PatientIntakeToken token, UUID doctorId, PatientRequest request,
            AppointmentType type) {
        // Retorno de paciente já identificado (CPF + data de nascimento): o
        // cadastro é reaproveitado como está, sem gravar nada por cima. No
        // retorno o paciente só confere o nome na tela e escolhe o horário —
        // se o update rodasse aqui, quem tivesse o link poderia renomear um
        // paciente ou zerar telefone/endereço mandando o corpo na mão.
        if (token.getPatient() == null && type == AppointmentType.RETORNO) {
            String cpf = CpfValidator.normalize(request.cpf());
            if (cpf != null && !cpf.isBlank() && request.birthDate() != null) {
                Patient identified = patientRepository.findByDoctorIdAndCpf(doctorId, cpf)
                        .filter(patient -> sameBirthDate(patient, request))
                        .orElse(null);
                if (identified != null) {
                    return identified;
                }
            }
        }

        // Daqui para baixo o cadastro é criado ou reescrito com o que veio do
        // link, então o contato precisa estar lá.
        requireContact(request);

        // Dado clínico fica de fora dos dois caminhos (includeClinicalFields =
        // false), então o link público nunca lê nem sobrescreve prontuário.
        Patient linked = token.getPatient();
        if (linked != null) {
            patientService.update(doctorId, linked.getId(), request, false);
            return patientRepository.findById(linked.getId()).orElseThrow();
        }
        return registerFromOpenLink(doctorId, request);
    }

    /**
     * A trava contra consulta duplicada: a secretária pode ter marcado pela
     * agenda enquanto o paciente estava com o link aberto. Roda antes de
     * {@link #resolvePatient}, que já gravaria o cadastro.
     *
     * <p>A data da consulta só aparece na mensagem quando dá para confiar que
     * é o próprio paciente: link gerado da ficha dele, ou CPF <b>e</b> data de
     * nascimento batendo (a mesma regra da identificação). Só com o CPF a
     * resposta é genérica, para o link não revelar a agenda de terceiros.
     */
    private void rejectIfAlreadyScheduled(PatientIntakeToken token, UUID doctorId, PatientRequest request) {
        Patient existing = token.getPatient();
        boolean trusted = existing != null;
        if (existing == null) {
            String cpf = CpfValidator.normalize(request.cpf());
            if (cpf == null || cpf.isBlank()) {
                return;
            }
            existing = patientRepository.findByDoctorIdAndCpf(doctorId, cpf).orElse(null);
            trusted = existing != null && sameBirthDate(existing, request);
        }
        if (existing == null) {
            return;
        }

        Appointment upcoming = upcomingFor(doctorId, existing.getId()).orElse(null);
        if (upcoming == null) {
            return;
        }
        if (!trusted) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Não foi possível agendar por este link. Entre em contato com a clínica.");
        }
        String when = DateTimeFormatter.ofPattern("dd/MM 'às' HH:mm")
                .format(upcoming.getScheduledAt().atZone(AvailabilityService.ZONE));
        throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Você já tem uma consulta marcada para " + when
                        + ". Para remarcar, entre em contato com a clínica.");
    }

    /**
     * Consulta que ainda vai acontecer. Atendida, falta e cancelada não
     * contam: nenhuma delas impede marcar a próxima.
     */
    private Optional<Appointment> upcomingFor(UUID doctorId, UUID patientId) {
        return appointmentRepository.findFirstByDoctorIdAndPatientIdAndStatusInAndScheduledAtAfterOrderByScheduledAtAsc(
                doctorId, patientId, UPCOMING_STATUSES, Instant.now());
    }

    private PatientIntakeToken resolveToken(String rawToken) {
        String tokenHash = hash(rawToken);
        return tokenRepository.findByTokenHash(tokenHash)
                .filter(t -> !t.isRevoked() && !t.isExpired())
                // Mensagem genérica de propósito — não distingue "nunca existiu" de
                // "expirou/foi revogado", mesma convenção usada no login (AuthService).
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Link inválido ou expirado."));
    }

    private String generateRawToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return Base64.getEncoder().encodeToString(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
