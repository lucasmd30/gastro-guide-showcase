package com.gastroguide.medicalrecord.draft;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gastroguide.patient.Patient;
import com.gastroguide.patient.PatientRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Rascunho automático do formulário de registro. O conteúdo é o estado da
 * tela, parcial por natureza, então não passa pela validação de campos do
 * registro — ela acontece quando o registro de verdade é salvo. O que se
 * limita aqui é o que protege o banco: a chave do modelo e o tamanho.
 */
@Service
public class MedicalRecordDraftService {

    /** Ex.: "drge", "geral", "gastro-op1". */
    private static final Pattern FORM_KEY = Pattern.compile("[a-z0-9:-]{1,80}");

    /** Folgado para um prontuário inteiro digitado; impede usar a rota como depósito. */
    static final int MAX_BYTES = 256 * 1024;

    private final MedicalRecordDraftRepository repository;
    private final PatientRepository patientRepository;
    private final ObjectMapper objectMapper;

    public MedicalRecordDraftService(MedicalRecordDraftRepository repository, PatientRepository patientRepository,
                                      ObjectMapper objectMapper) {
        this.repository = repository;
        this.patientRepository = patientRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public Optional<MedicalRecordDraftDto> get(UUID doctorId, UUID patientId, String formKey) {
        findPatientOrThrow(doctorId, patientId);
        return repository.findByPatientIdAndFormKey(patientId, validKey(formKey)).map(MedicalRecordDraftDto::from);
    }

    @Transactional
    public MedicalRecordDraftDto save(UUID doctorId, UUID patientId, String formKey, Map<String, Object> data) {
        Patient patient = findPatientOrThrow(doctorId, patientId);
        String key = validKey(formKey);
        Map<String, Object> content = data == null ? Map.of() : data;
        rejectIfTooLarge(content);

        MedicalRecordDraft draft = repository.findByPatientIdAndFormKey(patientId, key)
                .orElseGet(() -> new MedicalRecordDraft(patient, key, content));
        draft.setData(content);
        return MedicalRecordDraftDto.from(repository.saveAndFlush(draft));
    }

    @Transactional
    public void delete(UUID doctorId, UUID patientId, String formKey) {
        findPatientOrThrow(doctorId, patientId);
        repository.findByPatientIdAndFormKey(patientId, validKey(formKey)).ifPresent(repository::delete);
    }

    private Patient findPatientOrThrow(UUID doctorId, UUID patientId) {
        return patientRepository.findByIdAndDoctorId(patientId, doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Paciente não encontrado."));
    }

    private static String validKey(String formKey) {
        if (formKey == null || !FORM_KEY.matcher(formKey).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Modelo de rascunho inválido.");
        }
        return formKey;
    }

    private void rejectIfTooLarge(Map<String, Object> data) {
        try {
            if (objectMapper.writeValueAsBytes(data).length > MAX_BYTES) {
                throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Rascunho grande demais.");
            }
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rascunho inválido.");
        }
    }
}
