package com.gastroguide.medicalrecord.draft;

import java.time.Instant;
import java.util.Map;

public record MedicalRecordDraftDto(String formKey, Map<String, Object> data, Instant updatedAt) {
    public static MedicalRecordDraftDto from(MedicalRecordDraft draft) {
        return new MedicalRecordDraftDto(draft.getFormKey(), draft.getData(), draft.getUpdatedAt());
    }
}
