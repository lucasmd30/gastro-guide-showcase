package com.gastroguide.doctor;

import com.gastroguide.doctor.dto.DoctorHealthPlanDto;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

/**
 * Convênios que o médico atende ("Meu perfil"). Lista livre, sem catálogo
 * oficial: o nome é o que o paciente vê no link, então vale como o médico
 * escrever. Não há mínimo — sem convênio nenhum, o link só oferece
 * atendimento particular.
 */
@Service
public class DoctorHealthPlanService {

    private final DoctorHealthPlanRepository repository;
    private final DoctorRepository doctorRepository;

    public DoctorHealthPlanService(DoctorHealthPlanRepository repository, DoctorRepository doctorRepository) {
        this.repository = repository;
        this.doctorRepository = doctorRepository;
    }

    @Transactional(readOnly = true)
    public List<DoctorHealthPlanDto> list(UUID doctorId) {
        return repository.findByDoctorIdOrderByNameAsc(doctorId).stream().map(DoctorHealthPlanDto::from).toList();
    }

    /** Só os nomes, na ordem em que o link mostra. */
    @Transactional(readOnly = true)
    public List<String> names(UUID doctorId) {
        return repository.findByDoctorIdOrderByNameAsc(doctorId).stream().map(DoctorHealthPlan::getName).toList();
    }

    @Transactional
    public List<DoctorHealthPlanDto> add(UUID doctorId, String rawName) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Sessão inválida, faça login novamente."));
        String name = rawName.trim().replaceAll("\s+", " ");
        if (name.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe o nome do convênio.");
        }
        if (repository.existsByDoctorIdAndNameIgnoreCase(doctorId, name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Esse convênio já está na sua lista.");
        }
        repository.save(new DoctorHealthPlan(doctor, name));
        return list(doctorId);
    }

    @Transactional
    public List<DoctorHealthPlanDto> remove(UUID doctorId, UUID planId) {
        DoctorHealthPlan plan = repository.findByIdAndDoctorId(planId, doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Convênio não encontrado."));
        repository.delete(plan);
        repository.flush();
        return list(doctorId);
    }
}
