package com.gastroguide.patient;

import com.gastroguide.common.CpfValidator;
import com.gastroguide.doctor.Doctor;
import com.gastroguide.doctor.DoctorRepository;
import com.gastroguide.patient.dto.PatientDto;
import com.gastroguide.patient.dto.PatientPageDto;
import com.gastroguide.patient.dto.PatientRequest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.util.UUID;

@Service
public class PatientService {

    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;

    public PatientService(PatientRepository patientRepository, DoctorRepository doctorRepository) {
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
    }

    /** Tamanho máximo de página, pra uma query solta não conseguir puxar a base inteira. */
    private static final int MAX_PAGE_SIZE = 100;

    public PatientPageDto list(UUID doctorId, boolean includeClinicalFields, String query, int page, int size) {
        // Sem acento, como o nome do lado do banco: "Silverio" acha "Silvério".
        String q = query == null ? "" : stripAccents(query.trim()).toLowerCase();
        String digits = CpfValidator.normalize(q);
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.clamp(size, 1, MAX_PAGE_SIZE));

        return PatientPageDto.from(
                patientRepository.search(doctorId, q, digits, pageable)
                        .map(patient -> PatientDto.from(patient, includeClinicalFields)));
    }

    public PatientDto getById(UUID doctorId, UUID patientId, boolean includeClinicalFields) {
        return PatientDto.from(findOrThrow(doctorId, patientId), includeClinicalFields);
    }

    @Transactional
    public PatientDto create(UUID doctorId, PatientRequest request, boolean includeClinicalFields) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sessão inválida, faça login novamente."));

        String cpf = normalizeAndValidateCpf(request.cpf());
        if (cpf != null && patientRepository.existsByDoctorIdAndCpf(doctorId, cpf)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Você já tem um paciente cadastrado com esse CPF.");
        }

        Patient patient = new Patient(doctor, request.name().trim());
        applyFields(patient, request, cpf, includeClinicalFields);
        patientRepository.save(patient);

        return PatientDto.from(patient, includeClinicalFields);
    }

    @Transactional
    public PatientDto update(UUID doctorId, UUID patientId, PatientRequest request, boolean includeClinicalFields) {
        Patient patient = findOrThrow(doctorId, patientId);

        String cpf = normalizeAndValidateCpf(request.cpf());
        if (cpf != null && patientRepository.existsByDoctorIdAndCpfAndIdNot(doctorId, cpf, patientId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Você já tem um paciente cadastrado com esse CPF.");
        }

        patient.setName(request.name().trim());
        applyFields(patient, request, cpf, includeClinicalFields);
        patientRepository.save(patient);

        return PatientDto.from(patient, includeClinicalFields);
    }

    @Transactional
    public void delete(UUID doctorId, UUID patientId) {
        Patient patient = findOrThrow(doctorId, patientId);
        patientRepository.delete(patient);
    }

    private void applyFields(Patient patient, PatientRequest request, String cpf, boolean includeClinicalFields) {
        patient.setCpf(cpf);
        patient.setPhone(blankToNull(request.phone()));
        patient.setPhone2(blankToNull(request.phone2()));
        patient.setEmail(blankToNull(request.email()));
        patient.setBirthDate(request.birthDate());
        patient.setBirthplace(blankToNull(request.birthplace()));
        patient.setOrigin(blankToNull(request.origin()));
        patient.setAddress(blankToNull(request.address()));
        patient.setMotherName(blankToNull(request.motherName()));
        patient.setSex(blankToNull(request.sex()));
        patient.setProfession(blankToNull(request.profession()));
        patient.setMaritalStatus(blankToNull(request.maritalStatus()));
        patient.setReligion(blankToNull(request.religion()));
        // Secretária não deve conseguir ler NEM escrever dado clínico — se
        // ignorássemos isso só na leitura, ela ainda poderia sobrescrever
        // medicamentos/observações às cegas. Em vez de zerar o campo (o que
        // apagaria dado que o médico já tinha registrado), simplesmente não
        // tocamos nele quando a requisição vem de uma secretária.
        if (includeClinicalFields) {
            patient.setContinuousMedications(blankToNull(request.continuousMedications()));
            patient.setNotes(blankToNull(request.notes()));
        }
    }

    /** "Silvério" → "Silverio": decompõe (NFD) e descarta as marcas de acento. */
    static String stripAccents(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
    }

    private String normalizeAndValidateCpf(String rawCpf) {
        String cpf = CpfValidator.normalize(rawCpf);
        if (cpf.isEmpty()) {
            return null;
        }
        CpfValidator.validate(cpf);
        return cpf;
    }

    private Patient findOrThrow(UUID doctorId, UUID patientId) {
        return patientRepository.findByIdAndDoctorId(patientId, doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Paciente não encontrado."));
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}
