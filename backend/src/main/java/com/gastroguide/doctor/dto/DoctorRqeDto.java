package com.gastroguide.doctor.dto;

import com.gastroguide.doctor.DoctorRqe;

public record DoctorRqeDto(String id, String rqe, String specialty, boolean principal) {

    public static DoctorRqeDto from(DoctorRqe rqe) {
        return new DoctorRqeDto(rqe.getId().toString(), rqe.getRqe(), rqe.getSpecialty(), rqe.isPrincipal());
    }
}
