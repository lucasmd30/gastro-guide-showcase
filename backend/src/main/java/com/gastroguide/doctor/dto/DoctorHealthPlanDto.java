package com.gastroguide.doctor.dto;

import com.gastroguide.doctor.DoctorHealthPlan;

public record DoctorHealthPlanDto(String id, String name) {

    public static DoctorHealthPlanDto from(DoctorHealthPlan plan) {
        return new DoctorHealthPlanDto(plan.getId().toString(), plan.getName());
    }
}
