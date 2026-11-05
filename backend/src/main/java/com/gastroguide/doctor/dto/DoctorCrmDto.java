package com.gastroguide.doctor.dto;

import com.gastroguide.doctor.DoctorCrm;

public record DoctorCrmDto(String id, String crm, String crmUf, boolean principal) {

    public static DoctorCrmDto from(DoctorCrm entity) {
        return new DoctorCrmDto(
                entity.getId().toString(),
                entity.getCrm(),
                entity.getCrmUf(),
                entity.isPrincipal());
    }
}
