package com.gastroguide.patient.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record PatientRequest(
        @NotBlank String name,
        String cpf,
        String phone,
        String phone2,
        String email,
        LocalDate birthDate,
        String birthplace,
        String origin,
        String address,
        String motherName,
        String sex,
        String profession,
        String maritalStatus,
        String religion,
        String continuousMedications,
        String notes) {
}
