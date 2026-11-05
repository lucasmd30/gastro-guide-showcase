package com.gastroguide.medicalrecord.dto;

import com.gastroguide.medicalrecord.MedicalRecord;
import com.gastroguide.medicalrecord.MedicalRecordType;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record MedicalRecordDetailDto(
        String id, MedicalRecordType type, String disease, String title,
        String crm, String crmUf, String rqe, String specialty,
        String contentText, Map<String, Object> contentJson,
        Map<String, Object> consultationJson, List<String> scoresJson, Instant createdAt) {
    public static MedicalRecordDetailDto from(MedicalRecord record) {
        return new MedicalRecordDetailDto(
                record.getId().toString(), record.getType(), record.getDisease(), record.getTitle(),
                record.getCrm(), record.getCrmUf(), record.getRqe(), record.getSpecialty(),
                record.getContentText(), record.getContentJson(),
                record.getConsultationJson(), record.getScoresJson(), record.getCreatedAt());
    }
}
