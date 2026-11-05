package com.gastroguide.doctor.dto;

import com.gastroguide.doctor.Doctor;
import com.gastroguide.doctor.DoctorCrm;
import com.gastroguide.doctor.DoctorRqe;

import java.util.List;

public record DoctorDto(
        String id,
        String name,
        String email,
        List<DoctorCrmDto> crms,
        List<DoctorRqeDto> rqes,
        String phone,
        OfficeAddressDto officeAddress) {

    public static DoctorDto from(Doctor doctor, List<DoctorCrm> crms, List<DoctorRqe> rqes) {
        return new DoctorDto(
                doctor.getId().toString(),
                doctor.getName(),
                doctor.getEmail(),
                crms.stream().map(DoctorCrmDto::from).toList(),
                rqes.stream().map(DoctorRqeDto::from).toList(),
                doctor.getPhone(),
                OfficeAddressDto.from(doctor));
    }
}
