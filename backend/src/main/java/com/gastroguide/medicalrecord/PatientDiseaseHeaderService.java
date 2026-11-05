package com.gastroguide.medicalrecord;

import com.gastroguide.common.FormDataNormalizer;
import com.gastroguide.medicalrecord.dto.PatientDiseaseHeaderDto;
import com.gastroguide.medicalrecord.dto.UpdateDiseaseHeaderRequest;
import com.gastroguide.patient.Patient;
import com.gastroguide.patient.PatientRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class PatientDiseaseHeaderService {

    private final PatientDiseaseHeaderRepository headerRepository;
    private final PatientRepository patientRepository;

    public PatientDiseaseHeaderService(PatientDiseaseHeaderRepository headerRepository,
                                        PatientRepository patientRepository) {
        this.headerRepository = headerRepository;
        this.patientRepository = patientRepository;
    }

    public Optional<PatientDiseaseHeaderDto> get(UUID doctorId, UUID patientId, String disease) {
        findPatientOrThrow(doctorId, patientId);
        DiseaseRegistry.getOrThrow(disease);
        return headerRepository.findByPatientIdAndDisease(patientId, disease)
                .map(PatientDiseaseHeaderDto::from);
    }

    @Transactional
    public PatientDiseaseHeaderDto upsert(UUID doctorId, UUID patientId, String disease,
                                           UpdateDiseaseHeaderRequest request) {
        Patient patient = findPatientOrThrow(doctorId, patientId);
        Map<String, Object> data = FormDataNormalizer.normalize(request.data() == null ? Map.of() : request.data());
        DiseaseRegistry.validate(disease, data);

        Optional<PatientDiseaseHeader> existing = headerRepository.findByPatientIdAndDisease(patientId, disease);
        PatientDiseaseHeader header;
        if (existing.isPresent()) {
            header = existing.get();
            header.setData(data);
        } else {
            header = new PatientDiseaseHeader(patient, disease, data);
        }
        // saveAndFlush (não só save): @PreUpdate só roda no flush, que por padrão
        // fica adiado até o commit da transação. Sem o flush explícito aqui, o
        // DTO montado logo abaixo capturaria o updatedAt antigo no caminho de
        // atualização (o de criação já funciona, porque @PrePersist roda de forma
        // síncrona dentro do persist()).
        headerRepository.saveAndFlush(header);

        return PatientDiseaseHeaderDto.from(header);
    }

    Optional<PatientDiseaseHeader> findHeader(UUID patientId, String disease) {
        return headerRepository.findByPatientIdAndDisease(patientId, disease);
    }

    private Patient findPatientOrThrow(UUID doctorId, UUID patientId) {
        return patientRepository.findByIdAndDoctorId(patientId, doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Paciente não encontrado."));
    }
}
