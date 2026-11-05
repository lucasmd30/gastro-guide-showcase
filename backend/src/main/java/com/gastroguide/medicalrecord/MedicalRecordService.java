package com.gastroguide.medicalrecord;

import com.gastroguide.common.FormDataNormalizer;
import com.gastroguide.doctor.Doctor;
import com.gastroguide.doctor.DoctorCrm;
import com.gastroguide.doctor.DoctorCrmRepository;
import com.gastroguide.doctor.DoctorRepository;
import com.gastroguide.doctor.DoctorRqe;
import com.gastroguide.doctor.DoctorRqeRepository;
import com.gastroguide.medicalrecord.dto.CreateMedicalRecordRequest;
import com.gastroguide.medicalrecord.dto.MedicalRecordDetailDto;
import com.gastroguide.medicalrecord.dto.MedicalRecordSummaryDto;
import com.gastroguide.patient.Patient;
import com.gastroguide.patient.PatientRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class MedicalRecordService {

    private final MedicalRecordRepository recordRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final DoctorCrmRepository doctorCrmRepository;
    private final DoctorRqeRepository doctorRqeRepository;
    private final PatientDiseaseHeaderService headerService;

    public MedicalRecordService(MedicalRecordRepository recordRepository,
                                 PatientRepository patientRepository,
                                 DoctorRepository doctorRepository,
                                 DoctorCrmRepository doctorCrmRepository,
                                 DoctorRqeRepository doctorRqeRepository,
                                 PatientDiseaseHeaderService headerService) {
        this.recordRepository = recordRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.doctorCrmRepository = doctorCrmRepository;
        this.doctorRqeRepository = doctorRqeRepository;
        this.headerService = headerService;
    }

    public List<MedicalRecordSummaryDto> list(UUID doctorId, UUID patientId) {
        findPatientOrThrow(doctorId, patientId);
        return recordRepository.findByPatientIdOrderByCreatedAtDesc(patientId).stream()
                .map(MedicalRecordSummaryDto::from)
                .toList();
    }

    public MedicalRecordDetailDto getById(UUID doctorId, UUID patientId, UUID recordId) {
        findPatientOrThrow(doctorId, patientId);
        return MedicalRecordDetailDto.from(findRecordOrThrow(patientId, recordId));
    }

    @Transactional
    public MedicalRecordDetailDto create(UUID doctorId, UUID patientId, CreateMedicalRecordRequest request) {
        Patient patient = findPatientOrThrow(doctorId, patientId);
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sessão inválida, faça login novamente."));

        DoctorCrm crm = doctorCrmRepository.findByIdAndDoctorId(request.crmId(), doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "CRM inválido."));
        DoctorRqe rqe = null;
        if (request.rqeId() != null) {
            rqe = doctorRqeRepository.findByIdAndDoctorId(request.rqeId(), doctorId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "RQE inválido."));
        }

        String disease = blankToNull(request.disease());
        if (disease != null) {
            DiseaseRegistry.getOrThrow(disease);
        }

        // Cópia defensiva do Map ao capturar o snapshot: header.getData() é a
        // instância viva do cabeçalho, e setData() troca a referência inteira
        // (não muta em lugar) — mas copiar aqui também remove a dependência
        // desse invariante implícito, deixando a garantia de snapshot
        // congelado estrutural em vez de "nada mais no pacote muta esse Map".
        Map<String, Object> contentJson = disease == null ? null
                : headerService.findHeader(patientId, disease)
                        .map(header -> new LinkedHashMap<>(header.getData()))
                        .orElse(null);

        Map<String, Object> consultationJson = FormDataNormalizer.normalize(
                request.consultationData() == null ? Map.of() : request.consultationData());
        ConsultationSectionRegistry.validate(request.type(), disease, consultationJson);

        // Nada a validar além de "não vazio": o conteúdo é o resultado que o
        // frontend calculou e o médico escolheu anexar, não uma entrada a
        // conferir — recalcular aqui seria uma segunda implementação da mesma
        // fórmula, livre para divergir da que o médico viu na tela.
        List<String> scores = request.scores() == null ? List.of()
                : request.scores().stream().map(String::trim).filter(s -> !s.isEmpty()).toList();

        MedicalRecord record = new MedicalRecord(
                patient, doctor, request.type(), disease,
                request.title().trim(),
                crm.getCrm(), crm.getCrmUf(),
                rqe == null ? null : rqe.getRqe(), rqe == null ? null : rqe.getSpecialty(),
                blankToEmpty(request.contentText()), contentJson,
                consultationJson.isEmpty() ? null : consultationJson,
                scores.isEmpty() ? null : scores);
        recordRepository.save(record);

        return MedicalRecordDetailDto.from(record);
    }

    @Transactional
    public void delete(UUID doctorId, UUID patientId, UUID recordId) {
        findPatientOrThrow(doctorId, patientId);
        MedicalRecord record = findRecordOrThrow(patientId, recordId);
        recordRepository.delete(record);
    }

    private MedicalRecord findRecordOrThrow(UUID patientId, UUID recordId) {
        return recordRepository.findByIdAndPatientId(recordId, patientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Registro não encontrado."));
    }

    private Patient findPatientOrThrow(UUID doctorId, UUID patientId) {
        return patientRepository.findByIdAndDoctorId(patientId, doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Paciente não encontrado."));
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }

    private static String blankToEmpty(String value) {
        return value == null ? "" : value.trim();
    }
}
