package com.gastroguide.patient.dto;

import com.gastroguide.patient.Patient;

import java.time.LocalDate;

public record PatientDto(
        String id,
        String name,
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

    public static PatientDto from(Patient patient) {
        return from(patient, true);
    }

    /**
     * @param includeClinicalFields false pra secretária: ela acessa pacientes e
     *                              agenda, mas a tela de perfil promete explicitamente
     *                              que ela "não vê dado clínico" — medicamentos
     *                              contínuos e observações são dado clínico, mesmo
     *                              vivendo na tabela de paciente e não no prontuário.
     *                              Achado da revisão final da Fase 0.
     */
    public static PatientDto from(Patient patient, boolean includeClinicalFields) {
        return new PatientDto(
                patient.getId().toString(),
                patient.getName(),
                patient.getCpf(),
                patient.getPhone(),
                patient.getPhone2(),
                patient.getEmail(),
                patient.getBirthDate(),
                patient.getBirthplace(),
                patient.getOrigin(),
                patient.getAddress(),
                patient.getMotherName(),
                patient.getSex(),
                patient.getProfession(),
                patient.getMaritalStatus(),
                patient.getReligion(),
                includeClinicalFields ? patient.getContinuousMedications() : null,
                includeClinicalFields ? patient.getNotes() : null);
    }
}
