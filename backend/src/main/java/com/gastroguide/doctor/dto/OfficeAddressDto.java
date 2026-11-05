package com.gastroguide.doctor.dto;

import com.gastroguide.doctor.Doctor;

/** Endereço comercial do médico; todos os campos opcionais. `cep` só com dígitos. */
public record OfficeAddressDto(
        String cep,
        String street,
        String number,
        String complement,
        String district,
        String city,
        String state) {

    public static OfficeAddressDto from(Doctor doctor) {
        return new OfficeAddressDto(
                doctor.getOfficeCep(),
                doctor.getOfficeStreet(),
                doctor.getOfficeNumber(),
                doctor.getOfficeComplement(),
                doctor.getOfficeDistrict(),
                doctor.getOfficeCity(),
                doctor.getOfficeState());
    }
}
