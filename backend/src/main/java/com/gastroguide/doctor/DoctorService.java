package com.gastroguide.doctor;

import com.gastroguide.common.CrmValidator;
import com.gastroguide.common.MedicalSpecialties;
import com.gastroguide.doctor.dto.AddCrmRequest;
import com.gastroguide.doctor.dto.AddRqeRequest;
import com.gastroguide.doctor.dto.DoctorDto;
import com.gastroguide.doctor.dto.UpdateDoctorRequest;
import com.gastroguide.doctor.dto.UpdateOfficeAddressRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class DoctorService {

    private final DoctorRepository doctorRepository;
    private final DoctorCrmRepository doctorCrmRepository;
    private final DoctorRqeRepository doctorRqeRepository;

    public DoctorService(DoctorRepository doctorRepository, DoctorCrmRepository doctorCrmRepository,
                          DoctorRqeRepository doctorRqeRepository) {
        this.doctorRepository = doctorRepository;
        this.doctorCrmRepository = doctorCrmRepository;
        this.doctorRqeRepository = doctorRqeRepository;
    }

    public DoctorDto getById(UUID doctorId) {
        Doctor doctor = findOrThrow(doctorId);
        return DoctorDto.from(doctor, crmsFor(doctorId), rqesFor(doctorId));
    }

    @Transactional
    public DoctorDto update(UUID doctorId, UpdateDoctorRequest request) {
        Doctor doctor = findOrThrow(doctorId);

        doctor.setName(request.name().trim());
        doctor.setPhone(blankToNull(request.phone()));
        doctorRepository.save(doctor);

        return DoctorDto.from(doctor, crmsFor(doctorId), rqesFor(doctorId));
    }

    /** Endereço comercial: substitui o endereço inteiro; em branco = vazio. */
    @Transactional
    public DoctorDto updateOfficeAddress(UUID doctorId, UpdateOfficeAddressRequest request) {
        Doctor doctor = findOrThrow(doctorId);

        String cep = blankToNull(request.cep() == null ? null : request.cep().replaceAll("[^0-9]", ""));
        if (cep != null && cep.length() != 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CEP deve ter 8 dígitos.");
        }
        String state = blankToNull(request.state());
        if (state != null) {
            state = state.toUpperCase();
            if (!CrmValidator.isValidUf(state)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "UF do endereço inválida.");
            }
        }

        doctor.setOfficeAddress(cep, blankToNull(request.street()), blankToNull(request.number()),
                blankToNull(request.complement()), blankToNull(request.district()),
                blankToNull(request.city()), state);
        doctorRepository.save(doctor);

        return DoctorDto.from(doctor, crmsFor(doctorId), rqesFor(doctorId));
    }

    @Transactional
    public DoctorDto addCrm(UUID doctorId, AddCrmRequest request) {
        Doctor doctor = findOrThrow(doctorId);

        String crm = CrmValidator.normalize(request.crm());
        String crmUf = request.crmUf().trim().toUpperCase();
        CrmValidator.validate(crm, crmUf);

        if (doctorCrmRepository.existsByCrmAndCrmUf(crm, crmUf)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Esse CRM já está cadastrado por outro médico.");
        }
        if (doctorCrmRepository.existsByDoctorIdAndCrmUf(doctorId, crmUf)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Você já tem um CRM cadastrado nessa UF.");
        }

        doctorCrmRepository.save(new DoctorCrm(doctor, crm, crmUf, false));

        return DoctorDto.from(doctor, crmsFor(doctorId), rqesFor(doctorId));
    }

    @Transactional
    public DoctorDto removeCrm(UUID doctorId, UUID crmId) {
        DoctorCrm target = doctorCrmRepository.findByIdAndDoctorId(crmId, doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CRM não encontrado."));

        List<DoctorCrm> all = doctorCrmRepository.findByDoctorIdOrderByCreatedAtAsc(doctorId);
        if (all.size() <= 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O médico precisa ter ao menos um CRM.");
        }

        boolean wasPrincipal = target.isPrincipal();
        doctorCrmRepository.delete(target);
        // Flush explícito: sem isso, o Hibernate pode emitir o UPDATE que promove o
        // novo principal antes do DELETE do antigo (ordem de flush não segue a ordem
        // das chamadas), o que viola por um instante o índice parcial
        // idx_doctor_crms_one_principal (só um principal=true por médico).
        doctorCrmRepository.flush();

        if (wasPrincipal) {
            DoctorCrm promoted = all.stream()
                    .filter(crm -> !crm.getId().equals(target.getId()))
                    .findFirst()
                    .orElseThrow();
            promoted.setPrincipal(true);
            doctorCrmRepository.save(promoted);
        }

        Doctor doctor = findOrThrow(doctorId);
        return DoctorDto.from(doctor, crmsFor(doctorId), rqesFor(doctorId));
    }

    @Transactional
    public DoctorDto setPrincipalCrm(UUID doctorId, UUID crmId) {
        DoctorCrm target = doctorCrmRepository.findByIdAndDoctorId(crmId, doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CRM não encontrado."));

        if (!target.isPrincipal()) {
            doctorCrmRepository.findByDoctorIdAndPrincipalTrue(doctorId).ifPresent(current -> {
                current.setPrincipal(false);
                // saveAndFlush (não só save): garante que o UPDATE que tira o principal
                // antigo é executado antes do UPDATE que promove o novo — mesma razão do
                // flush em removeCrm, pro índice parcial idx_doctor_crms_one_principal
                // nunca ver dois principal=true ao mesmo tempo.
                doctorCrmRepository.saveAndFlush(current);
            });
            target.setPrincipal(true);
            doctorCrmRepository.save(target);
        }

        Doctor doctor = findOrThrow(doctorId);
        return DoctorDto.from(doctor, crmsFor(doctorId), rqesFor(doctorId));
    }

    @Transactional
    public DoctorDto addRqe(UUID doctorId, AddRqeRequest request) {
        Doctor doctor = findOrThrow(doctorId);

        String rqe = request.rqe().trim();
        String specialty = request.specialty().trim();
        MedicalSpecialties.validate(specialty);

        if (doctorRqeRepository.existsByDoctorIdAndSpecialty(doctorId, specialty)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Você já tem um RQE cadastrado nessa especialidade.");
        }

        boolean isFirst = doctorRqeRepository.findByDoctorIdOrderByCreatedAtAsc(doctorId).isEmpty();
        doctorRqeRepository.save(new DoctorRqe(doctor, rqe, specialty, isFirst));

        return DoctorDto.from(doctor, crmsFor(doctorId), rqesFor(doctorId));
    }

    @Transactional
    public DoctorDto removeRqe(UUID doctorId, UUID rqeId) {
        DoctorRqe target = doctorRqeRepository.findByIdAndDoctorId(rqeId, doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "RQE não encontrado."));

        boolean wasPrincipal = target.isPrincipal();
        doctorRqeRepository.delete(target);
        // Mesmo motivo do flush em removeCrm: evita que a promoção do novo principal
        // seja flushada antes do DELETE do antigo, violando o índice parcial
        // idx_doctor_rqes_one_principal.
        doctorRqeRepository.flush();

        if (wasPrincipal) {
            doctorRqeRepository.findByDoctorIdOrderByCreatedAtAsc(doctorId).stream()
                    .findFirst()
                    .ifPresent(promoted -> {
                        promoted.setPrincipal(true);
                        doctorRqeRepository.save(promoted);
                    });
        }

        Doctor doctor = findOrThrow(doctorId);
        return DoctorDto.from(doctor, crmsFor(doctorId), rqesFor(doctorId));
    }

    @Transactional
    public DoctorDto setPrincipalRqe(UUID doctorId, UUID rqeId) {
        DoctorRqe target = doctorRqeRepository.findByIdAndDoctorId(rqeId, doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "RQE não encontrado."));

        if (!target.isPrincipal()) {
            doctorRqeRepository.findByDoctorIdAndPrincipalTrue(doctorId).ifPresent(current -> {
                current.setPrincipal(false);
                doctorRqeRepository.saveAndFlush(current);
            });
            target.setPrincipal(true);
            doctorRqeRepository.save(target);
        }

        Doctor doctor = findOrThrow(doctorId);
        return DoctorDto.from(doctor, crmsFor(doctorId), rqesFor(doctorId));
    }

    private List<DoctorCrm> crmsFor(UUID doctorId) {
        return doctorCrmRepository.findByDoctorIdOrderByCreatedAtAsc(doctorId);
    }

    private List<DoctorRqe> rqesFor(UUID doctorId) {
        return doctorRqeRepository.findByDoctorIdOrderByCreatedAtAsc(doctorId);
    }

    private Doctor findOrThrow(UUID doctorId) {
        return doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sessão inválida, faça login novamente."));
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}
