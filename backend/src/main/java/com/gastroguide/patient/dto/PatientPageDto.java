package com.gastroguide.patient.dto;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Envelope de paginação da lista de pacientes. Explícito de propósito, em vez
 * de serializar um {@code Page} do Spring Data direto — o formato do
 * {@code PageImpl} não é estável entre versões do Spring e o próprio framework
 * desaconselha expô-lo numa API pública.
 */
public record PatientPageDto(
        List<PatientDto> items,
        int page,
        int size,
        long total,
        int totalPages) {

    public static PatientPageDto from(Page<PatientDto> page) {
        return new PatientPageDto(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages());
    }
}
